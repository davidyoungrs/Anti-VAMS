import { supabase } from './supabaseClient';

export const auditService = {
    /**
     * Log a security or system event.
     * @param {string} action - Event name (e.g., 'LOGIN_FAILED', 'CONFIG_CHANGE')
     * @param {object} details - Metadata (e.g., ip address, error message)
     * @param {'INFO'|'WARNING'|'CRITICAL'} severity - Event severity
     * @param {string|null} email - Optional email (useful for failed logins)
     */
    logEvent: async (action, details = {}, severity = 'INFO', email = null) => {
        if (!supabase) return;

        try {
            const { error } = await supabase.rpc('log_security_event', {
                p_action: action,
                p_details: details,
                p_severity: severity,
                p_email: email
            });

            if (error) console.error('Audit Log Error:', error);
        } catch (e) {
            console.error('Audit Log Exception:', e);
        }
    },

    /**
     * Fetch logs (Admin only via RLS).
     * @param {number} limit 
     * @returns 
     */
    getLogs: async (limit = 100) => {
        if (!supabase) return { data: [], error: 'Offline' };

        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limit);

        return { data, error };
    },

    /**
     * Export All Logs to CSV
     */
    exportLogs: async () => {
        if (!supabase) return;

        // Fetch all logs (or last 1000 to be safe)
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(5000);

        if (error || !data) {
            alert('Failed to fetch logs for export');
            return;
        }

        const headers = ['Timestamp', 'Action', 'Severity', 'User ID', 'Email', 'Details'];
        const csvRows = [headers.join(',')];

        for (const row of data) {
            const detailsStr = JSON.stringify(row.details || {}).replace(/"/g, '""');
            csvRows.push([
                row.timestamp,
                row.action,
                row.severity,
                row.user_id || 'System/Guest',
                row.email || '',
                `"${detailsStr}"`
            ].join(','));
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    },

    /**
     * Run Data Retention Policy (Purge logs > 1 year, Downgrade inactive users > 6 months)
     */
    runRetentionPolicy: async () => {
        if (!supabase) return { error: 'Offline' };
        return await supabase.rpc('enforce_data_retention');
    }
};
