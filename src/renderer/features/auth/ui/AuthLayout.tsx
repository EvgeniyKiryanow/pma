import type { ReactNode } from 'react';

import LogoSvg from '../../../shared/icons/LogoSvg';

/** Centered card used by every screen shown before entering the application. */
export default function AuthLayout({
    title,
    subtitle,
    children,
    width = 'max-w-md',
}: {
    title: string;
    subtitle?: ReactNode;
    children: ReactNode;
    width?: string;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-blue-100 px-4 pb-8 pt-16">
            <div className={`w-full ${width} rounded-2xl border bg-white p-8 shadow-xl`}>
                <div className="mb-6 text-center">
                    <div className="mx-auto mb-3 h-14 w-14">
                        <LogoSvg />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                    {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
                </div>
                {children}
            </div>
        </div>
    );
}
