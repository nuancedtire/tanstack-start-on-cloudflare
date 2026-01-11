// Web Crypto API Wrapper for AES-GCM
// This runs in the browser.

export async function encryptWithPin(plaintext: string, pin: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(pin, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encoded = encoder.encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encoded
    );

    // Format: salt:iv:ciphertext (all hex)
    return `${toHex(salt)}:${toHex(iv)}:${toHex(new Uint8Array(ciphertext))}`;
}

export async function decryptWithPin(encrypted: string, pin: string): Promise<string> {
    try {
        const [saltHex, ivHex, cipherHex] = encrypted.split(':');
        if (!saltHex || !ivHex || !cipherHex) throw new Error("Invalid format");

        const salt = fromHex(saltHex);
        const iv = fromHex(ivHex);
        const ciphertext = fromHex(cipherHex);

        const key = await deriveKey(pin, salt);
        
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            ciphertext
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (e) {
        throw new Error("Decryption failed. Wrong PIN?");
    }
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(pin),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as any, // Cast to any to bypass strict typing issues with BufferSource in some envs
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

function toHex(buffer: Uint8Array): string {
    return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
    return new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
}
