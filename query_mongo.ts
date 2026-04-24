import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("No MONGODB_URI found!");
    process.exit(1);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('portfolio_tracker');
    const user = await db.collection('users').findOne({ email: 'ambanijiocine@gmail.com' });
    console.log("Found user:", !!user);
    if (user) {
      console.log("Assets count:", user.assets ? user.assets.length : 'none');
      console.log("Keys in user:", Object.keys(user));
      if (user.assets && user.assets.length > 0) {
        console.log("First asset:", user.assets[0]);
      }
    }
  } finally {
    await client.close();
  }
}
run();
