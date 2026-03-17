import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

console.log('🔍 Testing Supabase PostgreSQL Connection...\n');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('error', (err) => {
  console.error('❌ Pool error:', err.message);
  process.exit(1);
});

try {
  const result = await pool.query('SELECT NOW()');
  console.log('✅ Connection successful!');
  console.log('📅 Server time:', result.rows[0].now);
  console.log('\n✅ Supabase PostgreSQL is ready to use!\n');
  process.exit(0);
} catch (error) {
  console.error('❌ Connection failed:', error.message);
  console.error('\n🔧 Troubleshooting:');
  console.error('1. Check your .env file has correct DB_PASSWORD');
  console.error('2. Verify DB_HOST, DB_PORT, DB_USER are correct');
  console.error('3. Make sure your Supabase project is active');
  process.exit(1);
}
