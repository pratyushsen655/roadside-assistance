// scratch/testSurcharge.js
require('dotenv').config({ path: 'c:/Users/praty/OneDrive/Desktop/my app/backend/.env' });
const mongoose = require('mongoose');

const { calculateServicePrice } = require('../backend/config/constants');
const { calculateHaversineDistance } = require('../backend/services/mapService');

// Verify calculation logic
function testCalculations() {
  console.log('--- Testing Calculations ---');
  // Example 1: 4.2 km for car/flat_tire
  const fare1 = calculateServicePrice('car', 'flat_tire', 4.2);
  console.log('Car flat_tire 4.2 km:', fare1);
  if (fare1.baseRate === 350 && fare1.distanceCharge === 126 && fare1.totalPrice === 476) {
    console.log('✔ Example 1 passed!');
  } else {
    console.log('✖ Example 1 failed');
  }

  // Example 2: 0 km for bike/oil_change
  const fare2 = calculateServicePrice('bike', 'other', 0);
  console.log('Bike other 0 km:', fare2);
  if (fare2.baseRate === 150 && fare2.distanceCharge === 0 && fare2.totalPrice === 150) {
    console.log('✔ Example 2 passed!');
  } else {
    console.log('✖ Example 2 failed');
  }
}

async function testDatabase() {
  console.log('\n--- Testing Database Schema Insertion ---');
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/roadside_assistance';
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');

    const ServiceRequest = require('../backend/models/ServiceRequest');

    // Create a dummy service request
    const dummy = await ServiceRequest.create({
      customer: new mongoose.Types.ObjectId(),
      vehicleType: 'car',
      vehicleModel: 'Maruti Swift',
      vehicleNumber: 'KA01AB1234',
      serviceType: 'flat_tire',
      issueDescription: 'Flat tire diagnostic test',
      customerLocation: { type: 'Point', coordinates: [77.2090, 28.6139] },
      baseRate: 350,
      distanceCharge: 126,
      totalPrice: 476,
      amount: 476,
      pricing: { baseFare: 350, totalAmount: 476 }
    });

    console.log('✔ Created request with fields:');
    console.log('ID:', dummy._id);
    console.log('baseRate:', dummy.baseRate);
    console.log('distanceCharge:', dummy.distanceCharge);
    console.log('totalPrice:', dummy.totalPrice);

    // Clean up
    await ServiceRequest.deleteOne({ _id: dummy._id });
    console.log('✔ Deleted dummy request successfully');

  } catch (err) {
    console.error('✖ DB Test error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

testCalculations();
testDatabase();
