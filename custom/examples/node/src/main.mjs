import {readFileSync} from 'node:fs';
import {shipping} from './quote.mjs';
const {release}=JSON.parse(readFileSync(new URL('./release.json',import.meta.url)));
console.log(JSON.stringify({application:'shipping-quote',feeCents:shipping({weightKg:1,express:true}),release}));
