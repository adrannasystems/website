import type { MutationCtx, QueryCtx } from './_generated/server'

export async function requireAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    throw new Error('Unauthorized')
  } else {
    return identity
  }
}
