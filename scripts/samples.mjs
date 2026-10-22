import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {once} from 'node:events';

const root=fileURLToPath(new URL('../',import.meta.url));
const servers=[];
let child;
function stop(){
  child?.kill();
  for(const server of servers)server.closeAllConnections?.();
  for(const server of servers)server.close();
}
process.on('SIGINT',()=>{stop();process.exitCode=130;});
process.on('SIGTERM',()=>{stop();process.exitCode=143;});
async function npm(app,...args){
  const npmCli=process.env.npm_execpath;
  if(!npmCli)throw Error('Start this launcher with npm run samples.');
  child=spawn(process.execPath,[npmCli,...args],{cwd:resolve(root,'apps',app),stdio:'inherit'});
  const [code,signal]=await once(child,'exit');
  child=undefined;
  if(code!==0)throw Error(`${app}: npm ${args.join(' ')} stopped (${signal??code}).`);
}
try{
  // Always honor the lockfiles and rebuild current source; no pipeline/cache experiment.
  for(const app of ['inventory','dashboard']){
    console.log(`\nPreparing ${app}: installing locked dependencies and building the app...`);
    await npm(app,'ci','--no-audit','--no-fund');
    await npm(app,'run','build');
  }
  const require=createRequire(new URL('../apps/inventory/package.json',import.meta.url));
  const {serve}=require('@hono/node-server');
  const {createApp}=await import('../apps/inventory/dist/app.mjs');
  const {createAppServer}=await import('../apps/dashboard/dist/server.mjs');
  const inventory=serve({fetch:createApp().fetch,port:4301,hostname:'127.0.0.1'});
  servers.push(inventory);
  await once(inventory,'listening');
  const dashboard=createAppServer();
  servers.push(dashboard);
  dashboard.listen(4302,'127.0.0.1');
  await once(dashboard,'listening');
  console.log('\nBoth sample apps are running (no Docker or pipeline comparison).');
  console.log('Inventory API: http://127.0.0.1:4301/inventory');
  console.log('Low-stock products: http://127.0.0.1:4301/reorder');
  console.log('StatusLens dashboard: http://127.0.0.1:4302');
  console.log('Keep this terminal open. Ctrl+C stops both apps. Inventory resets on restart.');
}catch(error){
  stop();
  console.error(`\nCould not start samples: ${error.message}`);
  process.exitCode=1;
}
