/**
 * hybrid-encrypt.ts
 * Mirrors Flutter's HybridEncryptor exactly:
 *   1. Generate random AES-128 key + IV (16 bytes each)
 *   2. AES-128-CBC encrypt JSON payload {domain, userid}
 *   3. Prepend IV to ciphertext → base64 → encryptedData
 *   4. RSA-OAEP encrypt the AES key → base64 → encryptedKey
 *
 * The public RSA key is loaded from /public.pem (copied from assets/keys/public.pem).
 */

const PEM_URL = `${import.meta.env.BASE_URL}public.pem`;

/** Parse PEM → ArrayBuffer (strips headers, decodes base64) */
function pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64 = pem
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\s+/g, '');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/** Encode ArrayBuffer → URL-safe base64 */
function toBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/** Load and cache the RSA public key */
let _cachedPublicKey: CryptoKey | null = null;
async function loadPublicKey(): Promise<CryptoKey> {
    if (_cachedPublicKey) return _cachedPublicKey;

    const res = await fetch(PEM_URL);
    if (!res.ok) throw new Error(`Failed to load public key: ${res.status}`);
    const pem = await res.text();
    const keyBuffer = pemToArrayBuffer(pem);

    _cachedPublicKey = await crypto.subtle.importKey(
        'spki',
        keyBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-1' }, // Flutter uses OAEP with default SHA-1
        false,
        ['encrypt'],
    );
    return _cachedPublicKey;
}

/**
 * Encrypt domain + userid using Hybrid Encryption (AES-128-CBC + RSA-OAEP).
 * Returns { encryptedData, encryptedKey } — both base64-encoded strings.
 */
export async function hybridEncrypt(domain: string, userid: string): Promise<{
    encryptedData: string;
    encryptedKey: string;
}> {
    // 1. Generate random AES-128 key (16 bytes) and IV (16 bytes)
    const aesKeyBytes = crypto.getRandomValues(new Uint8Array(16));
    const ivBytes = crypto.getRandomValues(new Uint8Array(16));

    // 2. Import as AES-CBC key
    const aesKey = await crypto.subtle.importKey(
        'raw',
        aesKeyBytes,
        { name: 'AES-CBC' },
        false,
        ['encrypt'],
    );

    // 3. Encrypt the JSON payload with AES-128-CBC
    const payload = JSON.stringify({ domain, userid });
    const encodedPayload = new TextEncoder().encode(payload);
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-CBC', iv: ivBytes },
        aesKey,
        encodedPayload,
    );

    // 4. Prepend IV to ciphertext → encryptedData (matches Flutter: combinedData = [IV + ciphertext])
    const combined = new Uint8Array(ivBytes.length + ciphertext.byteLength);
    combined.set(ivBytes, 0);
    combined.set(new Uint8Array(ciphertext), ivBytes.length);
    const encryptedData = toBase64(combined.buffer);

    // 5. RSA-OAEP encrypt the AES key → encryptedKey
    const publicKey = await loadPublicKey();
    const encryptedKeyBuffer = await crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        aesKeyBytes,
    );
    const encryptedKey = toBase64(encryptedKeyBuffer);

    return { encryptedData, encryptedKey };
}
