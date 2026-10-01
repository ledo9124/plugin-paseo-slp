import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Server and shared logic only. Client surfaces are proved in the real app.
    include: ["server/**/*.test.ts", "shared/**/*.test.ts"],
    environment: "node",
  },
});
