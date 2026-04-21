# DESIGN.md — EstateSync Enterprise Portal

## 1. Overview

EstateSync is a full-stack real estate transaction management system built with **NestJS** (backend), **Nuxt 3** (frontend), and **MongoDB Atlas** (database). The system automates commission distribution, enforces stage-based transaction lifecycles, and provides a clear financial audit trail for every property deal.

---

## 2. Architecture

```
real-estate-backend/          # NestJS REST API
├── src/
│   ├── modules/
│   │   ├── auth/             # JWT authentication (register, login, /me)
│   │   ├── users/            # Agent management
│   │   ├── transactions/     # Transaction lifecycle & stage engine
│   │   └── commissions/      # Pure commission calculation service
│   └── schemas/
│       ├── user.schema.ts
│       └── transaction.schema.ts

real-estate-frontend/         # Nuxt 3 SPA
├── app/
│   ├── pages/
│   │   ├── index.vue           # Dashboard with financial chart
│   │   ├── login.vue           # Auth (login + register toggle)
│   │   ├── agents/
│   │   │   ├── index.vue       # Agent directory with live stats
│   │   │   └── [id].vue        # Agent profile + performance chart
│   │   └── transactions/
│   │       ├── index.vue       # Transaction table + financial drawer
│   │       ├── create.vue      # New transaction form
│   │       └── manage-[id].vue # Stage advancement UI
│   ├── stores/
│   │   ├── auth.ts             # Pinia: JWT token + user session
│   │   └── transactions.ts     # Pinia: transaction list + selection
│   ├── middleware/
│   │   └── auth.global.ts      # Route protection
│   └── layouts/
│       └── default.vue         # Sidebar + current user display
```

---

## 3. Data Models

### User (Agent)
```typescript
{
  name: string       // required
  email: string      // required, unique
  password: string   // bcrypt-hashed
  role: string       // 'agent' | 'admin', default 'agent'
  phone: string
  bio: string
  photo: string      // stored as base64 data URL
  location: string
  instagram: string  // optional
  linkedin: string   // optional
}
```

### Transaction
```typescript
{
  title: string                   // Property name
  totalServiceFee: number         // Gross commission (USD)
  status: string                  // 'agreement' | 'earnest_money' | 'title_deed' | 'completed'
  listingAgentId: ObjectId → User
  sellingAgentId?: ObjectId → User
  financialBreakdown?: {
    agencyShare: number
    listingAgentShare: number
    sellingAgentShare: number
    totalFee: number
  }
  createdAt: Date
  updatedAt: Date
}
```

**Design decision:** `financialBreakdown` is embedded in the transaction document (not a separate collection). Since breakdown data is small, immutable after calculation, and always read together with its parent transaction, embedding avoids unnecessary joins and keeps read performance optimal.

---

## 4. Transaction Lifecycle & Stage Engine

Transactions follow a **strict linear state machine**:

```
agreement → earnest_money → title_deed → completed
```

Only forward transitions are valid. The `TransactionsService` enforces this at the service layer:

```typescript
const VALID_TRANSITIONS: Record<string, string> = {
  agreement: 'earnest_money',
  earnest_money: 'title_deed',
  title_deed: 'completed',
};
```

- Skipping stages (e.g. `agreement → completed`) throws `BadRequestException`
- Advancing a `completed` transaction throws `BadRequestException`
- Invalid transitions are caught before persistence — no partial state is ever written

**Why enforce at service layer (not schema)?** The enum only constrains valid state values. The *ordering* is business logic and belongs in the service. This also makes it easily unit-testable without a database.

---

## 5. Commission Policy Implementation

### Rules
| Scenario | Agency | Listing Agent | Selling Agent |
|---|---|---|---|
| Same agent (or no selling agent) | 50% | 50% | 0% |
| Different agents | 50% | 25% | 25% |

### Implementation
The `CommissionsService.calculate()` method is a **pure function** — it takes `(totalFee, listingAgentId, sellingAgentId)` and returns the breakdown with no side effects. This makes it trivially testable and reusable.

