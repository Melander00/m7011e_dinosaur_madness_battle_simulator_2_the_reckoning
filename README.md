dinosaur game test

# Database schema (paste picture, shortly explain it)
REQ9: System must include documented and well-designed database schema with proper relationships (must be able to explain and motivate design choices)

# API documentation (summary)
REQ16: System must include comprehensive API documentation using OpenAPI, Swagger, or AsyncAPI specifications

# Architecture diagram
REQ17: Project must include comprehensive architecture diagram using C4 model or equivalent architectural documentation, and documentation in GitHub repository

# Performance analysis
REQ18: Project must include performance analysis with load testing results and bottleneck identification

# Security considerations

## Protection against SQL Injection and XSS attacks

The system should be protected against common web vulnerabilities like SQL injection in backend services and Cross-Site Scripting (XSS) in the frontend
Backend services (e.g. leaderboard-service, friend-service) use parameterized SQL queries via libraries such as pg. and no user input is directly concatenated into SQL strings.
for example: leaderboard queries pass user input as $1, $2 parameters rather than string interpolation.

The frontend is built using React, which by default escapes values rendered in JSX.We do not use dangerouslySetInnerHTML. User-generated content (usernames, scores) is rendered as plain text.
We acknowledge there is no centralized input validation library (e.g. schema validation) and no explicit Content Security Policy (CSP) configured in NGINX.
This is acceptable because parameterized queries are the industry-standard baseline protection against SQL injection and React’s default escaping significantly reduces XSS risk.
Given the project scope and time constraints, this level of protection is reasonable and documented.

## Certificate management and automatic renewal

The system uses HTTPS with valid certificates and avoid manual certificate handling inside services and TLS is terminated at the Kubernetes Ingress.
Services communicate internally over HTTP and certificates are managed automatically by the cluster (via cert-manager and Let’s Encrypt).
Certificate renewal policies are handled at the infrastructure level, not in application code.

## GDPR compliance considerations and data privacy measures

The system should minimize stored personal data and clearly separate identity from application data.

We have implemented authentication via Keycloak, not by application services. Backend services use Keycloak user IDs (UUIDs) instead of storing passwords or credentials and only minimal user data is stored like userId, username (where required) andgame-related data (scores, friendships)

What is not implemented: No explicit “delete my data” endpoint. No UI for GDPR data export or erasure.

Why this is acceptable: Identity management is delegated to a specialized system (Keycloak). The project demonstrates data minimization, which is a core GDPR principle. Advanced GDPR workflows are acknowledged but out of scope.

## Documentation of data privacy measures (data minimization, consent)

Users authenticate via Keycloak and explicitly consent during login. Services only receive: JWT, userId (sub) and selected claims (username, roles)
No service stores passwords or emails unless explicitly needed

What is partially implemented: Consent is implicit via authentication, not managed per feature. There is no fine-grained consent management UI.

Why this is acceptable: OAuth2 / OpenID Connect flows are a standard consent mechanism. For a student project, we think this demonstrates a realistic and defensible approach to privacy.

## Ethical analysis of sensitive data handling and societal impact

No sensitive personal data (health, location, financial data) is stored. Game scores and friendships are low-risk data types. Authentication is delegated to a trusted identity provider.
Ethical considerations identified as follows potential abuse of leaderboard scores (cheating). Social pressure from public rankings. Privacy concerns if user identities were exposed incorrectly.
Mitigations: Backend authority over leaderboard data (frontend cannot set scores). Separation of identity and application data. Clear boundaries between services.
Why this is sufficient: Risks are identified and discussed. Mitigations are documented.

The project demonstrates awareness, even where full solutions are out of scope.
