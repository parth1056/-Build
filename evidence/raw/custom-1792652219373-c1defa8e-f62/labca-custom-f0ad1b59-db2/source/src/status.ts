import {z} from 'zod';
const service=z.object({name:z.string().min(1),latencyMs:z.number().nonnegative(),errorRate:z.number().min(0).max(1),uptime:z.number().min(0).max(100)}).strict();
export const configSchema=z.object({latencyLimitMs:z.number().positive(),errorRateLimit:z.number().min(0).max(1)}).strict();
export function summarize(raw:unknown,limits:unknown){const rows=z.array(service).min(1).parse(raw),config=configSchema.parse(limits);if(new Set(rows.map(x=>x.name)).size!==rows.length)throw Error('Duplicate service');return {services:rows.map(x=>({...x,state:x.latencyMs>config.latencyLimitMs&&x.errorRate>config.errorRateLimit?'degraded':'operational'})),config};}
