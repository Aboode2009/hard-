/**
 * Generates the company attendance QR code as a PNG on the Desktop.
 *
 * The value encoded here is whatever `record_attendance(p_scanned_value)`
 * validates server-side — it lives in the `attendance_config` table in
 * Supabase and is not readable from the client (RLS), so it has to be passed
 * in explicitly.
 *
 * Usage:
 *   node scripts/make-attendance-qr.cjs "<the-code-from-attendance_config>"
 *
 * Find the value in Supabase → Table Editor → attendance_config.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const QRCode = require('qrcode');

const value = process.argv[2];

if (!value) {
  console.error('\nUsage: node scripts/make-attendance-qr.cjs "<code>"\n');
  console.error('The code is the value record_attendance() expects — find it in');
  console.error('Supabase → Table Editor → attendance_config.\n');
  process.exit(1);
}

const out = path.join(os.homedir(), 'Desktop', 'attendance-qr.png');

QRCode.toFile(
  out,
  value,
  {
    // Large and high-correction: this gets printed and scanned from a phone
    // across a room, often on paper that picks up smudges.
    width: 1200,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  },
  (err) => {
    if (err) {
      console.error('Failed to write the QR code:', err.message);
      process.exit(1);
    }
    console.log('QR written to: ' + out);
    console.log('Encoded value: ' + value);
    console.log('\nTest it with the app scanner before printing.');
  },
);
