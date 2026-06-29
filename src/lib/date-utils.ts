/* ═══════════════════════════════════════════════════════════
   Date Utilities — Shared date formatting helpers
   ═══════════════════════════════════════════════════════════ */

/**
 * Format a yyyyMMdd date string to dd/mm/yyyy for display.
 * Handles both "20260221" and null/undefined gracefully.
 */
export function displayDate(raw?: string | unknown): string {
    const s = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim();
    if (!s || s.length < 8) return '—';
    
    // Strip hyphens and T... time parts if it's an ISO-like date string
    const cleanStr = s.split('T')[0].replace(/-/g, '');
    if (cleanStr.length < 8) return '—';

    // yyyyMMdd → dd/MM/yyyy
    const yyyy = cleanStr.substring(0, 4);
    const mm = cleanStr.substring(4, 6);
    const dd = cleanStr.substring(6, 8);
    return `${dd}/${mm}/${yyyy}`;
}
