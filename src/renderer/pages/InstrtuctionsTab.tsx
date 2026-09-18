import {
    Bell,
    ClipboardList,
    DatabaseBackup,
    Edit3,
    FileSpreadsheet,
    FileText,
    FileWarning,
    Keyboard,
    Layers,
    LayoutPanelLeft,
    LifeBuoy,
    Lightbulb,
    Moon,
    RefreshCw,
    Settings,
    Table2,
    UploadCloud,
    UserCircle,
    Users,
    ZoomIn,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { Button, cn, EmptyState, Modal, SearchInput, Tabs } from '../shared/ui';
import PageHeader from '../shared/ui/PageHeader';
import { HEADER_MAP } from '../shared/utils/headerMap';

type HelpTab = 'personnel' | 'reports' | 'excel' | 'backups' | 'interface';

export default function InstructionsTab() {
    const [activeTab, setActiveTab] = useState<HelpTab>('personnel');

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <PageHeader
                title="Довідка"
                description="Коротко про те, як працювати з PManager"
                icon={<LifeBuoy />}
            />
            <div className="shrink-0 border-b border-line bg-surface px-5">
                <Tabs
                    value={activeTab}
                    onChange={setActiveTab}
                    items={[
                        { value: 'personnel', label: 'Особовий склад', icon: <Users /> },
                        { value: 'reports', label: 'Рапорти та шаблони', icon: <FileText /> },
                        { value: 'excel', label: 'Імпорт Excel', icon: <UploadCloud /> },
                        { value: 'backups', label: 'Резервні копії', icon: <DatabaseBackup /> },
                        { value: 'interface', label: 'Інтерфейс', icon: <Settings /> },
                    ]}
                />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div key={activeTab} className="mx-auto max-w-5xl animate-fade-in">
                    {activeTab === 'personnel' && <PersonnelInstructions />}
                    {activeTab === 'reports' && <ReportsInstructions />}
                    {activeTab === 'excel' && <ExcelImportInstructions />}
                    {activeTab === 'backups' && <BackupInstructions />}
                    {activeTab === 'interface' && <InterfaceInstructions />}
                </div>
            </div>
        </div>
    );
}

function Grid({ children }: { children: ReactNode }) {
    return <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>;
}

function InterfaceInstructions() {
    return (
        <div className="space-y-4">
            <Grid>
                <InstructionCard
                    icon={<LayoutPanelLeft />}
                    title="Бічне меню"
                    steps={[
                        'Розділи зібрані в меню ліворуч: «Робота» і «Система»',
                        'Кнопка «Згорнути меню» внизу залишає лише іконки — більше місця для таблиць',
                        'На вузькому вікні меню згортається само',
                        'Внизу меню — ваш обліковий запис: зміна пароля та вихід',
                    ]}
                />
                <InstructionCard
                    icon={<ZoomIn />}
                    title="Масштаб інтерфейсу"
                    steps={[
                        'Кнопки «−» і «+» у верхній панелі роблять усе дрібнішим або більшим',
                        'Вікно при цьому не звужується — просто вміщується більше даних',
                        'Натисніть на відсотки, щоб повернути 100%',
                        'Масштаб запамʼятовується на цьому компʼютері',
                    ]}
                />
                <InstructionCard
                    icon={<Moon />}
                    title="Денна та нічна тема"
                    steps={[
                        'Кнопка з місяцем / сонцем у верхній панелі перемикає тему',
                        'Нічна тема менше втомлює очі в темряві',
                        'Бланки звітів (іменний список, донесення) завжди лишаються «паперовими» — білими',
                    ]}
                />
                <InstructionCard
                    icon={<Bell />}
                    title="Сповіщення у верхній панелі"
                    steps={[
                        'Латунна кнопка з дзвіночком — найближчі події: дні народження, розпорядження, що закінчуються, завершення статусів',
                        'Червона кнопка — записи про зміну статусу без файлу або періоду',
                        'Кнопка «Відкрити картку» у списку веде прямо до потрібної людини',
                    ]}
                />
                <InstructionCard
                    icon={<RefreshCw />}
                    title="Оновлення та перезавантаження"
                    steps={[
                        'Кнопка зі стрілкою вниз перевіряє нові версії програми',
                        'Кругова стрілка перезавантажує вікно, дані при цьому не втрачаються',
                        'Перед оновленням зробіть повну резервну копію',
                    ]}
                />
                <InstructionCard
                    icon={<Lightbulb />}
                    title="Поради"
                    steps={[
                        'Небезпечні дії (видалення, виключення) завжди просять підтвердження',
                        'Результат дій зʼявляється у сповіщеннях у правому нижньому куті',
                        'Якщо щось пішло не так — натисніть «Перезавантажити вікно»',
                    ]}
                />
            </Grid>
            <ShortcutsCard />
        </div>
    );
}

