// scratch/testCreateQrOrder.js
require('dotenv').config({ path: 'c:/Users/praty/OneDrive/Desktop/my app/backend/.env' });
const mongoose = require('mongoose');
const ServiceRequest = require('../backend/models/ServiceRequest');
const { createQrOrder } = require('../backend/controllers/paymentController');

async function runTest() {
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
  console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET);

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/roadside_assistance';
  try {
    await mongoose.connect(uri);
    console.log('Connected to DB');

    // Find the latest service request
    const request = await ServiceRequest.findOne().sort({ createdAt: -1 });
    if (!request) {
      console.log('No service requests found in the DB.');
      return;
    }

    console.log('Found request:', {
      id: request._id,
      status: request.status,
      amount: request.amount,
      accepted_price: request.accepted_price,
      pricing: request.pricing,
      totalPrice: request.totalPrice
    });

    // Mock Express req and res
    const req = {
      body: {
        requestId: request._id.toString()
      }
    };

    const res = {
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.data = data;
        return this;
      }
    };

    console.log('Invoking createQrOrder...');
    await createQrOrder(req, res);
    console.log('Result status:', res.statusCode);
    console.log('Result json:', res.data);

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
