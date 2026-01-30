import { openDB } from 'idb';

const DB_NAME = 'anti_vams_db';
const DB_VERSION = 1;
const STORE_NAME = 'valve_records';

export const dbService = {
    /**
     * Opens the database connection.
     */
    dbPromise: openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // Create a store that uses 'id' as the key path
                // We aren't using autoIncrement because we use UUIDs
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        },
    }),

    /**
     * Adds or updates a record.
     * @param {object} record 
     */
    put: async (record) => {
        const db = await dbService.dbPromise;
        return db.put(STORE_NAME, record);
    },

    /**
     * Gets a record by ID.
     * @param {string} id 
     */
    get: async (id) => {
        const db = await dbService.dbPromise;
        return db.get(STORE_NAME, id);
    },

    /**
     * Gets all records.
     */
    getAll: async () => {
        const db = await dbService.dbPromise;
        return db.getAll(STORE_NAME);
    },

    /**
     * Deletes a record by ID.
     * @param {string} id 
     */
    delete: async (id) => {
        const db = await dbService.dbPromise;
        return db.delete(STORE_NAME, id);
    },

    /**
     * Clears the entire store.
     */
    clear: async () => {
        const db = await dbService.dbPromise;
        return db.clear(STORE_NAME);
    },

    /**
     * Bulk put for migration
     */
    bulkPut: async (records) => {
        const db = await dbService.dbPromise;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        // Execute all puts in parallel within the transaction
        await Promise.all(records.map(record => store.put(record)));
        await tx.done;
    }
};
