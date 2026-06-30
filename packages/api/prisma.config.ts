import "dotenv/config";
import { defineConfig } from "prisma/config";
import path from "path";
import { config } from "dotenv";

// Load .env.local first (overrides), then .env
config({ path: path.resolve(__dirname, ".env.local") });
config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
