import {z} from 'zod';
export type Item={sku:string;name:string;onHand:number;reserved:number};
export const request=z.object({sku:z.string().min(1).max(40),quantity:z.number().int().positive().max(1000),key:z.string().min(1).max(80)}).strict();
export const available=(item:Item)=>item.onHand-item.reserved;
export const reorder=(items:Item[],threshold:number)=>items.filter(item=>available(item)<threshold).map(item=>({...item,available:available(item)}));
export function inventory(seed:Item[]){
 const items=structuredClone(seed),reservations=new Map<string,{sku:string;quantity:number;available:number}>();
 return {
  list:()=>structuredClone(items),
  reserve(raw:unknown){
   const x=request.parse(raw),previous=reservations.get(x.key);
   if(previous){if(previous.sku!==x.sku||previous.quantity!==x.quantity)throw new Error('IDEMPOTENCY_CONFLICT');return {...previous};}
   const item=items.find(i=>i.sku===x.sku);if(!item)throw new Error('SKU_NOT_FOUND');
   if(available(item)<x.quantity)throw new Error('INSUFFICIENT_STOCK');
   item.reserved+=x.quantity;const result={sku:x.sku,quantity:x.quantity,available:available(item)};reservations.set(x.key,result);return {...result};
  }
 };
}
