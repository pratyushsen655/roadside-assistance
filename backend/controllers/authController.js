const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    /** @type {string} */ (process.env.JWT_SECRET || 'fallback_secret_change_in_env'),
    { expiresIn: /** @type {import('jsonwebtoken').SignOptions['expiresIn']} */ (process.env.JWT_EXPIRY || '90d') }
  );
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
        errors: [],
        statusCode: 400,
      });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
        errors: [],
        statusCode: 400,
      });
    }

    user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'user',
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    if (email !== undefined && typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid email parameter: must be a string',
        errors: [],
        statusCode: 400,
      });
    }

    if (phone !== undefined && typeof phone !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone parameter: must be a string',
        errors: [],
        statusCode: 400,
      });
    }

    if (typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password parameter: must be a non-empty string',
        errors: [],
        statusCode: 400,
      });
    }

    const identifier = email || phone;

    if (!identifier || (typeof identifier === 'string' && !identifier.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/phone and password',
        errors: [],
        statusCode: 400,
      });
    }

    const query = email ? { email } : { phone };
    const user = await User.findOne(query).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        errors: [],
        statusCode: 401,
      });
    }

    const isMatch = await /** @type {any} */ (user).matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        errors: [],
        statusCode: 401,
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, generateToken };
