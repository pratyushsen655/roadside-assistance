const mongoose = require('mongoose');
const ServiceRequestSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mechanic: { type: mongoose.Schema.Types.ObjectId, ref: 'Mechanic', default: null },
  vehicleType: { type: String, enum: ['car', 'bike', 'auto', 'e-vehicle', 'other'], required: true },
  vehicleModel: { type: String, default: '' },
  vehicleNumber: { type: String, default: '' },
  serviceType: { type: String, enum: ['flat_tire', 'battery_jump', 'towing', 'fuel_delivery', 'engine_repair', 'puncture_repair', 'breakdown', 'oil_change', 'other'], default: 'breakdown' },
  issueDescription: { type: String, required: true },
  customerLocation: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], required: true } },
  customerAddress: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'assigned', 'accepted', 'on_the_way', 'arrived', 'work_in_progress', 'completed', 'cancelled'], default: 'pending' },
  pricing: { baseFare: { type: Number, default: 0 }, totalAmount: { type: Number, default: 0 } },
  amount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'razorpay'], default: 'cash' },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  startOTP: { type: String, default: '' },
  completedAt: { type: Date, default: null },
  bookingType: { type: String, enum: ['instant', 'scheduled'], default: 'instant' },
  scheduledTime: { type: Date, default: null },
  cancelledBy: { type: String, default: '' },
  cancellationReason: { type: String, default: '' },
  rejectedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Mechanic' }],
  mechanicLocationAtAcceptance: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  // Bidding System Fields
  initial_price: { type: Number, default: 0 },
  current_price: { type: Number, default: 0 },
  price_increase_count: { type: Number, default: 0 },
  price_history: [{
    price: { type: Number },
    increased_by: { type: Number },
    timestamp: { type: Date, default: Date.now }
  }],
  last_price_update_time: { type: Date, default: Date.now },
  accepted_price: { type: Number, default: null },
  accepted_mechanic_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Mechanic', default: null }
}, { timestamps: true });
ServiceRequestSchema.index({ customerLocation: '2dsphere' });
module.exports = mongoose.model('ServiceRequest', ServiceRequestSchema);