import { supabase } from './supabaseClient';

const STORAGE_KEY = 'valve_test_reports';

export const testReportService = {
    // Get test report for a specific valve
    getByValveId: async (valveId) => {
        // 1. Try local storage first
        let localReports = [];
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            const allReports = data ? JSON.parse(data) : [];
            localReports = allReports.filter(r => r.valveId === valveId);
        } catch (e) {
            console.error('Error reading local test reports', e);
        }

        // 2. Try Supabase
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('valve_test_reports')
                    .select('*')
                    .eq('valve_id', valveId)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.warn('Database fetch failed, using local reports', error);
                    return localReports;
                }

                if (data) {
                    const cloudReports = data.map(r => ({
                        id: r.id,
                        valveId: r.valve_id,
                        inspectionId: r.inspection_id,
                        createdAt: r.created_at,
                        testDate: r.test_date,
                        pressureTest: r.pressure_test || {},
                        strokeTest: r.stroke_test || {},
                        equipment: r.equipment || {},
                        approvals: r.approvals || {}
                    }));

                    // Update local storage
                    const allLocal = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                    const otherReports = allLocal.filter(r => r.valveId !== valveId);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify([...otherReports, ...cloudReports]));

                    return cloudReports;
                }
            } catch (e) {
                console.error('Database connection error', e);
            }
        }

        return localReports;
    },

    // Save (create or update) a test report
    save: async (report) => {
        let finalReport = { ...report };

        // 1. Prepare ID and metadata
        if (!finalReport.id) {
            finalReport.id = crypto.randomUUID();
            finalReport.createdAt = new Date().toISOString();
        }

        // 2. Save to local storage
        const allReports = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const index = allReports.findIndex(r => r.id === finalReport.id);
        if (index !== -1) {
            allReports[index] = finalReport;
        } else {
            allReports.unshift(finalReport);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allReports));

        // 3. Try online save
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('valve_test_reports')
                    .upsert({
                        id: finalReport.id,
                        valve_id: finalReport.valveId,
                        inspection_id: finalReport.inspectionId,
                        created_at: finalReport.createdAt,
                        test_date: finalReport.testDate,
                        pressure_test: finalReport.pressureTest || {},
                        stroke_test: finalReport.strokeTest || {},
                        equipment: finalReport.equipment || {},
                        approvals: finalReport.approvals || {}
                    });

                if (error) {
                    console.error('Supabase DB error:', error);
                    throw error;
                }
            } catch (e) {
                console.error('Supabase connection error:', e);
            }
        }

        return finalReport;
    },

    // Delete a test report
    delete: async (id) => {
        if (supabase) {
            try {
                const { error } = await supabase
                    .from('valve_test_reports')
                    .delete()
                    .eq('id', id);

                if (error) console.error('Supabase delete error', error);
            } catch (e) {
                console.error('Supabase connection error during delete', e);
            }
        }

        // Delete from local storage
        const allReports = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const filtered = allReports.filter(r => r.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
};
