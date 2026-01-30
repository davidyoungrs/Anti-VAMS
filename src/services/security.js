import CryptoJS from 'crypto-js';

const KEY_STORAGE_NAME = 'antivams_secure_key';

export const securityService = {
    /**
     * Generates or retrieves a persistent 256-bit encryption key.
     * Stored in localStorage for now (Browser limit).
     */
    getOrGenerateKey: () => {
        let key = localStorage.getItem(KEY_STORAGE_NAME);
        if (!key) {
            // Generate a random 256-bit key (32 bytes) encoded as Hex
            key = CryptoJS.lib.WordArray.random(32).toString();
            localStorage.setItem(KEY_STORAGE_NAME, key);
        }
        return key;
    },

    /**
     * Encrypts a JSON object or string.
     * @param {any} data - Data to encrypt.
     * @returns {string} - AES ciphertext string.
     */
    encrypt: (data) => {
        try {
            const key = securityService.getOrGenerateKey();
            const payload = JSON.stringify(data);
            return CryptoJS.AES.encrypt(payload, key).toString();
        } catch (e) {
            console.error('Encryption failed:', e);
            throw new Error('Encryption failed');
        }
    },

    /**
     * Decrypts an AES ciphertext string.
     * @param {string} ciphertext - Encrypted string.
     * @returns {any} - Decrypted JSON data.
     */
    decrypt: (ciphertext) => {
        try {
            if (!ciphertext) return null;
            const key = securityService.getOrGenerateKey();
            const bytes = CryptoJS.AES.decrypt(ciphertext, key);
            const originalText = bytes.toString(CryptoJS.enc.Utf8);

            if (!originalText) return null; // Decryption failed (wrong key or empty)

            return JSON.parse(originalText);
        } catch (e) {
            console.error('Decryption failed:', e);
            return null;
        }
    }
};
