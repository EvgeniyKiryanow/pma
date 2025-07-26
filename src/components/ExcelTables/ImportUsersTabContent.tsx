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
    const [parsedSheets, setParsedSheets] = useState<Record<string, any[]>>({});
    const [dbColumns, setDbColumns] = useState<string[]>([]);
    const [existingUsers, setExistingUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const lowerSearch = searchTerm.toLowerCase();

    useEffect(() => {
        window.electronAPI.getDbColums().then((cols: string[]) => setDbColumns(cols));
        window.electronAPI.fetchUsers().then((users: any[]) => setExistingUsers(users));
    }, []);

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
            const sheetsData: Record<string, any[]> = {};

            workbook.SheetNames.forEach((sheetName) => {
                const worksheet = workbook.Sheets[sheetName];
                const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                if (rawJson.length === 0) return;

                sheetsData[sheetName] = rawJson; // keep raw rows
            });

            setParsedSheets(sheetsData);
        };
        reader.readAsBinaryString(file);
    };

    /** ✅ Чи є таблиця користувачів */
    const isUsersSheet = (rows: any[]): boolean => {
        if (!rows.length) return false;

        const headers = Object.keys(rows[0]).map((h) => h.toLowerCase().trim());

        const hasFullname = headers.some(
            (h) => h.includes('fullname') || h.includes('full name') || h.includes('піб'),
        );

        const hasLastName = headers.some(
            (h) =>
                h.includes('прізвищ') ||
                h.includes('прізвище') ||
                h.includes('surname') ||
                h.includes('last name'),
        );

        const hasFirstName = headers.some(
            (h) =>
                h.includes('ім’я') ||
                h.includes('імя') ||
                h.includes('firstname') ||
                h.includes('first name') ||
                h.includes("ім'я"),
        );

        const hasDob = headers.some(
            (h) =>
                h.includes('дата народ') ||
                h.includes('date of birth') ||
                h.includes('дн') ||
                h.includes('dob'),
        );

        // ✅ Якщо є fullname і дата народження
        if (hasFullname && hasDob) return true;

        // ✅ Якщо є прізвище + ім’я + дата народження
        if (hasLastName && hasFirstName && hasDob) return true;

        return false;
    };

    /** ✅ Чи є таблиця штатних посад */
    const isShtatniPosadySheet = (rows: any[]): boolean => {
        if (!rows.length) return false;

        const headers = Object.keys(rows[0]).map((h) => h.toLowerCase().trim());

        const hasShtat = headers.some(
            (h) =>
                h.includes('shtat_number') ||
                h.includes('номер по штату') ||
                h.includes('№ по штату') ||
                h.includes('№ штату') ||
                h === 'номер' ||
                h.startsWith('№'),
        );

        const hasUnit = headers.some(
            (h) => h.includes('підрозділ') || h.includes('unit') || h.includes('підр.'),
        );

        const hasPosition = headers.some(
            (h) => h.includes('посада') || h.includes('position') || h.includes('назва посади'),
        );

        const hasCategory = headers.some(
            (h) => h === 'кат' || h.includes('категорія') || h.includes('category'),
        );

        const hasShpk = headers.some(
            (h) => h === 'шпк' || h.includes('shpk') || h.includes('код шпк'),
        );

        // ✅ Має бути всі 5 одночасно
        return hasShtat && hasUnit && hasPosition && hasCategory && hasShpk;
    };

    /** Import штатні посади */
    const handleImportShtatniPosady = async (rows: any[]) => {
        const positions = rows
            .map((row) => {
                // --- Detect shtat_number ---
                const shtat_number =
                    row['shtat_number'] ||
                    row['Номер по штату'] ||
                    row['№ по штату'] ||
                    row['№ штату'] ||
                    row['№'] ||
                    row['номер'] ||
                    '';

                if (!shtat_number || String(shtat_number).trim() === '') return null;

                // --- Detect підрозділ ---
                const unit_name =
                    row['Підрозділ'] ||
                    row['підрозділ'] ||
                    row['unit_name'] ||
                    row['Unit'] ||
                    row['підр.'] ||
                    '';

                // --- Detect посада ---
                const position_name =
                    row['Посада'] ||
                    row['посада'] ||
                    row['position_name'] ||
                    row['Назва посади'] ||
                    row['Посада (повна назва)'] ||
                    row['Position'] ||
                    '';

                // --- Detect category (кат) ---
                const category =
                    row['Кат'] ||
                    row['кат'] ||
                    row['Категорія'] ||
                    row['категорія'] ||
                    row['category'] ||
                    '';

                // --- Detect ШПК ---
                const shpk_code =
                    row['ШПК'] || row['шпк'] || row['shpk_code'] || row['Код ШПК'] || '';

                // ✅ Keep original row as extra_data
                const extra_data = { ...row };

                return {
                    shtat_number: String(shtat_number).trim(),
                    unit_name: String(unit_name || '').trim(),
                    position_name: String(position_name || '').trim(),
                    category: String(category || '').trim(),
                    shpk_code: String(shpk_code || '').trim(),
                    extra_data,
                };
            })
            .filter(Boolean);

        if (!positions.length) {
            alert('⚠️ Не знайдено валідних рядків з номером по штату!');
            return;
        }

        const result = await window.electronAPI.shtatni.import(positions);
        alert(
            `✅ Імпортовано ${result.added} нових позицій\nПропущено ${result.skipped} (вже існували в БД)`,
        );
    };

    /** Import USERS sheet (classic logic) */
    const handleImportUsersSheet = async (rows: any[]) => {
        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        const userLookup = new Map(existingUsers.map((u) => [generateUserKey(u), u]));

        for (const row of rows) {
            // Map Excel row → DB user
            const mappedRow: any = {};
            Object.entries(row).forEach(([header, value]) => {
                const dbField = HEADER_MAP[header.trim()];
                if (!dbField) return;
                let v = value;
                if (dbField === 'dateOfBirth' && !isNaN(Number(value))) {
                    v = excelSerialToDate(Number(value));
                }
                mappedRow[dbField] = String(v ?? '').trim();
            });

            if (!mappedRow.fullName?.trim()) {
                skippedCount++;
                continue;
            }

            const key = generateUserKey(mappedRow);
            const existing = userLookup.get(key);

            if (existing) {
                if (needsUpdate(existing, mappedRow)) {
                    try {
                        const updatedUser = await window.electronAPI.updateUser({
                            ...existing,
                            ...mappedRow,
                            id: existing.id,
                        });
                        userLookup.set(key, updatedUser);
                        updatedCount++;
                    } catch (err) {
                        console.error('❌ Update failed', err);
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
                    console.error('❌ Creation failed', err);
                    failedCount++;
                }
            }
        }

        alert(
            `✅ Імпорт завершено!\n\nСтворено: ${createdCount}\nОновлено: ${updatedCount}\nПропущено: ${skippedCount}`,
        );
    };

    const hasData = Object.keys(parsedSheets).length > 0;

    return (
        <div className="flex flex-col items-center justify-start h-full w-full p-8 bg-gray-50">
            {/* Заголовок + опис */}
            <div className="text-center mb-8 max-w-2xl">
                <h1 className="text-3xl font-bold text-gray-800">📊 Завантаження даних із Excel</h1>
                <p className="text-gray-600 mt-2 text-sm">
                    Імпортуйте персональні дані або штатні посади з усіх листів{' '}
                    <strong>Excel</strong>. Для кожного листа доступна окрема кнопка імпорту.
                </p>
            </div>

            {/* Зона завантаження файлу */}
            <div className="w-full max-w-xl bg-white border-2 border-dashed border-blue-300 hover:border-blue-500 transition rounded-xl p-8 text-center shadow-sm">
                <p className="text-gray-700 mb-3">Перетягніть сюди файл або оберіть його вручну</p>
                <label className="inline-flex items-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-medium shadow transition">
                    <UploadCloud className="w-5 h-5" />
                    Завантажити Excel
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                </label>
            </div>

            {/* Глобальний пошук */}
            {hasData && (
                <div className="relative w-full md:w-72 my-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Пошук по всіх листах..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 focus:border-blue-400 focus:ring focus:ring-blue-100 text-sm"
                    />
                </div>
            )}

            {Object.entries(parsedSheets).map(([sheetName, rows]) => {
                const sheetIsStaff = isShtatniPosadySheet(rows);
                const sheetIsUsers = isUsersSheet(rows);

                const visibleColumns =
                    rows.length > 0
                        ? Object.keys(rows[0]).filter((header) =>
                              searchTerm.trim() === ''
                                  ? true
                                  : header.toLowerCase().includes(lowerSearch),
                          )
                        : [];

                const filteredData =
                    rows.length > 0
                        ? rows.filter((row) =>
                              Object.entries(row).some(
                                  ([header, val]) =>
                                      visibleColumns.includes(header) &&
                                      String(val).toLowerCase().includes(lowerSearch),
                              ),
                          )
                        : [];

                return (
                    <div
                        key={sheetName}
                        className="mt-8 w-full bg-white rounded-xl shadow-lg border overflow-hidden"
                    >
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-800">
                                📄 Лист: {sheetName} ({filteredData.length}/{rows.length} рядків)
                            </h2>

                            <div className="flex gap-3">
                                {sheetIsStaff && (
                                    <button
                                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-md transition"
                                        onClick={() => handleImportShtatniPosady(rows)}
                                    >
                                        ✅ Імпортувати штатні посади
                                    </button>
                                )}

                                {sheetIsUsers && (
                                    <button
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-md transition"
                                        onClick={() => handleImportUsersSheet(rows)}
                                    >
                                        ✅ Імпортувати користувачів
                                    </button>
                                )}

                                {!sheetIsStaff && !sheetIsUsers && (
                                    <span className="text-gray-400 italic text-sm">
                                        ❌ Цей лист не підтримується для імпорту
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Попередній перегляд */}
                        <div className="overflow-auto max-h-[60vh]">
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
                                    {filteredData.map((row, idx) => (
                                        <tr
                                            key={idx}
                                            className={`transition ${
                                                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                            } hover:bg-blue-50`}
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
                );
            })}
        </div>
    );
}
