import type { UserIdentity } from 'convex/server'
import { query, type MutationCtx, type QueryCtx } from './_generated/server'

export function createUnauthorizedError() {
  return new Error('Unauthorized')
}

/** Stable Convex auth key for DB ownership (`issuer|subject`). */
export function databaseUserId(identity: UserIdentity): string {
  return identity.tokenIdentifier
}

export async function requireAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    throw createUnauthorizedError()
  } else {
    return identity
  }
}

export const getMyTokenIdentifier = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      return null
    }
    return identity.tokenIdentifier
  },
})
