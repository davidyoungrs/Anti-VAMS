import { openDB } from 'idb';

const DB_NAME = 'anti_vams_db';
const DB_VERSION = 2; // Bump version for new 'jobs' store
const STORE_NAME = 'valve_records';
const JOBS_STORE_NAME = 'jobs';

export const dbService = {
    /**
     * Opens the database connection.
     */
    dbPromise: openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // Create a store that uses 'id' as the key path
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(JOBS_STORE_NAME)) {
                console.log('Creating jobs object store...');
                db.createObjectStore(JOBS_STORE_NAME, { keyPath: 'id' });
            }
        },
    }),

    /**
     * Adds or updates a record.
     * @param {object} record 
     * @param {string} storeName (Optional)
     */
    put: async (record, storeName = STORE_NAME) => {
        const db = await dbService.dbPromise;
        return db.put(storeName, record);
    },

    /**
     * Gets a record by ID.
     * @param {string} id 
     * @param {string} storeName (Optional)
     */
    get: async (id, storeName = STORE_NAME) => {
        const db = await dbService.dbPromise;
        return db.get(storeName, id);
    },

    /**
     * Gets all records.
     * @param {string} storeName (Optional)
     */
    getAll: async (storeName = STORE_NAME) => {
        const db = await dbService.dbPromise;
        return db.getAll(storeName);
    },

    /**
     * Deletes a record by ID.
     * @param {string} id 
     * @param {string} storeName (Optional)
     */
    delete: async (id, storeName = STORE_NAME) => {
        const db = await dbService.dbPromise;
        return db.delete(storeName, id);
    },

    /**
     * Clears the entire store.
     * @param {string} storeName (Optional)
     */
    clear: async (storeName = STORE_NAME) => {
        const db = await dbService.dbPromise;
        return db.clear(storeName);
    },

    /**
     * Bulk put for migration
     * @param {Array} records
     * @param {string} storeName (Optional)
     */
    bulkPut: async (records, storeName = STORE_NAME) => {
        const db = await dbService.dbPromise;
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        // Execute all puts in parallel within the transaction
        await Promise.all(records.map(record => store.put(record)));
        await tx.done;
    }
};
