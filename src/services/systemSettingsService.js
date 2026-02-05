import { supabase } from './supabaseClient';

class SystemSettingsService {
    constructor() {
        this.cache = {
            emergency_mode: false
        };
        this.initialized = false;
        this.subscribers = new Set();
    }

    async init() {
        if (this.initialized) return;
        if (!supabase) return;

        // 1. Initial Load
        await this.refreshSettings();

        // 2. Realtime Subscription
        supabase
            .channel('public:system_settings')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_settings' }, (payload) => {
                if (payload.new && payload.new.key) {
                    this.cache[payload.new.key] = payload.new.value;
                    this.notifySubscribers();
                }
            })
            .subscribe();

        this.initialized = true;
    }

    async refreshSettings() {
        if (!supabase) return;
        const { data, error } = await supabase
            .from('system_settings')
            .select('key, value');

        if (!error && data) {
            data.forEach(item => {
                this.cache[item.key] = item.value;
            });
            this.notifySubscribers();
        }
    }

    async getServerTime() {
        if (!supabase) return { error: 'Offline', time: null };
        const start = Date.now();
        const { data, error } = await supabase.rpc('get_server_time');
        const end = Date.now();
        const latency = (end - start) / 2; // Approximate network latency

        return {
            error,
            serverTime: data ? new Date(data) : null,
            latency
        };
    }

    // Synchronous check (fast) for storage service
    isEmergencyMode() {
        // Default to false if not initialized, or unsafe?
        // Better false to allow work if offline, but if online we should know.
        return this.cache.emergency_mode === true;
    }

    async setEmergencyMode(enabled) {
        if (!supabase) throw new Error("Offline");

        const { error } = await supabase
            .from('system_settings')
            .update({ value: enabled, updated_at: new Date().toISOString() })
            .eq('key', 'emergency_mode');

        if (error) throw error;
        // Optimistic update
        this.cache.emergency_mode = enabled;
        this.notifySubscribers();
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        // Instant callback with current state
        callback(this.cache);
        return () => this.subscribers.delete(callback);
    }

    notifySubscribers() {
        this.subscribers.forEach(cb => cb(this.cache));
    }
}

export const systemSettingsService = new SystemSettingsService();
