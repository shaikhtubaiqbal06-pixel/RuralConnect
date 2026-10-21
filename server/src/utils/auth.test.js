import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmail, normalizeEmail, normalizePhone } from './auth.js';

test('normalizes and validates email addresses consistently', () => {
  const email = normalizeEmail('  Asha@RuralConnect.in ');
  assert.equal(email, 'asha@ruralconnect.in');
  assert.equal(isValidEmail(email), true);
  assert.equal(isValidEmail('not-an-email'), false);
});

test('normalizes supported Indian phone formats to ten digits', () => {
  assert.equal(normalizePhone('9876543210'), '9876543210');
  assert.equal(normalizePhone('+91 98765-43210'), '9876543210');
  assert.equal(normalizePhone('09876543210'), '9876543210');
  assert.equal(normalizePhone('1234567890'), '');
  assert.equal(normalizePhone('98765abc210'), '');
});
