# TypeScript Migration Guide

## Overview

The friend-service and user-service have been partially converted to TypeScript. This document explains the changes, potential issues, and how to complete the migration.

## Changes Made

### 1. Package.json Updates
- Added TypeScript and type definition dependencies
- Added build scripts (`npm run build`)
- Changed dev script to use `ts-node`
- Output directory changed to `dist/`

### 2. TypeScript Configuration
- Created `tsconfig.json` for both friend-service and shared module
- Configured for Node.js environment with ES2020 target
- Strict mode enabled for better type safety

### 3. Files Converted
- ✅ `shared/db/index.ts` - Database connection pool and query helper
- ✅ `shared/db/schemas/friend.ts` - Friend service schema
- ✅ `friend-service/src/server.ts` - Express server
- ⏳ Route files (friendships, requests, users) - Need conversion

## Benefits of TypeScript

### ✅ Pros:
1. **Type Safety**: Catch errors at compile time, not runtime
2. **Better IDE Support**: Auto-completion, refactoring, inline documentation
3. **Self-Documenting**: Types serve as documentation
4. **Easier Refactoring**: Compiler catches breaking changes
5. **Modern JavaScript**: Use latest ES features with confidence

### ❌ Potential Issues:
1. **Build Step Required**: Must compile TS → JS before running
2. **Learning Curve**: Team needs to understand TypeScript syntax
3. **Dependency Types**: Need `@types/*` packages for libraries
4. **Initial Setup Time**: More configuration needed
5. **Longer Build Times**: Compilation adds overhead

## How to Complete the Migration

### Step 1: Install Dependencies

```bash
# In shared directory
cd shared
npm install

# In friend-service directory
cd ../friend-service
npm install
```

### Step 2: Convert Remaining Route Files

Each route file needs to be converted from `.js` to `.ts`:

**Example: friendships.js → friendships.ts**

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../../../shared/db';

const router = Router();

interface User {
  userID: number;
  username: string;
  created_at: Date;
}

router.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }

    const { rows } = await query<User>(
      `SELECT u."userID", u.username, u.created_at
       FROM "USER_RELATIONSHIP" ur
       JOIN "USER" u ON (
         CASE 
           WHEN ur."userID1" = $1 THEN u."userID" = ur."userID2"
           WHEN ur."userID2" = $1 THEN u."userID" = ur."userID1"
         END
       )
       WHERE ur."userID1" = $1 OR ur."userID2" = $1
       ORDER BY u.username ASC`,
      [userId]
    );

    return res.json({ userId, friends: rows, count: rows.length });
  } catch (err) {
    return next(err);
  }
});

export default router;
```

### Step 3: Build the Project

```bash
cd friend-service
npm run build
```

This compiles TypeScript files from `src/` to JavaScript in `dist/`.

### Step 4: Run the Service

```bash
# Development (with auto-restart)
npm run dev

# Production (run compiled JS)
npm start
```

## Alternative: Keep JavaScript

If TypeScript seems like too much overhead, you can **keep using JavaScript**:

1. Delete the `.ts` files created
2. Revert `package.json` changes
3. Keep using the original `.js` files
4. Consider adding JSDoc comments for type hints:

```javascript
/**
 * @param {number} userId
 * @returns {Promise<Array<{userID: number, username: string}>>}
 */
async function getFriends(userId) {
  // ...
}
```

## Recommended Approach

For your project size and team, I recommend:

### **Option 1: Gradual Migration (Best)**
- Keep existing JavaScript files working
- Add TypeScript incrementally for new features
- Use `allowJs: true` in tsconfig.json
- Both .js and .ts files can coexist

### **Option 2: Full TypeScript (If team is experienced)**
- Convert all files at once
- Get full benefits immediately
- More upfront work

### **Option 3: Stick with JavaScript (Simplest)**
- No migration needed
- Add JSDoc for basic type hints
- Less complexity

## Files Still Needing Conversion

If you want to continue with TypeScript:

1. `friend-service/src/routes/friendships.js` → `.ts`
2. `friend-service/src/routes/requests.js` → `.ts`
3. `user-service/routes/users.js` → `.ts`

Each follows the same pattern:
- Change `const express = require()` to `import { Router } from 'express'`
- Add type annotations to function parameters
- Add `export default router` at the end
- Define interfaces for database query results

## Decision Time

**Do you want to:**
1. Continue with full TypeScript conversion?
2. Use gradual migration (keep some JS)?
3. Revert to pure JavaScript?

Let me know and I'll help with whichever approach you choose!
