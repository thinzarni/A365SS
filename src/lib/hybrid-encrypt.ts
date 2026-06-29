/**
 * hybrid-encrypt.ts
 * Mirrors Flutter's HybridEncryptor exactly using node-forge:
 *   1. Generate random AES-128 key + IV (16 bytes each)
 *   2. AES-128-CBC encrypt JSON payload {domain, userid}
 *   3. Prepend IV to ciphertext → base64 → encryptedData
 *   4. RSA-OAEP encrypt the AES key → base64 → encryptedKey
 *
 * The public RSA key is loaded from /public.pem (copied from assets/keys/public.pem).
 * Uses node-forge instead of window.crypto.subtle to support non-HTTPS environments (like HTTP in WebViews).
 */

import forge from 'node-forge';

const PEM_URL = `${import.meta.env.BASE_URL}public.pem`;

/** Load and cache the RSA public key */
let _cachedPublicKey: forge.pki.rsa.PublicKey | null = null;
async function loadPublicKey(): Promise<forge.pki.rsa.PublicKey> {
    if (_cachedPublicKey) return _cachedPublicKey;

    const res = await fetch(PEM_URL);
    if (!res.ok) throw new Error(`Failed to load public key: ${res.status}`);
    const pem = await res.text();
    
    _cachedPublicKey = forge.pki.publicKeyFromPem(pem) as forge.pki.rsa.PublicKey;
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
    const aesKey = forge.random.getBytesSync(16);
    const iv = forge.random.getBytesSync(16);

    // 2. Encrypt the JSON payload with AES-128-CBC
    const payload = JSON.stringify({ domain, userid });
    const cipher = forge.cipher.createCipher('AES-CBC', aesKey);
    cipher.start({ iv: iv });
    cipher.update(forge.util.createBuffer(payload, 'utf8'));
    cipher.finish();
    const ciphertext = cipher.output.getBytes();

    // 3. Prepend IV to ciphertext → encryptedData (matches Flutter: combinedData = [IV + ciphertext])
    const combined = iv + ciphertext;
    const encryptedData = forge.util.encode64(combined);

    // 4. RSA-OAEP encrypt the AES key → encryptedKey
    const publicKey = await loadPublicKey();
    const encryptedKeyBytes = publicKey.encrypt(aesKey, 'RSA-OAEP', {
        md: forge.md.sha1.create(), // Flutter uses OAEP with default SHA-1
        mgf1: {
            md: forge.md.sha1.create()
        }
    });
    const encryptedKey = forge.util.encode64(encryptedKeyBytes);

    return { encryptedData, encryptedKey };
}
