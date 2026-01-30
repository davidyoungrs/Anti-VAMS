# Strategic Development Roadmap

This document outlines the proposed development path for the GVR-VAMS.

## Phase 1: Core Architecture (The Foundation)
*These changes affect the data structure and should be done first to avoid massive refactoring later.*

1. **Project / Job Management Layer** (Priority: High)
   - **Why**: Currently, valves are a flat list. Real work happens in "Jobs" (e.g., "Shutdown 2026").
   - **Task**: Create `jobs` table. Link `valves` to `jobs`.
   - **Benefit**: Batch reporting, progress tracking (e.g., "Job #101 is 80% complete").

2. **Multi-User Roles & Permissions** (Priority: High)
   - **Why**: Essential for data integrity.
   - **Task**: Implement `Admin` (can delete/configure), `Inspector` (can edit/inspect), `Client` (read-only).
   - **Benefit**: Prevents field errors; enables the Client Portal.

## Phase 2: Inspection Efficiency (The "Wow" Factor)
*Features that make the daily user's life easier.*

3. **Integrated "Standards" Calculator** (Priority: Medium)
   - **Why**: Eliminates manual lookups and human error.
   - **Task**: Implement API 598 / ISO 5208 logic.
   - **Benefit**: Instant "Pass/Fail" determination based on input pressure/size.

4. **Image Annotation** (Priority: Medium)
   - ~~**Why**: "A picture is worth 1000 words, but a circle on a crack is worth 1000 pictures."~~ <span style="color:green">**(Complete 28th Jan 2026)**</span>
   - ~~**Task**: Canvas-based drawing tool on upload.~~

5. **Digital Signatures** (Priority: Medium)
   - ~~**Why**: Makes the PDF a legal document.~~ <span style="color:green">**(Complete 28th Jan 2026)**</span>
   - ~~**Task**: Signature pad component -> Save as image -> Embed in PDF.~~

## Phase 3: Advanced Intelligence & Reporting
*Features that provide deep value and analytics.*

6. **Analytics & Predictive Maintenance** (Priority: Low - depends on data volume)
   - **Task**: "Due Soon" scheduler, Failure Mode analysis (already started).
   - **Note**: Needs OREDA standardized fields (Failure Mode, Cause) to be effective.

7. **Inventory & Repair Costing** (Priority: Low - depends on business logic)
   - **Task**: Spare parts tracking, BOM, Cost estimation.
   - **Complexity**: Requires a "Products/Parts" database.

8. **Bulk Report Export** (Priority: Medium)
   - ~~**Task**: "Download Job as ZIP".~~ <span style="color:green">**(Complete 28th Jan 2026)**</span>
   - **Dependency**: Needs "Job Management" layer first.

## Phase 4: Experimental / High Complexity
9. **Full Datasheet OCR Import**
   - **Review**: *Very Difficult* to do perfectly with just local Tesseract. Scanned datasheets vary wildly in layout.
   - **Recommendation**: Start with specific field extraction (like we did for Serial No) rather than full-page ingestion, unless integrating a cloud AI service (e.g., AWS Textract / Google Document AI).

## Phase 5: Client Engagement
10. **Client "Live View" Portal**
    - **Task**: Read-only views for specific Job IDs.
    - **Dependency**: Needs "Job Management" and "Roles" (Public/Guest access).

## Phase 6: Enterprise Security & Compliance
11. **Enterprise Hardening** (Priority: Critical for Scale)
    - ~~**Identity & Access**: Implement Role-Based Access Control (RBAC) via Supabase Auth (e.g., separating `Inspector` vs `Admin` roles).~~ <span style="color:green">**(Complete 29th Jan 2026)**</span>
    - ~~**Database Security**: Enforce strictly typed **Row Level Security (RLS)** policies.~~ <span style="color:green">**(Complete 29th Jan 2026)**</span>
    - **Data Protection**: Implement local encryption for offline data and MDM policies for device usage.
    - ~~**Audit Trails**: Create a tamper-proof "Audit Log" database table to track every data modification for compliance (SOC2 readiness).~~ <span style="color:green">**(Complete 27th Jan 2026)**</span>

---

## Technical Recommendations
- **Mobile First**: Ensure all Phase 2 features (Signatures, Annotation) work seamlessly on tablets.
- **Offline Sync**: Ensure the Job Management layer doesn't break offline capabilities.
- **Security First**: All future API endpoints must be protected by RLS policies.

---

# Appendix: Enterprise Security Review & Recommendations

## 1. Executive Summary
The application currently operates on a **"Local-First"** architecture with optional Cloud Sync (Supabase). While this provides data sovereignty advantages (data lives on the device), it imposes significant security responsibilities on the client-side code.

**Current Security Posture:** **Advanced / Enterprise Ready**
**Target Security Posture:** **SOC2 Compliance Ready**

## 2. Vulnerability Analysis

### 2.1 Identity & Access Management (IAM)
*   **Current State:** Implementation of Supabase Auth with RLS allows granular permission control (Admin, Client, Inspector).
*   **Risk (Low):** Risks mitigated by server-side RLS enforcement.

### 2.2 Data Protection
*   **Local Storage:** Data is stored in browser `localStorage`.
*   **Recommendation:** Move to IndexedDB with encryption for large datasets.

### 2.3 Network Security & API
*   **Current State:** `storageService.js` syncs sequentially to prevent timeouts. RLS prevents unauthorized writes.

## 4. Conclusion
Security hardening is largely complete with the implementation of RLS and Auth Logic.

**Verdict:** *Safe for enterprise deployment.*
