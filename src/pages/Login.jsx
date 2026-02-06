import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

import { auditService } from '../services/auditService';
import { SecurityBannerModal } from '../components/SecurityBannerModal';
import { config } from '../config';

export const Login = () => {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [bannerAccepted, setBannerAccepted] = useState(false);

    const handleAcceptBanner = async () => {
        // Log acceptance immediately (even before login attempt)
        await auditService.logEvent('SECURITY_BANNER_ACCEPTED', {
            timestamp: new Date().toISOString(),
            status: 'CONSENTED'
        }, 'INFO', email || 'Anonymous');

        setBannerAccepted(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: err } = await signIn(email, password);
            if (err) throw err;

            // Log Success
            await auditService.logEvent('LOGIN_SUCCESS', { method: 'password' }, 'INFO', email);
        } catch (err) {
            console.error(err);
            setError(err.message);
            // Log Failure
            await auditService.logEvent('LOGIN_FAILED', { error: err.message }, 'WARNING', email);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'var(--bg-app)',
            color: 'var(--text-primary)'
        }}>
            {config.security.showBanner && !bannerAccepted && (
                <SecurityBannerModal
                    title={config.security.bannerTitle}
                    text={config.security.bannerText}
                    acceptButtonText={config.security.acceptButtonText}
                    onAccept={handleAcceptBanner}
                    onReject={() => window.location.href = 'https://thevalve.pro'} // Redirect on decline
                />
            )}

            <div className="glass-panel" style={{
                padding: '3rem',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
            }}>
                <h1 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>
                    Welcome Back
                </h1>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '1.5rem',
                        fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-primary)',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-primary)',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        style={{
                            marginTop: '1rem',
                            padding: '0.875rem',
                            fontSize: '1rem',
                            width: '100%'
                        }}
                    >
                        {loading ? 'Processing...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};
