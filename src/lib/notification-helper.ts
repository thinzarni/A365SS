/* ═══════════════════════════════════════════════════════════
   Notification Helper — mirrors Flutter NotiHelper
   ═══════════════════════════════════════════════════════════ */

/**
 * Parse the API date format: "20250910:15:13:53:353"
 *   parts[0] = yyyymmdd, parts[1]=hh, parts[2]=mm, parts[3]=ss, parts[4]=ms
 */
export function parseApiDate(dateString: string): Date {
    try {
        const parts = dateString.split(':');
        const ymd = parts[0]; // "20250910"
        const year = parseInt(ymd.substring(0, 4), 10);
        const month = parseInt(ymd.substring(4, 6), 10) - 1; // months are 0-indexed
        const day = parseInt(ymd.substring(6, 8), 10);
        const hour = parseInt(parts[1], 10);
        const minute = parseInt(parts[2], 10);
        const second = parseInt(parts[3], 10);
        const ms = parseInt(parts[4], 10);
        return new Date(year, month, day, hour, minute, second, ms);
    } catch {
        return new Date();
    }
}

/**
 * Format notification date the same way as Flutter's NotiHelper.formatNotiTime:
 *   - Today    → "03:13 PM"
 *   - Yesterday→ "Yesterday"
 *   - This week→ "Thursday"
 *   - Older    → "10/09/25"
 */
export function formatNotiTime(date: Date): string {
    const now = new Date();

    const isToday =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();

    if (isToday) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
        date.getFullYear() === yesterday.getFullYear() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getDate() === yesterday.getDate();

    if (isYesterday) return 'Yesterday';

    // Start of current week (Monday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    if (date >= startOfWeek && date < endOfWeek) {
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    }

    // Older than this week → dd/MM/yy
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
}

/**
 * Returns the web app route to navigate to when a notification is tapped.
 * Mirrors Flutter NotiHelper.handle().
 *
 * toNotiType values: "request" | "approval" | "all"
 * requestType values match mobile RequestType.value strings
 */
export function getNotiRoute(
    requestType: string,
    toNotiType: string,
    requestSyskey: string,
): string | null {
    const type = requestType.toLowerCase();
    const notiDirection = toNotiType.toLowerCase();

    switch (type) {
        case 'holiday':
            return '/holidays';

        case 'ruleandregulation':
            return '/rulesandreg';

        case 'location':
            return '/locationapproval';

        case 'attendanceapproval':
        case 'remote':
        case 'backdate':
        case 'remote and backdate':
            // Approval direction → attendance approval; request direction → calendar (not a page, skip)
            if (notiDirection === 'approval') return `/approvals/${requestSyskey}`;
            return '/attendanceapproval';

        case 'leave':
        case 'general':
        case 'claim':
        case 'overtime':
        case 'workfromhome':
        case 'late':
        case 'earlyout':
        case 'reservation':
        case 'transportation':
        case 'purchase':
        case 'travel':
        case 'offinlieu':
        case 'ferry taxi':
        case 'employeerequisition':
            if (notiDirection === 'request') return `/requests/${requestSyskey}`;
            return `/approvals/${requestSyskey}`;

        default:
            return null;
    }
}