Commission is **calculated at completion time** only (when `status === 'completed'`) and the result is stored embedded in `financialBreakdown`. Dynamic computation at read time was considered, but embedding means historical breakdowns are preserved even if the agent policy changes in the future.

---

## 6. Authorization Design: "Everyone Can See, Only Involved Agents Can Advance"

### Decision
> An agent can **view** any transaction on the Dashboard, but the **"Advance Stage"** button is only enabled if the authenticated user is the `listingAgentId` or `sellingAgentId` of that transaction.

### Why this approach?

**Transparency is intentional.** In a real estate brokerage:
- Managers and team leads need full portfolio visibility
- Agents benefit from seeing how deals in the pipeline are progressing
- This encourages healthy team awareness without sacrificing confidentiality of personal earnings (those are only shown on agent profile pages)

**Restriction is also intentional.** Allowing any agent to advance another agent's transaction would:
- Risk accidental or malicious stage changes
- Break the auditability of the system (who advanced which stage?)
- Create disputes over commission timing

### Implementation
The backend enforces this at the **service layer**, not just the frontend:

```typescript
// TransactionsService.updateStatus()
if (requesterId) {
  const isInvolved = listId === requesterId || sellId === requesterId;
  if (!isInvolved) throw new ForbiddenException(...);
}
```

The frontend additionally disables the "Advance Status" button using reactive auth state:
```vue
v-if="user.role === 'admin' || user._id === listingAgentId || user._id === sellingAgentId"
```

**Admins bypass the ownership check** — `requesterId` is only set when the JWT guard is active. This allows admin users full control while regular agents are scoped to their own deals.

---

## 7. Authentication

- **JWT-based**: `@nestjs/jwt` + `passport-jwt`
- **Token storage**: `localStorage` (client-side, restored on mount via `authStore.restoreFromStorage()`)
- **Route protection**: `auth.global.ts` middleware runs on every navigation — redirects to `/login` if no token, redirects to `/` if already logged in
- **Password hashing**: `bcryptjs` with 10 salt rounds

---

## 8. Frontend State Management (Pinia)

### `useAuthStore`
- Holds `user` object and JWT `token`
- `login()` / `register()` calls backend and persists to `localStorage`
- `logout()` clears state and storage, redirects to `/login`

### `useTransactionStore`
- `transactions[]` — full list fetched on mount
- `selectedTransaction` — drives the right-drawer financial breakdown
- `fetchTransactions()` — single fetch shared across dashboard + transaction pages
- Shared store prevents redundant API calls when navigating between pages

---

## 9. API Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/auth/register` | Register new agent | Public |
| `POST` | `/auth/login` | Login, returns JWT | Public |
| `GET` | `/auth/me` | Current user info | JWT |
| `GET` | `/users` | All agents | Public |
| `GET` | `/users/:id` | Single agent | Public |
| `POST` | `/users` | Create agent | Public |
| `PATCH` | `/users/:id` | Update agent profile | Public |
| `GET` | `/transactions` | All transactions (populated) | Public |
| `POST` | `/transactions` | Create transaction | Public |
| `PATCH` | `/transactions/:id/status` | Advance stage / assign agent | **JWT + Ownership** |

---

## 10. Testing Strategy

Unit tests cover:

| Test File | What's Tested |
|---|---|
| `commissions.service.spec.ts` | Scenario 1 (same agent), Scenario 2 (different agents), zero fee, decimal fees, share sum validation |
| `transactions.service.spec.ts` | Valid transitions (all 3 hops), invalid skips, completed lock, 404 not found, 403 unrelated agent, listing/selling agent allowed, admin bypass |

**Philosophy:** Tests mock the Mongoose model entirely — no real database connection needed. This makes CI/CD fast and test runs deterministic.

---

## 11. Known Trade-offs & Future Improvements

| Trade-off | Rationale |
|---|---|
| Photo stored as base64 in DB | Simple for demo; production should use S3/Cloudflare R2 |
| No refresh token | Simplicity; 7-day JWT expiry is acceptable for internal tools |
| Public read endpoints | Reduces friction for the demo; production should require auth |
| No pagination | Transaction volume is small in this case; can be added easily |
| No HTTPS local | Development only; deployment uses HTTPS automatically |
