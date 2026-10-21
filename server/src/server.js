import app from './app.js';
import dotenv from 'dotenv';
import prisma from './config/db.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Database connection established.');
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();
