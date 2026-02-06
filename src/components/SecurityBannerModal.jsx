import React from 'react';

export const SecurityBannerModal = ({ title, text, acceptButtonText, onAccept, onReject }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '2rem',
            backdropFilter: 'blur(8px)'
        }}>
            <div className="glass-panel" style={{
                maxWidth: '700px',
                width: '100%',
                maxHeight: '80vh',
                overflowY: 'auto',
                padding: '2.5rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(14, 165, 233, 0.3)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
            }}>
                <h2 style={{
                    color: 'var(--primary)',
                    marginBottom: '1.5rem',
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 'bold'
                }}>
                    ⚠️ {title}
                </h2>

                <div style={{
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-line',
                    marginBottom: '2rem',
                    textAlign: 'justify'
                }}>
                    {text}
                </div>

                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={onAccept}
                        className="btn-primary"
                        style={{ padding: '0.75rem 2rem' }}
                    >
                        {acceptButtonText}
                    </button>
                    {onReject && (
                        <button
                            onClick={onReject}
                            className="btn-secondary"
                            style={{ padding: '0.75rem 2rem', border: '1px solid var(--border-color)' }}
                        >
                            Decline
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
