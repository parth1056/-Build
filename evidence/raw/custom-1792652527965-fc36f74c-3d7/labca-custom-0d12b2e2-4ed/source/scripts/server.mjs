import {serve} from '@hono/node-server';import {createApp} from './app.mjs';
serve({fetch:createApp().fetch,port:3000,hostname:'0.0.0.0'});
