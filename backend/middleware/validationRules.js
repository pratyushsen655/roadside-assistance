const { body } = require('express-validator');

// Auth validation rules
exports.loginValidation = [
  body('email').optional().isEmail().withMessage('Please provide a valid email address'),
  body('phone').optional().isMobilePhone('any').withMessage('Please provide a valid phone number'),
  body('password').notEmpty().withMessage('Password is required'),
];

exports.registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

exports.adminLoginValidation = [
  body('email').isEmail().withMessage('Valid admin email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Service Request validation rules
const VALID_SERVICE_TYPES = [
  'flat_tire', 'battery_jump', 'towing', 'fuel_delivery',
  'engine_repair', 'puncture_repair', 'breakdown', 'oil_change',
  'other', 'tire_repair', 'battery', 'lock_out'
];

const VALID_VEHICLE_TYPES = [
  'car', 'bike', 'auto', 'ev', 'other', 'truck', 'tractor', 'bus', 'e-vehicle'
];

const INDIAN_PLATE_REGEX = /^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[0-9A-Z]{1,4}[-\s]?[0-9]{4}$/i;

const isNotRepeatedChar = (val) => {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.length < 2) return false;
  return !/^([a-zA-Z0-9])\1+$/.test(trimmed);
};

exports.createRequestValidation = [
  body('serviceType')
    .trim()
    .notEmpty().withMessage('Service type is required')
    .isIn(VALID_SERVICE_TYPES).withMessage(`Service type must be one of: ${VALID_SERVICE_TYPES.join(', ')}`),

  body('vehicleType')
    .optional()
    .trim()
    .isIn(VALID_VEHICLE_TYPES).withMessage(`Vehicle type must be one of: ${VALID_VEHICLE_TYPES.join(', ')}`),

  body('vehicleModel')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Vehicle make/model must be between 2 and 50 characters')
    .custom((val) => {
      if (val && !isNotRepeatedChar(val)) {
        throw new Error('Vehicle make/model cannot be random repetitive characters');
      }
      return true;
    }),

  body('vehicleNumber')
    .optional()
    .trim()
    .matches(INDIAN_PLATE_REGEX).withMessage('Invalid vehicle registration number format (e.g. MH12AB1234)'),

  body(['customerLocation', 'location'])
    .custom((value, { req }) => {
      const loc = req.body.customerLocation || req.body.location;
      if (!loc) {
        if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
          const lat = Number(req.body.latitude);
          const lng = Number(req.body.longitude);
          if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new Error('Valid non-zero location coordinates (latitude and longitude) are required');
          }
          return true;
        }
        if (req.body.customerAddress) {
          return true; // Address geocoding fallback
        }
        throw new Error('Customer location is required');
      }

      if (!loc.coordinates || !Array.isArray(loc.coordinates) || loc.coordinates.length < 2) {
        throw new Error('Location coordinates must be an array [longitude, latitude]');
      }

      const [lng, lat] = loc.coordinates.map(Number);
      if (isNaN(lng) || isNaN(lat)) {
        throw new Error('Location coordinates must be numbers');
      }

      if (lng === 0 && lat === 0) {
        throw new Error('Location coordinates [0, 0] are invalid default values');
      }

      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        throw new Error('Latitude must be between -90 and 90, Longitude between -180 and 180');
      }

      return true;
    }),

  body(['issueDescription', 'description'])
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Special instructions / description must not exceed 500 characters'),

  body(['amount', 'initial_price', 'price'])
    .optional()
    .isFloat({ min: 1, max: 100000 }).withMessage('Price must be a positive number up to 1,00,000')
];

// SOS request validation rules
exports.sosValidation = [
  body('latitude').isNumeric().withMessage('Valid latitude is required'),
  body('longitude').isNumeric().withMessage('Valid longitude is required'),
];

// Bank details validation rules
exports.bankDetailsValidation = [
  body('accountHolderName').trim().notEmpty().withMessage('Account holder name is required'),
  body('accountNumber').matches(/^\d{9,18}$/).withMessage('Account number must be 9-18 digits'),
  body('ifscCode').matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Valid IFSC code is required'),
];
