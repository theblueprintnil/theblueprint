# /auth — Authentication (Phase 6 of 8)

## Purpose

Add real authentication to what has been built and tested: login, register, sessions, and route protection.

## Instructions

1. Use the project's chosen auth stack (the loop's default reference stack is Auth.js v5 with credentials, bcrypt-hashed passwords, and a protected `/dashboard`).
2. Implement:
   - Register flow that hashes passwords (bcrypt or argon2, never plaintext)
   - Login flow with proper session cookies
   - Middleware or route guards so protected pages redirect unauthenticated users
   - Logout
3. Store users in the database schema established in the db-testing phase.
4. Verify manually: register a user, log out, hit a protected route, confirm the redirect, log back in.
5. Never commit real credentials, session secrets, or `.env` files; use `.env.example` with placeholder values.

## Checklist

- [ ] Login and register flows work
- [ ] Passwords hashed and sessions secured
- [ ] Protected routes redirect unauthenticated users

## When done

```
vibe-loop done authentication
```

The next phase is deployment (automated).
