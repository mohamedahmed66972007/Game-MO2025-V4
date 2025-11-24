import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Database is optional - game logic uses in-memory storage
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
  console.log("Database connected");
} else {
  console.log("DATABASE_URL not set - using in-memory storage for game state");
}

export { pool, db };
