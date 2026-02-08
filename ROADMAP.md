# Strategic Development Roadmap

This document outlines the development path for the GVR-VAMS. Completed items have been archived to reflect current and future priorities.

## Phase 1: Advanced Intelligence & Reporting
*Features that provide deep value and analytics.*

1. **Predictive Analytics (Future)** (Status: **Planned**)
   - **Task**: Trend analysis for "Mean Time Between Failure" (MTBF) calculations.
   - **Note**: Needs OREDA standardized fields (Cause) to be fully effective.

2. **Inventory & Repair Costing** (Priority: Low - depends on business logic)
   - **Task**: Spare parts tracking, BOM, Cost estimation.
   - **Complexity**: Requires a "Products/Parts" database.

## Phase 2: Experimental / High Complexity

3. **Full Datasheet OCR Import**
   - **Review**: *Very Difficult* to do perfectly with just local Tesseract. Scanned datasheets vary wildly in layout.
   - **Recommendation**: Integrate a cloud AI service (e.g., AWS Textract / Google Document AI) for structured data extraction.

---

## Phase 3: AI Intelligence Layer (MCP Server)
*Exposing lived history data to external AI agents via Model Context Protocol.*

3. **MCP Server Deployment** (Status: **Planned**)
   - **Objective**: Develop a Model Context Protocol (MCP) Server that exposes the `valve.app`’s "lived history" data to external AI agents.
   - **Benefit**: Allows operators to "**chat with their fleet**," automate audit preparation, and instantly retrieve valve history without navigating the web UI.
   - **Core Philosophy**: The MCP Server functions as the "**Intelligence Layer**" sitting on top of the "Shadow System" data. 
   - **Quote**: *Compliance doesn’t mean understanding—MCP allows the AI to understand.*

---

## Phase 4: Security updates and Compliance
*Mandatory controls for international and government operations.*

4. **Multi-Factor Authentication (MFA)** (Priority: Critical for Admins)
   - **Standard**: ISO 27002 9.4.3 & 24.1.
   - **Task**: Enforce MFA (TOTP) for 'Admin' and 'Inspector' roles.

5. **SM Series Cryptography (MLPS 2.0 / China Mode)** (Priority: High)
   - **Task**: Alternative crypto stack using SM4-CBC and SM2 for sovereign algorithm compliance.

---

## Phase 5: Future Standards & Technical Debt
*Strategic improvements with high complexity or long-term implementation horizons.*

6. **Data Residency & Localization (GCC/Middle East)** (Priority: Critical)
   - **Standard**: Saudi NCA ECC / UAE NESA.
   - **Task**: Architect Supabase deployment for "Region Pinning" (e.g., AWS Bahrain/UAE) or On-Premise capability.

7. **FIPS 140-2 Cryptography Review (SC-13)** (Priority: High)
   - **Task**: Plan migration from CryptoJS to Web Crypto API (browser-native, FIPS-compliant on host OS).
   - **Note**: High difficulty due to Async migration and re-encryption of legacy data.

---

## Technical Recommendations
- **Mobile First**: Ensure all new features work seamlessly on tablets and rugged field devices.
- **Offline Sync**: Maintain the "Encryption-First" sync logic for all new data structures.
- **Zero Trust**: All future database tables must use Row Level Security (RLS) by default.
