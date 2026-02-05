# Security Architecture & Enterprise Features

## Executive Summary
The GVS-VAMS (Valve Asset Management System) is engineered with a **Defense-in-Depth** security philosophy. It combines robust server-side enforcement (PostgreSQL Row Level Security) with client-side hardening (AES-256 Encryption), ensuring that critical asset data remains secure, tamper-proof, and accessible only to authorized personnel. This document outlines the security layers that classify GVS-VAMS as an enterprise-grade solution.

---

## 1. Authentication & Access Control (RBAC)
**Justification:** Enterprise environments require granular control over who can view and manipulate data. A "one-size-fits-all" login is insufficient for compliance.

*   **Role-Based Access Control (RBAC):** The system implements strict role separation:
    *   **Admins/Super Users:** Full access to system configuration and all records.
    *   **Inspectors:** Operational access to create and edit inspections/reports, but restricted from system-wide administrative functions.
    *   **Clients:** "View-Only" access strictly scoped to their own assets.
*   **Context-Aware UI Guards:** The frontend application actively validates user roles before rendering sensitive views (e.g., Admin Panel), preventing unauthorized interface discovery.
*   **Tenant Isolation:** Client access is dynamically filtered based on `allowedCustomers` attributes, ensuring strict data segregation between different clients sharing the same platform.

## 2. Database Security & Row Level Security (RLS)
**Justification:** Application-level security is fallible. Enterprise security requires data protection at the *database engine level*, ensuring that no matter how a query is constructed, users can *never* access data they don't own.

*   **Row Level Security (RLS) Enforcement:** Direct policies on PostgreSQL tables (`valve_records`, `valve_history`, `valve_inspections`) enforce access limits at the query execution level.
    *   *Example:* A "Client" user's `SELECT` query is automatically rewritten by the database to include `WHERE customer = [ClientName]`, making it mathematically impossible for them to retrieve another client's data.
*   **Least Privilege Policy:**
    *   `INSERT`, `UPDATE`, and `DELETE` operations are strictly limited to `authenticated` users with `admin` or `inspector` roles.
    *   Public access is entirely disabled for core data tables.
*   **Function Security:** Custom database functions (e.g., `handle_new_user`) are hardened with `SET search_path = public`, preventing search path hijacking attacks that could escalate privileges.

## 3. Client-Side Encryption (Data-at-Rest)
**Justification:** Field operations often require offline access on shared or mobile devices. If a device is lost or stolen, plain text data would be a liability.

*   **AES-256 Encryption:** All sensitive valve records stored locally (for offline mode) are encrypted using **AES-256** before being written to the browser's IndexedDB.
*   **Secure implementation:**
    *   Uses distinct 256-bit encryption keys generated via `CryptoJS`.
    *   Data is encrypted *before* it leaves the application memory, ensuring that even a dump of the browser's local storage yields only useless ciphertext (`encryptedData` blobs).
    *   Decryption occurs only in memory when the application is actively authenticated.

## 4. Data Integrity & Sanitization
**Justification:** Corrupt or malicious data entry is a common vector for system instability and security breaches (e.g., SQL Injection, XSS).

*   **Strict Input Sanitization:**
    *   The `storageService` layer implements rigorous sanitization routines (`sanitizeVal`, `sanitizeNum`) before data syncs to the cloud.
    *   Ensures that invalid types (e.g., empty strings for numbers) are normalized to `NULL`, preserving database schema integrity.
*   **Audit Trails (Valve History):**
    *   Changes to valve records are automatically logged in `valve_history`.
    *   This provides an immutable timeline of who changed what and when, critical for post-incident forensics and compliance audits.
*   **Soft Delete:** Records are never immediately destroyed. The "Soft Delete" mechanism marks records as `deleted_at`, preserving the data for recovery and audit purposes while removing it from the operational view.

## 5. Secure Offline Architecture
**Justification:** Enterprise networks are not always available in the field (e.g., offshore rigs). Security must not degrade when connectivity is lost.

*   **Offline-First Design:** The security model is designed to work without constant server connection.
*   **Encrypted Sync:** When connectivity is restored, the `syncLocalToCloud` process safely transmits data over separate channels, handling conflict resolution (server-wins or latest-wins logic) while maintaining the integrity of the encrypted local store.

---

## Conclusion
GVS-VAMS moves beyond basic password protection to a **comprehensive security architecture**. By layering **Database RLS** (for absolute server-side authority), **AES-256 Encryption** (for device security), and **Strict Sanitization** (for data integrity), it meets the rigorous demands of enterprise asset management environments where data confidentiality and availability are paramount.
