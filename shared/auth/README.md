# Keycloak JWT Authentication

This directory contains reusable JWT authentication middleware for Express services that validates tokens from Keycloak.

## How It Works

The middleware validates JWT tokens by:
1. **Signature Verification**: Uses JWKS (JSON Web Key Set) to fetch Keycloak's public keys and verify token signature
2. **Issuer Validation**: Ensures token was issued by your Keycloak realm
3. **Audience Validation**: Checks the token is for the correct audience (`account`)
4. **Expiry Check**: Rejects expired tokens
5. **Algorithm Check**: Only accepts RS256 (asymmetric encryption)

## User Identification: The `sub` Claim

**CRITICAL**: All backend services MUST use the `sub` (subject) claim from the JWT as the user's unique identifier.

### Why `sub`?

- The `sub` claim is Keycloak's **stable, permanent user ID**
- It never changes, even if the user updates their email, username, or other attributes
- All database tables that reference users MUST use `sub` as the foreign key
- **NEVER** query Keycloak's database directly - always get user info from the JWT

### Example Token Payload

```json
{
  "sub": "1f2bc56a-c5f9-49df-8ea2-bef9ed228c93",  // <-- USE THIS!
  "email": "user@example.com",
  "preferred_username": "testuser",
  "name": "Test User",
  "realm_access": {
    "roles": ["default-roles-myapp", "offline_access"]
  },
  "email_verified": true,
  "iat": 1234567890,
  "exp": 1234571490
}
```

## Usage in Services

### 1. Import the Middleware

```typescript
import { requireAuth } from "../../shared/auth/keycloak";
```

### 2. Protect Your Routes

```typescript
app.get("/api/protected", requireAuth, (req, res) => {
    // Token is validated - req.userId contains the Keycloak sub
    const userId = req.userId;  // Convenience accessor
    // OR access full token:
    const email = req.user?.email;
    const roles = req.user?.realm_access?.roles || [];
    
    res.json({ userId, email, roles });
});
```

### 3. Database Schema Pattern

All user-owned database tables should reference `sub`:

```sql
CREATE TABLE leaderboard (
    id SERIAL PRIMARY KEY,
    keycloak_sub UUID NOT NULL,  -- <-- Keycloak user ID from token
    elo_rating INTEGER DEFAULT 1500,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_sub ON leaderboard(keycloak_sub);
```

### 4. Profile Bootstrap Pattern

When a user first uses your service, create their database record:

```typescript
app.get("/profile/me", requireAuth, async (req, res) => {
    const userId = req.userId!;
    
    // Find or create user profile using sub
    let profile = await db.findProfileByKeycloakSub(userId);
    
    if (!profile) {
        // First time user - bootstrap their profile
        profile = await db.createProfile({
            keycloak_sub: userId,
            email: req.user?.email,
            username: req.user?.preferred_username,
            created_at: new Date()
        });
    }
    
    res.json(profile);
});
```

## Request Object Extensions

After `requireAuth` runs successfully:

- `req.user`: Full JWT payload (type: `jwt.JwtPayload`)
- `req.userId`: Convenience accessor for `req.user.sub` (type: `string`)

## Security Best Practices

✅ **DO**:
- Use `req.userId` or `req.user.sub` for user identification
- Store `sub` in your database as the user identifier
- Use `/me` endpoints instead of `/:userId` URL parameters
- Validate that authenticated user owns the resource they're accessing

❌ **DON'T**:
- Use URL parameters like `/:userId` where users could request other users' data
- Query Keycloak's database directly
- Use email or username as the primary user identifier (they can change)
- Trust client-provided user IDs without validation

## Environment Variables

Create a `.env` file in your service directory:

```bash
KEYCLOAK_URL=https://keycloak.ltu-m7011e-1.se
KEYCLOAK_REALM=myapp
PORT=3005
```

## Testing

Get a token from Keycloak:

```bash
curl -X POST "https://keycloak.ltu-m7011e-1.se/realms/myapp/protocol/openid-connect/token" \
  -d "client_id=account" \
  -d "username=testuser" \
  -d "password=testpass123" \
  -d "grant_type=password" | jq -r '.access_token'
```

Use it to call protected endpoints:

```bash
TOKEN="your-token-here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3005/api/protected
```

## Error Responses

- **401 No authorization header**: Missing `Authorization` header
- **401 Invalid authorization header**: Header format incorrect (should be `Bearer <token>`)
- **401 Token has expired**: Token's `exp` claim is in the past
- **401 Invalid token**: Signature invalid, wrong issuer, wrong audience, or malformed

## Files

- `keycloak.ts`: Main middleware implementation
- `README.md`: This documentation
