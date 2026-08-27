import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../db/schema';

const connectionString = process.env.DATABASE_URL!;

const queryClient = mysql.createPool({
  uri: connectionString,
  connectionLimit: 10,
  enableKeepAlive: true,
  timezone: 'Z',
  charset: 'utf8mb4',
});

queryClient.on('connection', (connection) => {
  void connection.query("SET time_zone = '+00:00'");
});

export const db = drizzle(queryClient, { schema, mode: 'default' });

export { schema };
export type Database = typeof db;
