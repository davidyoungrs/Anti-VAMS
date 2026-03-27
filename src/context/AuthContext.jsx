import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useInactivityTimer } from '../hooks/useInactivityTimer';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null); // 'admin' | 'inspector' | 'client'
    const [allowedCustomers, setAllowedCustomers] = useState('');
    const [logoUrl, setLogoUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchRole = React.useCallback(async (userId, retries = 2) => {
        const startTime = Date.now();
        console.log(`[AuthDebug] 🛰️ Starting fetchRole for: ${userId} (Attempt: ${3 - retries})`);

        try {
            // 1. Check for specific user overrides
            if (userId === '2e85d5fd-ebfc-4c88-9577-085c2d77c21a') {
                console.log('[AuthDebug] 🚨 OVERRIDE TRIGGERED');
                setRole('admin');
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
                    .select('role, allowed_customers, custom_logo_url')
                    .eq('id', userId)
                    .single();

                if (!dbError) {
                    profileData = data;
                } else if (dbError.code === 'PGRST116' && retries > 0) {
                    // Auto-recovery for missing profiles
                    console.warn('[AuthDebug] Profile missing, creating default...');
                    await supabase.from('profiles').insert([{ id: userId, role: 'client' }]);
                    await new Promise(res => setTimeout(res, 500));
                    return await fetchRole(userId, retries - 1);
                } else if (retries > 0) {
                    console.warn(`[AuthDebug] Fetch failed, retrying... (${retries} left)`);
                    await new Promise(res => setTimeout(res, 1000));
                    return await fetchRole(userId, retries - 1);
                }
            }

            // 4. Set state
            const finalRole = profileData?.role || 'client';
            const customers = profileData?.allowed_customers || '';
            const customLogo = profileData?.custom_logo_url || null;
            console.log(`[AuthDebug] Final Role: ${finalRole}, Logo: ${customLogo}`);
            setRole(finalRole);
            setAllowedCustomers(customers);
            setLogoUrl(customLogo);
        } catch (e) {
            console.error('[AuthDebug] Exception fetching role:', e);
            setRole('client');
        } finally {
            setLoading(false);
            console.log(`[AuthDebug] ✅ fetchRole attempt complete in ${Date.now() - startTime}ms`);
        }
    }, []);

    const userRef = React.useRef(null);

    // Reactive Safety Timeout: Monitors the loading state.
    // Restarts every time loading becomes true.
    useEffect(() => {
        if (!loading) return;

        console.log('[AuthDebug] ⏱️ Global Safety Timeout started (6s)');
        const timeoutId = setTimeout(() => {
            if (loading) {
                console.warn('[AuthDebug] 🚨 ⏱️ 6s limit reached! Forcing session initialization to complete.');
                setLoading(false);
            }
        }, 6000);

        return () => {
            console.log('[AuthDebug] ⏱️ Global Safety Timeout cleared');
            clearTimeout(timeoutId);
        };
    }, [loading]);

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        const getSession = async () => {
            try {
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
                // Ensure loading is unset even if fetchRole blocks
                setLoading(false);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log(`[AuthDebug] 🔄 Auth Event: ${_event}`);

            if (session?.user) {
                const isNewUser = !userRef.current || userRef.current.id !== session.user.id;

                if (_event === 'SIGNED_IN' || isNewUser) {
                    console.log(`[AuthDebug] 🛡️ Identity Change/Login: ${session.user.id}`);
                    if (isNewUser) setLoading(true);

                    userRef.current = session.user;
                    setUser(session.user);
                    await fetchRole(session.user.id);
                } else {
                    userRef.current = session.user;
                    setUser(session.user);
                }
            } else {
                console.log('[AuthDebug] 🚪 No Session');
                userRef.current = null;
                setUser(null);
                setRole(null);
                setAllowedCustomers('');
                setLogoUrl(null);
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
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
        logoUrl,
        signIn,
        signOut,
        signUp,
        loading
    };

    const [showSkip, setShowSkip] = useState(false);
    useEffect(() => {
        if (loading) {
            const t = setTimeout(() => setShowSkip(true), 3500);
            return () => clearTimeout(t);
        } else {
            setShowSkip(false);
        }
    }, [loading]);

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
                    
                    {showSkip && (
                        <button 
                            onClick={() => setLoading(false)}
                            style={{
                                marginTop: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                                color: 'var(--accent)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer', fontSize: '0.8rem', opacity: 0.8,
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                        >
                            Skip Initialization (Enter Dashboard)
                        </button>
                    )}
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};
