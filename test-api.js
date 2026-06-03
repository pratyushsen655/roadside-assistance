// test-api.js – automated integration test for the Roadside Assistance backend
// Run with: node test-api.js

require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');

const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

function logStep(step, success, details = '') {
  const symbol = success ? chalk.green('✔') : chalk.red('✖');
  const msg = success ? chalk.green(step) : chalk.red(step);
  console.log(`${symbol} ${msg}${details ? ' – ' + details : ''}`);
}

(async () => {
  try {
    // 1. Register Customer
    const customerReg = await axios.post(`${baseUrl}/api/auth/register/customer`, {
      name: 'Test Customer',
      email: 'cust@example.com',
      phone: '9899000001',
      password: 'password123'
    });
    logStep('Register Customer', true);
    const customerId = customerReg.data?.user?._id || null;

    // 2. Register Mechanic
    const mechanicReg = await axios.post(`${baseUrl}/api/auth/register/mechanic`, {
      name: 'Test Mechanic',
      email: 'mech@example.com',
      phone: '9899000002',
      password: 'password123',
      vehicleSpecializations: ['car', 'bike']
    });
    logStep('Register Mechanic', true);
    const mechanicId = mechanicReg.data?.mechanic?._id || null;

    // 3. Login Customer
    const loginCustRes = await axios.post(`${baseUrl}/api/auth/login`, {
      phone: '9899000001',
      password: 'password123'
    });
    const custToken = loginCustRes.data?.token;
    logStep('Login Customer', !!custToken);

    // 4. Login Mechanic
    const loginMechRes = await axios.post(`${baseUrl}/api/auth/login`, {
      phone: '9899000002',
      password: 'password123'
    });
    const mechToken = loginMechRes.data?.token;
    logStep('Login Mechanic', !!mechToken);

    // 5. Create Service Request (customer)
    const reqRes = await axios.post(
      `${baseUrl}/api/servicerequests`,
      {
        vehicleType: 'car',
        vehicleModel: 'Maruti Swift',
        issueDescription: 'Engine stalling',
        customerLocation: { type: 'Point', coordinates: [77.2090, 28.6139] }
      },
      { headers: { Authorization: `Bearer ${custToken}` } }
    );
    const serviceRequestId = reqRes.data?._id;
    logStep('Create Service Request', !!serviceRequestId);

    // 6. Mechanic Accepts Request
    const acceptRes = await axios.post(
      `${baseUrl}/api/servicerequests/${serviceRequestId}/accept`,
      {},
      { headers: { Authorization: `Bearer ${mechToken}` } }
    );
    logStep('Mechanic Accept Request', acceptRes.status === 200);

    // 7. Mechanic Completes Job
    const completeRes = await axios.post(
      `${baseUrl}/api/servicerequests/${serviceRequestId}/complete`,
      {},
      { headers: { Authorization: `Bearer ${mechToken}` } }
    );
    logStep('Mechanic Complete Job', completeRes.status === 200);

    // 8. Create Razorpay Order (customer)
    const orderRes = await axios.post(
      `${baseUrl}/api/payments/create`,
      { serviceRequestId, amount: 2500 },
      { headers: { Authorization: `Bearer ${custToken}` } }
    );
    const orderId = orderRes.data?.orderId || orderRes.data?.id;
    logStep('Create Razorpay Order', !!orderId);

    // 9. Verify Payment (customer) – mock data
    const verifyRes = await axios.post(
      `${baseUrl}/api/payments/verify`,
      {
        orderId: orderId,
        paymentId: 'pay_mock_123',
        signature: 'sig_mock_123'
      },
      { headers: { Authorization: `Bearer ${custToken}` } }
    );
    logStep('Verify Payment', verifyRes.status === 200);

    // 10. Submit Rating (customer)
    const ratingRes = await axios.post(
      `${baseUrl}/api/ratings`,
      {
        serviceRequest: serviceRequestId,
        from: customerId,
        fromModel: 'User',
        to: mechanicId,
        toModel: 'Mechanic',
        rating: 5,
        review: 'Excellent service!'
      },
      { headers: { Authorization: `Bearer ${custToken}` } }
    );
    logStep('Submit Rating', ratingRes.status === 200 || ratingRes.status === 201);

    console.log(chalk.blue('\nAll steps completed.'));
  } catch (err) {
    const step = err.config?.url?.split('/').pop() || 'unknown';
    logStep(`Error during ${step}`, false, err.message);
    process.exit(1);
  }
})();
