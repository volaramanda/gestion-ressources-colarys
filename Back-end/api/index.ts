// api/index.ts
import app from '../src/app';
import { AppDataSource } from '../src/config/data-source';

// Initialiser la base de données pour Vercel
AppDataSource.initialize()
  .then(() => {
    console.log('📦 Database connected on Vercel');
  })
  .catch((error) => {
    console.error('❌ Database connection failed on Vercel:', error);
  });

export default app;