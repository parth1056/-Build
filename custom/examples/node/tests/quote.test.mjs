import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shipping} from '../src/quote.mjs';
test('known express shipment',()=>assert.equal(shipping({weightKg:1,express:true}),900));
test('ordinary shipment',()=>assert.equal(shipping({weightKg:2,express:false}),700));
test('invalid shipment rejected',()=>{assert.throws(()=>shipping({weightKg:-1,express:true}));assert.throws(()=>shipping({weightKg:1,express:true,extra:1}));});
