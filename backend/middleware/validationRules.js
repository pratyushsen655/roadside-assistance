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
exports.createRequestValidation = [
  body('serviceType').trim().notEmpty().withMessage('Service type is required'),
  body('customerLocation').notEmpty().withMessage('Customer location is required'),
  body('customerLocation.coordinates').isArray({ min: 2, max: 2 }).withMessage('Coordinates must be [longitude, latitude]'),
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
