/* ═══════════════════════════════════════════════════════════
   s_token generator — mirrors Flutter's Token.createSToken
   s_token = sha512(uuid + app_id + datetime + req_type + secretKey)
   ═══════════════════════════════════════════════════════════ */

const APP_ID = '004';
const SECRET_KEY = import.meta.env.VITE_SECRET_KEY || 'jRxaPLUjcm210BiPDey7kMM7';

/**
 * Generate s_token hash using Web Crypto API (SHA-512)
 * Matches: Flutter Token().createSToken(time, reqType)
 */
export async function createSToken(dateTime: string, reqType: string, uuid: string): Promise<string> {
    const raw = uuid + APP_ID + dateTime + reqType + SECRET_KEY;
    const data = new TextEncoder().encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Build the full sign-in payload matching Flutter's auth models
 */
export async function makeSignInPayload(userId: string, reqType: number, password = '') {
    const uuid = getOrCreateUUID();
    const dateTime = new Date().toISOString();
    const sToken = await createSToken(dateTime, String(reqType), uuid);

    return {
        user_id: userId,
        s_token: sToken,
        app_id: APP_ID,
        sid: password != "" ? '' : '999', // empty for password login, '999' for OTP
        uuid,
        date_time: dateTime,
        req_type: reqType,
        password, // empty string when not used (OTP flow)
    };
}

/** Persist a UUID per-device in localStorage, matching Flutter's device UUID */
function getOrCreateUUID(): string {
    const KEY = 'a365-device-uuid';
    let uuid = localStorage.getItem(KEY);
    if (!uuid) {
        uuid = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(KEY, uuid);
    }
    return uuid;
}

export { APP_ID };
