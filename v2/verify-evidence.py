from pathlib import Path
import json, statistics, hashlib, base64, math, datetime
root=Path(__file__).resolve().parent
audited=json.loads((root/'verified-evidence.json').read_text(encoding='utf-8'))
checks=[]
for audit in audited['experiments']:
 if audit['status']!='verified': continue
 folder=root/'evidence'/audit['id']
 e=json.loads((folder/'experiment.json').read_text(encoding='utf-8'))
 assert e['status']=='completed'
 for r in e['runs']:
  plan=r['plan'];actual=(folder/r['id']/'source/Dockerfile').read_text(encoding='utf-8')
  assert actual==plan['dockerfile']
  serial=json.dumps({'dockerfile':actual,'parallel':plan['parallel'],'checks':plan['checks']},separators=(',',':'),ensure_ascii=False)
  assert hashlib.sha256(serial.encode()).hexdigest()==plan['planHash']
  assert all(s['durationMs']>=0 and s['startMs']>=0 and s['startMs']+s['durationMs']<=r['elapsedMs']+1 for s in r['stages'])
  if r['scenario']=='failure' and r['workload']=='invoice' and r['purpose']=='proof':
   seed=next(x for x in e['runs'] if x['purpose']=='preparation' and x['workload']=='invoice' and x['mode']==r['mode'])
   assert (folder/seed['id']/'source/tests/invoice.test.ts').read_bytes()==(folder/r['id']/'source/tests/invoice.test.ts').read_bytes()
   assert 'total:subtotal-discount+tax+1' in (folder/r['id']/'source/src/invoice.ts').read_text()
   assert next(s for s in r['stages'] if s['name']=='tests')['status']=='failed'
   assert not any(s['name']=='package' for s in r['stages']) and not r['releaseEligible']
  if r['scenario']=='dependency-change' and r['purpose']=='measurement':
   lock=json.loads((folder/r['id']/'source/package-lock.json').read_text())
   package=lock['packages']['node_modules/zod'];assert package['version']=='4.6.7'
   archive=Path(e['environment']['packageDirectory'])/package['resolved'].split('/')[-1]
   integrity='sha512-'+base64.b64encode(hashlib.sha512(archive.read_bytes()).digest()).decode()
   assert integrity==package['integrity'] and not r['cache']['installLayerReused']
 for g in audit['summary']:
  for result in g['result']:
   values=[r['elapsedMs'] for r in e['runs'] if r['purpose']=='measurement' and r['workload']==g['workload'] and r['mode']==result['mode']]
   if values:
    assert math.isclose(statistics.median(values),result['medianMs'],abs_tol=1e-8)
    assert min(values)==result['minMs'] and max(values)==result['maxMs']
 checks.append({'experiment':e['id'],'runs':len(e['runs']),'independentStatistics':True,'actualDockerfilesMatchPlanHashes':True,'stageIntervalsWithinElapsed':True,'faultAndUpgradeChecks':True})
out={'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'experiments':checks,'note':'Independent Python checks of Node summaries, executable plans, stage boundaries, unchanged tests catching the invoice regression and actual dependency-upgrade input integrity.'}
(root/'independent-verification.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
print(json.dumps({'independentlyVerifiedExperiments':len(checks),'runs':sum(x['runs'] for x in checks)}))
