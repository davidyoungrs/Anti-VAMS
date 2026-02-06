import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useInactivityTimer } from '../hooks/useInactivityTimer';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null); // 'admin' | 'inspector' | 'client'
    const [allowedCustomers, setAllowedCustomers] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchRole = React.useCallback(async (userId, retries = 2) => {
        console.log(`[AuthDebug] Fetching role for User ID: ${userId}`);

        try {
            // 1. Check for specific user overrides
            if (userId === '2e85d5fd-ebfc-4c88-9577-085c2d77c21a') {
                console.log('[AuthDebug] 🚨 OVERRIDE TRIGGERED');
                setRole('admin');
                setLoading(false);
                return;
            }

            // 2. Try RPC first
            let profileData = null;
            try {
                const { data: rpcData, error: rpcError } = await supabase.rpc('get_active_user_role');
                if (!rpcError && rpcData) {
                    profileData = rpcData;
                }
            } catch (rpcEx) {
                console.warn('[AuthDebug] RPC Exception:', rpcEx);
            }

            // 3. Fallback to DB Select
            if (!profileData) {
                const { data, error: dbError } = await supabase
                    .from('profiles')
                    .select('role, allowed_customers')
                    .eq('id', userId)
                    .single();

                if (!dbError) {
                    profileData = data;
                } else if (dbError.code === 'PGRST116' && retries > 0) {
                    // Auto-recovery for missing profiles
                    await supabase.from('profiles').insert([{ id: userId, role: 'client' }]);
                    setTimeout(() => fetchRole(userId, retries - 1), 500);
                    return;
                } else if (retries > 0) {
                    setTimeout(() => fetchRole(userId, retries - 1), 1000);
                    return;
                }
            }

            // 4. Set state
            const finalRole = profileData?.role || 'client';
            const customers = profileData?.allowed_customers || '';
            setRole(finalRole);
            setAllowedCustomers(customers);
            setLoading(false);

        } catch (e) {
            console.error('Exception fetching role:', e);
            setRole('client');
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => setLoading(false), 3000);

        if (!supabase) {
            setLoading(false);
            return;
        }

        const getSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUser(session.user);
                    await fetchRole(session.user.id);
                }
            } catch (err) {
                console.error("Session check failed", err);
            } finally {
                setLoading(false);
                clearTimeout(timeoutId);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                if (_event === 'SIGNED_IN' || !user || user.id !== session.user.id) {
                    setLoading(true);
                    setUser(session.user);
                    fetchRole(session.user.id);
                } else {
                    setUser(session.user);
                }
            } else {
                setUser(null);
                setRole(null);
                setAllowedCustomers('');
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeoutId);
        };
    }, [user, fetchRole]);

    const signIn = async (email, password) => {
        if (!supabase) return { error: { message: "Supabase not configured" } };
        return supabase.auth.signInWithPassword({ email, password });
    };

    const signOut = async () => {
        console.log('[Auth] Signing out...');
        try {
            // 1. Clear Context State
            setUser(null);
            setRole(null);

            // 2. Clear Local Storage (Robust)
            // Remove any keys starting with 'sb-' to handle potential key mismatches
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-')) {
                    localStorage.removeItem(key);
                }
            });

            // 3. Supabase SignOut (Best Effort)
            if (supabase) await supabase.auth.signOut();
        } catch (e) {
            console.error('SignOut Exception:', e);
        } finally {
            // 4. Force Redirect to Login (avoids infinite reload loops)
            window.location.href = '/login';
        }
    };

    const signUp = async (email, password) => {
        if (!supabase) return { error: { message: "Supabase not configured" } };
        return supabase.auth.signUp({ email, password });
    };

    // Session Management: Auto-logout after 10 minutes (600,000 ms) of inactivity
    useInactivityTimer(600000, signOut, !!user);

    const value = {
        user,
        role,
        allowedCustomers,
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
