import {z} from 'zod';
const input=z.object({weightKg:z.number().positive().max(100),express:z.boolean()}).strict();
export function shipping(raw){const x=input.parse(raw);return 500 + Math.round(x.weightKg*100)+(x.express?300:0);}
