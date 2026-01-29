import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null); // 'admin' | 'inspector' | 'client'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Safety timeout: If auth takes too long, stop loading so user isn't stuck on blank screen
        const timeoutId = setTimeout(() => {
            setLoading(false);
        }, 3000);

        if (!supabase) {
            setLoading(false);
            return;
        }

        // Check active session
        const getSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUser(session.user);
                    // Don't await role fetch to block UI, let it populate async
                    fetchRole(session.user.id);
                }
            } catch (err) {
                console.error("Session check failed", err);
            } finally {
                setLoading(false);
                clearTimeout(timeoutId);
            }
        };

        getSession();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                setUser(session.user);
                if (_event === 'SIGNED_IN') {
                    await fetchRole(session.user.id);
                }
            } else {
                setUser(null);
                setRole(null);
                // Ensure loading is false on sign out
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeoutId);
        };
    }, []);

    const fetchRole = async (userId, retries = 2) => {
        // Log the URL we are trying to connect to (helpful for debugging)
        // Accessing via the imported client object if possible, or just checking if it exists
        console.log(`[AuthDebug] Fetching role for User ID: ${userId}`);
        // We can't easily see the internal URL from the client instance in all versions, 
        // but we can trust that if 'supabase' exists, it was initialized.

        try {
            // connection probe
            const { count, error: countError } = await supabase.from('valve_records').select('*', { count: 'exact', head: true });
            if (countError) console.warn('[AuthDebug] DB Connection Check Failed:', countError);
            else console.log('[AuthDebug] DB Connection Check Passed. Record count:', count);

            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            if (error) {
                console.warn(`Error fetching role (Attempts left: ${retries}):`, error.message);

                // Auto-Recovery: If profile is missing (PGRST116), try to create it
                if (error.code === 'PGRST116' && userId) {
                    console.warn("Profile missing. Attempting auto-recovery...");
                    try {
                        const { error: insertError } = await supabase
                            .from('profiles')
                            // We don't know the email here easily without creating a circular dep or refetching user
                            // checking if 'user' state is available, but it might not be set yet.
                            // However, RLS policy for insert likely requires auth.uid() match.
                            // We can just set id, and let defaults handle role. 
                            // Note: We might need email for the profile if the table requires it.
                            // Let's assume table has id and role default.
                            .insert([{ id: userId, role: 'client' }]);

                        if (!insertError) {
                            console.log("Auto-recovery successful. Profile created.");
                            // Retry fetch immediately
                            if (retries > 0) {
                                setTimeout(() => fetchRole(userId, retries - 1), 500);
                                return;
                            }
                        } else {
                            console.error("Auto-recovery failed:", insertError);
                        }
                    } catch (recoveryErr) {
                        console.error("Auto-recovery exception:", recoveryErr);
                    }
                }

                if (retries > 0) {
                    setTimeout(() => fetchRole(userId, retries - 1), 1000);
                    return;
                }

                console.error('Final error fetching role for user:', userId, error);

                // Fallback to client if error or no profile
                setRole('client');
                setLoading(false);
            } else {
                console.log('[AuthDebug] Role fetch raw data:', data);
                if (!data) {
                    console.warn('[AuthDebug] Data object is null/undefined!');
                } else if (!data.role) {
                    console.warn('[AuthDebug] Role field is missing or null in data:', data);
                }

                const finalRole = data?.role || 'client';
                console.log(`[AuthDebug] Setting final role to: ${finalRole}`);
                setRole(finalRole);
                setLoading(false);
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                console.warn(`Fetch aborted (Attempts left: ${retries})`);
                if (retries > 0) {
                    setTimeout(() => fetchRole(userId, retries - 1), 500);
                    return;
                }
            } else {
                console.error('Exception fetching role:', e);
            }
            setRole('client');
            setLoading(false);
        }
    };

    const signIn = async (email, password) => {
        if (!supabase) return { error: { message: "Supabase not configured" } };
        return supabase.auth.signInWithPassword({ email, password });
    };

    const signOut = async () => {
        if (!supabase) return;
        return supabase.auth.signOut();
    };

    const signUp = async (email, password) => {
        if (!supabase) return { error: { message: "Supabase not configured" } };
        return supabase.auth.signUp({ email, password });
    };

    const value = {
        user,
        role,
        signIn,
        signOut,
        signUp,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
