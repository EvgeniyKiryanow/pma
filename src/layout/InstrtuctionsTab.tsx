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
} from 'lucide-react';

export default function InstructionsTab() {
    const [activeTab, setActiveTab] = useState<'reports' | 'personnel' | 'backups'>('reports');

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
            </div>

            {/* Tab Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                {activeTab === 'reports' && <ReportsInstructions />}
                {activeTab === 'personnel' && <PersonnelInstructions />}
                {activeTab === 'backups' && <BackupInstructions />}
            </div>
        </div>
    );
}

/* ---------------------------
   REPORTS INSTRUCTIONS TAB
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

/* ---------------------------
   PERSONNEL INSTRUCTIONS TAB
----------------------------*/
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

/* ---------------------------
   BACKUP INSTRUCTIONS TAB
----------------------------*/
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

/* ---------------------------
   SHARED CARD COMPONENT
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
