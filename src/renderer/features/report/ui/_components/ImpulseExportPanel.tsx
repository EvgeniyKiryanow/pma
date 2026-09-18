import { CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';

import type { User } from '../../../../../shared/types/user';
import { cn } from '../../../../shared/ui';
import { IMPULSE_CHECKS, type ImpulseCheckKey, impulseSummary } from '../../model/impulseExport';

const LABELS = Object.fromEntries(IMPULSE_CHECKS.map((c) => [c.key, c.label])) as Record<
    ImpulseCheckKey,
    string
>;

/**
 * «Імпульс»: what the file for Impulse Toolkit will hold, and who needs their card completed
 * first. The file itself has 108 columns, so it is not shown here.
 */
export function ImpulseExportPanel({ users }: { users: User[] }) {
    const summary = useMemo(() => impulseSummary(users), [users]);

    return (
        <div className="max-w-5xl space-y-5">
            <div className="paper space-y-2 p-5 text-[13px] leading-relaxed text-ink-2">
                <p className="flex items-start gap-2 font-medium text-ink">
                    <Info className="mt-0.5 size-4 shrink-0 text-ink-3" />
                    Файл для Імпульс Toolkit: «Додаток 1» (особовий склад, 108 колонок) і «Додаток
                    2» (освіта), заповнені з карток — усі, крім виключених.
                </p>
                <p>
                    Імпульс знаходить картку за прізвищем, імʼям і РНОКПП та перезаписує в ній те,
                    що є у файлі. Тому клітинку заповнено лише тоді, коли значення розпізнано
                    напевно; решта — порожня, а те, що записано в PManager, лежить праворуч у сірих
                    інформаційних колонках (Імпульс їх не імпортує).
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {IMPULSE_CHECKS.map((check) => {
                    const count = summary.filled[check.key];
                    const complete = count === summary.people;
                    return (
                        <div key={check.key} className="paper p-3">
                            <p className="text-xs text-ink-3">{check.label}</p>
                            <p
                                className={cn(
                                    'mt-1 text-lg font-semibold',
                                    complete ? 'text-ink' : 'text-warning-ink',
                                )}
                            >
                                {count} з {summary.people}
                            </p>
                        </div>
                    );
                })}
            </div>

            {summary.gaps.length === 0 ? (
                <p className="flex items-center gap-2 text-[13px] text-ink-2">
                    <CheckCircle2 className="size-4 text-ink-3" />
                    Основні дані є в усіх — файл можна формувати.
                </p>
            ) : (
                <div className="paper overflow-hidden">
                    <p className="flex items-center gap-2 border-b border-line px-4 py-3 text-[13px] font-medium text-ink">
                        <TriangleAlert className="size-4 text-warning-ink" />
                        Варто доповнити картки ({summary.gaps.length}) — інакше ці клітинки у файлі
                        будуть порожні
                    </p>
                    <table className="w-full text-left text-[13px]">
                        <thead className="bg-surface-2 text-xs text-ink-3">
                            <tr>
                                <th className="px-4 py-2 font-medium">ПІБ</th>
                                <th className="px-4 py-2 font-medium">
                                    Чого немає або не розпізнано
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.gaps.map(({ user, missing }) => (
                                <tr key={user.id} className="border-t border-line">
                                    <td className="px-4 py-2 text-ink">{user.fullName}</td>
                                    <td className="px-4 py-2 text-ink-2">
                                        {missing.map((key) => LABELS[key]).join(', ')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
