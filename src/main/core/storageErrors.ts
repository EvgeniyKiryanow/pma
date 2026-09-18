import { AppError } from '../../shared/ipc/result';

/**
 * What the person can do about a failed disk operation, instead of «Сталася помилка»: a full
 * or write-protected flash drive, a file held open by Excel, a drive pulled out mid-way.
 * Recognised by the system error code (`err.code`), wherever the error came from.
 */
const MESSAGES: Record<string, string> = {
    ENOSPC: 'На диску або флешці не вистачає місця. Звільніть місце або оберіть інший носій.',
    EDQUOT: 'На диску або флешці не вистачає місця. Звільніть місце або оберіть інший носій.',
    EROFS: 'Носій захищений від запису (перемикач на флешці або диск лише для читання). Оберіть інший носій.',
    EACCES: 'Не вдалося записати: файл відкритий в іншій програмі (наприклад, Excel) або папка чи флешка захищена від запису. Закрийте файл або оберіть іншу папку.',
    EPERM: 'Не вдалося записати: файл відкритий в іншій програмі (наприклад, Excel) або папка чи флешка захищена від запису. Закрийте файл або оберіть іншу папку.',
    EBUSY: 'Файл відкритий в іншій програмі (наприклад, Excel). Закрийте його й спробуйте ще раз.',
    ENOENT: 'Файл або папку не знайдено. Якщо працюєте з флешкою — перевірте, чи вона під’єднана.',
    ENODEV: 'Носій не знайдено: можливо, флешку від’єднали. Під’єднайте її й спробуйте ще раз.',
    ENXIO: 'Носій не знайдено: можливо, флешку від’єднали. Під’єднайте її й спробуйте ще раз.',
    EIO: 'Помилка читання або запису носія: флешка чи диск можуть бути пошкоджені. Спробуйте інший носій.',
};

/** The AppError to show for a failed file operation, or null when it is not one. */
export function storageError(err: unknown): AppError | null {
    const code = (err as { code?: unknown } | null)?.code;
    if (typeof code !== 'string' || !(code in MESSAGES)) return null;
    return new AppError('STORAGE', MESSAGES[code], { reason: code });
}
