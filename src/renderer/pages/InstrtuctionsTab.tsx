import {
    ArrowRightLeft,
    DatabaseBackup,
    Edit3,
    FilePlus,
    FileSpreadsheet,
    KeyRound,
    LifeBuoy,
    ListTree,
    Lock,
    MonitorCog,
    Paperclip,
    Send,
    Sheet,
    ShieldCheck,
    Table2,
    Trash2,
    UploadCloud,
    UserCog,
    UserPlus,
    Users,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

import { Button, EmptyState, Modal, SearchInput } from '../shared/ui';
import PageHeader from '../shared/ui/PageHeader';
import { HEADER_MAP } from '../shared/utils/headerMap';

/**
 * «Довідка»: short answers to "how do I…", written for people who would rather not learn a
 * program. Every step names the button exactly as it appears on screen; keep them in sync
 * when a label changes.
 */

type GroupId = 'daily' | 'reports' | 'data';

type Topic = {
    id: string;
    group: GroupId;
    icon: ReactNode;
    title: string;
    steps: string[];
    tip?: string;
    /** Other words people may type into the search. */
    keywords?: string;
    /** Opens the list of Excel column names. */
    showsHeaderMap?: boolean;
};

const GROUPS: { id: GroupId; title: string }[] = [
    { id: 'daily', title: 'Щоденна робота' },
    { id: 'reports', title: 'Звіти та Excel' },
    { id: 'data', title: 'Дані, паролі, безпека' },
];

const OVERVIEW: { icon: ReactNode; title: string; text: string }[] = [
    { icon: <Users />, title: 'Особовий склад', text: 'Картки людей: дані, статус, документи' },
    { icon: <ListTree />, title: 'БЧС', text: 'Штатні посади: хто на якій посаді' },
    {
        icon: <Sheet />,
        title: 'Таблиці та Excel',
        text: 'Завантажити список з Excel і зробити звіт',
    },
    {
        icon: <DatabaseBackup />,
        title: 'Резервні копії',
        text: 'Зберегти всі дані у файл або перенести на інший компʼютер',
    },
];

const TOPICS: Topic[] = [
    {
        id: 'status',
        group: 'daily',
        icon: <Edit3 />,
        title: 'Змінити статус (відпустка, шпиталь, відрядження…)',
        steps: [
            'Відкрийте «Особовий склад» і натисніть на людину',
            'Праворуч, в «Історії», натисніть «Додати запис»',
            'Оберіть новий статус, дати «з» і «по», прикріпіть документ',
            'Натисніть «Зберегти запис»',
        ],
        tip: 'Статус оновиться всюди: у картці, у БЧС і у звітах.',
        keywords: 'статус відпустка лікарня шпиталь відрядження поранення історія запис',
    },
    {
        id: 'document',
        group: 'daily',
        icon: <Paperclip />,
        title: 'Додати документ людині (наказ, рапорт, довідку)',
        steps: [
            'Відкрийте картку людини',
            'Натисніть «Додати запис», потім «Прикріпити файли» і оберіть файл',
            'Натисніть «Зберегти запис»',
        ],
        tip: 'Файл зберігається всередині програми. Відкрити його можна з історії людини.',
        keywords: 'файл документ наказ скан фото вкладення прикріпити',
    },
    {
        id: 'add-person',
        group: 'daily',
        icon: <UserPlus />,
        title: 'Додати нову людину',
        steps: [
            'Відкрийте «Особовий склад» і натисніть «Додати військовослужбовця» (вгорі праворуч)',
            'Заповніть ПІБ і дату народження, решту — якщо знаєте',
            'Натисніть «Додати»',
        ],
        tip: 'Багато людей одразу простіше завантажити з Excel — див. «Завантажити БЧС або список людей з Excel».',
        keywords: 'новий боєць військовослужбовець створити картку',
    },
    {
        id: 'edit-person',
        group: 'daily',
        icon: <UserCog />,
        title: 'Виправити дані людини',
        steps: [
            'Відкрийте картку людини і натисніть «Редагувати»',
            'Виправте потрібне і натисніть «Зберегти»',
        ],
        keywords: 'змінити телефон звання посада адреса помилка',
    },
    {
        id: 'position',
        group: 'daily',
        icon: <ListTree />,
        title: 'Поставити людину на посаду',
        steps: [
            'Відкрийте «БЧС»',
            'Знайдіть посаду через пошук угорі',
            'У колонці «Призначений військовослужбовець» оберіть людину зі списку',
        ],
        tip: 'Щоб звільнити посаду, оберіть у тому ж списку «✖ Зняти з посади».',
        keywords: 'бчс штат посада призначити вакантна звільнити',
    },
    {
        id: 'orders',
        group: 'daily',
        icon: <Send />,
        title: 'Розпорядження, виключення, повернення',
        steps: [
            'У картці людини натисніть «Подати розпорядження» або «Виключити»',
            'Вкажіть дату, заголовок і додайте документ-підставу',
            'Людина переходить у вкладку «Розпорядження» або «Виключені» і зникає з БЧС',
            'Щоб повернути: відкрийте її у вкладці «Розпорядження» і натисніть «Відновити»',
        ],
        keywords: 'розпорядження виключити виключені відновити повернути',
    },
    {
        id: 'report',
        group: 'reports',
        icon: <FileSpreadsheet />,
        title: 'Зробити звіт для командира',
        steps: [
            'Відкрийте «Таблиці та Excel», вкладка «Згенеровані таблиці»',
            'Оберіть звіт: «Альтернативний звіт», «Штатний звіт» або «Іменний список»',
            'Перевірте цифри і натисніть «Експорт у Excel»',
        ],
        tip: 'Цифри рахуються самі з карток людей і БЧС. В «Альтернативному звіті» натисніть на число — побачите, хто саме там, і зможете змінити статус.',
        keywords: 'звіт донесення альтернативний штатний іменний список табель excel експорт',
    },
    {
        id: 'import',
        group: 'reports',
        icon: <UploadCloud />,
        title: 'Завантажити БЧС або список людей з Excel',
        steps: [
            'Відкрийте «Таблиці та Excel», вкладка «Імпорт з Excel»',
            'Перетягніть файл Excel у вікно або натисніть і оберіть його',
            'Біля потрібного листа натисніть «Імпортувати БЧС» (посади) або «Імпортувати особовий склад» (люди)',
        ],
        tip: 'Для людей потрібні ПІБ і дата народження. Для БЧС — «Номер по штату», «Підрозділ», «Посада», «Категорія», «ШПК». Людей, які вже є, програма не задвоює — лише оновлює їхні дані.',
        keywords: 'excel імпорт завантажити бчс список таблиця xlsx',
        showsHeaderMap: true,
    },
    {
        id: 'templates',
        group: 'reports',
        icon: <FilePlus />,
        title: 'Додати шаблон документа',
        steps: [
            'Відкрийте «Рапорти», вкладка «Додати шаблон»',
            'Оберіть файл Word (.docx) і перевірте, як він виглядає',
            'Натисніть «Зберегти шаблон»',
        ],
        keywords: 'шаблон word docx рапорт бланк',
    },
    {
        id: 'backup',
        group: 'data',
        icon: <DatabaseBackup />,
        title: 'Зберегти всі дані на флешку',
        steps: [
            'Відкрийте «Резервні копії», вкладка «Повна копія»',
            'Придумайте пароль (не менше 8 символів) і запишіть його',
            'Натисніть «Зберегти копію…» і оберіть флешку',
        ],
        tip: 'Без пароля копію не відкриє ніхто — навіть ви. Робіть копію хоча б раз на тиждень.',
        keywords: 'копія резервна флешка зберегти бекап',
    },
    {
        id: 'transfer',
        group: 'data',
        icon: <ArrowRightLeft />,
        title: 'Перенести все на інший компʼютер',
        steps: [
            'На старому компʼютері збережіть повну копію (див. «Зберегти всі дані на флешку»)',
            'На новому встановіть PManager і на першому екрані натисніть «Відновити з резервної копії»',
            'Оберіть файл, введіть пароль, натисніть «Перевірити копію», потім «Відновити дані»',
            'Увійдіть тим самим логіном і паролем, що й на старому компʼютері',
        ],
        tip: 'Переносяться всі люди, історія, документи, БЧС і користувачі. Копіювати папки програми вручну не треба — так дані не відкриються, бо вони зашифровані.',
        keywords: 'перенести інший компʼютер ноутбук відновити копія',
    },
    {
        id: 'lock',
        group: 'data',
        icon: <Lock />,
        title: 'Програма сама попросила увійти знову',
        steps: [
            'Це захист: якщо програмою не користуватись кілька хвилин або заблокувати Windows, дані ховаються',
            'Введіть свій пароль — усе збережене на місці',
        ],
        tip: 'Через скільки хвилин блокувати, налаштовує адміністратор: «Адміністрування» → «Безпека».',
        keywords: 'блокування заблокувалась вхід пароль знову вийшла',
    },
    {
        id: 'password',
        group: 'data',
        icon: <KeyRound />,
        title: 'Забули пароль',
        steps: [
            'На екрані входу натисніть «Забули пароль?»',
            'Введіть логін і код відновлення (його показали один раз, коли створювали обліковий запис)',
            'Немає коду — попросіть адміністратора: «Адміністрування» → «Користувачі» → «Скинути пароль»',
        ],
        keywords: 'пароль забув код відновлення вхід',
    },
    {
        id: 'users',
        group: 'data',
        icon: <UserPlus />,
        title: 'Додати користувача програми (писаря, командира)',
        steps: [
            'Відкрийте «Адміністрування» → «Користувачі» → «Додати користувача»',
            'Вкажіть логін, роль і тимчасовий пароль',
            'Передайте пароль особисто — під час першого входу людина задасть свій',
        ],
        keywords: 'користувач обліковий запис роль права доступ',
    },
    {
        id: 'privacy',
        group: 'data',
        icon: <ShieldCheck />,
        title: 'Де зберігаються дані',
        steps: [
            'Усе зберігається лише всередині програми на цьому компʼютері, і все зашифровано',
            'У Windows слідів не лишається: ні в «Недавніх файлах», ні в журналі буфера обміну, ні в тимчасових папках',
            'Файл на диску зʼявляється лише тоді, коли ви самі натискаєте «Експорт» чи «Зберегти» і обираєте місце',
        ],
        keywords: 'безпека шифрування сліди windows секретність',
    },
    {
        id: 'wipe',
        group: 'data',
        icon: <Trash2 />,
        title: 'Знищити всі дані на цьому компʼютері',
        steps: [
            'Якщо дані ще потрібні — спершу збережіть повну копію',
            'Відкрийте «Резервні копії», вкладка «Очищення», увімкніть «Знищити також усі локальні копії»',
            'Введіть слово ОЧИСТИТИ і натисніть «Очистити всі дані»',
        ],
        keywords: 'видалити знищити очистити стерти все',
    },
];

const CONVENIENCES = [
    'Кнопки «−» і «+» угорі роблять усе дрібнішим або більшим (Ctrl − і Ctrl +)',
    'Місяць / сонце угорі — нічна або денна тема',
    'Кнопка поруч із хрестиком розгортає вікно на весь екран або зменшує його',
    'Кругова стрілка перезавантажує вікно, якщо щось зависло — дані не зникнуть',
];

function matches(topic: Topic, query: string): boolean {
    const text = [topic.title, topic.tip ?? '', topic.keywords ?? '', ...topic.steps]
        .join(' ')
        .toLowerCase();
    return query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((word) => text.includes(word));
}

export default function InstructionsTab() {
    const [query, setQuery] = useState('');
    const [showHeaderMap, setShowHeaderMap] = useState(false);
    const found = useMemo(() => TOPICS.filter((topic) => matches(topic, query)), [query]);

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <PageHeader
                title="Довідка"
                description="Що натиснути, щоб зробити потрібне"
                icon={<LifeBuoy />}
            />

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="mx-auto max-w-5xl space-y-6">
                    {!query && (
                        <section>
                            <h2 className="mb-3 text-[15px] font-semibold text-ink">
                                Програма за хвилину
                            </h2>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {OVERVIEW.map((item) => (
                                    <div key={item.title} className="card flex gap-3 p-4">
                                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink [&_svg]:size-[18px]">
                                            {item.icon}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-ink">
                                                {item.title}
                                            </p>
                                            <p className="text-[13px] leading-snug text-ink-3">
                                                {item.text}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <SearchInput
                        value={query}
                        onChange={setQuery}
                        placeholder="Що потрібно зробити? Наприклад: статус, звіт, копія, пароль"
                        autoFocus
                    />

                    {found.length === 0 && (
                        <EmptyState
                            title="Нічого не знайдено"
                            description="Спробуйте інше слово або зверніться до адміністратора."
                        />
                    )}

                    {GROUPS.map((group) => {
                        const topics = found.filter((topic) => topic.group === group.id);
                        if (!topics.length) return null;
                        return (
                            <section key={group.id}>
                                <h2 className="mb-3 text-[15px] font-semibold text-ink">
                                    {group.title}
                                </h2>
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    {topics.map((topic) => (
                                        <TopicCard
                                            key={topic.id}
                                            topic={topic}
                                            onShowHeaderMap={() => setShowHeaderMap(true)}
                                        />
                                    ))}
                                </div>
                            </section>
                        );
                    })}

                    {!query && (
                        <section className="card p-5">
                            <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink">
                                <MonitorCog className="size-[18px] text-ink-3" />
                                Зручності
                            </h2>
                            <ul className="grid gap-2 text-sm leading-relaxed text-ink-2 sm:grid-cols-2">
                                {CONVENIENCES.map((line) => (
                                    <li key={line}>• {line}</li>
                                ))}
                            </ul>
                            <p className="mt-4 text-[13px] text-ink-3">
                                Від натискання кнопок нічого не зламається: видалення та інші
                                небезпечні дії завжди перепитують. Якщо щось незрозуміло —
                                зверніться до адміністратора.
                            </p>
                        </section>
                    )}
                </div>
            </div>

            {showHeaderMap && <HeaderMapModal onClose={() => setShowHeaderMap(false)} />}
        </div>
    );
}

function TopicCard({ topic, onShowHeaderMap }: { topic: Topic; onShowHeaderMap: () => void }) {
    return (
        <section className="card flex flex-col gap-3 p-5">
            <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink [&_svg]:size-5">
                    {topic.icon}
                </span>
                <h3 className="text-[15px] font-semibold leading-snug text-ink">{topic.title}</h3>
            </div>
            <ol className="space-y-2">
                {topic.steps.map((step, index) => (
                    <li key={step} className="flex gap-3 text-sm leading-relaxed text-ink-2">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-surface-3 text-[11px] font-semibold tabular-nums text-ink-3">
                            {index + 1}
                        </span>
                        <span>{step}</span>
                    </li>
                ))}
            </ol>
            {topic.tip && (
                <p className="rounded-lg bg-surface-2 px-3 py-2 text-[13px] leading-relaxed text-ink-2">
                    {topic.tip}
                </p>
            )}
            {topic.showsHeaderMap && (
                <div>
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={<Table2 className="size-4" />}
                        onClick={onShowHeaderMap}
                    >
                        Які назви колонок розуміє програма
                    </Button>
                </div>
            )}
        </section>
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
