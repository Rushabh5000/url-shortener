import dotenv from "dotenv";

// Next.js convention: .env.local (gitignored, real secrets) overrides .env.
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
