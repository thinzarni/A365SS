/* ═══════════════════════════════════════════════════════════
   Format Utilities — Number formatting helpers
   ═══════════════════════════════════════════════════════════ */

/**
 * Format a number string with thousand separators.
 * "1234567" → "1,234,567"
 * "1234567.89" → "1,234,567.89"
 * Allows typing decimals (trailing dot is preserved).
 */
export function formatAmount(value: string | number | undefined | null): string {
    if (value === null || value === undefined || value === '') return '';
    
    // If it's a number, convert it safely (e.g. 1000.0000001 -> '1000')
    let strValue = typeof value === 'number' ? Number(value.toFixed(2)).toString() : String(value);

    // Strip everything except digits and dot
    const clean = strValue.replace(/[^0-9.]/g, '');
    if (!clean) return '';

    const parts = clean.split('.');
    // Limit to 2 parts (one decimal point)
    if (parts.length > 2) {
        parts.length = 2;
    }
    
    // Format integer part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
}

/**
 * Strip thousand separators to get the raw numeric string.
 * "1,234,567.89" → "1234567.89"
 */
export function unformatAmount(formatted: string | undefined | null): string {
    if (!formatted) return '';
    return String(formatted).replace(/,/g, '');
}
