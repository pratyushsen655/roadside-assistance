const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/roadside_assistance';

async function run() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const mechanics = await db.collection('mechanics').find({}).toArray();
    console.log(`TOTAL_MECHANICS_COUNT: ${mechanics.length}`);
    mechanics.forEach(m => {
      console.log(`\nMECHANIC_ID: ${m._id}`);
      console.log(`  Name: ${m.name}`);
      console.log(`  Phone: ${m.phone}`);
      console.log(`  isVerified: ${m.isVerified}`);
      console.log(`  kyc: ${JSON.stringify(m.kyc || {})}`);
      console.log(`  documents: ${JSON.stringify(m.documents || {})}`);
    });
  } catch (err) {
    console.error('Error querying MongoDB:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
