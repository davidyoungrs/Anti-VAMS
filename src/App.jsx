import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { supabase } from './services/supabaseClient';
import { Login } from './pages/Login';
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
import { inspectionService } from './services/inspectionService';
import { jobService } from './services/jobService';
import { JobSelectionModal } from './components/JobSelectionModal';
import { SearchableJobSelect } from './components/SearchableJobSelect';
import { Jobs } from './pages/Jobs';

// Import Markdown Content
import featuresContent from '../FEATURES.md?raw';
import userGuideContent from '../USER_GUIDE.md?raw';
import roadmapContent from '../ROADMAP.md?raw';
import legalContent from '../LEGAL_TERMS.md?raw';
import licensesContent from '../LICENSES.md?raw';

function App() {
  const { user, role, allowedCustomers, signOut } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [stats, setStats] = useState({ total: 0, testPending: 0 });
  const [records, setRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [inspectionData, setInspectionData] = useState(null); // { valveId, inspectionId }

  // Job Management State
  const [jobs, setJobs] = useState({}); // Map: id -> Job Object
  const [selectedValveIds, setSelectedValveIds] = useState(new Set());
  const [showJobModal, setShowJobModal] = useState(false);
  const [jobFilter, setJobFilter] = useState(''); // NEW: Filter by specific job

  const [viewHistory, setViewHistory] = useState([]); // Stack of previous states

  // Load data on mount and view change
  const loadData = async () => {
    // Basic permissions check needed here? for now just load all.
    let allRecords = await storageService.getAll();

    // Client-side filtering as a backup measure (primary security is RLS)
    // This ensures local storage can't show unauthorized records
    if (role === 'client') {
      if (!allowedCustomers) {
        // No permission set? Show nothing.
        allRecords = [];
      } else if (allowedCustomers.toLowerCase() === 'all') {
        // Show all
      } else {
        // Filter by text match
        const allowedList = allowedCustomers.split(',').map(s => s.trim().toLowerCase());
        allRecords = allRecords.filter(r => {
          if (!r.customer) return false;
          const rCust = r.customer.toLowerCase();
          return allowedList.some(allowed => rCust.includes(allowed));
        });
      }
    }

    // Calc Stats
    let inspectedValveIds = new Set();
    try {
      inspectedValveIds = await inspectionService.getValveIdsWithInspections();
    } catch (e) {
      console.error("Failed to load inspected valve IDs", e);
    }

    setStats({
      total: allRecords.length,
      testPending: allRecords.filter(r => !inspectedValveIds.has(r.id)).length
    });
    setRecords(allRecords);

    // Load Jobs
    try {
      const allJobs = await jobService.getAllJobs();
      const jobMap = {};
      allJobs.forEach(j => { jobMap[j.id] = j; });
      setJobs(jobMap);
    } catch (e) {
      console.error('Failed to load jobs', e);
    }
  };

  // Load data on mount
  // Load data on mount
  // Load data on mount and set up Real-Time subscription
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
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    };
    init();

    // Set up Real-Time Subscription
    const channel = supabase
      .channel('public:valve_records')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'valve_records' }, (payload) => {
        console.log('Real-Time Change detected:', payload);
        // Refresh data to reflect changes from other devices
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [allowedCustomers, role]); // Only load on mount or permission change

  // Force Dashboard View only on NEW Login (User Identity Change)
  // Use a ref to track the previous user ID so we don't reset on session refreshes
  const prevUserIdRef = React.useRef(user?.id);

  React.useEffect(() => {
    // If user changed (and is logged in)
    if (user && user.id !== prevUserIdRef.current) {
      const params = new URLSearchParams(window.location.search);
      // Only reset if no deep link
      if (!params.get('valveId')) {
        setCurrentView('dashboard');
        setViewHistory([]); // Clear history on user switch
      }
    }
    // Update ref
    prevUserIdRef.current = user?.id;
  }, [user]);

  const handleRecordClick = async (record) => {
    // Update last viewed timestamp without blocking
    const updatedRecord = { ...record, lastViewedAt: new Date().toISOString() };
    await storageService.save(updatedRecord);

    // Ensure files array is populated from file_urls if necessary
    const normalizedRecord = {
      ...updatedRecord,
      files: updatedRecord.files || updatedRecord.file_urls || []
    };

    // Push current context to history before navigating
    // Note: We use the function form of setState inside handleNavigate usually, but for record click we call explicitly.
    // Let's defer to handleNavigate if possible, BUT handleNavigate logic below is generic.
    // We should call handleNavigate('record-detail', normalizedRecord) but handleNavigate implementation handles the history push.
    // However, handleNavigate below needs to be updated first.

    handleNavigate('record-detail', normalizedRecord);

    // Refresh records to show updated timestamp in list immediately
    loadData();
  };

  const handleNavigate = (view, data = null) => {
    if (view === 'back') {
      handleBack();
      return;
    }

    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved location changes. Are you sure you want to leave?")) {
        return;
      }
      setHasUnsavedChanges(false);
    }

    // Push CURRENT state to history
    setViewHistory(prev => [
      ...prev,
      {
        view: currentView,
        selectedRecord,
        inspectionData // Preserve inspection context if leaving inspection 
      }
    ]);

    if (data) {
      setSelectedRecord(data);
    } else if (view === 'create') {
      setSelectedRecord(null);
    }
    setCurrentView(view);
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to go back?")) return;
      setHasUnsavedChanges(false);
    }

    setViewHistory(prev => {
      if (prev.length === 0) {
        setCurrentView('dashboard');
        return [];
      }

      const newHistory = [...prev];
      const lastState = newHistory.pop();

      // Restore State
      setCurrentView(lastState.view);
      // Only restore explicit state if it was stored (undefined check important if we ever store falsy values, though objects are safe)
      // Actually, we stored the *entire* state variables from that snapshot.
      // But wait, if I go Dashboard -> Record A -> Record B.
      // History: [ { view: 'dashboard', selectedRecord: null } ]
      // Now I am at Record B.
      // Back -> Restore Record A? 
      // Logic in handleNavigate pushes *active* selectedRecord.
      // So yes, lastState.selectedRecord was the record active *at that time*.
      if (lastState.selectedRecord !== undefined) setSelectedRecord(lastState.selectedRecord);
      if (lastState.inspectionData !== undefined) setInspectionData(lastState.inspectionData);

      return newHistory;
    });
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

  /* CSV CONSTANTS */
  const CSV_HEADERS = [
    "Serial Number", "Job No", "Tag No", "Order No", "Customer", "OEM", "Plant Area", "Site Location",
    "Date In", "Required Date", "Safety Check", "Decontamination Cert", "LSA Check", "Seized Mid Stroke",
    "Model No", "Valve Type", "Size Class", "Packing Type", "Flange Type", "MAWP",
    "Body Material", "Seat Material", "Trim Material", "Obturator Material",
    "Actuator", "Gear Operator", "Fail Mode",
    // Globe Control Valve Specifics
    "Actuator Serial", "Actuator Make", "Actuator Model", "Actuator Type", "Actuator Other",
    "Actuator Size", "Actuator Range", "Actuator Travel",
    "Positioner Model", "Positioner Serial", "Positioner Mode", "Positioner Signal",
    "Positioner Characteristic", "Positioner Supply", "Positioner Other",
    "Regulator Model", "Regulator Set Point",
    "Body Test Spec", "Seat Test Spec", "Body Pressure", "Body Pressure Unit",
    "Tested By", "Test Date", "Test Medium", "Pass/Fail",
    "Latitude", "Longitude"
  ];

  const CSV_KEYS = [
    "serialNumber", "jobNo", "tagNo", "orderNo", "customer", "oem", "plantArea", "siteLocation",
    "dateIn", "requiredDate", "safetyCheck", "decontaminationCert", "lsaCheck", "seizedMidStroke",
    "modelNo", "valveType", "sizeClass", "packingType", "flangeType", "mawp",
    "bodyMaterial", "seatMaterial", "trimMaterial", "obturatorMaterial",
    "actuator", "gearOperator", "failMode",
    // Globe Control Valve Specifics
    "actuatorSerial", "actuatorMake", "actuatorModel", "actuatorType", "actuatorOther",
    "actuatorSize", "actuatorRange", "actuatorTravel",
    "positionerModel", "positionerSerial", "positionerMode", "positionerSignal",
    "positionerCharacteristic", "positionerSupply", "positionerOther",
    "regulatorModel", "regulatorSetPoint",
    "bodyTestSpec", "seatTestSpec", "bodyPressure", "bodyPressureUnit",
    "testedBy", "testDate", "testMedium", "passFail",
    "latitude", "longitude"
  ];

  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," + CSV_HEADERS.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "valve_record_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    const headerRow = CSV_HEADERS.join(",");
    const dataRows = records.map(r => {
      return CSV_KEYS.map(key => {
        let val = r[key];
        if (val === null || val === undefined) val = "";
        // Handle boolean fields for CSV readability
        if (key === 'lsaCheck' || key === 'seizedMidStroke') val = val ? "TRUE" : "FALSE";
        // Escape quotes
        const stringVal = String(val).replace(/"/g, '""');
        return `"${stringVal}"`;
      }).join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headerRow, ...dataRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `valve_records_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    document.body.removeChild(link);
  };

  const handleBulkJobAssign = async (jobId) => {
    try {
      await jobService.assignValvesToJob(jobId, Array.from(selectedValveIds));
      alert('Valves assigned to job successfully!');
      setShowJobModal(false);
      setSelectedValveIds(new Set()); // Clear selection
      await loadData(); // Refresh to see updated job names
    } catch (e) {
      alert('Failed to assign valves: ' + e.message);
    }
  };

  const toggleValveSelection = (id) => {
    const newSet = new Set(selectedValveIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedValveIds(newSet);
  };

  const toggleAllSelection = (filteredRecords) => {
    if (selectedValveIds.size === filteredRecords.length) {
      setSelectedValveIds(new Set());
    } else {
      setSelectedValveIds(new Set(filteredRecords.map(r => r.id)));
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const rows = text.split(/\r?\n/); // Handle different newline formats
      let importedCount = 0;
      let errors = [];

      // Skip header row (i=1)
      for (let i = 1; i < rows.length; i++) {
        const rowText = rows[i];
        if (!rowText.trim()) continue; // Skip empty lines

        // regex to split by comma but ignore commas inside quotes
        const row = rowText.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        // The above simple regex might be flaky for complex CSVs. 
        // Let's use a slightly more robust manual split or just split(',') if we assume simple structure,
        // BUT user asked for "standard" CSV.
        // Let's assume standard "val1","val2" format from our export or template.
        // A simpler split approach for now that handles basic quoted strings:

        // Manual CSV parse for the line to handle commas in quotes
        const matches = [];
        let inQuote = false;
        let currentToken = '';
        for (let charIndex = 0; charIndex < rowText.length; charIndex++) {
          const char = rowText[charIndex];
          if (char === '"') {
            inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
            matches.push(currentToken);
            currentToken = '';
          } else {
            currentToken += char;
          }
        }
        matches.push(currentToken); // push last token

        // Clean up quotes
        const cleanRow = matches.map(val => val.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

        if (cleanRow.length < 2) continue; // Not enough data

        const record = {};
        let hasData = false;

        CSV_KEYS.forEach((key, index) => {
          let val = cleanRow[index] || '';

          // Transform booleans
          if (key === 'lsaCheck' || key === 'seizedMidStroke') {
            record[key] = (val.toUpperCase() === 'TRUE' || val.toUpperCase() === 'YES' || val === '1');
          } else {
            record[key] = val;
          }

          if (val) hasData = true;
        });

        // Basic validation: Serial Number is required
        if (!record.serialNumber) {
          // Try to generate one or skip? Let's skip and log error if completely empty
          if (hasData) errors.push(`Row ${i + 1}: Missing Serial Number`);
          continue;
        }

        // Set default status
        record.status = 'Pending';
        if (!record.passFail) record.passFail = 'Pending';

        try {
          await storageService.save(record);
          importedCount++;
        } catch (err) {
          console.error(err);
          errors.push(`Row ${i + 1}: Save failed (${err.message})`);
        }
      }

      let msg = `Successfully imported ${importedCount} records!`;
      if (errors.length > 0) {
        msg += `\n\nErrors:\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? '...' : ''}`;
      }
      alert(msg);

      if (importedCount > 0) {
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

  const handleSave = async (savedRecord) => {
    await loadData();
    if (savedRecord && typeof savedRecord === 'object') {
      setSelectedRecord(savedRecord);
      setCurrentView('record-detail');
      // Update history so if they click back, they go to dashboard?
      // Actually, if they just created it, history might be [dashboard, create].
      // If we switch to 'detail' (replace 'create'), that's fine.
      // handleNavigate('record-detail', savedRecord) handles push...
      // But here we are manually setting things.
      // Let's rely on manual set for now or use handleNavigate if possible?
      // handleNavigate('record-detail', savedRecord) would push 'create' to history?
      // We probably want to Replace 'create' with 'detail' or just push.
      // For simplicity, let's just set view.
    } else {
      setCurrentView('dashboard');
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'create':
        return <RecordForm key="create" onSave={handleSave} onNavigate={handleNavigate} />;
      case 'admin':
        if (!['admin', 'super_user'].includes(role)) return <div className="glass-panel" style={{ padding: '2rem' }}><h2>Access Denied</h2><p>You do not have permission to view this page.</p></div>;
        return <AdminPanel onNavigate={handleNavigate} />;
      case 'user-guide':
        return <MarkdownPage title="User Guide" content={userGuideContent} />;
      case 'features':
        return <MarkdownPage title="System Features" content={featuresContent} />;
      case 'roadmap':
        return <MarkdownPage title="Strategic Development Roadmap" content={roadmapContent} />;
      case 'legal':
        return <MarkdownPage title="Legal Terms & Conditions" content={legalContent} />;
      case 'licenses':
        return <MarkdownPage title="Licenses & Attribution" content={licensesContent} />;
      case 'analytics':
        return <AnalyticsDashboard records={records} />;
      case 'scheduler':
        return <MaintenanceScheduler />;
      case 'jobs':
        return <Jobs onNavigate={handleNavigate} />;
      case 'record-detail':
        return <RecordForm key={selectedRecord?.id || 'detail'} initialData={selectedRecord} onSave={handleSave} onNavigate={handleNavigate} />;
      case 'search':
        // Handle search filtering client side on the loaded records
        const filteredRecords = records.filter(r => {
          const matchesSearch = r.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.oem?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.valveType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.sizeClass?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.mawp?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.tagNo?.toLowerCase().includes(searchQuery.toLowerCase());

          const matchesJob = jobFilter ? r.jobId === jobFilter : true;

          return matchesSearch && matchesJob;
        });
        return (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 className="section-title">Search Records</h2>
            <div className="mb-4" style={{ display: 'flex', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Search by Serial No, Customer, OEM, Type, Size, Class, or Tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '1.2rem', padding: '1rem', flex: 2 }}
              />
              <SearchableJobSelect
                jobs={jobs}
                selectedJobId={jobFilter}
                onChange={(val) => setJobFilter(val)}
              />
            </div>

            {/* Bulk Actions Bar */}
            {selectedValveIds.size > 0 && (
              <div
                className="glass-panel"
                style={{
                  marginBottom: '1rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid #3b82f6', borderRadius: 'var(--radius-md)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <div style={{ fontWeight: 'bold', color: '#60a5fa' }}>
                  {selectedValveIds.size} valves selected
                </div>
                <div>
                  <button
                    onClick={() => setShowJobModal(true)}
                    className="btn-primary"
                    style={{ background: '#3b82f6', fontSize: '0.9rem' }}
                  >
                    📂 Assign to Job
                  </button>
                </div>
              </div>
            )}

            {showJobModal && (
              <JobSelectionModal
                selectedCount={selectedValveIds.size}
                onCancel={() => setShowJobModal(false)}
                onConfirm={handleBulkJobAssign}
              />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Select All Checkbox (Only if records exist) */}
              {filteredRecords.length > 0 && (
                <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'flex-end', marginRight: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Select All</span>
                  <input
                    type="checkbox"
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    checked={selectedValveIds.size === filteredRecords.length && filteredRecords.length > 0}
                    onChange={() => toggleAllSelection(filteredRecords)}
                  />
                </div>
              )}

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
                      background: selectedValveIds.has(record.id) ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-surface)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: selectedValveIds.has(record.id) ? '1px solid #3b82f6' : '1px solid transparent'
                    }}
                    onClick={(e) => {
                      // If clicking checkbox, don't nav. If clicking card, nav.
                      if (e.target.type !== 'checkbox') handleRecordClick(record);
                    }}
                  >
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
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
                          {/* Job Badge */}
                          {record.jobId && jobs[record.jobId] && (
                            <span style={{
                              fontSize: '0.8rem', background: '#3b82f6', color: 'white',
                              padding: '2px 8px', borderRadius: '12px'
                            }}>
                              🏢 {jobs[record.jobId].name}
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
                    </div>
                    <div style={{ marginLeft: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                      {/* Checkbox Moved Here */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedValveIds.has(record.id)}
                          onChange={() => toggleValveSelection(record.id)}
                          style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                        />
                      </div>
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
            onNavigate={handleNavigate}
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
            onNavigate={handleNavigate}
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
          onSave: () => {
            loadData();
            setCurrentView('inspection-list');
          }
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
            onNavigate={handleNavigate}
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
                <div style={{ marginTop: '1rem', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Logged in as: {user?.email} ({role}) <button onClick={signOut} style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}>Sign Out</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                {(role === 'admin' || role === 'super_user' || role === 'inspector') && (
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
                )}
                {role !== 'client' && (
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
                )}
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
                <h3 style={{ margin: '0 0 0.5rem 0' }}>Pending Inspection</h3>
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
                  onClick={handleDownloadTemplate}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--text-muted)',
                    color: 'var(--text-primary)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  📄 Download Template
                </button>

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
                  📥 Export Records
                </button>

                {(role === 'admin' || role === 'super_user' || role === 'inspector') && (
                  <label
                    style={{
                      background: 'var(--primary)',
                      border: 'none',
                      color: 'white',
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
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  if (!user) {
    return <Login />;
  }

  return (
    <Layout activeView={currentView} onNavigate={handleNavigate} userRole={role} onLogout={signOut}>
      {renderContent()}
    </Layout >
  );
}

export default App;
