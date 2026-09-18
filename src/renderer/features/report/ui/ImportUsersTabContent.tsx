import { FileSpreadsheet, ListTree, Sheet, UploadCloud, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

import {
    excelSerialToDate,
    generateUserKey,
    needsUpdate,
} from '../../../../shared/helpers/csvImports';
import { useShtatniStore } from '../../../entities/shtatna-posada/model/useShtatniStore';
import { errorMessage } from '../../../shared/api/call';
import { Badge, Button, cn, SearchInput } from '../../../shared/ui';
import { toast } from '../../../shared/ui/toast';
import { HEADER_MAP } from '../../../shared/utils/headerMap';
import { useI18nStore } from '../../../stores/i18nStore';
import { useUserStore } from '../../../stores/userStore';

export default function ImportUsersTabContent() {
    const [parsedSheets, setParsedSheets] = useState<Record<string, any[]>>({});
    const [dbColumns, setDbColumns] = useState<string[]>([]);
    const [existingUsers, setExistingUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [fileName, setFileName] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [busySheet, setBusySheet] = useState<string | null>(null);

    const lowerSearch = searchTerm.toLowerCase();

    useEffect(() => {
        // Import of staffing positions only does not require access to personnel data.
        window.electronAPI
            .getDbColumns()
            .then((cols: string[]) => setDbColumns(cols))
            .catch(() => setDbColumns([]));
        window.electronAPI
            .fetchUsersMetadata()
            .then((users: any[]) => setExistingUsers(users))
            .catch(() => setExistingUsers([]));
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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) void loadWorkbook(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && /\.xlsx?$/i.test(file.name)) void loadWorkbook(file);
        else if (file) toast.warning('Підтримуються лише файли Excel (.xlsx, .xls)');
    };

    /** Runs a sheet import with a busy indicator on its button. */
    const runImport = async (sheetName: string, work: () => Promise<void>) => {
        setBusySheet(sheetName);
        try {
            await work();
        } finally {
            setBusySheet(null);
        }
    };

    const loadWorkbook = async (file: File) => {
        setFileName(file.name);
        const dbCols = await window.electronAPI.getDbColumns();
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
            (h) =>
                h.includes('fullname') ||
                h.includes('full name') ||
                h.includes('піб') ||
                h.includes('ПІБ'),
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

        // Headers are already lower-cased here, so comparing against "Дата народ" never
        // matched and a normal table with "ПІБ" + "Дата народження" was not recognized.
        const hasDob = headers.some((h) => {
            const compact = h.replace(/[\s.]+/g, '');
            return (
                compact.includes('датанарод') ||
                compact.includes('dateofbirth') ||
                compact.includes('dob') ||
                compact === 'дн'
            );
        });

        // ✅ Якщо є fullname і дата народження
        if (hasFullname && hasDob) return true;

        // ✅ Якщо є прізвище + ім’я + дата народження
        // if (hasLastName && hasFirstName && hasDob) return true;

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
            toast.warning('Не знайдено рядків з номером по штату');
            return;
        }

        try {
            // Through the store, so the БЧС tab and tables update without reloading the window.
            const result = await useShtatniStore.getState().importFromExcel(positions);
            toast.success(
                `БЧС імпортовано: нових позицій ${result.added}\nПропущено ${result.skipped} (вже були в базі)`,
            );
        } catch (err) {
            toast.error(
                `Не вдалося імпортувати БЧС: ${errorMessage(err, useI18nStore.getState().t)}`,
            );
        }
    };

    /** Import USERS sheet (classic logic) */
    const handleImportUsersSheet = async (rows: any[]) => {
        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        // Fresh list: people created by an earlier import in this session must be matched too.
        const currentUsers: any[] = await window.electronAPI
            .fetchUsersMetadata()
            .catch(() => existingUsers);
        const userLookup = new Map(currentUsers.map((u) => [generateUserKey(u), u]));

        for (const row of rows) {
            const mappedRow: any = {};

            Object.entries(row).forEach(([header, value]) => {
                const dbField = HEADER_MAP[header.trim()];
                if (!dbField) return;

                const strVal = String(value ?? '').trim();

                // ❌ Skip if truly empty OR Excel fake zero
                if (!strVal || strVal === '0') return;

                let v = strVal;

                // ✅ Only convert Excel date serials if it's a valid > 0 number
                if (dbField === 'dateOfBirth') {
                    const numVal = Number(value);
                    if (!isNaN(numVal) && numVal > 0) {
                        v = excelSerialToDate(numVal);
                    }
                }
                if (dbField === 'rankAssignmentDate') {
                    const numVal = Number(value);
                    if (!isNaN(numVal) && numVal > 0) {
                        v = excelSerialToDate(numVal);
                    }
                }

                mappedRow[dbField] = v;
            });

            // ✅ REQUIRE some mandatory fields
            const hasName = mappedRow.fullName?.trim();
            const hasDob = mappedRow.dateOfBirth?.trim();
            const hasPhone = mappedRow.phoneNumber?.trim();

            // ❌ If NO fullName → skip entirely
            if (!hasName) {
                skippedCount++;
                continue;
            }
            if (!hasDob) {
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

        await useUserStore.getState().fetchUsers();
        const summary =
            `Імпорт завершено.\nСтворено: ${createdCount} · Оновлено: ${updatedCount} · Пропущено: ${skippedCount}` +
            (failedCount ? `\nПомилки: ${failedCount} (немає прав або некоректні дані)` : '');
        if (failedCount) toast.warning(summary);
        else toast.success(summary);
    };

    const hasData = Object.keys(parsedSheets).length > 0;

    return (
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="mx-auto max-w-6xl space-y-5">
                <label
                    onDrop={handleDrop}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    className={cn(
                        'relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
                        dragOver
                            ? 'border-primary bg-primary-soft'
                            : 'border-line-strong bg-surface hover:border-primary hover:bg-primary-soft',
                    )}
                >
                    <div className="topo absolute inset-0 text-primary opacity-[0.06]" />
                    <span className="relative grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-ink">
                        <UploadCloud className="size-7" />
                    </span>
                    <span className="relative text-[15px] font-semibold text-ink">
                        {fileName || 'Перетягніть файл Excel сюди або натисніть, щоб обрати'}
                    </span>
                    <span className="relative max-w-xl text-[13px] leading-relaxed text-ink-3">
                        Система прочитає всі листи й сама визначить їх тип. Для кожного листа —
                        окрема кнопка імпорту.
                    </span>
                    <span className="relative mt-2 flex flex-wrap justify-center gap-2 text-xs">
                        <Badge tone="olive">
                            <Users className="size-3.5" /> ПІБ + дата народження → особовий склад
                        </Badge>
                        <Badge tone="brass">
                            <ListTree className="size-3.5" /> № по штату, підрозділ, посада, кат,
                            ШПК → БЧС
                        </Badge>
                    </span>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                </label>

                {hasData && (
                    <SearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Пошук по всіх листах…"
                        className="max-w-sm"
                    />
                )}

                {Object.entries(parsedSheets).map(([sheetName, rows]) => {
                    const sheetIsStaff = isShtatniPosadySheet(rows);
                    const sheetIsUsers = isUsersSheet(rows);
                    const staffKey = `${sheetName}:staff`;
                    const usersKey = `${sheetName}:users`;

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
                        <section key={sheetName} className="card overflow-hidden">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-success-soft text-success-ink">
                                        <Sheet className="size-[18px]" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-ink">
                                            {sheetName}
                                        </p>
                                        <p className="text-xs text-ink-3">
                                            {filteredData.length} з {rows.length} рядків
                                        </p>
                                    </div>
                                    {sheetIsUsers && <Badge tone="olive">Особовий склад</Badge>}
                                    {sheetIsStaff && <Badge tone="brass">БЧС</Badge>}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {sheetIsStaff && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            loading={busySheet === staffKey}
                                            disabled={busySheet !== null}
                                            icon={<ListTree className="size-4" />}
                                            onClick={() =>
                                                void runImport(staffKey, () =>
                                                    handleImportShtatniPosady(rows),
                                                )
                                            }
                                        >
                                            Імпортувати БЧС
                                        </Button>
                                    )}
                                    {sheetIsUsers && (
                                        <Button
                                            size="sm"
                                            loading={busySheet === usersKey}
                                            disabled={busySheet !== null}
                                            icon={<Users className="size-4" />}
                                            onClick={() =>
                                                void runImport(usersKey, () =>
                                                    handleImportUsersSheet(rows),
                                                )
                                            }
                                        >
                                            Імпортувати особовий склад
                                        </Button>
                                    )}
                                    {!sheetIsStaff && !sheetIsUsers && (
                                        <span className="inline-flex items-center gap-1.5 text-xs text-ink-3">
                                            <FileSpreadsheet className="size-4" />
                                            Цей лист не підтримується для імпорту
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="max-h-[60vh] overflow-auto">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            {visibleColumns.map((key) => (
                                                <th key={key}>{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.map((row, idx) => (
                                            <tr key={idx}>
                                                {visibleColumns.map((colKey) => (
                                                    <td key={colKey} className="whitespace-nowrap">
                                                        {row[colKey] as string}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
