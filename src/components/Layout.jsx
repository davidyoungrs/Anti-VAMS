import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const Layout = ({ children, activeView, onNavigate, userRole }) => {
  const { signOut } = useAuth();
  const [isAdminOpen, setIsAdminOpen] = useState(false); // Default collapsed
  const [isChartsOpen, setIsChartsOpen] = useState(false); // Default collapsedn for visibility
  const mainContentRef = useRef(null);

  // Scroll to top whenever the active view changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [activeView]);

  const getItemStyle = (viewName) => ({
    display: 'block',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: activeView === viewName ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
    color: activeView === viewName ? 'var(--primary)' : 'var(--text-muted)',
    textDecoration: 'none',
    fontWeight: activeView === viewName ? '600' : '400',
    cursor: 'pointer',
    transition: 'all 0.2s'
  });

  return (
    <div className="dashboard-grid">
      {/* Sidebar */}
      <aside className="glass-panel" style={{
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '48px', width: 'auto' }} />
          <h1 style={{
            margin: 0,
            fontSize: '1.2rem',
            background: 'linear-gradient(to right, var(--primary), var(--accent))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: '800'
          }}>
            Global Valve Record
          </h1>
        </div>

        <nav style={{ flex: 1, padding: '1rem' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <a onClick={() => onNavigate('dashboard')} style={getItemStyle('dashboard')}>
                Dashboard
              </a>
            </li>
            {userRole !== 'client' && (
              <li style={{ marginBottom: '0.5rem' }}>
                <a onClick={() => onNavigate('create')} style={getItemStyle('create')}>
                  Add New Record
                </a>
              </li>
            )}
            <li style={{ marginBottom: '0.5rem' }}>
              <a onClick={() => onNavigate('search')} style={getItemStyle('search')}>
                Search Records
              </a>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <a onClick={() => onNavigate('jobs')} style={getItemStyle('jobs')}>
                Jobs
              </a>
            </li>
            {userRole !== 'client' && (
              <li style={{ marginBottom: '0.5rem' }}>
                <a onClick={() => onNavigate('map')} style={getItemStyle('map')}>
                  Valve Map
                </a>
              </li>
            )}
            {/* Dashboards and Charts Group */}
            <li style={{ marginBottom: '0.5rem' }}>
              <div
                onClick={() => setIsChartsOpen(!isChartsOpen)}
                style={{
                  ...getItemStyle('charts-group'),
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                Dashboards & Charts
                <span style={{ fontSize: '0.8rem' }}>{isChartsOpen ? '▼' : '▶'}</span>
              </div>

              {isChartsOpen && (
                <ul style={{ listStyle: 'none', padding: '0.5rem 0 0 1.5rem', margin: 0 }}>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <a onClick={() => onNavigate('analytics')} style={{ ...getItemStyle('analytics'), fontSize: '0.9rem' }}>
                      Analytics
                    </a>
                  </li>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <a onClick={() => onNavigate('scheduler')} style={{ ...getItemStyle('scheduler'), fontSize: '0.9rem' }}>
                      Maintenance Scheduler
                    </a>
                  </li>
                </ul>
              )}
            </li>

            <li style={{ marginBottom: '0.5rem' }}>
              <div
                onClick={() => setIsAdminOpen(!isAdminOpen)}
                style={{
                  ...getItemStyle('admin-group'),
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                Admin
                <span style={{ fontSize: '0.8rem' }}>{isAdminOpen ? '▼' : '▶'}</span>
              </div>

              {isAdminOpen && (
                <ul style={{ listStyle: 'none', padding: '0.5rem 0 0 1.5rem', margin: 0 }}>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <a onClick={() => onNavigate('admin')} style={{ ...getItemStyle('admin'), fontSize: '0.9rem' }}>
                      Admin Panel
                    </a>
                  </li>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <a onClick={() => onNavigate('user-guide')} style={{ ...getItemStyle('user-guide'), fontSize: '0.9rem' }}>
                      User Guide
                    </a>
                  </li>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <a onClick={() => onNavigate('features')} style={{ ...getItemStyle('features'), fontSize: '0.9rem' }}>
                      Features
                    </a>
                  </li>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <a onClick={() => onNavigate('roadmap')} style={{ ...getItemStyle('roadmap'), fontSize: '0.9rem' }}>
                      Strategic Roadmap
                    </a>
                  </li>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <a onClick={() => onNavigate('licenses')} style={{ ...getItemStyle('licenses'), fontSize: '0.9rem' }}>
                      Licenses
                    </a>
                  </li>
                </ul>
              )}
            </li>
            <li style={{ marginBottom: '0.5rem' }}> <a href="https://thevalve.pro" target="_blank" rel="noopener noreferrer" style={{ ...getItemStyle('TheValve.pro'), color: 'white', fontWeight: 'bold', border: '1px solid white' }} > TheValve.pro </a>
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <a onClick={() => onNavigate('legal')} style={getItemStyle('legal')}>
                Legal Terms
              </a>
            </li>

          </ul>
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            User: {userRole ? userRole.toUpperCase() : 'UNKNOWN'}
          </div>
          <button
            onClick={async () => {
              if (window.confirm('Are you sure you want to sign out?')) {
                await signOut();
              }
            }}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              width: '100%',
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              marginBottom: '1rem'
            }}
          >
            Sign Out
          </button>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.8 }}>
            Copyright © 2026 TheValve.pro. All rights reserved.
          </div>
        </div>
      </aside >

      {/* Main Content */}
      < main className="main-content" ref={mainContentRef} >
        {children}
        <footer style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', opacity: 0.7 }}>
          Copyright © 2026 TheValve.pro All rights reserved.
        </footer>
      </main >
    </div >
  );
};
