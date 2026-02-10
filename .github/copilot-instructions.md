# ShiftSwap AI Coding Instructions

## Project Overview
ShiftSwap is a multi-tenant shift swap management system where managers post shifts needing coverage and staff claim them. Built with Next.js 16 (App Router), Prisma ORM, PostgreSQL, and includes PWA push notifications.

## Architecture & Data Model

### Multi-Tenancy Pattern
- **Organisation-based isolation**: All data queries MUST filter by `organisationId` from session
- Session contains: `memberId`, `organisationId`, `role`, `name`, `email`
- Never expose cross-organisation data—always verify org membership before operations

### Core Data Flow
```
Organisation (has join code)
  ├─ Members (MANAGER or STAFF roles)
  └─ Shifts (POSTED → CLAIMED → APPROVED/DECLINED)
      ├─ originalOwner: member giving away shift
      ├─ claimedBy: member taking shift
      └─ postedBy: who created the listing (usually manager)
```

### Shift State Machine
- **POSTED**: Available for claiming by staff
- **CLAIMED**: Staff member claimed, awaiting manager approval
- **APPROVED**: Manager approved swap, shift reassigned
- **DECLINED**: Manager rejected claim, returns to POSTED
- **CANCELLED**: Shift cancelled entirely

**Critical**: Always pass `version` field in approve/decline/cancel operations for optimistic locking

## Authentication & Authorization

### Session Management (`lib/auth.ts`)
- JWT stored in HTTP-only cookie named `session`
- Use `getSession()` for optional auth, `requireAuth()` for required, `requireManager()` for manager-only
- Session payload: `TokenPayload { memberId, organisationId, role, name, email }`

### Role-Based Access
- **Manager**: Full CRUD on shifts, approve/decline claims, manage team, regenerate join codes
- **Staff**: View POSTED shifts + own shifts, claim available shifts, cancel own claims

### Access Pattern in API Routes
```typescript
const session = await getSession()
if (!session) return unauthorized()

// Staff see: POSTED shifts + their originalOwner + their claimedBy
if (session.role === 'STAFF') {
  where.OR = [
    { status: 'POSTED' },
    { originalOwnerId: session.memberId },
    { claimedById: session.memberId },
  ]
}
```

## API Response Conventions

All routes in [`app/api/`](app/api/) return JSON with this structure:
```typescript
{ ok: true, data: {...} }           // Success
{ ok: false, error: "message" }     // Failure
```

Use helper functions from [`lib/utils.ts`](lib/utils.ts):
- `success(data, status?)` → 200 response
- `error(message, status?)` → 400 response
- `unauthorized()`, `forbidden()`, `notFound()`, `conflict()` → appropriate status codes

## Frontend Architecture

### Custom Hooks Pattern ([`app/hooks/useShiftSwap.ts`](app/hooks/useShiftSwap.ts))
Centralized data fetching with auto-polling intervals:
- `useSession()` → authentication state
- `useOrg()` → organisation details, regenerateCode()
- `useMembers()` → team list, fetchMembers(), removeMember()
- `useShifts(pollInterval?)` → shifts list with auto-refresh, postShift(), claimShift(), approveShift(), etc.
- `useChangelog()` → audit logs, fetchLogs()

**Pattern**: All hooks return `{ data, loading, error, actions... }` and handle API communication internally

### Component Organization
- [`app/components/ui.tsx`](app/components/ui.tsx): Shared UI components (Navbar, Card, StatusBadge, Spinner, Toast, etc.)
- Role-specific pages: [`app/manager/page.tsx`](app/manager/page.tsx), [`app/staff/page.tsx`](app/staff/page.tsx)
- Both use same hooks but filter/display data per role requirements

## Push Notifications

### Setup Pattern
1. Service worker: [`public/sw.js`](public/sw.js) handles push events
2. Client requests notification permission, gets subscription
3. Subscription saved via POST [`/api/push`](app/api/push/route.ts) as PushSubscription record
4. Server sends via [`lib/notifications.ts`](lib/notifications.ts):
   - `sendNotificationToMember(memberId, payload)`
   - `sendNotificationToRole(orgId, role, payload, excludeMemberId?)`

### Notification Triggers
- Staff claims shift → notify all managers in org
- Manager approves shift → notify claimedBy and originalOwner
- Manager declines claim → notify claimedBy, originalOwner gets shift re-posted
- New shift posted → notify all staff in org

## Database Operations

### Prisma Client ([`lib/db.ts`](lib/db.ts))
Singleton pattern: `export const prisma = ...` prevents hot-reload connection leaks

### Critical Patterns
1. **Always include org filtering**:
   ```typescript
   where: { organisationId: session.organisationId, ... }
   ```

2. **Cascade deletes configured in schema**: Deleting org removes all members, shifts, subscriptions automatically

3. **Indexes**: Query by `[organisationId, status]` and `[organisationId, date]` for performance

4. **Audit logging**: Every state change creates ShiftSwapLog entry with actorId, action, details

## Development Workflows

### Local Setup
```bash
npm install
npx prisma generate          # Generate Prisma client
npx prisma db push           # Sync schema to DB (dev)
npm run dev                  # Start Next.js on :3000
```

### Environment Variables Required
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...   # Push notifications
VAPID_PRIVATE_KEY=...               # Push notifications
```

### Database Migrations
- Development: `npx prisma db push` for quick iteration
- Production: `npx prisma migrate dev --name description` for versioned migrations

## Key Conventions

### Date/Time Handling
- Dates stored as ISO strings in DB (`DateTime` type)
- Display formatting: `formatShiftDate(date)` and `formatShiftDateLong(date)` from [`ui.tsx`](app/components/ui.tsx)
- `startTime`/`endTime` stored as strings (e.g., "09:00", "17:00") for simplicity

### Join Code Generation
6-character uppercase codes via `generateJoinCode()` in [`lib/utils.ts`](lib/utils.ts). Must be unique per organisation—loop with retry if collision detected.

### Version-Based Concurrency
The `version` field on Shift prevents race conditions. When approving/declining:
```typescript
await prisma.shift.update({
  where: { id: shiftId, version: currentVersion },
  data: { status: 'APPROVED', version: { increment: 1 } }
})
```
If version mismatches, throws error → client shows conflict message

## Testing & Type Safety

- TypeScript strict mode enabled
- Run `npx tsc --noEmit` to check types
- No formal test suite yet—manual testing via UI
- Use Prisma Studio (`npx prisma studio`) to inspect DB state

## Common Tasks

**Add new shift field**: Update schema.prisma → `npx prisma db push` → update TypeScript interfaces in `useShiftSwap.ts` → update API routes and UI

**Add new notification trigger**: Call `sendNotificationToMember()` or `sendNotificationToRole()` after relevant DB operation, typically in shift status transitions

**New API endpoint**: Create route.ts under `app/api/`, import auth helpers, return `success()` or `error()` responses
