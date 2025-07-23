import { useState } from 'react';
import {
    FileText,
    Users,
    UploadCloud,
    Info,
    Lightbulb,
    UserCircle,
    ClipboardList,
    Edit3,
    Download,
    RefreshCw,
    Settings,
    RotateCcw,
    Minus,
    X,
    Upload,
    Trash2,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { HEADER_MAP } from '../utils/headerMap';

export default function InstructionsTab() {
    const [activeTab, setActiveTab] = useState<
        'reports' | 'personnel' | 'backups' | 'header' | 'excel'
    >('reports');

    return (
        <div className="h-full w-full bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b bg-white flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                    <Info className="w-6 h-6 text-blue-500" />
                    Інструкції по використанню системи
                </h1>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b bg-white text-sm font-medium">
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-6 py-3 flex items-center gap-2 transition ${
                        activeTab === 'reports'
                            ? 'border-b-2 border-blue-600 text-blue-700'
                            : 'text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <FileText className="w-4 h-4" /> Звіти та шаблони
                </button>

                <button
                    onClick={() => setActiveTab('personnel')}
                    className={`px-6 py-3 flex items-center gap-2 transition ${
                        activeTab === 'personnel'
                            ? 'border-b-2 border-blue-600 text-blue-700'
                            : 'text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <Users className="w-4 h-4" /> Управління персоналом
                </button>

                <button
                    onClick={() => setActiveTab('backups')}
                    className={`px-6 py-3 flex items-center gap-2 transition ${
                        activeTab === 'backups'
                            ? 'border-b-2 border-blue-600 text-blue-700'
                            : 'text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <Download className="w-4 h-4" /> Резервні копії
                </button>

                <button
                    onClick={() => setActiveTab('header')}
                    className={`px-6 py-3 flex items-center gap-2 transition ${
                        activeTab === 'header'
                            ? 'border-b-2 border-blue-600 text-blue-700'
                            : 'text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <Settings className="w-4 h-4" /> Верхня панель
                </button>
                <button
                    onClick={() => setActiveTab('excel')}
                    className={`px-6 py-3 flex items-center gap-2 transition ${
                        activeTab === 'excel'
                            ? 'border-b-2 border-blue-600 text-blue-700'
                            : 'text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <UploadCloud className="w-4 h-4" /> Імпорт Excel/CSV
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                {activeTab === 'reports' && <ReportsInstructions />}
                {activeTab === 'personnel' && <PersonnelInstructions />}
                {activeTab === 'backups' && <BackupInstructions />}
                {activeTab === 'header' && <HeaderInstructions />}
                {activeTab === 'excel' && <ExcelImportInstructions />}
            </div>
        </div>
    );
}

/* ---------------------------
   HEADER (TITLE BAR) INSTRUCTIONS TAB
----------------------------*/
function HeaderInstructions() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InstructionCard
                icon={<Download className="w-8 h-8 text-blue-500" />}
                title="Перевірка оновлень"
                steps={[
                    'Натисніть кнопку зі стрілкою вниз, щоб перевірити нові версії',
                    'При наявності оновлень вони автоматично завантажуються',
                    'Рекомендується робити резервну копію перед оновленням',
                ]}
            />
            <InstructionCard
                icon={<Upload className="w-8 h-8 text-green-500" />}
                title="Відновлення даних"
                steps={[
                    'Натисніть кнопку із хмарою зі стрілкою вверх',
                    'Оберіть резервну копію для відновлення',
                    'Після успішного відновлення додаток перезапуститься',
                ]}
            />
            <InstructionCard
                icon={<Trash2 className="w-8 h-8 text-red-500" />}
                title="Скидання бази даних"
                steps={[
                    'Натисніть кнопку з іконкою смітника',
                    'Підтвердіть дію – усі дані будуть видалені',
                    'Додаток автоматично перезапуститься з чистою базою',
                ]}
            />
            <InstructionCard
                icon={<RotateCcw className="w-8 h-8 text-orange-500" />}
                title="Перезавантаження програми"
                steps={[
                    'Натисніть кнопку із круговою стрілкою',
                    'Інтерфейс перезапуститься без втрати даних',
                ]}
            />
            <InstructionCard
                icon={<Minus className="w-8 h-8 text-gray-500" />}
                title="Згортання в трей"
                steps={[
                    'Натисніть кнопку з мінусом',
                    'Додаток згорнеться у трей, але продовжить працювати',
                ]}
            />
            <InstructionCard
                icon={<X className="w-8 h-8 text-gray-700" />}
                title="Закриття програми"
                steps={['Натисніть кнопку з хрестиком', 'Програма завершить роботу']}
            />
            <InstructionCard
                icon={<Lightbulb className="w-8 h-8 text-yellow-500" />}
                title="Поради по верхній панелі"
                steps={[
                    'Перед оновленням чи скиданням робіть резервну копію',
                    'Якщо програма зависла – натисніть «Перезавантажити»',
                    'Закривайте додаток лише після збереження усіх даних',
                ]}
            />
        </div>
    );
}

/* ---------------------------
   OTHER EXISTING TABS REMAIN
----------------------------*/
function ReportsInstructions() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InstructionCard
                icon={<FileText className="w-8 h-8 text-blue-600" />}
                title="Збережені шаблони"
                steps={[
                    'Перегляньте список доступних шаблонів',
                    'Оберіть користувача, чиї дані будуть вставлені',
                    'Згенеруйте документ та завантажте його',
                ]}
            />
            <InstructionCard
                icon={<Users className="w-8 h-8 text-green-600" />}
                title="Ваші збережені звіти"
                steps={[
                    'Перетягніть файли у вікно або натисніть «browse»',
                    'Шукайте звіти за назвою',
                    'Завантажуйте або видаляйте непотрібні',
                ]}
            />
            <InstructionCard
                icon={<UploadCloud className="w-8 h-8 text-purple-600" />}
                title="Завантаження нових шаблонів"
                steps={[
                    'Натисніть «Завантажити шаблон»',
                    'Перегляньте PDF-превʼю перед збереженням',
                    'Збережіть шаблон у вашу базу',
                ]}
            />
            <InstructionCard
                icon={<Lightbulb className="w-8 h-8 text-yellow-500" />}
                title="Поради"
                steps={[
                    'Оберіть правильного користувача перед генерацією документа',
                    'Використовуйте пошук, щоб швидко знайти потрібний звіт',
                    'Шаблони автоматично зберігаються після завантаження',
                ]}
            />
        </div>
    );
}

function PersonnelInstructions() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InstructionCard
                icon={<UserCircle className="w-8 h-8 text-blue-500" />}
                title="Список персоналу"
                steps={[
                    'Використовуйте пошук для фільтрації персоналу',
                    'Клікніть по користувачу, щоб переглянути детальну інформацію',
                    'Переглядайте ранги, посади, контакти та інші дані',
                ]}
            />
            <InstructionCard
                icon={<ClipboardList className="w-8 h-8 text-green-500" />}
                title="Детальна інформація"
                steps={[
                    'Переглядайте особисту інформацію, військові дані, родичів',
                    'Додавайте історію, коментарі та оновлюйте дані',
                    'Видаляйте користувача за потреби',
                ]}
            />
            <InstructionCard
                icon={<Edit3 className="w-8 h-8 text-orange-500" />}
                title="Редагування та додавання користувачів"
                steps={[
                    'Натисніть «Редагувати», щоб змінити існуючі дані',
                    'Додавайте фото, контакти, військові дані, родичів',
                    'Збережіть зміни або додайте нового користувача',
                ]}
            />
            <InstructionCard
                icon={<Lightbulb className="w-8 h-8 text-yellow-500" />}
                title="Поради по роботі з персоналом"
                steps={[
                    'Слідкуйте за оновленнями та правами доступу',
                    'Зберігайте актуальні дані про родичів та військовий статус',
                    'Використовуйте коментарі для важливих заміток',
                ]}
            />
        </div>
    );
}

