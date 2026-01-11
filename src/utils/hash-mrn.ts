
/**
 * Hashes an MRN (Medical Record Number) with a site-specific salt to ensure privacy.
 * This generates a pseudonymized token that can be used for identifying records
 * without storing PII (Personally Identifiable Information).
 */
export async function hashMRN(mrn: string): Promise<string> {
    const SALT = import.meta.env.VITE_MRN_SALT || "FALLBACK_DEV_SALT"; 
    const encoder = new TextEncoder();
    const data = encoder.encode(mrn + SALT);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
}
