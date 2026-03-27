import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useInactivityTimer } from '../hooks/useInactivityTimer';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [allowedCustomers, setAllowedCustomers] = useState('');
    const [logoUrl, setLogoUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSkip, setShowSkip] = useState(false);

    const userRef = React.useRef(null);
    const fetchingRef = React.useRef(null);

    const fetchRole = React.useCallback(async (userId, retries = 2) => {
        if (!userId) {
            setLoading(false);
            return;
        }
        
        if (fetchingRef.current === userId) {
            console.log(`[AuthDebug] ⏹️ fetchRole already in progress for ${userId}, waiting...`);
            return;
        }
        
        fetchingRef.current = userId;
        const startTime = Date.now();
        console.log(`[AuthDebug] 🛰️ Starting fetchRole for: ${userId} (Attempt: ${3 - retries})`);

        try {
            const { data, error: dbError } = await supabase
                .from('profiles')
                .select('role, allowed_customers, custom_logo_url')
                .eq('id', userId)
                .single();

            if (dbError && dbError.code === 'PGRST116' && retries > 0) {
                console.warn('[AuthDebug] Profile missing, creating default...');
                await supabase.from('profiles').insert([{ id: userId, role: 'client' }]);
                await new Promise(res => setTimeout(res, 500));
                fetchingRef.current = null;
                return await fetchRole(userId, retries - 1);
            } else if (dbError && retries > 0) {
                console.warn(`[AuthDebug] Fetch failed (${dbError.message}), retrying... (${retries} left)`);
                await new Promise(res => setTimeout(res, 1000));
                fetchingRef.current = null;
                return await fetchRole(userId, retries - 1);
            }

            const finalRole = data?.role || 'client';
            const customers = data?.allowed_customers || '';
            const customLogo = data?.custom_logo_url || null;
            
            console.log(`[AuthDebug] Final Role: ${finalRole}, Customers: ${customers ? 'Set' : 'Empty'}`);
            
            // Atomic state updates
            setRole(finalRole);
            setAllowedCustomers(customers);
            setLogoUrl(customLogo);
            
        } catch (e) {
            console.error('[AuthDebug] Exception fetching role:', e);
            setRole('client');
        } finally {
            fetchingRef.current = null;
            setLoading(false);
            console.log(`[AuthDebug] ✅ fetchRole complete in ${Date.now() - startTime}ms`);
        }
    }, []);

    // Global Safety Timeout
    useEffect(() => {
        if (!loading) return;
        const timeoutId = setTimeout(() => {
            if (loading) {
                console.warn('[AuthDebug] 🚨 6s limit reached! Forcing initialization to complete.');
                setLoading(false);
            }
        }, 6000);
        return () => clearTimeout(timeoutId);
    }, [loading]);

    // Skip Button Logic
    useEffect(() => {
        if (loading) {
            const t = setTimeout(() => setShowSkip(true), 3500);
            return () => clearTimeout(t);
        } else {
            setShowSkip(false);
        }
    }, [loading]);

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log(`[AuthDebug] 🔄 Auth Event: ${_event}`);

            if (session?.user) {
                const isNewUser = !userRef.current || userRef.current.id !== session.user.id;
                userRef.current = session.user;
                setUser(session.user);

                if (isNewUser || _event === 'INITIAL_SESSION' || _event === 'SIGNED_IN') {
                    if (isNewUser) setLoading(true);
                    await fetchRole(session.user.id);
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

        return () => subscription.unsubscribe();
    }, [fetchRole]);

    const signOut = React.useCallback(async () => {
        setLoading(true);
        try {
            await supabase.auth.signOut();
            setUser(null);
            setRole(null);
            setAllowedCustomers('');
            setLogoUrl(null);
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-')) localStorage.removeItem(key);
            });
            window.location.href = '/login';
        } catch (e) {
            console.error('SignOut Error:', e);
            window.location.href = '/login';
        } finally {
            setLoading(false);
        }
    }, []);

    const signIn = async (email, password) => {
        if (!supabase) return { error: { message: "Supabase not configured" } };
        return supabase.auth.signInWithPassword({ email, password });
    };

    const signUp = async (email, password) => {
        if (!supabase) return { error: { message: "Supabase not configured" } };
        return supabase.auth.signUp({ email, password });
    };

    useInactivityTimer(600000, signOut, !!user);

    const contextValue = React.useMemo(() => ({
        user,
        role,
        allowedCustomers,
        logoUrl,
        loading,
        signIn,
        signOut,
        signUp
    }), [user, role, allowedCustomers, logoUrl, loading, signOut]);

    return (
        <AuthContext.Provider value={contextValue}>
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