function BackupInstructions() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InstructionCard
                icon={<Download className="w-8 h-8 text-green-600" />}
                title="Створення резервної копії"
                steps={[
                    'Натисніть кнопку «Завантажити резервну копію»',
                    'Файл з базою даних буде збережений на ваш компʼютер',
                    'Рекомендується робити копії перед оновленням або змінами',
                ]}
            />
            <InstructionCard
                icon={<RefreshCw className="w-8 h-8 text-orange-500" />}
                title="Відновлення даних"
                steps={[
                    'Натисніть «Відновити з резервної копії»',
                    'Оберіть файл резервної копії, який хочете відновити',
                    'Після відновлення система перезапуститься',
                ]}
            />
            <InstructionCard
                icon={<Settings className="w-8 h-8 text-blue-500" />}
                title="Автоматичне резервне копіювання"
                steps={[
                    'У вкладці «Налаштування» задайте частоту автозбережень',
                    'Файли автоматично створюються в обрану директорію',
                    'Ви можете змінити директорію у налаштуваннях',
                ]}
            />
            <InstructionCard
                icon={<Lightbulb className="w-8 h-8 text-yellow-500" />}
                title="Рекомендації"
                steps={[
                    'Зберігайте резервні копії на окремому носії або у хмарі',
                    'Регулярно перевіряйте автозбереження',
                    'Перед оновленнями завжди створюйте ручну копію',
                ]}
            />
        </div>
    );
}
function ExcelImportInstructions() {
    const [showModal, setShowModal] = useState(false);

    return (
        <div className="flex flex-col gap-6">
            {/* Instruction Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InstructionCard
                    icon={<UploadCloud className="w-8 h-8 text-blue-500" />}
                    title="Як працює імпорт Excel/CSV?"
                    steps={[
                        'При завантаженні файлу обробляється тільки перший лист',
                        'Стовпці без заголовків («Unnamed») ігноруються',
                        'Якщо заголовок не відповідає відомим полям → також ігнорується',
                        'Відомі заголовки шукаються через HEADER_MAP і конвертуються у поля БД',
                    ]}
                />
                <InstructionCard
                    icon={<FileText className="w-8 h-8 text-green-600" />}
                    title="Обробка заголовків"
                    steps={[
                        'Заголовки порівнюються без пробілів/розділових знаків',
                        'Якщо назва відповідає карті полів – вона імпортується',
                        'Наприклад, «ПІБ» → fullName, «Дата народження» → dateOfBirth',
                        'Тестові або зайві заголовки («Тестовий хедер») просто пропускаються',
                    ]}
                />

                <InstructionCard
                    icon={<Edit3 className="w-8 h-8 text-orange-500" />}
                    title="Обробка значень"
                    steps={[
                        'Порожні значення конвертуються у порожній рядок',
                        'Дати автоматично конвертуються у формат YYYY-MM-DD',
                        'Числові дати з Excel (серійні номери) теж розпізнаються',
                        'Будь-який текст («ні», «так», «є») зберігається без змін',
                    ]}
                />

                <InstructionCard
                    icon={<Users className="w-8 h-8 text-purple-600" />}
                    title="Як визначаються нові/існуючі користувачі?"
                    steps={[
                        'Унікальний ключ формується з ПІБ + дата народження',
                        'Якщо такий користувач існує – його дані оновлюються',
                        'Якщо користувач не знайдений – створюється новий',
                        'Якщо ПІБ відсутній – рядок пропускається',
                    ]}
                />

                <InstructionCard
                    icon={<Lightbulb className="w-8 h-8 text-yellow-500" />}
                    title="Що ще важливо знати?"
                    steps={[
                        'Формат дат може бути будь-який – система намагається розпізнати',
                        'Невідомі колонки не викликають помилок – вони просто ігноруються',
                        'Завжди перевіряйте попередній перегляд перед імпортом',
                        'Після імпорту показується підсумок: скільки створено/оновлено/пропущено',
                    ]}
                />
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow transition"
                >
                    HEADER_MAP(Види заголовків)
                </button>
            </div>

            {/* Modal with search */}
            {showModal && <HeaderMapModal onClose={() => setShowModal(false)} />}
        </div>
    );
}

