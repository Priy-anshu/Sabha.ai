import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;

  try {
    console.log('🍃 Connecting to MongoDB Atlas Cloud Database...');
    const conn = await mongoose.connect(uri);
    console.log(`🎉 MongoDB Atlas Cloud Connected: ${conn.connection.host}`);
    console.log(`📁 Database Name: ${conn.connection.name}`);
  } catch (error) {
    console.warn(`⚠️ MongoDB Atlas Connection Warning: ${error.message}`);
    console.warn('🔄 Falling back to Local MongoDB instance...');
    try {
      const conn = await mongoose.connect('mongodb://localhost:27017/multi_agent_debate_db');
      console.log(`🍃 Local MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
      console.error('❌ Failed to connect to any MongoDB instance:', err.message);
    }
  }
}
