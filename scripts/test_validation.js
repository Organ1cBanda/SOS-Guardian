/**
 * Test script for SOS Guardian validation and services
 */

const {
  validatePhoneNumber,
  validateContactName,
  validateContact,
  validateIpAddress,
  MAX_CONTACTS,
} = require('../src/utils/validation');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('--- Running Validation Tests ---');

// 1. Phone validation
assert(validatePhoneNumber('+919876543210').isValid === true, 'Valid Indian format +91');
assert(validatePhoneNumber('9876543210').isValid === true, 'Valid 10-digit phone');
assert(validatePhoneNumber('+1 (555) 123-4567').isValid === true, 'Valid US format with formatting chars');
assert(validatePhoneNumber('12345').isValid === false, 'Invalid short phone (5 digits)');
assert(validatePhoneNumber('abc12345678').isValid === false, 'Invalid phone with alphabets');
assert(validatePhoneNumber('').isValid === false, 'Empty phone rejected');

// 2. Name validation
assert(validateContactName('Mom').isValid === true, 'Valid contact name');
assert(validateContactName('Dr. Emergency Contact').isValid === true, 'Valid long name');
assert(validateContactName('').isValid === false, 'Empty name rejected');
assert(validateContactName('   ').isValid === false, 'Whitespace-only name rejected');

// 3. Contact validation
assert(validateContact({ name: 'Mom', phone: '+919876543210' }).isValid === true, 'Valid contact object');
assert(validateContact({ name: '', phone: '+919876543210' }).isValid === false, 'Contact with empty name rejected');

// 4. IP validation
assert(validateIpAddress('192.168.4.1') === true, 'Valid default ESP32 IP 192.168.4.1');
assert(validateIpAddress('127.0.0.1') === true, 'Valid localhost IP');
assert(validateIpAddress('999.999.999.999') === false, 'Invalid IP out of range');
assert(validateIpAddress('invalid-ip') === false, 'Invalid non-numeric IP');

// 5. Max contacts limit constant
assert(MAX_CONTACTS === 5, 'MAX_CONTACTS constant is strictly 5');

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
