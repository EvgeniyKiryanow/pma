import { Phone, UsersRound } from 'lucide-react';

import type { RelativeContact } from '../../../../shared/types/user';
import { Avatar } from '../../../shared/ui';

/** Relatives and emergency contacts of a service member (dossier card). */
export default function UserRelatives({ relatives }: { relatives: RelativeContact[] }) {
    return (
        <section className="card p-5">
            <h3 className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-ink">
                <UsersRound className="size-4 text-ink-3" />
                Родичі та контакти
            </h3>
            {relatives.length === 0 ? (
                <p className="text-sm text-ink-3">Не вказано</p>
            ) : (
                <ul className="grid gap-2 @md:grid-cols-2">
                    {relatives.map((r, idx) => (
                        <li
                            key={idx}
                            className="flex items-start gap-3 rounded-xl border border-line p-3"
                        >
                            <Avatar name={r.name || '?'} size={34} />
                            <div className="min-w-0 text-sm">
                                <p className="truncate font-medium text-ink">{r.name || '—'}</p>
                                {r.relationship && (
                                    <p className="text-xs text-ink-3">{r.relationship}</p>
                                )}
                                {r.phone && (
                                    <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-ink-2">
                                        <Phone className="size-3.5 text-ink-3" />
                                        {r.phone}
                                    </p>
                                )}
                                {r.email && <p className="text-xs text-ink-3">{r.email}</p>}
                                {r.notes && <p className="mt-1 text-xs text-ink-3">{r.notes}</p>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
