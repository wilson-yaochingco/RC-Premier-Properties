import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["{backend,frontend,shared}/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**", "e2e/**"],
    env: {
      NODE_ENV: "test",
      MONGODB_URI: "mongodb://127.0.0.1:27017/rc-premier-properties-test",
      CORS_ORIGIN: "http://localhost:3000",
    },
  },
});
