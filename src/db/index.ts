import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Neon's HTTP driver — works in both serverless/edge and normal Node runtimes
// without holding a persistent connection, which fits Vercel's execution model.
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
export { schema };
