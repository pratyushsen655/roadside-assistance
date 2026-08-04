/**
 * audit-kyc-documents.js
 * Run with: node scripts/audit-kyc-documents.js
 *
 * Audits all Mechanic records in MongoDB and:
 *  - Identifies mechanics with file:// URIs, placeholder URLs, or missing docUrls
 *  - Revokes verification for those mechanics (isVerified: false, kyc.status: 'rejected')
 *  - Prints a full audit report
 */

require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');

const PLACEHOLDER_PATTERNS = [
  'placehold.co',
  'placeholder.com',
  'via.placeholder',
  'picsum.photos',
  'dummyimage.com',
  'lorempixel.com',
];

function isBrokenDocUrl(url) {
  if (!url || typeof url !== 'string') return { broken: true, reason: 'Missing or empty docUrl' };
  if (url.startsWith('file://')) return { broken: true, reason: 'Local device file:// URI (not accessible externally)' };
  if (url.startsWith('data:')) return { broken: true, reason: 'Inline base64 data URI (should be uploaded to server)' };
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (url.includes(pattern)) return { broken: true, reason: `Placeholder/demo image detected (${pattern})` };
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { broken: true, reason: `Non-HTTP URI detected: ${url.slice(0, 60)}` };
  }
  return { broken: false, reason: 'OK' };
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/roadside_assistance';
  console.log(`\nConnecting to MongoDB at: ${uri}\n`);

  await mongoose.connect(uri);
  console.log('Connected to MongoDB.\n');

  const db = mongoose.connection.db;
  const mechanics = await db.collection('mechanics').find({}).toArray();

  console.log(`Total mechanics found: ${mechanics.length}\n`);
  console.log('='.repeat(80));

  const broken = [];
  const clean = [];

  for (const m of mechanics) {
    const kycDocUrl = m.kyc?.docUrl || '';
    const identityProof = m.documents?.identityProof || '';
    const licenseImage = m.documents?.licenseImage || '';
    const certImages = (m.documents?.certificationImages || []).filter(Boolean);

    // Use the same priority as the admin dashboard/backend
    const effectiveDocUrl = kycDocUrl || identityProof || licenseImage || certImages[0] || '';

    console.log(`\nMechanic: ${m.name} (${m._id})`);
    console.log(`  isVerified: ${m.isVerified}`);
    console.log(`  kyc.status: ${m.kyc?.status || 'N/A'}`);
    console.log(`  kyc.docUrl (raw): "${kycDocUrl}"`);
    console.log(`  documents.identityProof (raw): "${identityProof}"`);
    console.log(`  effective docUrl used by dashboard: "${effectiveDocUrl}"`);

    const check = isBrokenDocUrl(effectiveDocUrl);
    if (check.broken) {
      console.log(`  ❌ BROKEN: ${check.reason}`);
      broken.push({ mechanic: m, reason: check.reason });
    } else {
      console.log(`  ✅ CLEAN: Document URL looks valid`);
      clean.push(m);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\nAUDIT SUMMARY`);
  console.log(`  Total mechanics: ${mechanics.length}`);
  console.log(`  ✅ Clean records: ${clean.length}`);
  console.log(`  ❌ Broken/Flagged records: ${broken.length}`);

  if (broken.length === 0) {
    console.log('\nNo broken records found. No changes needed.\n');
    await mongoose.disconnect();
    return;
  }

  console.log('\nBroken mechanics to be REVOKED:');
  broken.forEach(({ mechanic, reason }) => {
    console.log(`  - ${mechanic.name} (${mechanic._id}): ${reason}`);
  });

  console.log('\nRevoking approvals for broken records...\n');

  let revokedCount = 0;
  for (const { mechanic, reason } of broken) {
    const result = await db.collection('mechanics').updateOne(
      { _id: mechanic._id },
      {
        $set: {
          isVerified: false,
          'kyc.status': 'rejected',
          'kyc.rejectionReason': `KYC document inaccessible or invalid format (${reason}). Please re-upload a valid photo of your document from the mobile app.`,
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`  ✅ Revoked: ${mechanic.name} (${mechanic._id}) — ${reason}`);
      revokedCount++;
    } else {
      console.log(`  ⚠️  No change (may already be revoked): ${mechanic.name} (${mechanic._id})`);
    }
  }

  console.log(`\nDone. ${revokedCount}/${broken.length} records revoked.\n`);
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.\n');
}

main().catch(err => {
  console.error('Audit script error:', err);
  process.exit(1);
});
