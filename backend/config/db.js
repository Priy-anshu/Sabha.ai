import mongoose from 'mongoose';

export async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/multi_agent_debate_db');
    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️ Local MongoDB Connection Failed (${error.message}). Continuing without database persistence for now.`);
  }
}
