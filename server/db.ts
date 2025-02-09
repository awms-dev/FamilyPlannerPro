import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Optimize connection pool settings for cost efficiency
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Reduced from 20 to optimize costs while maintaining performance
  idleTimeoutMillis: 10000, // Reduced idle timeout to release connections faster
  connectionTimeoutMillis: 2000,
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const db = drizzle({ client: pool, schema });

// Only log queries in development
if (process.env.NODE_ENV !== 'production') {
  const queryLogging = (query: any) => {
    console.log('Query:', query.query, 'Params:', query.params);
  };

  // Attach query logging if available
  if (typeof db.on === 'function') {
    db.on('query', queryLogging);
  }
}