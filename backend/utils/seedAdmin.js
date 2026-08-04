const User = require('../models/User');

/**
 * Seeds a default admin account in MongoDB if none exists.
 */
const seedAdminAccount = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@roadside.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@RoadMitra2026!';
      const adminPhone = process.env.ADMIN_PHONE || '+910000000000';

      await User.create({
        name: 'RoadMitra Admin',
        email: adminEmail,
        password: adminPassword,
        phone: adminPhone,
        role: 'admin',
        isVerified: true
      });

      console.log(`[SEED] Admin account created successfully: ${adminEmail}`);
    }
  } catch (error) {
    console.error('[SEED ERROR] Failed to seed admin account:', error.message);
  }
};

module.exports = seedAdminAccount;
