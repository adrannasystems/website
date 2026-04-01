import type { UserIdentity } from "convex/server";
import { query, type MutationCtx, type QueryCtx } from "./_generated/server";

export async function authedUserIdOrThrow(ctx: QueryCtx | MutationCtx) {
  return databaseUserId(await authedIdentityOrThrow(ctx));
}

export function databaseUserId(identity: UserIdentity): string {
  return identity.tokenIdentifier;
}

export async function authedIdentityOrThrow(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (identity === null) {
    throw createUnauthorizedError();
  } else {
    return identity;
  }
}

export const getMyTokenIdentifier = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return null;
    }
    return identity.tokenIdentifier;
  },
});

export function createUnauthorizedError() {
  return new Error("Unauthorized");
}
