import React, { useState, useRef, useEffect } from 'react';

export const SearchableJobSelect = ({ jobs, selectedJobId, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);

    // Convert jobs map/array to array
    const jobList = Array.isArray(jobs) ? jobs : Object.values(jobs || {});

    // Filter jobs based on search
    const filteredJobs = jobList.filter(job =>
        job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (job.clientName && job.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const selectedJob = jobList.find(j => j.id === selectedJobId);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    return (
        <div ref={wrapperRef} style={{ position: 'relative', flex: 1 }}>
            {/* The Trigger (looks like a select box) */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    padding: '1rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none'
                }}
            >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedJob ? selectedJob.name : 'Filter by Job...'}
                </span>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>▼</span>
            </div>

            {/* The Dropdown Menu */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    zIndex: 100,
                    maxHeight: '300px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Search Input */}
                    <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        <input
                            type="text"
                            placeholder="Type to search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()} // Prevent closing
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>

                    {/* Options List */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        <div
                            onClick={() => {
                                onChange('');
                                setIsOpen(false);
                                setSearchTerm('');
                            }}
                            className="dropdown-item"
                            style={{
                                padding: '0.75rem 1rem',
                                cursor: 'pointer',
                                borderBottom: '1px solid rgba(255,255,255,0.02)',
                                color: 'var(--text-muted)',
                                fontStyle: 'italic'
                            }}
                        >
                            -- Clear Filter (Show All) --
                        </div>
                        {filteredJobs.map(job => (
                            <div
                                key={job.id}
                                onClick={() => {
                                    onChange(job.id);
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                                className="dropdown-item"
                                style={{
                                    padding: '0.75rem 1rem',
                                    cursor: 'pointer',
                                    background: selectedJobId === job.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    color: selectedJobId === job.id ? '#60a5fa' : 'var(--text-primary)',
                                    borderBottom: '1px solid rgba(255,255,255,0.02)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = selectedJobId === job.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}
                            >
                                <div style={{ fontWeight: 'bold' }}>{job.name}</div>
                                {job.clientName && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{job.clientName}</div>}
                            </div>
                        ))}
                        {filteredJobs.length === 0 && (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No jobs found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
