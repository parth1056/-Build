import {Hono} from 'hono';
import {inventory,reorder} from './domain.js';
import stock from './stock.json' with {type:'json'};
import config from './config.json' with {type:'json'};
export function createApp(){
 const app=new Hono(),store=inventory(stock);
 app.get('/health',c=>c.json({status:'ok',warehouse:config.warehouse}));
 app.get('/inventory',c=>c.json(store.list()));
 app.get('/reorder',c=>c.json({threshold:config.reorderThreshold,items:reorder(store.list(),config.reorderThreshold)}));
 app.post('/reservations',async c=>{try{return c.json(store.reserve(await c.req.json()),201);}catch(e){const message=e instanceof Error?e.message:'Invalid request';return c.json({error:message},message==='SKU_NOT_FOUND'?404:message==='INSUFFICIENT_STOCK'||message==='IDEMPOTENCY_CONFLICT'?409:400);}});
 return app;
}
