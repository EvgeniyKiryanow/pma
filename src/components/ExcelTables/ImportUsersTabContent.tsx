import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { HEADER_MAP } from '../../utils/headerMap';
import {
    excelSerialToDate,
    normalizeExcelDate,
    generateUserKey,
    needsUpdate,
} from '../../helpers/csvImports';
import { UploadCloud, Search } from 'lucide-react';

export default function ImportUsersTabContent() {
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [dbColumns, setDbColumns] = useState<string[]>([]);
    const [missingDbFields, setMissingDbFields] = useState<string[]>([]);
    const [existingUsers, setExistingUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const lowerSearch = searchTerm.toLowerCase();

    const visibleColumns =
        parsedData.length > 0
            ? Object.keys(parsedData[0]).filter((header) =>
                  searchTerm.trim() === '' ? true : header.toLowerCase().includes(lowerSearch),
              )
            : [];

    const filteredData =
        parsedData.length > 0
            ? parsedData.filter((row) =>
                  Object.entries(row).some(
                      ([header, val]) =>
                          visibleColumns.includes(header) &&
                          String(val).toLowerCase().includes(lowerSearch),
                  ),
              )
            : [];

    useEffect(() => {
        window.electronAPI.getDbColums().then((cols: string[]) => setDbColumns(cols));
        window.electronAPI.fetchUsers().then((users: any[]) => setExistingUsers(users));
    }, []);

    const mapExcelRowToDb = (row: Record<string, string>): Record<string, string> => {
        const mapped: Record<string, string> = {};
        for (const [excelHeader, value] of Object.entries(row)) {
            const dbField = HEADER_MAP[excelHeader.trim()];
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
                .replace(/[^\p{L}\p{N}]+/gu, '')
                .trim();

        const normExcel = normalize(excelHeader);

        const exact = dbCols.find((col) => normalize(col) === normExcel);
        if (exact) return exact;

        const partial = dbCols.find(
            (col) => normExcel.includes(normalize(col)) || normalize(col).includes(normExcel),
        );
        if (partial) return partial;

        return excelHeader;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

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

            const validHeaders = Object.keys(rawJson[0] || {}).filter(
                (h) => h && !h.startsWith('Unnamed') && !h.startsWith('__EMPTY'),
            );

            const cleanedRows = rawJson.map((row: any) => {
                const mappedRow: Record<string, string> = {};

                validHeaders.forEach((header) => {
                    let val = row[header];
                    if (val === 0 || val === '0' || val == null) val = '';

                    const mappedField = findBestDbColumn(header, dbCols);

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

        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        const userLookup = new Map(existingUsers.map((u) => [generateUserKey(u), u]));

        for (const row of parsedData) {
            const mappedRow = mapExcelRowToDb(row);

            if (mappedRow.dateOfBirth)
                mappedRow.dateOfBirth = normalizeExcelDate(mappedRow.dateOfBirth);
            if (mappedRow.rankAssignmentDate)
                mappedRow.rankAssignmentDate = normalizeExcelDate(mappedRow.rankAssignmentDate);

            Object.keys(mappedRow).forEach((key) => {
                mappedRow[key] =
                    mappedRow[key] !== undefined && mappedRow[key] !== null
                        ? String(mappedRow[key]).trim()
                        : '';
            });

            if (!mappedRow.fullName?.trim()) {
                console.error(`❌ Skipping row because fullName is missing`, row);
                skippedCount++;
                continue;
            }

            const key = generateUserKey(mappedRow);
            const existing = userLookup.get(key);

            if (existing) {
                if (needsUpdate(existing, mappedRow)) {
                    const updatedUser = { ...existing, ...mappedRow, id: existing.id };
                    try {
                        const result = await window.electronAPI.updateUser(updatedUser);
                        userLookup.set(key, result);
                        updatedCount++;
                    } catch (err) {
                        console.error(`❌ Failed to update user: ${existing.fullName}`, err);
                        failedCount++;
                    }
                } else {
                    skippedCount++;
                }
            } else {
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

        window.alert(
            `✅ Імпорт завершено!\n\n` +
                `Створено: ${createdCount}\n` +
                `Оновлено: ${updatedCount}\n` +
                `Пропущено: ${skippedCount}\n`,
        );
        window.location.reload();
    };

    return (
        <div className="flex flex-col items-center justify-start h-full w-full p-8 bg-gray-50">
            {/* Заголовок + опис */}
            <div className="text-center mb-8 max-w-2xl">
                <h1 className="text-3xl font-bold text-gray-800">
                    📊 Завантаження даних із таблиці
                </h1>
                <p className="text-gray-600 mt-2 text-sm">
                    Імпортуйте персональні дані з <strong>Excel</strong> або <strong>CSV</strong>.
                    Система автоматично розпізнає заголовки й покаже попередній перегляд перед
                    імпортом.
                </p>
            </div>

            {/* Зона завантаження файлу */}
            <div className="w-full max-w-xl bg-white border-2 border-dashed border-blue-300 hover:border-blue-500 transition rounded-xl p-8 text-center shadow-sm">
                <p className="text-gray-700 mb-3">
                    Перетягніть сюди файл або натисніть, щоб обрати його вручну
                </p>
                <label className="inline-flex items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-medium shadow transition">
                    <UploadCloud className="w-5 h-5" />
                    Завантажити Excel/CSV
                    <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                </label>
            </div>

            {/* Якщо є дані → кнопка імпорту */}
            {parsedData.length > 0 && (
                <div className="mt-6 flex gap-4">
                    <button
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg shadow-md flex items-center gap-2 transition"
                        onClick={handleImportUsers}
                    >
                        ✅ Імпортувати користувачів
                    </button>
                    <span className="text-gray-500 text-sm self-center">
                        ({parsedData.length} рядків готово до імпорту)
                    </span>
                </div>
            )}

            {/* Попередження про відсутні поля */}
            {missingDbFields.length > 0 && (
                <div className="mt-6 w-full max-w-2xl bg-red-50 border-l-4 border-red-400 p-4 rounded">
                    <p className="text-red-700 font-medium">
                        ⚠ Деякі заголовки з таблиці відсутні в базі:
                    </p>
                    <p className="text-sm text-red-600 mt-1">{missingDbFields.join(', ')}</p>
                </div>
            )}

            {/* Попередній перегляд */}
            {parsedData.length > 0 && (
                <div className="mt-8 w-full bg-white rounded-xl shadow-lg border overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            📄 Попередній перегляд даних
                        </h2>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Пошук по заголовках колонок..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-100 text-sm"
                            />
                        </div>
                        <span className="text-gray-500 text-sm">
                            Показано {visibleColumns.length} колонок з{' '}
                            {Object.keys(parsedData[0]).length}
                        </span>
                    </div>

                    <div className="overflow-auto max-h-[70vh]">
                        <table className="w-full text-sm border-collapse">
                            <thead className="sticky top-0 bg-gray-100 shadow-sm">
                                <tr>
                                    {visibleColumns.map((key) => (
                                        <th
                                            key={key}
                                            className="border border-gray-300 px-3 py-2 text-left text-gray-700 font-medium"
                                        >
                                            {key}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {parsedData.map((row, idx) => (
                                    <tr
                                        key={idx}
                                        className={`transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
                                    >
                                        {visibleColumns.map((colKey) => (
                                            <td
                                                key={colKey}
                                                className="border border-gray-200 px-3 py-2 text-gray-800 whitespace-nowrap"
                                            >
                                                {row[colKey] as string}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
