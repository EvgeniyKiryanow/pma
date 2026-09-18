import { useId } from 'react';

/**
 * PManager mark: a field-green shield (the unit) with brass rank chevrons over roster lines
 * (the personnel record). The same drawing is used for the application icon
 * (assets/icons/appIcon.*, rendered from this file).
 */
export default function LogoSvg({ className, title }: { className?: string; title?: string }) {
    const uid = useId().replace(/:/g, '');
    const shield = `pm-shield-${uid}`;
    const sheen = `pm-sheen-${uid}`;
    const brass = `pm-brass-${uid}`;

    return (
        <svg
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            role={title ? 'img' : undefined}
            aria-hidden={title ? undefined : true}
        >
            {title && <title>{title}</title>}
            <defs>
                <linearGradient id={shield} x1="0.2" y1="0" x2="0.8" y2="1">
                    <stop offset="0" stopColor="#6B8A3A" />
                    <stop offset="0.55" stopColor="#465F27" />
                    <stop offset="1" stopColor="#2B3B1A" />
                </linearGradient>
                <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.16" />
                    <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.16" />
                    <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
                <linearGradient id={brass} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#F6DD98" />
                    <stop offset="0.5" stopColor="#E0B458" />
                    <stop offset="1" stopColor="#B7852F" />
                </linearGradient>
            </defs>

            <path
                d="M32 3.2 54.6 10v19.4c0 15.2-9.4 25.9-22.6 31.4C18.8 55.3 9.4 44.6 9.4 29.4V10Z"
                fill={`url(#${shield})`}
            />
            <path
                d="M32 3.2 54.6 10v19.4c0 15.2-9.4 25.9-22.6 31.4C18.8 55.3 9.4 44.6 9.4 29.4V10Z"
                fill={`url(#${sheen})`}
            />
            <path
                d="M32 7.4 50.8 13v16.4c0 12.9-7.8 22.1-18.8 27.1-11-5-18.8-14.2-18.8-27.1V13Z"
                fill="none"
                stroke={`url(#${brass})`}
                strokeOpacity="0.5"
                strokeWidth="1.1"
            />

            <path
                d="m20.5 26.4 11.5-7.7 11.5 7.7"
                fill="none"
                stroke={`url(#${brass})`}
                strokeWidth="4.4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="m20.5 34.6 11.5-7.7 11.5 7.7"
                fill="none"
                stroke={`url(#${brass})`}
                strokeWidth="4.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.72"
            />

            <path
                d="M24.2 42.3h15.6M27.3 48.1h9.4"
                fill="none"
                stroke="#E9F0D8"
                strokeOpacity="0.85"
                strokeWidth="2.6"
                strokeLinecap="round"
            />
        </svg>
    );
}
