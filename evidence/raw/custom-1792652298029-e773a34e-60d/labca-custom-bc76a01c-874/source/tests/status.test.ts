import {test} from 'node:test';import assert from 'node:assert/strict';import {summarize} from '../src/status.js';
const service={name:'API',latencyMs:150,errorRate:0.01,uptime:99.9},limits={latencyLimitMs:200,errorRateLimit:0.02};
test('healthy service remains operational',()=>assert.equal(summarize([service],limits).services[0]!.state,'operational'));
test('latency or errors independently cause degradation',()=>{for(const s of [{...service,latencyMs:201},{...service,errorRate:0.021}])assert.equal(summarize([s],limits).services[0]!.state,'degraded');});
test('exact threshold is not exceeded',()=>assert.equal(summarize([{...service,latencyMs:200,errorRate:0.02}],limits).services[0]!.state,'operational'));
test('changing configuration changes real classifications',()=>assert.equal(summarize([service],{...limits,errorRateLimit:0.005}).services[0]!.state,'degraded'));
test('invalid observations, limits and duplicate names rejected',()=>{for(const s of [{...service,errorRate:-1},{...service,latencyMs:-1},{...service,uptime:101}])assert.throws(()=>summarize([s],limits));assert.throws(()=>summarize([service,service],limits),/Duplicate/);assert.throws(()=>summarize([],limits));assert.throws(()=>summarize([service],{...limits,latencyLimitMs:0}));});
