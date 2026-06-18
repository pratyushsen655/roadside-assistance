const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const SOS = require('../models/SOS');
const Mechanic = require('../models/Mechanic');

const router = express.Router();

// POST /api/sos — create SOS record
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, serviceType, description } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates (lat, lng) are required'
      });
    }

    const sos = await SOS.create({
      customerId: req.user.id,
      location: { lat, lng },
      status: 'pending',
      serviceType: serviceType || 'unknown',
      description: description || 'Emergency SOS Request'
    });

    // Broadcast new SOS to all mechanics listening
    if (/** @type {any} */ (req).io) {
      /** @type {any} */ (req).io.to('mechanics').emit('sos:new', sos);
    }

    res.status(201).json(sos);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/sos/active — return all SOS records with status: pending
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const activeSos = await SOS.find({ status: 'pending' });
    res.status(200).json(activeSos);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/sos/:id/accept — accept SOS request
router.put('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const sos = await SOS.findById(id);

    if (!sos) {
      return res.status(404).json({ success: false, message: 'SOS record not found' });
    }

    if (sos.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'SOS request is already accepted or completed' });
    }

    const mechanic = await Mechanic.findOne({ $or: [{ _id: req.user.id }, { userId: req.user.id }] });

    sos.status = 'accepted';
    sos.mechanicId = /** @type {any} */ (mechanic?.userId || req.user.id);
    await sos.save();

    // Notify customer via socket.io
    if (/** @type {any} */ (req).io) {
      /** @type {any} */ (req).io.to(`job:${id}`).emit('job:accepted:notify', {
        jobId: id,
        mechanicId: mechanic?._id || req.user.id,
        mechanicName: mechanic?.name || 'Mechanic',
        mechanicPhone: mechanic?.phone || ''
      });
    }

    res.status(200).json(sos);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
