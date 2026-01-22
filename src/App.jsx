import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { RecordForm } from './pages/RecordForm';
import { storageService } from './services/storage';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [stats, setStats] = useState({ total: 0, testPending: 0 });
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Load data on mount and view change
  React.useEffect(() => {
    const loadData = async () => {
      const allRecords = await storageService.getAll();
      setStats({
        total: allRecords.length,
        testPending: allRecords.filter(r => !r.testDate).length
      });
      setRecords(allRecords);
    };
    loadData();
  }, [currentView]); // Reload when switching views to get fresh data

  const handleRecordClick = (record) => {
    setSelectedRecord(record);
    setCurrentView('record-detail');
  };

  const handleNavigate = (view) => {
    setCurrentView(view);
    if (view === 'create') {
      setSelectedRecord(null); // Clear selected if creating new
    }
  };

  const handleSync = async () => {
    const result = await storageService.syncLocalToCloud();
    if (result.error) {
      alert(`Sync failed: ${result.error.message || result.error}`);
    } else {
      alert(`Successfully synced ${result.count} records to the cloud!`);
      const allRecords = await storageService.getAll();
      setRecords(allRecords);
    }
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Serial Number,Customer,OEM,Job No,Tag No,Order No,Date In\n"
      + records.map(r =>
        `"${r.serialNumber || ''}","${r.customer || ''}","${r.oem || ''}","${r.jobNo || ''}","${r.tagNo || ''}","${r.orderNo || ''}","${r.dateIn || ''}"`
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "valve_records.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const rows = text.split('\n').map(row => row.split(','));
      let importedCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 3) continue;

        const clean = (val) => val ? val.replace(/"/g, '') : '';
        const record = {
          serialNumber: clean(row[0]),
          customer: clean(row[1]),
          oem: clean(row[2]),
          jobNo: clean(row[3]),
          tagNo: clean(row[4]),
          orderNo: clean(row[5]),
          dateIn: clean(row[6]),
          status: 'Pending',
          passFail: 'Pending'
        };

        if (record.serialNumber) {
          await storageService.save(record);
          importedCount++;
        }
      }

      if (importedCount > 0) {
        alert(`Successfully imported ${importedCount} records!`);
        const allRecords = await storageService.getAll();
        setRecords(allRecords);
        setStats({
          total: allRecords.length,
          testPending: allRecords.filter(r => !r.testDate).length
        });
      }
    };
    reader.readAsText(file);
    e.target.value = null; // Reset input
  };

  const renderContent = () => {
    switch (currentView) {
      case 'create':
        return <RecordForm key="create" onSave={() => setCurrentView('dashboard')} />;
      case 'record-detail':
        return <RecordForm key={selectedRecord?.id || 'detail'} initialData={selectedRecord} onSave={() => setCurrentView('dashboard')} />;
      case 'search':
        // Handle search filtering client side on the loaded records
        const filteredRecords = records.filter(r =>
          r.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.oem?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 className="section-title">Search Records</h2>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by Serial No, Customer, or OEM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '1.2rem', padding: '1rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredRecords.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No records found.</p>
              ) : (
                filteredRecords.map(record => (
                  <div
                    key={record.id}
                    className="glass-panel"
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                    onClick={() => handleRecordClick(record)}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div className="flex-row" style={{ justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{record.serialNumber}</h4>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span>{record.customer} | {record.oem} | {record.dateIn || record.date_in}</span>
                          {(record.files?.length > 0 || record.file_urls?.length > 0) && (
                            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                              📎 {(record.files?.length || record.file_urls?.length)} Files
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          background: (record.pass_fail === 'Y' || record.passFail === 'Y') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: (record.pass_fail === 'Y' || record.passFail === 'Y') ? '#10b981' : '#ef4444',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>
                          {(record.pass_fail === 'Y' || record.passFail === 'Y') ? 'PASS' : ((record.pass_fail === 'N' || record.passFail === 'N') ? 'FAIL' : 'PENDING')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      case 'dashboard':
      default:
        return (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 className="section-title">Dashboard Overview</h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  Welcome to the Global Valve Record system. Select an option from the sidebar to begin.
                </p>
              </div>
              <button
                className="btn-secondary"
                onClick={handleSync}
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                  color: 'white',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                }}
              >
                ☁️ Sync Local to Cloud
              </button>
            </div>

            <div className="grid-3 mt-4">
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)' }}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>Recent Records</h3>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.total}</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)' }}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>Pending Tests</h3>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{stats.testPending}</div>
              </div>
            </div>

            <div className="mt-4" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn-primary" onClick={() => handleNavigate('create')}>+ New Valve Record</button>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button
                  className="btn-secondary"
                  onClick={handleExport}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--primary)',
                    color: 'var(--primary)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  📥 Export / Template
                </button>

                <label
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--text-muted)',
                    color: 'var(--text-primary)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontWeight: '600',
                    display: 'inline-block'
                  }}
                >
                  📤 Import CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImport}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Layout activeView={currentView} onNavigate={handleNavigate}>
      {renderContent()}
    </Layout>
  );
}

export default App;
