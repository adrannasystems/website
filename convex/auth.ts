import type { MutationCtx, QueryCtx } from './_generated/server'

export function createUnauthorizedError() {
  return new Error('Unauthorized')
}

export async function requireAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    throw createUnauthorizedError()
  } else {
    return identity
  }
}
