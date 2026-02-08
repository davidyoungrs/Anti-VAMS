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
    },

    /**
     * Generates random noise for data sanitization (MP-6).
     * @param {number} length 
     * @returns {string} 
     */
    generateShreddedBuffer: (length = 32) => {
        return CryptoJS.lib.WordArray.random(length).toString();
    },

    /**
     * Professional Sanitization (Crypto-shredding) of a record object.
     * Replaces sensitive fields with noise before disposal.
     */
    shred: (record) => {
        const noise = () => securityService.generateShreddedBuffer(16);
        return {
            ...record,
            serialNumber: `SHREDDED_${noise()}`,
            customer: 'PURGED',
            oem: 'PURGED',
            tagNo: null,
            jobNo: null,
            orderNo: null,
            plantArea: null,
            siteLocation: null,
            valvePhoto: null,
            files: [],
            signatureDataUrl: null,
            signedBy: null,
            deletedAt: new Date().toISOString(),
            isShredded: true
        };
    }
};
