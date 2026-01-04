1️⃣ Data flow

Leaderboard data is fetched via a typed API client. Public and authenticated endpoints are handled separately to enforce security boundaries.

2️⃣ Mocking

Mocked API responses are used at the HTTP boundary to enable frontend development independent of backend readiness while preserving the backend contract.

3️⃣ Auth

Authenticated leaderboard data requires a Keycloak-issued JWT, accessed via a centralized auth hook and injected into API requests.