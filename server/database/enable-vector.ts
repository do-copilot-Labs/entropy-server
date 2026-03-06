import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log('Enabling pgvector extension...');
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log('✅ pgvector extension enabled successfully!');
  } catch (error) {
    console.error('❌ Failed to enable pgvector:', error);
  }
}

main();