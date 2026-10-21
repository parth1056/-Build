import {mkdir,cp} from 'node:fs/promises';
await mkdir('dist/node_modules',{recursive:true});
await cp('src','dist/src',{recursive:true});
await cp('node_modules/zod','dist/node_modules/zod',{recursive:true});
console.log('Shipping application and runtime dependency packaged');
