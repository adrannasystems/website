import type { AuthConfig } from "convex/server";
import { z } from "zod";

const clerkFrontendApiUrl = z.string().url().parse(process.env["CLERK_FRONTEND_API_URL"]);

export default {
  providers: [{ domain: clerkFrontendApiUrl, applicationID: "convex" }],
} satisfies AuthConfig;
