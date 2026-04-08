import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["domain/**/*.test.ts", "convex/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
