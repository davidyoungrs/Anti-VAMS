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
   - **Why**: "A picture is worth 1000 words, but a circle on a crack is worth 1000 pictures."
   - **Task**: Canvas-based drawing tool on upload.

5. **Digital Signatures** (Priority: Medium)
   - **Why**: Makes the PDF a legal document.
   - **Task**: Signature pad component -> Save as image -> Embed in PDF.

## Phase 3: Advanced Intelligence & Reporting
*Features that provide deep value and analytics.*

6. **Analytics & Predictive Maintenance** (Priority: Low - depends on data volume)
   - **Task**: "Due Soon" scheduler, Failure Mode analysis (already started).
   - **Note**: Needs OREDA standardized fields (Failure Mode, Cause) to be effective.

7. **Inventory & Repair Costing** (Priority: Low - depends on business logic)
   - **Task**: Spare parts tracking, BOM, Cost estimation.
   - **Complexity**: Requires a "Products/Parts" database.

8. **Bulk Report Export** (Priority: Medium)
   - **Task**: "Download Job as ZIP".
   - **Dependency**: Needs "Job Management" layer first.

## Phase 4: Experimental / High Complexity
9. **Full Datasheet OCR Import**
   - **Review**: *Very Difficult* to do perfectly with just local Tesseract. Scanned datasheets vary wildly in layout.
   - **Recommendation**: Start with specific field extraction (like we did for Serial No) rather than full-page ingestion, unless integrating a cloud AI service (e.g., AWS Textract / Google Document AI).

## Phase 5: Client Engagement
10. **Client "Live View" Portal**
    - **Task**: Read-only views for specific Job IDs.
    - **Dependency**: Needs "Job Management" and "Roles" (Public/Guest access).

---

## Technical Recommendations
- **Mobile First**: Ensure all Phase 2 features (Signatures, Annotation) work seamlessly on tablets.
- **Offline Sync**: Ensure the Job Management layer doesn't break offline capabilities.
