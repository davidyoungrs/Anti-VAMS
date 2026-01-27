# Features

## 1. Valve Record Management
- ** comprehensive Datasheets**: Store and manage detailed technical specifications for valves.
- **Data Entry**: Fields for General Info, Construction Details, Service Conditions, and Testing Specs.
- **Search & Filter**: Easily locate valve records by Serial Number, Tag No, or Customer.

## 2. Inspection System
- **Component Checklists**: Detailed inspection checklists tailored to valve types (e.g., Gate, Globe, Ball).
- **Condition Ratings**: Record "Acceptable", "Repair", or "Replace" status for each component.
- **Repair Notes**: Add specific notes for required repairs or observations.
- **Photo Gallery**: Upload and attach inspection photos to the record.

## 3. Test Reporting
- **Pressure Tests**:
  - Hydrotest (Shell/Seat).
  - Low Pressure Gas Test.
  - High Pressure Liquid Test.
  - Automatic leakage rate recording and verification against allowable limits.
- **Stroke / Control Valve Tests**: 
  - Record signal inputs (4-20mA) vs. actual travel position.
  - Visualize control linearity.

## 4. PDF Report Generation
- **Professional Branding**: 
  - Automated header with Company Logo, "Global Valve Record" title, and Address on every page.
  - Repeating headers for multi-page reports.
- **Complete Data Output**: Generates a single PDF containing:
  - Valve Datasheet.
  - Inspection Results & Checklist.
  - Test Data (Pressure & Stroke).
  - Inspection Photo Gallery.
- **Layout automation**: Smart pagination to prevent table rows from breaking awkwardly or overlapping headers.
- **Traceability**: Footer on every page with generation Date/Time and Page Numbers.

## 5. Data Management
- **Hybrid Storage**: 
  - **Local First**: Works offline using browser LocalStorage.
  - **Cloud Sync**: One-click synchronization with Supabase for data backup and team collaboration.
- **Media Handling**: Securely uploads and retrieves images for inspection reports.
