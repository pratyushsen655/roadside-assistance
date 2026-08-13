const fs = require('fs');
const path = require('path');

function generateIncomingRequestWavBuffer() {
  const sampleRate = 22050;
  const duration = 4.0; // 4.0s ringtone loop
  const totalSamples = Math.floor(sampleRate * duration);
  const headerSize = 44;
  const dataSize = totalSamples;
  const totalSize = headerSize + dataSize;
  const bytes = Buffer.alloc(totalSize);

  // 1. RIFF Header
  bytes[0] = 0x52; bytes[1] = 0x49; bytes[2] = 0x46; bytes[3] = 0x46; // RIFF
  const fileSize = 36 + dataSize;
  bytes[4] = fileSize & 0xff;
  bytes[5] = (fileSize >> 8) & 0xff;
  bytes[6] = (fileSize >> 16) & 0xff;
  bytes[7] = (fileSize >> 24) & 0xff;

  bytes[8] = 0x57; bytes[9] = 0x41; bytes[10] = 0x56; bytes[11] = 0x45; // WAVE
  bytes[12] = 0x66; bytes[13] = 0x6d; bytes[14] = 0x74; bytes[15] = 0x20; // fmt 
  bytes[16] = 16; bytes[17] = 0; bytes[18] = 0; bytes[19] = 0; // Subchunk1Size
  bytes[20] = 1; bytes[21] = 0; // AudioFormat = 1 (PCM)
  bytes[22] = 1; bytes[23] = 0; // NumChannels = 1 (Mono)
  
  // SampleRate = 22050 (0x5622)
  bytes[24] = 0x22; bytes[25] = 0x56; bytes[26] = 0; bytes[27] = 0;
  // ByteRate = 22050
  bytes[28] = 0x22; bytes[29] = 0x56; bytes[30] = 0; bytes[31] = 0;
  // BlockAlign = 1
  bytes[32] = 1; bytes[33] = 0;
  // BitsPerSample = 8
  bytes[34] = 8; bytes[35] = 0;

  bytes[36] = 0x64; bytes[37] = 0x61; bytes[38] = 0x74; bytes[39] = 0x61; // data
  bytes[40] = dataSize & 0xff;
  bytes[41] = (dataSize >> 8) & 0xff;
  bytes[42] = (dataSize >> 16) & 0xff;
  bytes[43] = (dataSize >> 24) & 0xff;

  // 2. Ringtone Synthesis Algorithm (Same as soundData.js for in-app alert consistency)
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const cycle = t % 2.0;

    let freq1 = 0;
    let freq2 = 0;
    let amp = 0;

    if (cycle >= 0.0 && cycle < 0.4) {
      freq1 = 850;
      freq2 = 1250;
      const env = Math.sin((cycle / 0.4) * Math.PI);
      amp = env * 0.95;
    } else if (cycle >= 0.45 && cycle < 0.85) {
      freq1 = 950;
      freq2 = 1350;
      const env = Math.sin(((cycle - 0.45) / 0.4) * Math.PI);
      amp = env * 1.0;
    } else if (cycle >= 0.95 && cycle < 1.45) {
      const trillIndex = Math.floor((cycle - 0.95) * 20) % 2;
      freq1 = trillIndex === 0 ? 1400 : 1750;
      freq2 = freq1 * 1.25;
      const env = Math.sin(((cycle - 0.95) / 0.5) * Math.PI);
      amp = env * 0.9;
    }

    let val = 128;
    if (amp > 0) {
      const wave1 = Math.sin(2 * Math.PI * freq1 * t);
      const wave2 = Math.sin(2 * Math.PI * freq2 * t);
      const mixed = (wave1 + 0.6 * wave2) / 1.6;
      val = 128 + Math.floor(amp * 125 * mixed);
    }

    bytes[headerSize + i] = Math.max(0, Math.min(255, val));
  }

  return bytes;
}

const resRawDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'raw');
if (!fs.existsSync(resRawDir)) {
  fs.mkdirSync(resRawDir, { recursive: true });
}

const wavBuffer = generateIncomingRequestWavBuffer();
const targetPath = path.join(resRawDir, 'incoming_request_alert.wav');
fs.writeFileSync(targetPath, wavBuffer);
console.log(`[generate-sound] Wrote ${wavBuffer.length} bytes to ${targetPath}`);
