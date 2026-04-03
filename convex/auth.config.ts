import type { AuthConfig } from "convex/server";
import { z } from "zod";

const clerkFrontendApiUrlEnvVarName = "CLERK_FRONTEND_API_URL";
const clerkFrontendApiUrl = z
  .url(`${clerkFrontendApiUrlEnvVarName} is required`)
  .parse(process.env[clerkFrontendApiUrlEnvVarName]);

export default {
  providers: [{ domain: clerkFrontendApiUrl, applicationID: "convex" }],
} satisfies AuthConfig;