function ShortcutsCard() {
    const rows: [string[], string][] = [
        [['Ctrl', '+'], 'Збільшити інтерфейс'],
        [['Ctrl', '−'], 'Зменшити інтерфейс'],
        [['Ctrl', '0'], 'Звичайний масштаб (100%)'],
        [['Esc'], 'Закрити вікно чи діалог'],
    ];
    return (
        <section className="card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-ink">
                <Keyboard className="size-[18px] text-ink-3" />
                Гарячі клавіші
            </h3>
            <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                {rows.map(([keys, label]) => (
                    <li key={label} className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-ink-2">{label}</span>
                        <span className="flex gap-1">
                            {keys.map((key) => (
                                <kbd key={key} className="kbd">
                                    {key}
                                </kbd>
                            ))}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function ReportsInstructions() {
    return (
        <Grid>
            <InstructionCard
                icon={<FileText />}
                title="Створити рапорт"
                steps={[
                    'Ліворуч оберіть військовослужбовця',
                    'Оберіть шаблон документа (можна переглянути його заздалегідь)',
                    'Натисніть «Створити рапорт» — зʼявиться попередній перегляд',
                    'Перевірте документ і натисніть «Скачати рапорт»',
                ]}
            />
            <InstructionCard
                icon={<UploadCloud />}
                title="Додати шаблон"
                steps={[
                    'Відкрийте вкладку «Додати шаблон»',
                    'Оберіть файл .docx і перевірте попередній перегляд',
                    'Натисніть «Зберегти шаблон»',
                ]}
            />
            <InstructionCard
                icon={<Users />}
                title="Збережені звіти"
                steps={[
                    'Перетягніть файли у вікно або натисніть на зону завантаження',
                    'Шукайте звіти за назвою',
                    'Завантажуйте або видаляйте непотрібні',
                ]}
            />
            <InstructionCard
                icon={<Lightbulb />}
                title="Поради"
                steps={[
                    'Перевіряйте, що обрано правильну людину, перед створенням документа',
                    'Попередній перегляд приблизний — фінальний вигляд у Word може трохи відрізнятися',
                ]}
            />
        </Grid>
    );
}

function PersonnelInstructions() {
    return (
        <Grid>
            <InstructionCard
                icon={<UserCircle />}
                title="Список особового складу"
                steps={[
                    'Шукайте за прізвищем, званням, телефоном чи статусом',
                    'Кольорова крапка біля людини — група її статусу',
                    'Натисніть на людину, щоб відкрити картку; ще раз — щоб закрити',
                    'Список можна згорнути кнопкою над ним',
                ]}
            />
            <InstructionCard
                icon={<ClipboardList />}
                title="Картка військовослужбовця"
                steps={[
                    'Угорі — фото, звання, посада, статус і всі дії',
                    'Нижче — службові та особисті дані, «Показати всі дані» розгортає решту',
                    'Праворуч — історія: зміни статусу, посад, розпорядження, документи',
                    'Фільтри «1 день / 7 днів / Місяць / Увесь час» обмежують історію',
                ]}
            />
            <InstructionCard
                icon={<Edit3 />}
                title="Зміна статусу та записи"
                steps={[
                    'Натисніть «Додати запис» в історії',
                    'Оберіть новий статус, період і додайте файл-підставу',
                    'Без файлу або періоду запис буде позначено червоним — його варто доповнити',
                ]}
            />
            <InstructionCard
                icon={<FileWarning />}
                title="Розпорядження та виключення"
                steps={[
                    '«Подати розпорядження» переводить людину у вкладку «Розпорядження» і прибирає з БЧС',
                    '«Виключити» переносить у «Виключені»',
                    '«Відновити» повертає людину до штату',
                    'Для кожної дії потрібні заголовок, дата і документ-підстава',
                ]}
            />
        </Grid>
    );
}

function BackupInstructions() {
    return (
        <Grid>
            <InstructionCard
                icon={<DatabaseBackup />}
                title="Повна резервна копія"
                steps={[
                    'Розділ «Резервні копії» → «Повна копія»',
                    'Придумайте пароль і збережіть зашифрований файл',
                    'Цим файлом переносять усі дані на інший компʼютер',
                ]}
            />
            <InstructionCard
                icon={<RefreshCw />}
                title="Відновлення"
                steps={[
                    'Оберіть файл копії та введіть пароль',
                    'Програма покаже, що в копії, і лише після підтвердження відновить дані',
                    'Після відновлення потрібно увійти знову',
                ]}
            />
            <InstructionCard
                icon={<Settings />}
                title="Автоматичні копії"
                steps={[
                    'У «Автокопії» задайте, як часто робити копії та скільки зберігати',
                    'Копії лежать у теці даних програми — кнопка «Відкрити теку»',
                ]}
            />
            <InstructionCard
                icon={<Lightbulb />}
                title="Рекомендації"
                steps={[
                    'Зберігайте копії на окремому носії',
                    'Робіть ручну копію перед оновленням програми',
                    'Не передавайте пароль від копії разом із файлом',
                ]}
            />
        </Grid>
    );
}

function ExcelImportInstructions() {
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="space-y-4">
            <Grid>
                <InstructionCard
                    icon={<UploadCloud />}
                    title="Як працює імпорт"
                    steps={[
                        'Можна завантажити один файл — система читає всі листи',
                        'Для кожного листа визначається тип таблиці',
                        'Лист з особовим складом → кнопка «Імпортувати особовий склад»',
                        'Лист зі штатними посадами → кнопка «Імпортувати БЧС»',
                        'Якщо лист не підтримується — кнопки не буде',
                    ]}
                />
                <InstructionCard
                    icon={<FileText />}
                    title="Лист «особовий склад»"
                    steps={[
                        'Має бути колонка з ПІБ',
                        'Обовʼязково — «Дата народження»',
                        'Інші поля (посада, підрозділ, телефон) — за бажанням',
                        'Людина визначається за ПІБ + дата народження',
                    ]}
                />
                <InstructionCard
                    icon={<Layers />}
                    title="Лист «штатні посади»"
                    steps={[
                        'Потрібні всі 5 колонок:',
                        '«Номер по штату», «Підрозділ», «Посада», «Категорія» (кат), «ШПК»',
                        'Якщо хоч однієї немає — лист не вважається БЧС',
                    ]}
                />
                <InstructionCard
                    icon={<Edit3 />}
                    title="Обробка значень"
                    steps={[
                        'Порожні комірки → порожнє значення',
                        'Дати перетворюються у формат РРРР-ММ-ДД, числові дати Excel теж',
                        'Невідомі колонки ігноруються без помилок',
                    ]}
                />
                <InstructionCard
                    icon={<Users />}
                    title="Результат імпорту"
                    steps={[
                        'Особовий склад: існуючі оновлюються, нові створюються',
                        'Штатні посади: нові додаються, існуючі пропускаються',
                        'Підсумок (скільки додано / оновлено / пропущено) зʼявиться у сповіщенні',
                    ]}
                />
                <InstructionCard
                    icon={<Lightbulb />}
                    title="Важливо"
                    steps={[
                        'Завжди переглядайте таблицю перед імпортом',
                        'Великий файл може імпортуватися кілька секунд',
                    ]}
                />
            </Grid>
            <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-success-soft text-success-ink">
                        <FileSpreadsheet className="size-5" />
                    </span>
                    <div>
                        <p className="text-[15px] font-semibold text-ink">
                            Підтримувані заголовки колонок
                        </p>
                        <p className="text-[13px] text-ink-3">
                            Які назви колонок Excel розуміє програма і куди їх записує
                        </p>
                    </div>
                </div>
                <Button
                    variant="secondary"
                    icon={<Table2 className="size-4" />}
                    onClick={() => setShowModal(true)}
                >
                    Переглянути список
                </Button>
            </section>

            {showModal && <HeaderMapModal onClose={() => setShowModal(false)} />}
        </div>
    );
}

function HeaderMapModal({ onClose }: { onClose: () => void }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredHeaders = Object.entries(HEADER_MAP).filter(
        ([excel, db]) =>
            excel.toLowerCase().includes(searchTerm.toLowerCase()) ||
            db.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
        <Modal
            open
            onClose={onClose}
            title="Підтримувані заголовки Excel"
            icon={<FileSpreadsheet />}
            width="max-w-3xl"
            bodyClassName="p-0 flex min-h-0 flex-col"
        >
            <div className="border-b border-line p-4">
                <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Пошук заголовків…"
                    size="sm"
                    autoFocus
                />
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
                {filteredHeaders.length === 0 ? (
                    <EmptyState title="Нічого не знайдено" />
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Заголовок у Excel</th>
                                <th>Поле в базі</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHeaders.map(([excelHeader, dbField]) => (
                                <tr key={excelHeader}>
                                    <td>{excelHeader}</td>
                                    <td className="font-mono text-xs text-primary-ink">
                                        {dbField}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Modal>
    );
}

function InstructionCard({
    icon,
    title,
    steps,
}: {
    icon: ReactNode;
    title: string;
    steps: string[];
}) {
    return (
        <section className="card flex flex-col gap-4 p-5 transition-shadow hover:shadow-pop">
            <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink [&_svg]:size-5">
                    {icon}
                </span>
                <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
            </div>
            <ol className="space-y-2">
                {steps.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-sm leading-relaxed text-ink-2">
                        <span
                            className={cn(
                                'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums',
                                'bg-surface-3 text-ink-3',
                            )}
                        >
                            {idx + 1}
                        </span>
                        <span>{step}</span>
                    </li>
                ))}
            </ol>
        </section>
    );
}
