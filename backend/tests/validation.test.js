const express = require('express');
const request = require('supertest');
const { createRequestValidation } = require('../middleware/validationRules');
const validate = require('../middleware/validationMiddleware');

describe('Service Request Creation Validation', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.post('/api/requests', createRequestValidation, validate, (req, res) => {
      res.status(201).json({ success: true, message: 'Request validated and created' });
    });
  });

  test('should accept valid service request payload', async () => {
    const validPayload = {
      serviceType: 'flat_tire',
      vehicleType: 'car',
      vehicleModel: 'Honda City',
      vehicleNumber: 'MH 12 AB 1234',
      customerLocation: {
        type: 'Point',
        coordinates: [73.8567, 18.5204]
      },
      issueDescription: 'Front left tire is flat',
      amount: 350
    };

    const res = await request(app)
      .post('/api/requests')
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('should reject invalid location coordinates [0, 0]', async () => {
    const invalidPayload = {
      serviceType: 'towing',
      customerLocation: {
        type: 'Point',
        coordinates: [0, 0]
      }
    };

    const res = await request(app)
      .post('/api/requests')
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringMatching(/\[0, 0\] are invalid/i)
        })
      ])
    );
  });

  test('should reject invalid vehicle plate number "Xgko [DHKHC]"', async () => {
    const invalidPayload = {
      serviceType: 'fuel_delivery',
      vehicleNumber: 'Xgko [DHKHC]',
      customerLocation: {
        type: 'Point',
        coordinates: [72.8777, 19.0760]
      }
    };

    const res = await request(app)
      .post('/api/requests')
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'vehicleNumber',
          message: expect.stringMatching(/Invalid vehicle registration/i)
        })
      ])
    );
  });

  test('should reject repeated junk vehicleModel "aaaaa"', async () => {
    const invalidPayload = {
      serviceType: 'breakdown',
      vehicleModel: 'aaaaa',
      customerLocation: {
        type: 'Point',
        coordinates: [77.5946, 12.9716]
      }
    };

    const res = await request(app)
      .post('/api/requests')
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'vehicleModel',
          message: expect.stringMatching(/random repetitive/i)
        })
      ])
    );
  });

  test('should reject invalid serviceType', async () => {
    const invalidPayload = {
      serviceType: 'invalid_junk_service',
      customerLocation: {
        type: 'Point',
        coordinates: [77.5946, 12.9716]
      }
    };

    const res = await request(app)
      .post('/api/requests')
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'serviceType'
        })
      ])
    );
  });
});
