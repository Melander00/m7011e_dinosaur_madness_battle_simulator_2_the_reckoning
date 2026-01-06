# user-service

The **user-service** is responsible for **persisting and exposing user profile data** that is linked to Keycloak identities.

It acts as the **single source of truth for application-level user data**, while authentication and credentials are fully delegated to **Keycloak**.

---

## Responsibilities

The user-service is intentionally minimal and focused.

It is responsible for:

* Creating a user record when a user logs in for the first time
* Returning the authenticated user’s profile
* Allowing other services and the frontend to look up users by ID
* Persisting user-related data that does **not** belong in Keycloak

It is **not** responsible for:

* Authentication (handled by Keycloak)
* Passwords or credentials
* Social relationships (friend-service)
* Rankings or scores (leaderboard-service)
* Game logic

---

## High-Level Architecture

```
Frontend
   |
   |  (JWT via Authorization header)
   v
Ingress (TLS terminated)
   |
   v
user-service (Express)
   |
   v
PostgreSQL (users table)
```

* Identity is proven via **JWT (Keycloak)**
* Application data lives in **PostgreSQL**
* JWT claims are used only to identify the user (`sub`), not as a data store

---

## Authentication Model

* All authenticated endpoints require a **Keycloak-issued JWT**
* The JWT is validated using **JWKS (public keys)** from Keycloak
* The `sub` claim is treated as the **authoritative userId**
* No userId is ever accepted from the frontend

### Local Development Shortcut

For local development only:

```bash
DISABLE_AUTH=true
```

This bypasses JWT verification and injects a fixed `userId`.

⚠️ This is **never enabled in production**.

---

## Database Model (Relevant Fields)

```sql
users (
  userId UUID PRIMARY KEY,
  username TEXT UNIQUE,
  quote TEXT,
  profilePicture BYTEA,
  profileBanner BYTEA
)
```

Notes:

* `userId` corresponds exactly to `Keycloak sub`
* Blob fields exist but are **not returned by default**
* This keeps responses lightweight and expandable

---

## API Endpoints

### POST `/users/me`

**Ensure user exists (upsert)**

Creates the user row on first login or updates synced fields.

**Auth required:** ✅
**Why POST:** This is a state-changing operation.

**Behavior**

* Extracts `userId` from JWT
* Inserts user if missing
* Optionally syncs username from Keycloak

**Response**

```json
{
  "userId": "uuid",
  "username": "player123"
}
```

---

### GET `/users/me`

**Return authenticated user profile**

Returns the user’s profile from the database.

**Auth required:** ✅

**Response**

```json
{
  "userId": "uuid",
  "username": "player123",
  "quote": "Hello world"
}
```

**Errors**

* `404` if user row does not exist (user has not been initialized yet)

---

### GET `/users/:userId`

**Public user lookup**

Used by:

* Frontend rendering
* Other backend services (friends, leaderboard)

**Auth required:** ❌
**Public data only**

**Response**

```json
{
  "userId": "uuid",
  "username": "player123",
  "quote": "Hello world"
}
```

**Does NOT return**

* Profile pictures
* Banners
* Sensitive data

---

## Error Handling

* All endpoints return structured JSON errors
* Invalid UUIDs are rejected early
* Database errors are never leaked directly

---

## Observability

The service exposes Prometheus metrics:

### GET `/metrics`

Includes:

* HTTP request count
* Request duration histograms

Labeled by:

* HTTP method
* Endpoint
* Service name

---

## Local Development

```bash
npm install
DISABLE_AUTH=true npm run dev
```

Service runs at:

```
http://localhost:3002
```

Health check:

```
GET /healthz
```

---

## Testing Strategy

The service is designed to support:

* Unit tests for repository logic
* Integration tests using PostgreSQL testcontainers
* No end-to-end tests (handled at system level)

This aligns with the **testing pyramid**:

* Many unit tests
* Fewer integration tests
* E2E handled externally

---

## Design Philosophy

* **Identity ≠ Data**
* **Backend is authoritative**
* **Minimal surface area**
* **Explicit boundaries**
* **Easy to extend without breaking contracts**

This makes the user-service reliable, testable, and safe to evolve.

---

## Summary for New Developers

If you are new to this service:

1. Authentication comes from Keycloak
2. `sub` → `userId` is the core mapping
3. Call `POST /users/me` once after login
4. Use `GET /users/me` for profile
5. Use `GET /users/:userId` for public lookup
6. Do not add logic here that belongs in other services

---

