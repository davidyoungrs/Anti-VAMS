import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export const MarkdownPage = ({ title, content }) => {
    return (
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '900px', margin: '0 auto' }}>
            <h1 className="section-title" style={{ marginBottom: '2rem' }}>{title}</h1>
            <div className="markdown-content">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                        h1: (props) => <h1 className="section-title" style={{ marginTop: '2rem' }} {...props} />,
                        h2: (props) => <h2 style={{ color: 'var(--primary)', marginTop: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }} {...props} />,
                        h3: (props) => <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem' }} {...props} />,
                        h4: (props) => <h4 style={{ color: 'var(--text-primary)', marginTop: '0.5rem', fontWeight: '600' }} {...props} />,
                        ul: (props) => <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem', listStyleType: 'disc' }} {...props} />,
                        ol: (props) => <ol style={{ marginLeft: '1.5rem', marginBottom: '1rem', listStyleType: 'decimal' }} {...props} />,
                        li: (props) => <li style={{ marginBottom: '0.5rem' }} {...props} />,
                        hr: (props) => <hr style={{ margin: '2rem 0', borderColor: 'var(--border-color)' }} {...props} />,
                        p: (props) => <p style={{ lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '1rem' }} {...props} />,
                        table: (props) => <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', marginBottom: '1rem' }} {...props} />,
                        th: (props) => <th style={{ borderBottom: '2px solid var(--border-color)', padding: '0.75rem', textAlign: 'left', fontWeight: '600' }} {...props} />,
                        td: (props) => <td style={{ borderBottom: '1px solid var(--border-color)', padding: '0.75rem' }} {...props} />,
                        blockquote: (props) => <blockquote style={{ borderLeft: '4px solid var(--accent)', margin: '1rem 0', paddingLeft: '1rem', fontStyle: 'italic', color: 'var(--text-muted)' }} {...props} />,
                        strong: (props) => <strong style={{ color: 'var(--text-main)', fontWeight: 'bold' }} {...props} />,
                        a: (props) => <a style={{ color: 'var(--primary)', textDecoration: 'none' }} {...props} />
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
};
