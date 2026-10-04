import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Pure logic, client helpers included. Client surfaces are proved in the real app.
    include: ["server/**/*.test.ts", "shared/**/*.test.ts", "client/**/*.test.ts"],
    environment: "node",
  },
});
