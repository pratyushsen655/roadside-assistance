const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const Mechanic = require('./backend/models/Mechanic');

async function verifyKycLogic() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/roadside_assistance';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB for KYC Verification test');

  // Create or find test mechanic
  let mech = await Mechanic.findOne({ phone: '+919999900001' });
  if (!mech) {
    mech = await Mechanic.create({
      name: 'KYC Test Mechanic',
      phone: '+919999900001',
      kyc: {
        status: 'pending',
        docType: 'Aadhaar Card',
        docUrl: 'https://placehold.co/800x500/1565c0/ffffff.png?text=Aadhaar+KYC+Test',
        rejectionReason: ''
      }
    });
  } else {
    mech.kyc = {
      status: 'pending',
      docType: 'Aadhaar Card',
      docUrl: 'https://placehold.co/800x500/1565c0/ffffff.png?text=Aadhaar+KYC+Test',
      rejectionReason: ''
    };
    await mech.save();
  }

  console.log('Test mechanic created/reset with pending KYC:', mech._id.toString());

  // Test admin route mapping logic
  const idProofUrl = typeof mech.documents?.identityProof === 'object' ? (mech.documents?.identityProof?.url || '') : (mech.documents?.identityProof || '');
  const licenseUrl = typeof mech.documents?.licenseImage === 'object' ? (mech.documents?.licenseImage?.url || '') : (mech.documents?.licenseImage || '');
  const legacyDocUrl = idProofUrl || licenseUrl || '';

  const kycMapped = {
    status: mech.kyc?.status || (mech.kyc?.docUrl || legacyDocUrl ? 'pending' : 'unsubmitted'),
    docType: mech.kyc?.docType || (idProofUrl ? 'Identity Proof' : licenseUrl ? 'Driving License' : legacyDocUrl ? 'Registration Document' : ''),
    docUrl: mech.kyc?.docUrl || legacyDocUrl,
    rejectionReason: mech.kyc?.rejectionReason || '',
  };

  console.log('Mapped KYC Result for Admin Panel:', kycMapped);
  if (kycMapped.status === 'pending' && kycMapped.docUrl && typeof kycMapped.docUrl === 'string') {
    console.log('✅ KYC mapping test PASSED');
  } else {
    console.error('❌ KYC mapping test FAILED');
  }

  await mongoose.disconnect();
}

verifyKycLogic().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
