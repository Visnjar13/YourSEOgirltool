# Firebase Security Specification - SEO Workspace Studio

This document defines the data invariants, threat model, and "Dirty Dozen" malicious validation payloads to verify that our security layout prevents unauthorized access or state corruption.

## 1. Data Invariants & Access Control Policy

Our application requires the following security postures:
1. **Authenticated Users Verification**: Users must be signed in with Google, and their email address must be verified (`request.auth.token.email_verified == true`) to perform any write actions (build, edit, delete).
2. **Access Separation (Creations / Views)**:
   - **Workspaces** are owned by their creator (`createdBy`).
   - Private workspaces are only readable/writable by the owner (`request.auth.uid == resource.data.createdBy`).
   - Public workspaces (`isPublic == true`) are **read-only** by the public (anyone can view it to leverage collaborative links), but can only be modified/updated by the creator.
3. **Structured Validation**:
   - String characters and fields are limited to reasonable boundaries (e.g., workspace name <= 100 characters) to prevent database resource exhaustion.
   - Values like `createdAt` must be immutable. `updatedAt` on modifications must match the server timestamp (`request.time`).
   - Reference constraints: Documents in subcollections under `workspaces/{workspaceId}` derive access control permissions from the parent workspace creator settings.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads break safety barriers of Identity, Integrity, or State and must be rejected (`PERMISSION_DENIED`):

### 1. Identity Spoofing - Impersonation
*Target Code*: `workspaces/attacker-ws`
- **Attempt**: Creates a workspace document with a hijacked ownership ID:
  ```json
  {
    "id": "attacker-ws",
    "name": "Target Venture SEO",
    "createdBy": "victim_user_123" // Spoofed UID
  }
  ```
- **Reason for Rejection**: `createdBy` does not match the active auth user ID (`request.auth.uid`).

### 2. Privilege Escalation - Bypassing Verified Email Check
*Target Code*: `workspaces/hijack-ws`
- **Attempt**: Write a document when `request.auth.token.email_verified` is `false`.
- **Reason for Rejection**: Non-verified accounts cannot write workspace configurations.

### 3. State Pollution - Tampering with `createdAt` Timestamp
*Target Code*: `workspaces/existing-ws`
- **Attempt**: Attacker updates an existing workspace, attempting to set a retrofitted creation date or mock `createdAt` value.
- **Reason for Rejection**: `incoming().createdAt == existing().createdAt` must be enforced on updates.

### 4. Shadow Workspace Update - Injecting Hidden Fields
*Target Code*: `workspaces/my-ws`
- **Attempt**: User adds undocumented parameters (`isAdminOverride: true`).
- **Reason for Rejection**: `affectedKeys` are restricted via `.hasOnly([...])` during update actions.

### 5. Theft of Private Workspaces - Unauthorized Read
*Target Code*: `workspaces/victim-private-ws`
- **Attempt**: Unauthenticated or external user attempts to perform a `get` call on a workspace with `isPublic == false`.
- **Reason for Rejection**: Non-creator read requests are blocked unless `isPublic` is `true`.

### 6. Poisoned Document IDs - Path Space Intrusion
*Target Code*: `workspaces/$$$invalid-character-id$$$`
- **Attempt**: Writes a document whose identifier contains dangerous characters (to cause index exploitation).
- **Reason for Rejection**: Document ID does not match standard character sets.

### 7. Resource Exhaustion - Exceeding Name Field size limits
*Target Code*: `workspaces/bloated-ws`
- **Attempt**: Create a workspace name containing a 50KB string of repeating characters.
- **Reason for Rejection**: String length validation restricts workspace `name` to `<= 100` characters.

### 8. Denial of Wallet - Unbounded Map or Size Injections
*Target Code*: `workspaces/my-ws/keywords/bloated-kw`
- **Attempt**: Add search volume values as strings or excessively huge numbers.
- **Reason for Rejection**: Difficulty limits are constrained within `0..100` and keyword length is checked.

### 9. Mutability Tampering - Moving document properties
*Target Code*: `workspaces/my-ws`
- **Attempt**: Rename the creator email associated with a workspace during an update.
- **Reason for Rejection**: `creatorEmail` must match the original value and be immutable.

### 10. Orphaned Writes - Writing keywords to a hijacked workspace path
*Target Code*: `workspaces/victim-ws/keywords/some-kw`
- **Attempt**: Attacker joins an arbitrary keyword to a victim user's workspace subcollection.
- **Reason for Rejection**: Parent workspace exists check fails or does not belong to the user.

### 11. Terminal Outlier Modification
*Target Code*: `workspaces/my-ws/templates/term-brief`
- **Attempt**: Create or update template data without specifying required fields like `type` or `workspaceId`.
- **Reason for Rejection**: Validation schema ensures required fields are set.

### 12. Non-Timestamp Temporal Tampering
*Target Code*: `workspaces/my-ws`
- **Attempt**: Provide a future mock client date instead of server-authenticated timestamp (`request.time`) for `updatedAt`.
- **Reason for Rejection**: `updatedAt` must be set to `request.time`.
