import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

const pool = connectionString 
  ? new Pool({ connectionString }) 
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'relateflows',
      port: parseInt(process.env.DB_PORT || '5432'),
    });

export async function initDb() {
  let retries = 10;
  while (retries) {
    try {
      console.log('Testing connection to database...');
      await pool.query('SELECT NOW()');
      console.log('Connected to PostgreSQL successfully.');
      break;
    } catch (err) {
      console.log(`Database connection failed. Retrying in 3 seconds... (Retries left: ${retries - 1})`);
      retries -= 1;
      if (retries === 0) {
        throw new Error('Could not connect to PostgreSQL database. Exiting.');
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  try {
    console.log('Running init.sql schema & seeding...');
    const sqlPath = path.join(__dirname, 'init.sql');
    const initSql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(initSql);
    console.log('Database schema and seeds initialized successfully.');
  } catch (err) {
    console.error('Failed to run database initialization script:', err);
    throw err;
  }
}

export default pool;
