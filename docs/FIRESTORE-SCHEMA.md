# Firestore Schema

## Overview

All collections use the typed collection pattern — see `frontend/src/lib/firebase/firestore.ts`.
Security rules are in `firebase/firestore.rules`.

When adding a new collection, use the `/firebase-collection` Claude Code skill.

## Schema versioning

Every document in every collection **must** include a `_schemaVersion` field:

```typescript
_schemaVersion: 1; // increment when doing a breaking schema change
```

This enables **lazy migration** — when a document is read, check `_schemaVersion` and migrate on the fly if it's behind current. See the `/evolve-schema` skill for the full migration workflow.

**Rules:**

- `_schemaVersion` is always `1` on creation
- Non-breaking changes (adding optional fields with defaults) keep the same version
- Breaking changes (rename, remove, type change) increment the version and require a migration function
- Never remove `_schemaVersion` from a schema

---

## `users` collection

**Path:** `/users/{userId}`
**Access:** Owner-only (user can read/write their own document; admins can read all)

| Field            | Type                | Required | Description                                  |
| ---------------- | ------------------- | -------- | -------------------------------------------- |
| `uid`            | `string`            | Yes      | Firebase Auth UID (same as document ID)      |
| `email`          | `string`            | Yes      | User's email address                         |
| `displayName`    | `string \| null`    | Yes      | Display name from Auth or profile            |
| `photoURL`       | `string \| null`    | Yes      | Profile photo URL                            |
| `role`           | `'user' \| 'admin'` | Yes      | User role — immutable by user after creation |
| `createdAt`      | `Timestamp`         | Yes      | When the document was created                |
| `updatedAt`      | `Timestamp`         | Yes      | When the document was last updated           |
| `_schemaVersion` | `1`                 | Yes      | Schema version for lazy migration            |

**Creation:** Auto-created by `AuthProvider` on first sign-in via `syncUserProfile()`.
**Deletion:** Hard-delete is disabled in security rules. Use `deletedAt` field for soft-delete.

---

<!-- Add new collection schemas below using the /firebase-collection skill -->

## `dispatchRequests` collection

**Path:** `/dispatchRequests/{requestId}`
**Access:** Server-only through authenticated Next.js Server Actions. Browser access remains denied
by the default Firestore rule.

| Field                | Type                                   | Required | Description                                    |
| -------------------- | -------------------------------------- | -------- | ---------------------------------------------- |
| `ownerId`            | `string`                               | Yes      | Verified Firebase session UID                  |
| `premises`           | `string`                               | Yes      | Customer-premises description                  |
| `fault`              | `{ id: string, name: string }`         | Yes      | Fault resolved from the trial fixture          |
| `accessRequirement`  | `{ id: string, name: string }`         | Yes      | Access requirement resolved from the fixture   |
| `status`             | `'matching' \| 'scheduled'`            | Yes      | Current request state                          |
| `selectedTechnician` | `{ id: string, name: string } \| null` | Yes      | Compatible scheduled technician, when selected |
| `matchedEquipment`   | `string[]`                             | Yes      | Equipment combination used for compatibility   |
| `scheduledVisit`     | `Timestamp \| null`                    | Yes      | Scheduled visit time, when scheduled           |
| `createdAt`          | `Timestamp`                            | Yes      | Request creation time                          |
| `updatedAt`          | `Timestamp`                            | Yes      | Last request update time                       |
| `_schemaVersion`     | `1`                                    | Yes      | Schema version                                 |

**Creation:** `createDispatchRequest()` derives `ownerId` from the verified session and resolves
fault and access fields from `fixtures/technicians.json`.

**Scheduling:** `scheduleDispatch()` checks ownership, reloads the stored request, and recomputes
fixture compatibility before recording the technician, equipment and visit.

**Queries and indexes:** None. The scheduling action reads a known document ID, so no composite
index is required.
