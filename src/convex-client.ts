import { ConvexReactClient } from "convex/react";
import { z } from "zod";

const convexUrlEnvVarName = "VITE_CONVEX_URL";
export const convexUrl = z
  .url(`${convexUrlEnvVarName} is required`)
  .parse(import.meta.env[convexUrlEnvVarName]);

export const convexClient = new ConvexReactClient(convexUrl);
