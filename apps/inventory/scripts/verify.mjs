import assert from 'node:assert/strict';import {serve} from '@hono/node-server';import {createApp} from './app.mjs';
const server=serve({fetch:createApp().fetch,port:0,hostname:'127.0.0.1'});
try{
 if(!server.listening)await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const initial=await (await fetch(base+'/reorder')).json();
 const reserve=body=>fetch(base+'/reservations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const body={sku:'USB-C',quantity:2,key:'runtime-probe'},first=await reserve(body);assert.equal(first.status,201);const a=await first.json(),second=await reserve(body);assert.deepEqual(await second.json(),a);assert.equal(a.available,3);
 assert.equal((await reserve({sku:'USB-C',quantity:100,key:'over'})).status,409);
 console.log(JSON.stringify({application:'inventory-reservations',reorderThreshold:initial.threshold,reorderCount:initial.items.length,reservationAccepted:true,duplicateStable:true,overReserveBlocked:true}));
}finally{server.closeAllConnections();await new Promise((r,j)=>server.close(e=>e?j(e):r()));}
