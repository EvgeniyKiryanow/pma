export default function DefaultAvatar() {
    return (
        <svg
            viewBox="0 0 64 64"
            width="100%"
            height="100%"
            className="rounded-lg border object-cover"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* simplified placeholder avatar */}
            <circle cx="32" cy="20" r="12" fill="#ccc" />
            <path d="M16 52c0-8 8-12 16-12s16 4 16 12" fill="#ccc" />
        </svg>
    );
}
