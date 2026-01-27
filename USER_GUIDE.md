# GVS-VAMS User Guide V0.0.1

Welcome to the Global Valve Register - Valve Asset Management System (AntiGVR-VAMS). This specific guide will help you manage valve records, perform inspections, run tests, and generate professional PDF reports.

---

## 1. Getting Started

### Dashboard Overview
The main dashboard gives you quick access to all core functions:
- **Search Valve Records**: Use the search bar to find valves by Serial Number, Tag, or Customer.
- **New Valve Record**: Click to create a new blank datasheet.
- **Sync Status**: View your local vs. cloud data status (Green = Synced, Yellow = Changes Pending).

---

## 2. Managing Valve Records

### Creating a New Record
1. Click **"New Valve Record"** on the dashboard.
2. **Valve Data**: Fill in the basic identification (Serial No, Job No, Tag No).
3. **Construction**: Enter material details (Body, Seat, Trim, etc.).
4. **Service & Testing**: Define the required test pressures and service conditions.
5. Click **"Save Record"** at the bottom. The record is now saved locally.

### Viewing & Editing
- From the dashboard, click on any row in the **Valve Records** table to open that valve's details.
- Modify any field and click **"Save Changes"** to update.

---

## 3. Performing Inspections

1. Open a **Valve Record**.
2. Scroll to the **"Inspections"** section (or click the "Inspections" tab).
3. Click **"New Inspection"**.
4. **Checklist**:
   - The system automatically loads the correct component list for the valve type (e.g., Gate, Globe).
   - For each component (Body, Bonnet, Seat, etc.), select the **Condition** (Acceptable, Repair, Replace).
   - Add **Repair Notes** if action is needed.
5. **Photos**:
   - Scroll to the "Photos" section.
   - Click **"Upload Photos"** to select images from your device.
   - You can upload multiple images to document the valve's condition.
6. Click **"Save Inspection"**.

---

## 4. Valve Testing

1. Open a **Valve Record**.
2. Scroll to the **"Test Reports"** section.
3. Click **"New Test Report"**.

### Pressure Tests
- **Hydrotest**: Enter Actual vs. Recommended limits for Shell and Seat.
- **Leakage**: The system allows text input for leakage rates (e.g., "0 drops/min").
- **Verification**: If you enter numeric values, the system will visually flag if a test passed or failed.

### Stroke Test (Control Valves)
- If the valve is a Control Valve, scroll to the **Stroke Test** section.
- Enter the **Signal** (e.g., 4mA, 12mA, 20mA).
- Enter the **Actual Travel %** observed.
- The system will compare this against the Expected Travel.

Click **"Save Test Report"** when finished.

---

## 5. Generating Reports

Once a valve has an inspection or test record, you can generate a full PDF report.

1. Open the **Valve Record**.
2. Click the **"Generate PDF Report"** button (usually at the top right or bottom of the form).
3. **Wait a moment**: The system is fetching the logo and formatting the document.
4. **Download**: The PDF will automatically download to your device.

### What's in the Report?
- **Header**: Company Logo & Address on every page.
- **Page 1**: Valve Datasheet & Construction Details.
- **Inspection**: The full checklist condition report.
- **Test Results**: Tables for Hydro, Gas, and Stroke tests.
- **Photos**: A gallery of all inspection photos at the end.

---

## 6. Data Synchronization (Cloud)

Your data is stored **locally** on your browser first, so you can work offline. To backup or share data:

1. Look at the **"Sync Local to Cloud"** button on the dashboard.
2. If it is **Blue**, you have new local changes.
3. Click the button to push your records to the Cloud (Supabase).
4. **Sync from Cloud**: This happens automatically on load, but you can refresh the page to pull the latest updates from other users.
