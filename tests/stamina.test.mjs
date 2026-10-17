import assert from 'node:assert/strict';
import { dibblerClosingIn, regenStamina } from '../js/stamina.js';

const p = { x: 0, y: 0 };
assert.equal(dibblerClosingIn([{ x: 2, y: 0, sees: true }], p), true);
assert.equal(dibblerClosingIn([{ x: 2, y: 0, chasing: true }], p), true);
assert.equal(dibblerClosingIn([{ x: 2, y: 0 }], p), false, 'roaming dibbler ignored');
assert.equal(dibblerClosingIn([{ x: 6, y: 0, sees: true }], p), false, 'too far');
assert.equal(dibblerClosingIn([{ x: 2, y: 0, sees: true, slip: 1 }], p), false);
assert.equal(dibblerClosingIn([{ x: 2, y: 0, sees: true, distracted: 1 }], p), false);

assert.equal(regenStamina(10, 100, 20, 0.5, true, 0), 10, 'no regen while moving');
assert.equal(regenStamina(10, 100, 20, 0.5, false, 0.3), 10, 'regen delay');
assert.equal(regenStamina(10, 100, 20, 0.5, false, 0), 20);
assert.equal(regenStamina(95, 100, 20, 0.5, false, 0), 100);
console.log('stamina tests passed');
