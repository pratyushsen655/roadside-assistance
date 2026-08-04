const mongoose = require('mongoose');

const mechanicSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 5.0,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    ratingBreakdown: {
      five: { type: Number, default: 0 },
      four: { type: Number, default: 0 },
      three: { type: Number, default: 0 },
      two: { type: Number, default: 0 },
      one: { type: Number, default: 0 }
    },
    totalJobs: {
      type: Number,
      default: 0,
    },
    licenseNumber: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    licenseExpiry: Date,
    certifications: [String],
    experience: {
      type: Number,
      required: false,
    },
    vehicleSpecializations: [String],
    serviceRadius: {
      type: Number,
      default: 10,
    },
    status: {
      type: String,
      enum: ['online', 'busy', 'offline'],
      default: 'offline',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingsCount: {
      type: Number,
      default: 0,
    },
    completedRequests: {
      type: Number,
      default: 0,
    },
    hourlyRate: {
      type: Number,
      required: false,
      default: 0,
    },
    bankDetails: {
      accountHolderName: { type: String, default: '' },
      accountHolder: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      bankName: { type: String, default: '' },
      branchName: { type: String, default: '' },
      accountType: { type: String, enum: ['savings', 'current'], default: 'savings' },
      isVerified: { type: Boolean, default: false }
    },
    documents: {
      licenseImage: {
        url: { type: String, default: '' },
        status: { type: String, enum: ['unsubmitted', 'pending', 'verified', 'rejected'], default: 'unsubmitted' },
        expiryDate: { type: Date, default: null },
      },
      identityProof: {
        url: { type: String, default: '' },
        status: { type: String, enum: ['unsubmitted', 'pending', 'verified', 'rejected'], default: 'unsubmitted' },
        expiryDate: { type: Date, default: null },
      },
      certificationImages: [
        {
          url: { type: String, default: '' },
          status: { type: String, enum: ['unsubmitted', 'pending', 'verified', 'rejected'], default: 'unsubmitted' },
          expiryDate: { type: Date, default: null },
        }
      ],
    },
    preferences: {
      soundEnabled: { type: Boolean, default: true },
      vibrationEnabled: { type: Boolean, default: true },
      alertVolume: { type: String, enum: ['high', 'medium', 'low'], default: 'high' },
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' },
      language: { type: String, default: 'en' },
    },
    kyc: {
      status: {
        type: String,
        enum: ['unsubmitted', 'pending', 'approved', 'rejected'],
        default: 'unsubmitted',
      },
      docType: {
        type: String,
        default: '',
      },
      docUrl: {
        type: String,
        default: '',
      },
      rejectionReason: {
        type: String,
        default: '',
      },
    },
    earnings: {
      type: Number,
      default: 0,
    },
    activeRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      default: null,
    },
    fcmToken: {
      type: String,
      default: null,
    },
    pushToken: {
      type: String,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    bio: {
      type: String,
      default: '',
    },
    shopName: {
      type: String,
      default: '',
    },
    shopAddress: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

mechanicSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Mechanic', mechanicSchema);
