import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["council-tool.test.ts"],
  },
});
