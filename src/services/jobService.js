
import { dbService } from './db';
import { supabase } from './supabaseClient';
import { securityService } from './security'; // If we want to encrypt jobs too? Probably good for consistency.

const JOBS_STORE = 'jobs';

export const jobService = {
    /**
     * Get all jobs (Local + Cloud Sync)
     */
    getAllJobs: async () => {
        // 1. Load from Local
        let localJobs = [];
        try {
            const encryptedItems = await dbService.getAll(JOBS_STORE);
            localJobs = encryptedItems.map(item => {
                try {
                    return securityService.decrypt(item.encryptedData);
                } catch (e) {
                    console.error('Failed to decrypt job', item.id);
                    return null;
                }
            }).filter(j => j);
        } catch (e) {
            console.error('Error loading local jobs', e);
        }

        // 2. Try Sync with Cloud
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('jobs')
                    .select('*')
                    .order('updated_at', { ascending: false });

                if (data && !error) {
                    // Start simplified merge strategy (Cloud wins for now, or latest wins)
                    const cloudJobs = data.map(j => ({
                        id: j.id,
                        name: j.name,
                        clientName: j.client_name,
                        status: j.status,
                        createdAt: j.created_at,
                        updatedAt: j.updated_at
                    }));

                    // Save Cloud to Local (Merge)
                    // Robust Merge: Start with local, update with cloud. 
                    // This preserves local-only items (unsynced) while updating synced ones.
                    const jobMap = new Map();
                    localJobs.forEach(j => jobMap.set(j.id, j));
                    cloudJobs.forEach(j => jobMap.set(j.id, j));

                    const mergedJobs = Array.from(jobMap.values());

                    const encryptedToSave = mergedJobs.map(j => ({
                        id: j.id,
                        encryptedData: securityService.encrypt(j)
                    }));
                    await dbService.bulkPut(encryptedToSave, JOBS_STORE);

                    return mergedJobs;
                }
            } catch (e) {
                console.warn('Job sync failed, using local', e);
            }
        }

        return localJobs;
    },

    /**
     * Create or Update a job
     */
    saveJob: async (job) => {
        const finalJob = { ...job };
        if (!finalJob.id) {
            finalJob.id = crypto.randomUUID();
            finalJob.createdAt = new Date().toISOString();
        }
        finalJob.updatedAt = new Date().toISOString(); // Always update timestamp

        // 1. Save Local
        try {
            await dbService.put({
                id: finalJob.id,
                encryptedData: securityService.encrypt(finalJob)
            }, JOBS_STORE);
        } catch (e) {
            console.error('Failed to save job locally', e);
            throw e;
        }

        // 2. Save Cloud
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('jobs')
                    .upsert({
                        id: finalJob.id,
                        name: finalJob.name,
                        client_name: finalJob.clientName,
                        status: finalJob.status,
                        created_at: finalJob.createdAt,
                        updated_at: finalJob.updatedAt
                    });

                if (error) console.error('Failed to save job to cloud', error);
            } catch (e) {
                console.error('Supabase error saving job', e);
            }
        }

        return finalJob;
    },

    /**
     * Assign valves to a job
     * Only updates the 'job_id' field on the valves.
     */
    assignValvesToJob: async (jobId, valveIds) => {
        // This is a specialized bulk update
        if (!valveIds || valveIds.length === 0) return;

        const updatePayload = {
            jobId: jobId,
            updatedAt: new Date().toISOString()
        };

        // 1. Update Local Valves
        // We need to fetch each valve, update it, and save it back.
        // This is slightly inefficient but safe.
        for (const vid of valveIds) {
            try {
                const encryptedItem = await dbService.get(vid, 'valve_records'); // Explicit store
                if (encryptedItem) {
                    const record = securityService.decrypt(encryptedItem.encryptedData);
                    const updatedRecord = { ...record, ...updatePayload }; // jobId logic

                    // We need to save this back using dbService.put for the VALVE store
                    await dbService.put({
                        id: updatedRecord.id,
                        encryptedData: securityService.encrypt(updatedRecord)
                    }, 'valve_records');
                }
            } catch (e) {
                console.error(`Failed to update local valve ${vid}`, e);
            }
        }

        // 2. Update Cloud Valves (Bulk)
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('valve_records')
                    .update({
                        job_id: jobId,
                        updated_at: updatePayload.updatedAt
                    })
                    .in('id', valveIds);

                if (error) throw error;
            } catch (e) {
                console.error('Failed to update valves in cloud', e);
            }
        }
    },

    /**
     * Delete a job
     */
    deleteJob: async (jobId) => {
        // 1. Delete Local
        await dbService.delete(jobId, JOBS_STORE);

        // 2. Delete Cloud
        if (supabase) {
            const { error } = await supabase.from('jobs').delete().eq('id', jobId);
            if (error) console.error('Failed to delete job from cloud', error);
        }
    }
};
