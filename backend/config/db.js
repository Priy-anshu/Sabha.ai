import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;

  try {
    console.log('🍃 Connecting to MongoDB Atlas Cloud Database...');
    const conn = await mongoose.connect(uri);
    console.log(`🎉 MongoDB Atlas Cloud Connected: ${conn.connection.host}`);
    console.log(`📁 Database Name: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ Failed to connect to MongoDB: ${error.message}`);
  }
}
