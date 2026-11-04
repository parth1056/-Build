import {resolve} from 'node:path';
import {runCustom} from '../engine/runner.mjs';
const help=`Custom Docker app builds — separate from the comparison website\n\nnode custom/cli.mjs --project <folder> --trust-project [options]\n\n--config <relative.json>   Adapter file in the project (default pipeline-lab.json)\n--mode after|before|compare  Default after; compare requires explicit before Dockerfile\n--scenario repository|code-change|unchanged|cold|failure  Default repository\n--repeats 1..5             Default 1; repository and failure require 1\n--trust-project           Required: you trust this project's Dockerfiles and commands\n--help                    Show this help\n\nRepository mode restores/saves a local portable cache. Controlled scenarios use\nreset caches and explicit seeds. No arbitrary-project automatic optimization is claimed.\nRead custom/README.md for the adapter contract and examples.\n`;
try{
 const args=process.argv.slice(2);if(args.includes('--help')||!args.length){console.log(help);process.exitCode=args.includes('--help')?0:1;}
 else{const opts={config:'pipeline-lab.json',mode:'after',scenario:'repository',repeats:1,trust:false};
 for(let i=0;i<args.length;i++){const arg=args[i];if(arg==='--trust-project'){opts.trust=true;continue;}const key={'--project':'project','--config':'config','--mode':'mode','--scenario':'scenario','--repeats':'repeats'}[arg];if(!key||!args[i+1]||args[i+1].startsWith('--'))throw Error('Unknown or incomplete option: '+arg);opts[key]=key==='repeats'?Number(args[++i]):args[++i];}
 if(!opts.project)throw Error('--project is required');if(!opts.trust)throw Error('Review the project, then pass --trust-project. Docker build commands execute project-supplied code; this is not an untrusted-code service.');
 opts.project=resolve(opts.project);const result=await runCustom(opts);if(result.status!=='completed')process.exitCode=1;}
}catch(e){console.error('Custom build error: '+e.message);process.exitCode=1;}
