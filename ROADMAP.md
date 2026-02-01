# Strategic Development Roadmap

This document outlines the proposed development path for the GVR-VAMS.

## Phase 1: Inspection Efficiency (The "Wow" Factor)
*Features that make the daily user's life easier.*

1. **Integrated "Standards" Calculator** (Priority: Medium)
   - **Why**: Eliminates manual lookups and human error.
   - **Task**: Implement API 598 / ISO 5208 logic.
   - **Benefit**: Instant "Pass/Fail" determination based on input pressure/size.

## Phase 2: Advanced Intelligence & Reporting
*Features that provide deep value and analytics.*

2. **Analytics & Predictive Maintenance** (Status: **In Progress**)
   - **Task**: "Due Soon" scheduler, Failure Mode analysis.
   - **New**: Added **WIP Status Tracking** (Real-time dashboard of valve workflow stages).
   - **Note**: Needs OREDA standardized fields (Failure Mode, Cause) to be effective.

3. **Inventory & Repair Costing** (Priority: Low - depends on business logic)
   - **Task**: Spare parts tracking, BOM, Cost estimation.
   - **Complexity**: Requires a "Products/Parts" database.

## Phase 3: Experimental / High Complexity

4. **Full Datasheet OCR Import**
   - **Review**: *Very Difficult* to do perfectly with just local Tesseract. Scanned datasheets vary wildly in layout.
   - **Recommendation**: Start with specific field extraction (like we did for Serial No) rather than full-page ingestion, unless integrating a cloud AI service (e.g., AWS Textract / Google Document AI).

---

## Technical Recommendations
- **Mobile First**: Ensure all new features work seamlessly on tablets.
- **Offline Sync**: Ensure the Job Management layer doesn't break offline capabilities.
- **Security First**: All future API endpoints must be protected by RLS policies.
