# Session Retry Strategy

## Overview

The session module now implements exponential backoff retry logic to handle transient database connection failures (503 Service Unavailable, connection pool exhaustion, network timeouts, etc.).

## Problem

The Blueprint was experiencing 503 errors when retrieving the current authenticated user:

```
failed retrieving current user: failed to run query { viewer { ... } }: 
server returned a non-200 status code: 503
```

Root causes:
- **Connection pool exhaustion** — PgBouncer reaching connection limits under load
- **Temporary database unavailability** — Supabase regional outages or maintenance
- **Network transience** — Temporary network disruptions between app and database
- **Deadlocks** — Transaction conflicts in the database

## Solution

### Core Components

1. **`isTransientError()`** — Classifies errors as transient or permanent
   - Detects 503, connection errors, pool exhaustion, timeouts, deadlocks
   - Permanent errors (syntax errors, validation errors) fail immediately

2. **`withRetry<T>()`** — Generic retry wrapper with exponential backoff
   - Max 3 retries (4 total attempts)
   - Backoff: 500ms → 1000ms → 2000ms → 4000ms (capped)
   - Logs retry attempts with context

3. **Error classes** in `errors.ts`
   - `ServiceUnavailableError` — 503 responses
   - `DatabaseConnectionError` — Connection issues with `isTransient` flag

### Retry Flow

```
Attempt 1: Execute operation
  ↓ Transient error? → Wait 500ms
Attempt 2: Execute operation
  ↓ Transient error? → Wait 1000ms
Attempt 3: Execute operation
  ↓ Transient error? → Wait 2000ms
Attempt 4: Execute operation
  ↓ Success? → Return result
  ↓ Error? → Return null, log error
```

### Session Retrieval

The `getSessionUser()` function now wraps database operations:

```typescript
const existing = await withRetry(
  () => prismaAuth.user.findUnique({ where: { email } }),
  MAX_RETRIES,
  'findUser',
)
```

Both user lookup and creation operations retry on transient failures.

## Configuration

Located in `src/lib/session.ts`:

```typescript
const MAX_RETRIES = 3                  // Total attempts: 4
const INITIAL_BACKOFF_MS = 500         // First backoff: 500ms
const MAX_BACKOFF_MS = 4000            // Cap backoff at 4s
```

Adjust these values if:
- Database operations need more time to recover
- Application can tolerate longer wait times before failing
- Need to reduce latency for user-facing requests

## Logging

All retry attempts are logged to help diagnose issues:

```
[Session] Transient error in findUser, attempt 1/4, backing off 500ms: 
P1001: Can't reach database server...

[Session] Failed to retrieve session user: Error: 503 Service Unavailable
```

## Transient Error Detection

Recognized transient errors:
- HTTP 503 (Service Unavailable)
- `P1001` — Prisma connection errors
- `ECONNREFUSED`, `ECONNRESET` — Network errors
- `too many clients` — Connection pool exhaustion
- `timeout`, `deadline exceeded` — Operation timeouts
- `deadlock detected` — Transaction conflicts

Non-transient errors fail immediately:
- Syntax errors
- Validation errors
- Permission/authorization errors
- Not found errors

## Testing

Unit tests in `src/lib/session.test.ts` verify:
- ✅ Retry succeeds after transient failure
- ✅ Exhaustion of retries fails gracefully
- ✅ Permanent errors fail immediately (no retry)
- ✅ Missing clerk user handled gracefully
- ✅ New user creation on first login

Run tests:
```bash
npm test -- src/lib/session.test.ts
```

## Migration Notes

- **No breaking changes** — `getSessionUser()` API remains identical
- **Backward compatible** — Existing error handling still applies
- **Opt-in behavior** — Only affects database operations in session module
- **No database schema changes** — Uses existing Prisma models

## Performance Impact

- **Success case** — No delay, operations execute normally
- **Transient failure** — 0.5–4s additional latency before returning null
- **User experience** — Applications should treat null session as redirect to login

## Future Improvements

1. **Circuit breaker pattern** — Fail fast if database is persistently unavailable
2. **Metrics collection** — Track retry success rates and backoff durations
3. **Adaptive backoff** — Adjust wait times based on historical recovery patterns
4. **Connection pool monitoring** — Warn when approaching capacity limits
5. **Health check endpoint** — Proactive database connectivity monitoring
