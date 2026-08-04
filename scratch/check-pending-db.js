const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/roadside_assistance';

async function checkPendingRequests() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const ServiceRequest = mongoose.model('ServiceRequest', new mongoose.Schema({}, { strict: false }));
    const requests = await ServiceRequest.find({ status: { $in: ['pending', 'searching', 'unfulfilled'] } }).sort({ createdAt: -1 });

    console.log(`Found ${requests.length} pending requests in DB:`);
    requests.forEach(r => {
      console.log(`ID: ${r._id} | CreatedAt: ${r.createdAt} | Coordinates:`, r.customerLocation?.coordinates, `| Status: ${r.status}`);
    });

    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkPendingRequests();
