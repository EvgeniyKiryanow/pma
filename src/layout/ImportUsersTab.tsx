import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { HEADER_MAP } from '../utils/headerMap';

import {
    excelSerialToDate,
    normalizeExcelDate,
    generateUserKey,
    needsUpdate,
} from '../helpers/csvImports';

export default function ImportUsersTab() {
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [dbColumns, setDbColumns] = useState<string[]>([]);
    const [missingDbFields, setMissingDbFields] = useState<string[]>([]);

    const [existingUsers, setExistingUsers] = useState<any[]>([]);

    useEffect(() => {
        // load DB columns
        window.electronAPI.getDbColums().then((cols: string[]) => {
            setDbColumns(cols);
        });

        // load all users
        window.electronAPI.fetchUsers().then((users: any[]) => {
            setExistingUsers(users);
        });
    }, []);

    const mapExcelRowToDb = (row: Record<string, string>): Record<string, string> => {
        const mapped: Record<string, string> = {};

        for (const [excelHeader, value] of Object.entries(row)) {
            const dbField = HEADER_MAP[excelHeader.trim()]; // ✅ lookup mapping

            if (dbField) {
                mapped[dbField] = value?.toString().trim() ?? '';
            } else {
                console.warn(`⚠ No mapping found for Excel header: "${excelHeader}"`);
            }
        }

        return mapped;
    };

    const findBestDbColumn = (excelHeader: string, dbCols: string[]): string => {
        const normalize = (str: string) =>
            str
                .toLowerCase()
                .replace(/[^\p{L}\p{N}]+/gu, '') // remove spaces/punctuation
                .trim();

        const normExcel = normalize(excelHeader);

        // Try exact match first
        const exact = dbCols.find((col) => normalize(col) === normExcel);
        if (exact) return exact;

        // Try partial matches (contains)
        const partial = dbCols.find(
            (col) => normExcel.includes(normalize(col)) || normalize(col).includes(normExcel),
        );
        if (partial) return partial;

        // Nothing found → return original header (unknown field)
        return excelHeader;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // ✅ get DB columns from backend
        const dbCols = await window.electronAPI.getDbColums();
        setDbColumns(dbCols);

        const reader = new FileReader();
        reader.onload = (evt) => {
            const data = evt.target?.result;
            if (!data) return;

            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            // ✅ filter only valid headers (skip unnamed/empty)
            const validHeaders = Object.keys(rawJson[0] || {}).filter(
                (h) => h && !h.startsWith('Unnamed') && !h.startsWith('__EMPTY'),
            );

            // ✅ Clean rows + dynamically map headers → DB columns
            const cleanedRows = rawJson.map((row: any) => {
                const mappedRow: Record<string, string> = {};

                validHeaders.forEach((header) => {
                    let val = row[header];

                    // ✅ Normalize empty
                    if (val === 0 || val === 0.0 || val === '0' || val == null) val = '';

                    // ✅ Find DB field
                    const mappedField = findBestDbColumn(header, dbCols);

                    // ✅ If it's dateOfBirth & looks like Excel serial → convert
                    if (mappedField === 'dateOfBirth') {
                        if (!isNaN(Number(val)) && Number(val) > 10000 && Number(val) < 60000) {
                            mappedRow[mappedField] = excelSerialToDate(Number(val));
                        } else if (val instanceof Date) {
                            mappedRow[mappedField] = val.toISOString().split('T')[0];
                        } else {
                            mappedRow[mappedField] = String(val).trim();
                        }
                    } else {
                        mappedRow[mappedField] = String(val).trim();
                    }
                });

                return mappedRow;
            });

            setParsedData(cleanedRows);
        };
        reader.readAsBinaryString(file);
    };

    const handleImportUsers = async () => {
        if (parsedData.length === 0) return;

        // ✅ Counters
        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        // ✅ Build lookup for existing users
        const userLookup = new Map(existingUsers.map((u) => [generateUserKey(u), u]));

        for (const row of parsedData) {
            const mappedRow = mapExcelRowToDb(row);

            // ✅ normalize date fields
            if (mappedRow.dateOfBirth) {
                mappedRow.dateOfBirth = normalizeExcelDate(mappedRow.dateOfBirth);
            }
            if (mappedRow.rankAssignmentDate) {
                mappedRow.rankAssignmentDate = normalizeExcelDate(mappedRow.rankAssignmentDate);
            }

            // ✅ force ALL values to TEXT so "ні" stays "ні"
            Object.keys(mappedRow).forEach((key) => {
                mappedRow[key] =
                    mappedRow[key] !== undefined && mappedRow[key] !== null
                        ? String(mappedRow[key]).trim()
                        : '';
            });

            // ✅ required field check
            if (!mappedRow.fullName?.trim()) {
                console.error(`❌ Skipping row because fullName is missing`, row);
                skippedCount++;
                continue;
            }

            const key = generateUserKey(mappedRow);
            const existing = userLookup.get(key);

            if (existing) {
                // ✅ check if new fields need update
                if (needsUpdate(existing, mappedRow)) {
                    const updatedUser = { ...existing, ...mappedRow, id: existing.id };
                    try {
                        const result = await window.electronAPI.updateUser(updatedUser);
                        userLookup.set(key, result); // refresh cache
                        updatedCount++;
                    } catch (err) {
                        console.error(`❌ Failed to update user: ${existing.fullName}`, err);
                        failedCount++;
                    }
                } else {
                    skippedCount++;
                }
            } else {
                // ✅ create new user
                try {
                    const createdUser = await window.electronAPI.addUser(mappedRow);
                    userLookup.set(key, createdUser);
                    createdCount++;
                } catch (err) {
                    console.error(`❌ Failed to create user for row:`, mappedRow, err);
                    failedCount++;
                }
            }
        }

        // ✅ Show a nice alert after processing
        window.alert(
            `✅ Імпорт завершено!\n\n` +
                `Створено: ${createdCount}\n` +
                `Оновлено: ${updatedCount}\n` +
                `Пропущено: ${skippedCount}\n`,
        );
    };

    return (
        <div className="flex flex-col items-center justify-start h-full p-6 w-full">
            <h1 className="text-2xl font-bold mb-4">Завантаження даних із таблиці</h1>

            <label className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded mb-6">
                Завантажити Excel/CSV
                <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleFileUpload}
                />
            </label>

            {parsedData.length > 0 && (
                <>
                    {/* Import button */}
                    <div className="mt-4 flex gap-4">
                        <button
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                            onClick={handleImportUsers}
                        >
                            ✅ Імпортувати користувачів
                        </button>
                    </div>
                </>
            )}

            {/* ✅ Show DB missing fields */}
            {missingDbFields.length > 0 && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                    ⚠ Деякі поля з таблиці відсутні в базі:{' '}
                    <strong>{missingDbFields.join(', ')}</strong>
                </div>
            )}

            {/* ✅ Show parsed preview */}
            {parsedData.length > 0 && (
                <div className="w-full overflow-auto border p-4 rounded bg-white shadow">
                    <table className="min-w-full text-sm border-collapse border border-gray-300">
                        <thead>
                            <tr>
                                {Object.keys(parsedData[0]).map((key) => (
                                    <th
                                        key={key}
                                        className="border border-gray-300 p-2 bg-gray-100"
                                    >
                                        {key}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {parsedData.map((row, idx) => (
                                <tr key={idx}>
                                    {Object.values(row).map((val, i) => (
                                        <td key={i} className="border border-gray-300 p-2">
                                            {val as string}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
