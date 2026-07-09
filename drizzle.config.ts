import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js convention: .env.local (gitignored, real secrets) overrides .env.
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
