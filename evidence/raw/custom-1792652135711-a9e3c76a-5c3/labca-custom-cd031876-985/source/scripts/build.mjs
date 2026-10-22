import {build} from 'esbuild';import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await build({entryPoints:['src/app.ts'],outfile:'dist/app.mjs',bundle:true,platform:'node',format:'esm',target:'node24',sourcemap:false});
await build({entryPoints:['scripts/verify.mjs','scripts/server.mjs'],outdir:'dist',outExtension:{'.js':'.mjs'},bundle:true,external:['./app.mjs'],platform:'node',format:'esm',target:'node24'});
await writeFile('dist/README.txt','Inventory Reservations API: run node server.mjs; GET /inventory, GET /reorder, POST /reservations. In-memory lab storage only.\n');
