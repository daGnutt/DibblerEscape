import assert from 'node:assert/strict';
import { updateAutoSprint, regenStamina } from '../js/stamina.js';

const p = { x: 0, y: 0 };
const at = (x, extra = {}) => ({ x, y: 0, ...extra });
assert.equal(updateAutoSprint(false, [at(0.9, { sees: true })], p), true);
assert.equal(updateAutoSprint(false, [at(0.9, { chasing: true })], p), true);
assert.equal(updateAutoSprint(false, [at(1.5, { sees: true })], p), false, 'not close enough to start');
assert.equal(updateAutoSprint(false, [at(0.9)], p), false, 'roaming dibbler ignored');
assert.equal(updateAutoSprint(false, [at(0.9, { sees: true, slip: 1 })], p), false);
assert.equal(updateAutoSprint(false, [at(0.9, { sees: true, distracted: 1 })], p), false);
assert.equal(updateAutoSprint(true, [at(2)], p), true, 'keeps sprinting inside stop distance');
assert.equal(updateAutoSprint(true, [at(3.4)], p), true);
assert.equal(updateAutoSprint(true, [at(3.5), at(9)], p), false, 'stops at 3.5+');
assert.equal(updateAutoSprint(true, [at(9), at(2)], p), true, 'any dibbler counts');

assert.equal(regenStamina(10, 100, 20, 0.5, true, 0), 10, 'no regen while moving');
assert.equal(regenStamina(10, 100, 20, 0.5, false, 0.3), 10, 'regen delay');
assert.equal(regenStamina(10, 100, 20, 0.5, false, 0), 20);
assert.equal(regenStamina(95, 100, 20, 0.5, false, 0), 100);
console.log('stamina tests passed');
