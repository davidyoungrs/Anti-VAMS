import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    try {
        // 1. Fetch logs older than 365 days
        const { data: logs, error: fetchError } = await supabase.rpc('get_logs_for_archival', { p_retention_days: 365 })

        if (fetchError) throw fetchError
        if (!logs || logs.length === 0) {
            return new Response(JSON.stringify({ message: 'No logs to archive' }), { status: 200 })
        }

        // 2. Format logs as NDJSON
        const ndjson = logs.map(log => JSON.stringify(log)).join('\n')
        const fileName = `audit-logs-${new Date().toISOString().split('T')[0]}.ndjson`

        // 3. Upload to archival bucket
        const { error: uploadError } = await supabase.storage
            .from('audit-logs-archival')
            .upload(fileName, ndjson, {
                contentType: 'application/x-ndjson',
                upsert: true
            })

        if (uploadError) throw uploadError

        // 4. Cleanup archived logs from DB
        const logIds = logs.map(l => l.id)
        const { error: cleanupError } = await supabase.rpc('cleanup_archived_logs', { p_log_ids: logIds })

        if (cleanupError) throw cleanupError

        return new Response(JSON.stringify({
            message: 'Archival successful',
            count: logs.length,
            file: fileName
        }), { status: 200 })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})
