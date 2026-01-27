import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { RecordForm } from './pages/RecordForm';
import { MapView } from './pages/MapView';
import InspectionFormGateValve from './pages/InspectionFormGateValve';
import InspectionFormBallValve from './pages/InspectionFormBallValve';
import InspectionFormGlobeControlValve from './pages/InspectionFormGlobeControlValve';
import InspectionFormButterflyValve from './pages/InspectionFormButterflyValve';
import InspectionFormCheckValve from './pages/InspectionFormCheckValve';
import InspectionFormPlugValve from './pages/InspectionFormPlugValve';
import InspectionFormPressureReliefValve from './pages/InspectionFormPressureReliefValve';
import { ValveTypeSelector } from './components/inspection/ValveTypeSelector';
import InspectionList from './pages/InspectionList';
import TestReportForm from './pages/TestReportForm';
import { AdminPanel } from './pages/AdminPanel';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { MaintenanceScheduler } from './pages/MaintenanceScheduler';
import { MarkdownPage } from './components/MarkdownPage';
import { storageService } from './services/storage';

// Import Markdown Content
import featuresContent from '../FEATURES.md?raw';
import userGuideContent from '../USER_GUIDE.md?raw';
import roadmapContent from '../ROADMAP.md?raw';
import legalContent from '../LEGAL_TERMS.md?raw';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [stats, setStats] = useState({ total: 0, testPending: 0 });
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [inspectionData, setInspectionData] = useState(null); // { valveId, inspectionId }

  // Load data on mount and view change
  const loadData = async () => {
    const allRecords = await storageService.getAll();
    setStats({
      total: allRecords.length,
      testPending: allRecords.filter(r => !r.testDate).length
    });
    setRecords(allRecords);
  };

  // Load data on mount
  // Load data on mount
  React.useEffect(() => {
    const init = async () => {
      await loadData();

      // Check for deep link
      const params = new URLSearchParams(window.location.search);
      const valveId = params.get('valveId');
      if (valveId) {
        // We need to fetch fresh records to ensure we find it
        const allRecords = await storageService.getAll();
        const target = allRecords.find(r => r.id === valveId);
        if (target) {
          handleRecordClick(target);
          // Optional: Clean URL so refresh doesn't stick
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    };
    init();
  }, []); // Only load on mount

  const handleRecordClick = async (record) => {
    // Update last viewed timestamp without blocking
    const updatedRecord = { ...record, lastViewedAt: new Date().toISOString() };
    await storageService.save(updatedRecord);

    // Ensure files array is populated from file_urls if necessary
    const normalizedRecord = {
      ...updatedRecord,
      files: updatedRecord.files || updatedRecord.file_urls || []
    };
    setSelectedRecord(normalizedRecord);
    setCurrentView('record-detail');

    // Refresh records to show updated timestamp in list immediately
    loadData();
  };

  const handleNavigate = (view, data = null) => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved location changes. Are you sure you want to leave?")) {
        return;
      }
      setHasUnsavedChanges(false);
    }

    if (data) {
      setSelectedRecord(data);
    } else if (view === 'create') {
      setSelectedRecord(null);
    }
    setCurrentView(view);
  };

  const handleMapSave = async () => {
    if (!selectedRecord) return;
    try {
      await storageService.save(selectedRecord);
      setHasUnsavedChanges(false);
      alert('Location saved successfully!');
      await loadData();
    } catch (error) {
      alert('Failed to save location: ' + error.message);
    }
  };

  const handleSync = async () => {
    const result = await storageService.syncLocalToCloud();
    if (result.error) {
      alert(`Sync failed: ${result.error.message || result.error}`);
    } else {
      if (result.success) {
        const cloudMsg = result.cloudTotal !== undefined ? ` (Cloud Total: ${result.cloudTotal})` : '';
        alert(`Successfully synced ${result.count} records to the cloud!${cloudMsg}`);
        // Reload to refresh view
        window.location.reload();
      } else {
        // Fallback if result.success is not explicitly true but no error
        alert(`Sync completed with no errors, but success status is unclear. Synced ${result.count} records.`);
        const allRecords = await storageService.getAll();
        setRecords(allRecords);
      }
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

  const handleSave = async () => {
    await loadData();
    setCurrentView('dashboard');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'create':
        return <RecordForm key="create" onSave={handleSave} onNavigate={handleNavigate} />;
      case 'admin':
        return <AdminPanel />;
      case 'user-guide':
        return <MarkdownPage title="User Guide" content={userGuideContent} />;
      case 'features':
        return <MarkdownPage title="System Features" content={featuresContent} />;
      case 'roadmap':
        return <MarkdownPage title="Strategic Development Roadmap" content={roadmapContent} />;
      case 'legal':
        return <MarkdownPage title="Legal Terms & Conditions" content={legalContent} />;
      case 'analytics':
        return <AnalyticsDashboard records={records} />;
      case 'scheduler':
        return <MaintenanceScheduler />;
      case 'record-detail':
        return <RecordForm key={selectedRecord?.id || 'detail'} initialData={selectedRecord} onSave={handleSave} onNavigate={handleNavigate} />;
      case 'search':
        // Handle search filtering client side on the loaded records
        const filteredRecords = records.filter(r =>
          r.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.oem?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.valveType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.sizeClass?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.mawp?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.tagNo?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 className="section-title">Search Records</h2>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by Serial No, Customer, OEM, Type, Size, Class, or Tag..."
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
                    className="clickable-card glass-panel"
                    style={{
                      padding: '1.25rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid transparent'
                    }}
                    onClick={() => handleRecordClick(record)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.2rem' }}>{record.serialNumber}</h4>
                        {(record.files?.length > 0 || record.file_urls?.length > 0) && (
                          <span
                            title={`${(record.files?.length || record.file_urls?.length)} attachments`}
                            style={{
                              fontSize: '0.9rem',
                              color: 'var(--accent)',
                              background: 'rgba(245, 158, 11, 0.1)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}
                          >
                            📎 {(record.files?.length || record.file_urls?.length)}
                          </span>
                        )}
                      </div>
                      <div className="grid-2" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', gap: '0.5rem 1.5rem' }}>
                        <div><span style={{ color: 'var(--text-label)' }}>Customer:</span> {record.customer}</div>
                        <div><span style={{ color: 'var(--text-label)' }}>OEM:</span> {record.oem}</div>
                        <div><span style={{ color: 'var(--text-label)' }}>Type:</span> {record.valveType || 'N/A'}</div>
                        <div><span style={{ color: 'var(--text-label)' }}>Size:</span> {record.sizeClass || 'N/A'}</div>
                        <div><span style={{ color: 'var(--text-label)' }}>Class:</span> {record.mawp || 'N/A'}</div>
                        <div><span style={{ color: 'var(--text-label)' }}>Tag:</span> {record.tagNo || 'N/A'}</div>
                      </div>
                    </div>
                    <div style={{ marginLeft: '1.5rem' }}>
                      <span style={{
                        padding: '0.4rem 1rem',
                        borderRadius: '20px',
                        background: (record.pass_fail === 'Y' || record.passFail === 'Y') ? 'rgba(16, 185, 129, 0.2)' : (record.pass_fail === 'N' || record.passFail === 'N' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(148, 163, 184, 0.2)'),
                        color: (record.pass_fail === 'Y' || record.passFail === 'Y') ? '#4ade80' : (record.pass_fail === 'N' || record.passFail === 'N' ? '#f87171' : '#94a3b8'),
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        border: `1px solid ${(record.pass_fail === 'Y' || record.passFail === 'Y') ? 'rgba(16, 185, 129, 0.3)' : (record.pass_fail === 'N' || record.passFail === 'N' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(148, 163, 184, 0.3)')}`
                      }}>
                        {(record.pass_fail === 'Y' || record.passFail === 'Y') ? 'PASS' : (record.pass_fail === 'N' || record.passFail === 'N' ? 'FAIL' : 'PENDING')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      case 'map':
        return (
          <MapView
            records={records}
            onRecordClick={(record) => {
              if (hasUnsavedChanges) {
                if (!window.confirm("You have unsaved location changes. Are you sure you want to leave?")) return;
                setHasUnsavedChanges(false);
              }
              setSelectedRecord(record);
              setCurrentView('record-detail');
            }}
          />
        );
      case 'single-map':
        return (
          <MapView
            records={selectedRecord ? [selectedRecord] : []}
            hasUnsavedChanges={hasUnsavedChanges}
            onSave={handleMapSave}
            onRecordClick={(record) => {
              if (hasUnsavedChanges) {
                if (!window.confirm("You have unsaved location changes. Are you sure you want to leave?")) return;
                setHasUnsavedChanges(false);
              }
              setSelectedRecord(record);
              setCurrentView('record-detail');
            }}
            onLocationSelect={(latlng) => {
              if (selectedRecord) {
                const updated = { ...selectedRecord, latitude: latlng.lat, longitude: latlng.lng };
                setSelectedRecord(updated);
                setHasUnsavedChanges(true);
                // Also update in the main records list so the pin moves immediately
                setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
              }
            }}
          />
        );
      case 'inspection-form':
        const targetValve = records.find(r => r.id === inspectionData?.valveId);
        // Use override type if user just selected it, otherwise from record
        const typeToUse = inspectionData?.overrideType || targetValve?.valveType;

        if (!typeToUse || typeToUse === 'Other' || typeToUse === 'N/A') {
          return (
            <ValveTypeSelector
              onSelect={async (type) => {
                // Update local state to render immediately
                setInspectionData(prev => ({ ...prev, overrideType: type }));

                // Update the valve record persistently
                if (targetValve) {
                  const updated = { ...targetValve, valveType: type };
                  await storageService.save(updated);
                  await loadData(); // Refresh records
                }
              }}
              onCancel={() => setCurrentView('inspection-list')}
            />
          );
        }

        const formProps = {
          valveId: inspectionData?.valveId,
          inspectionId: inspectionData?.inspectionId,
          onBack: () => setCurrentView('inspection-list'),
          onSave: () => setCurrentView('inspection-list')
        };

        switch (typeToUse) {
          case 'Ball Valve': return <InspectionFormBallValve {...formProps} />;
          case 'Globe Control Valve': return <InspectionFormGlobeControlValve {...formProps} />;
          case 'Butterfly Valve': return <InspectionFormButterflyValve {...formProps} />;
          case 'Check Valve': return <InspectionFormCheckValve {...formProps} />;
          case 'Plug Valve': return <InspectionFormPlugValve {...formProps} />;
          case 'Pressure Relief Valve': return <InspectionFormPressureReliefValve {...formProps} />;
          case 'Gate Valve':
          default:
            return <InspectionFormGateValve {...formProps} />;
        }
      case 'test-report-form':
        return (
          <TestReportForm
            valveId={inspectionData?.valveId}
            reportId={inspectionData?.reportId}
            inspectionId={inspectionData?.inspectionId}
            onBack={() => setCurrentView('inspection-list')}
            onSave={() => setCurrentView('inspection-list')}
          />
        );
      case 'inspection-list':
        return (
          <InspectionList
            valveId={inspectionData?.valveId || selectedRecord?.id}
            onEdit={(inspectionId) => {
              setInspectionData({ valveId: selectedRecord?.id, inspectionId });
              setCurrentView('inspection-form');
            }}
            onNewInspection={() => {
              setInspectionData({ valveId: selectedRecord?.id, inspectionId: null });
              setCurrentView('inspection-form');
            }}
            onEditReport={(reportId) => {
              setInspectionData({ valveId: selectedRecord?.id, reportId });
              setCurrentView('test-report-form');
            }}
            onNewReport={(inspectionId = null) => {
              setInspectionData({ valveId: selectedRecord?.id, reportId: null, inspectionId });
              setCurrentView('test-report-form');
            }}
          />
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
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  className="btn-primary"
                  onClick={() => handleNavigate('create')}
                  style={{
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(14, 165, 233, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: 'bold'
                  }}
                >
                  + New Record
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSync}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 'bold'
                  }}
                >
                  ☁️ Sync Local to Cloud
                </button>
              </div>
            </div>

            <div className="grid-3 mt-4">
              <div
                onClick={() => handleNavigate('search')}
                className="glass-panel clickable-card"
                style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)' }}
              >
                <h3 style={{ margin: '0 0 0.5rem 0' }}>Number of Records</h3>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.total}</div>
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)' }}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>Pending Tests</h3>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent)' }}>{stats.testPending}</div>
              </div>
            </div>

            <div className="mt-4 glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)' }}>
              <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Latest Activity</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[...records]
                  .sort((a, b) => {
                    const getTime = (r) => {
                      const t1 = new Date(r.updatedAt || 0).getTime();
                      const t2 = new Date(r.createdAt || 0).getTime();
                      const t3 = new Date(r.lastViewedAt || 0).getTime();
                      return Math.max(
                        isNaN(t1) ? 0 : t1,
                        isNaN(t2) ? 0 : t2,
                        isNaN(t3) ? 0 : t3
                      );
                    };
                    return getTime(b) - getTime(a);
                  })
                  .slice(0, 5)
                  .map(record => (
                    <div
                      key={record.id}
                      onClick={() => handleRecordClick(record)}
                      className="clickable-card"
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: '1px solid transparent'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {record.serialNumber}
                          {(record.files?.length > 0 || record.file_urls?.length > 0) && (
                            <span
                              title={`${(record.files?.length || record.file_urls?.length)} attachments`}
                              style={{
                                fontSize: '0.9rem',
                                color: 'var(--accent)',
                                background: 'rgba(245, 158, 11, 0.1)',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}
                            >
                              📎 {(record.files?.length || record.file_urls?.length)}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {record.customer} | {record.oem} | {record.valveType || 'N/A'} | {record.sizeClass || 'N/A'} | {record.mawp || 'N/A'}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        background: (record.pass_fail === 'Y' || record.passFail === 'Y') ? 'rgba(16, 185, 129, 0.2)' : (record.pass_fail === 'N' || record.passFail === 'N' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(148, 163, 184, 0.2)'),
                        color: (record.pass_fail === 'Y' || record.passFail === 'Y') ? '#4ade80' : (record.pass_fail === 'N' || record.passFail === 'N' ? '#f87171' : '#94a3b8'),
                        fontWeight: '600'
                      }}>
                        {(record.pass_fail === 'Y' || record.passFail === 'Y') ? 'PASS' : (record.pass_fail === 'N' || record.passFail === 'N' ? 'FAIL' : 'PENDING')}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="mt-4" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>


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
    <Layout activeView={currentView} onNavigate={handleNavigate} >
      {renderContent()}
    </Layout >
  );
}

export default App;
