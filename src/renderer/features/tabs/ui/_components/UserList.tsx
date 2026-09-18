import { Check, SearchX } from 'lucide-react';

import type { User } from '../../../../../shared/types/user';
import { Avatar, cn, EmptyState, SearchInput } from '../../../../shared/ui';
import { useReportsStore } from '../../../report/model/reportsStore';

type Props = {
    users: User[];
    selectedUserId: string | number | null;
    searchUser1: string;
    setSearchUser1: (value: string) => void;
    searchUser2: string;
    setSearchUser2: (value: string) => void;
};

/** Step 1 of report generation: the person whose data fills the template. */
export default function UserList({ users, selectedUserId, searchUser1, setSearchUser1 }: Props) {
    const setSelectedUser = useReportsStore((s) => s.setSelectedUser);
    const search = searchUser1.toLowerCase();
    const visible = users.filter((u) => u.fullName.toLowerCase().includes(search));

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-3 border-b border-line p-3">
                <StepTitle step={1} title="Військовослужбовець" />
                <SearchInput
                    value={searchUser1}
                    onChange={setSearchUser1}
                    placeholder="Пошук за прізвищем…"
                    size="sm"
                />
            </div>
            <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
                {visible.length === 0 ? (
                    <li>
                        <EmptyState icon={<SearchX />} title="Нікого не знайдено" />
                    </li>
                ) : (
                    visible.map((u) => {
                        const selected = selectedUserId === u.id;
                        return (
                            <li key={u.id}>
                                <button
                                    onClick={() => setSelectedUser(selected ? null : u.id)}
                                    className={cn(
                                        'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                                        selected ? 'bg-primary-soft' : 'hover:bg-surface-2',
                                    )}
                                >
                                    <Avatar name={u.fullName} src={u.photo} size={30} />
                                    <span className="min-w-0 flex-1">
                                        <span
                                            className={cn(
                                                'block truncate text-[13px] font-medium',
                                                selected ? 'text-primary-ink' : 'text-ink',
                                            )}
                                        >
                                            {u.fullName}
                                        </span>
                                        {u.rank && (
                                            <span className="block truncate text-[11px] text-ink-3">
                                                {u.rank}
                                            </span>
                                        )}
                                    </span>
                                    {selected && (
                                        <Check className="size-4 shrink-0 text-primary-ink" />
                                    )}
                                </button>
                            </li>
                        );
                    })
                )}
            </ul>
        </div>
    );
}

export function StepTitle({ step, title, hint }: { step: number; title: string; hint?: string }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-on-primary">
                {step}
            </span>
            <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-ink">{title}</p>
                {hint && <p className="truncate text-xs text-ink-3">{hint}</p>}
            </div>
        </div>
    );
}
