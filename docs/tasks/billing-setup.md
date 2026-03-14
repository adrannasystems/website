# Billing Setup

**Status:** todo
**Priority:** high
**Stack:** Clerk Billing, Convex, TanStack React Start

## Description

Add subscription billing for external clients. Clerk Billing was chosen because Clerk is already integrated. Initial scope is flat subscription tiers only — no one-time payments yet.

Clerk Billing is in **beta** and wraps Stripe under the hood.

## Decisions Made

- **Provider:** Clerk Billing (not Stripe directly, not Lemon Squeezy)
- **Model:** Flat monthly/annual tiers only — skip one-time payments for now
- **Who pays:** External clients/customers (B2C)
- **Currency:** USD only (Clerk Billing limitation)

## Steps

### 1. Clerk Dashboard (manual, no code)

1. Go to Clerk Dashboard → **Billing** → Enable Billing
2. Connect Stripe — use "Clerk development gateway" for local dev, own Stripe account for prod
3. Create **Plans** (e.g. `free`, `starter`, `pro`) — note the slugs exactly
4. Create **Features** and assign them to plans (e.g. `tasks_access`, `maintenance_tasks`)
5. Go to Dashboard → Webhooks → add endpoint (URL below) and subscribe to billing events

### 2. Pricing page — `src/routes/pricing.tsx` (create)

New TanStack Router route at `/pricing` using Clerk's `<PricingTable />` component:

```tsx
import { PricingTable } from '@clerk/tanstack-react-start'

export default function PricingPage() {
  return (
    <div className="container mx-auto py-16">
      <h1 className="text-3xl font-bold text-center mb-8">Plans & Pricing</h1>
      <PricingTable newSubscriptionRedirectUrl="/tasks" />
    </div>
  )
}
```

Also add "Pricing" link to the header nav in `src/routes/__root.tsx`.

> **Note:** `PricingTable` and `Show` might need to be imported from `@clerk/clerk-react` if
> `@clerk/tanstack-react-start` doesn't re-export them — verify at runtime.

### 3. Convex schema — `convex/schema.ts` (modify)

Add `userSubscriptions` table to cache subscription state from webhooks:

```ts
userSubscriptions: defineTable({
  clerkUserId: v.string(),
  plan: v.string(),            // plan slug, e.g. "pro"
  status: v.string(),          // "active" | "past_due" | "canceled"
  periodEnd: v.optional(v.number()),
}).index("by_clerkUserId", ["clerkUserId"]),
```

### 4. Convex HTTP webhook handler — `convex/http.ts` (create)

Receive Clerk billing events and sync subscription state to Convex DB.

Webhook URL to register in Clerk Dashboard:
`https://<VITE_CONVEX_SITE_URL>/clerk-billing-webhook`

Events to handle: `subscription.active`, `subscription.updated`, `subscription.canceled`, `subscriptionItem.canceled`.

> In production, verify the webhook signature using the `svix` package + Clerk's signing secret.

### 5. Convex subscription mutations — `convex/subscriptions.ts` (create)

Internal mutations called by the webhook handler:

- `upsertSubscription(clerkUserId, plan, status, periodEnd)`
- `updateSubscriptionStatus(clerkUserId, status)`
- `getSubscriptionByUserId(clerkUserId)` — used by other Convex functions to gate access

### 6. Feature gating

**Client-side (React):**

```tsx
import { useAuth } from '@clerk/tanstack-react-start'

const { has } = useAuth()
if (!has({ plan: 'pro' })) return <UpgradeBanner />
```

Or declaratively:

```tsx
<Show when={{ feature: 'tasks_access' }} fallback={<UpgradeBanner />}>
  <TasksUI />
</Show>
```

**Server-side (Convex functions):**

Query `userSubscriptions` by `clerkUserId` and check `status === "active"`.
The existing `requireAuthenticatedUser` in `convex/auth.ts` can be extended to return subscription info.

## Files

| File | Action |
| --- | --- |
| `convex/schema.ts` | modify — add `userSubscriptions` table |
| `convex/http.ts` | create — webhook handler |
| `convex/subscriptions.ts` | create — subscription mutations/queries |
| `src/routes/pricing.tsx` | create — pricing page |
| `src/routes/__root.tsx` | modify — add "Pricing" nav link |
| `convex/auth.ts` | modify (optional) — extend to return subscription status |

## Verification

1. Plans appear in Clerk Dashboard → Subscription Plans
2. `/pricing` renders `<PricingTable />` with your plans
3. Clicking "Subscribe" → Stripe test checkout → redirects to `/tasks`
4. After checkout, `userSubscriptions` table in Convex has a record for the user
5. Wrapping UI with `<Show when={{ plan: 'pro' }}>` hides it for free users
6. Use Stripe test cards for payment testing

## Notes

- Clerk Billing is **beta** — pin `@clerk/tanstack-react-start` version
- No taxes/VAT handled — add Stripe Tax separately if needed
- No free trials yet (on Clerk's roadmap)
- No usage-based billing supported
