import assert from 'node:assert/strict';
import {shipping} from './src/quote.mjs';
for(const weightKg of [0.5,1,2,20,100])assert.ok(Number.isSafeInteger(shipping({weightKg,express:false})));
console.log('Shipping contract checked');
