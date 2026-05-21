import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL =
  process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    pool: "forks",
    hookTimeout: 30000,
    testTimeout: 30000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL,
      PORT: "3001",
      APP_NAME: "Asyncly",
      JWT_ACCESS_SECRET: "test-access-secret",
      JWT_REFRESH_SECRET: "test-refresh-secret",
      JWT_ACCESS_EXPIRES_IN: "15m",
      JWT_REFRESH_EXPIRES_IN: "7d",
      REDIS_HOST: "localhost",
      REDIS_PORT: "6379",
      WEBHOOK_SECRET: "test-webhook-secret",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "generated/**",
        "prisma/**",
        "**/*.config.*",
        "src/types/**",
      ],
    },
    setupFiles: ["./tests/setup.ts"],
  },
});
