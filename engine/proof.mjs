export function verifyFailureProof(record,fixture,log){
 const check=record.stages.find(s=>s.name===fixture.check);
 return record.status==='failed'&&!record.releaseEligible&&!record.stages.some(s=>['build','package','verify'].includes(s.name))&&check?.status==='failed'&&check.exitCode===(fixture.exitCode??1)&&typeof fixture.logContains==='string'&&!!fixture.logContains&&log.includes(fixture.logContains);
}
