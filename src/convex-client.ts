import { ConvexReactClient } from "convex/react";
import { z } from "zod";

export const convexUrl = z
  .string()
  .url()
  .parse(import.meta.env["VITE_CONVEX_URL"]);

export const convexClient = new ConvexReactClient(convexUrl);
