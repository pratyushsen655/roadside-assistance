const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/../backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/roadside_assistance';

async function cleanupOldDelhiRequests() {
  try {
    console.log('Connecting to MongoDB at:', MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected to MongoDB.');

    const ServiceRequest = mongoose.model('ServiceRequest', new mongoose.Schema({}, { strict: false }));

    const res = await ServiceRequest.updateMany(
      {
        status: { $in: ['pending', 'searching', 'unfulfilled'] },
        'customerLocation.coordinates': { $elemMatch: { $in: [77.209, 77.2090] } }
      },
      {
        $set: {
          status: 'cancelled',
          cancellationReason: 'Cleaned up legacy test request with hardcoded Delhi coordinates'
        }
      }
    );

    console.log(`Cleaned up ${res.modifiedCount || res.nModified || 0} old Delhi test requests!`);

    // Also cancel all old pending requests older than 1 hour if any exist
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const staleRes = await ServiceRequest.updateMany(
      {
        status: { $in: ['pending', 'searching', 'unfulfilled'] },
        createdAt: { $lt: oneHourAgo }
      },
      {
        $set: {
          status: 'cancelled',
          cancellationReason: 'Stale pending test request auto-cancelled'
        }
      }
    );

    console.log(`Auto-cancelled ${staleRes.modifiedCount || staleRes.nModified || 0} stale test requests created over 1 hour ago.`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  } catch (err) {
    console.error('Cleanup Error:', err.message);
  }
}

cleanupOldDelhiRequests();
