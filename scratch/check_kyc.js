const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const Mechanic = require('./backend/models/Mechanic');

async function test() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/roadside_assistance';
  console.log('Connecting to Mongo:', mongoUri);
  await mongoose.connect(mongoUri);

  const mechanics = await Mechanic.find();
  console.log(`Found ${mechanics.length} mechanics in DB:`);
  mechanics.forEach(m => {
    console.log({
      id: m._id.toString(),
      name: m.name,
      phone: m.phone,
      kyc: m.kyc,
      documents: m.documents
    });
  });

  await mongoose.disconnect();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
