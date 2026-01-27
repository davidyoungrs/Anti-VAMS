import React from 'react';

export const MarkdownPage = ({ title, content }) => {
    // Simple markdown processor
    const processLine = (line, index) => {
        // Headers
        if (line.startsWith('# ')) return <h1 key={index} className="section-title" style={{ marginTop: '2rem' }}>{line.replace('# ', '')}</h1>;
        if (line.startsWith('## ')) return <h2 key={index} style={{ color: 'var(--primary)', marginTop: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>{line.replace('## ', '')}</h2>;
        if (line.startsWith('### ')) return <h3 key={index} style={{ color: 'var(--text-primary)', marginTop: '1rem' }}>{line.replace('### ', '')}</h3>;

        // Lists
        if (line.trim().startsWith('- ')) {
            return (
                <li key={index} style={{ marginLeft: '1.5rem', marginBottom: '0.5rem' }}>
                    {line.trim().replace('- ', '')}
                </li>
            );
        }

        // Horizontal Rule
        if (line.trim() === '---') return <hr key={index} style={{ margin: '2rem 0', borderColor: 'var(--border-color)' }} />;

        // Empty lines
        if (line.trim() === '') return <div key={index} style={{ height: '0.5rem' }}></div>;

        // Default paragraph
        return <p key={index} style={{ lineHeight: '1.6', color: 'var(--text-secondary)' }}>{line}</p>;
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '900px', margin: '0 auto' }}>
            <h1 className="section-title" style={{ marginBottom: '2rem' }}>{title}</h1>
            <div className="markdown-content">
                {content.split('\n').map((line, i) => processLine(line, i))}
            </div>
        </div>
    );
};