function HeaderMapModal({ onClose }: { onClose: () => void }) {
    const [searchTerm, setSearchTerm] = useState('');

    const headers = Object.entries(HEADER_MAP);

    const filteredHeaders = headers.filter(
        ([excel, db]) =>
            excel.toLowerCase().includes(searchTerm.toLowerCase()) ||
            db.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-100/70 to-gray-300/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-3xl max-h-[80%] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">
                        📄 Підтримувані заголовки Excel
                    </h2>
                    <button onClick={onClose} className="p-2 rounded hover:bg-gray-100 transition">
                        ✖
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b">
                    <input
                        type="text"
                        placeholder="🔍 Пошук заголовків..."
                        className="w-full border rounded-lg px-4 py-2 text-sm focus:ring focus:ring-blue-300 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="min-w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border px-4 py-2 text-left">Заголовок у Excel</th>
                                <th className="border px-4 py-2 text-left">Поле в БД</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHeaders.map(([excelHeader, dbField]) => (
                                <tr key={excelHeader} className="hover:bg-gray-50">
                                    <td className="border px-4 py-2">{excelHeader}</td>
                                    <td className="border px-4 py-2 text-blue-700">{dbField}</td>
                                </tr>
                            ))}
                            {filteredHeaders.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={2}
                                        className="text-center text-gray-500 py-4 italic"
                                    >
                                        Нічого не знайдено...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700"
                    >
                        Закрити
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ---------------------------
   SHARED CARD
----------------------------*/
function InstructionCard({
    icon,
    title,
    steps,
}: {
    icon: React.ReactNode;
    title: string;
    steps: string[];
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col gap-3 hover:shadow-md transition">
            <div className="flex items-center gap-3">
                {icon}
                <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            </div>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                {steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                ))}
            </ul>
        </div>
    );
}
