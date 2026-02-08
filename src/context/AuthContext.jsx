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
        const startTime = Date.now();
        console.log(`[AuthDebug] 🛰️ Starting fetchRole for: ${userId}`);

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
            console.log(`[AuthDebug] Final Role: ${finalRole}, Allowed Customers: "${customers}"`);
            setRole(finalRole);
            setAllowedCustomers(customers);
            setLoading(false);

        } catch (e) {
            if (e.name === 'AbortError') {
                console.error('[AuthDebug] 🚨 CRITICAL: Role fetch ABORTED (Possible SQL Recursion loop).');
            } else {
                console.error('[AuthDebug] Exception fetching role:', e);
            }
            setRole('client');
            setLoading(false);
        } finally {
            console.log(`[AuthDebug] ✅ fetchRole complete in ${Date.now() - startTime}ms`);
        }
    }, []);

    const userRef = React.useRef(null);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (loading) {
                console.warn('[AuthDebug] ⏱️ Safety timeout reached. Forcing loading false.');
                setLoading(false);
            }
        }, 1500);

        if (!supabase) {
            setLoading(false);
            return;
        }

        const getSession = async () => {
            try {
                // Check if we already have a user/role from a previous sync in the same session
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    console.log(`[AuthDebug] 🔄 Initial Session Found: ${session.user.id}`);
                    userRef.current = session.user;
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
            console.log(`[AuthDebug] 🔄 Auth Event: ${_event}`);

            if (session?.user) {
                const isNewUser = !userRef.current || userRef.current.id !== session.user.id;

                if (_event === 'SIGNED_IN' || isNewUser) {
                    console.log(`[AuthDebug] 🛡️ Identity Change/Login: ${session.user.id}`);
                    // Only show full loading if we don't have a user yet or it's a fresh sign-in
                    if (isNewUser) setLoading(true);

                    userRef.current = session.user;
                    setUser(session.user);
                    await fetchRole(session.user.id);
                } else {
                    // Just update session data silently (e.g. TOKEN_REFRESHED)
                    userRef.current = session.user;
                    setUser(session.user);
                }
            } else {
                console.log('[AuthDebug] 🚪 No Session');
                userRef.current = null;
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
    }, [fetchRole]);

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
            {loading ? (
                <div style={{
                    height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-app)', color: 'white', gap: '1.5rem'
                }}>
                    <div className="spinner" style={{
                        width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)',
                        borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite'
                    }}></div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <div style={{ fontSize: '1.1rem', fontWeight: '500', opacity: 0.8 }}>Initializing Secure Session...</div>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};
