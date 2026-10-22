import {runCustom} from '../engine/runner.mjs';import {demoOptions} from '../demo.mjs';
const args=process.argv.slice(2),value=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
try{const result=await runCustom(demoOptions({app:value('--app','inventory'),scenario:value('--scenario','code-change'),repeats:Number(value('--repeats','1'))}));if(result.status!=='completed')process.exitCode=1;}catch(e){console.error(e.message);process.exitCode=1;}
