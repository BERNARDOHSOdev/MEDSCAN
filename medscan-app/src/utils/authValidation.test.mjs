import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistration } from './authValidation.js';
const valid = { name: 'Teste', age: '30', email: 'teste@example.com', password: 'Senha-teste-123', confirmPassword: 'Senha-teste-123' };
test('validates optional WhatsApp and password composition', () => {
  for (const whatsapp of ['', '(31) 99999-1234', '+55 31 99999-1234']) assert.equal(validateRegistration({ ...valid, whatsapp }), '');
  for (const whatsapp of ['123', 'abc31999991234']) assert.ok(validateRegistration({ ...valid, whatsapp }));
  for (const password of ['abcdefgh1', 'ABCDEFGH1', 'Abcdefghi']) assert.ok(validateRegistration({ ...valid, password, confirmPassword: password }));
});
test('accepts valid registration including age zero', () => { assert.equal(validateRegistration(valid), ''); assert.equal(validateRegistration({ ...valid, age: '0' }), ''); });
test('rejects blanks, invalid email, age, password and confirmation', () => { for (const patch of [{ name: ' ' }, { email: 'x' }, { age: '121' }, { age: '1.5' }, { password: 'abc' }, { confirmPassword: 'different' }, { password: 'a'.repeat(73) }]) assert.ok(validateRegistration({ ...valid, ...patch })); });
