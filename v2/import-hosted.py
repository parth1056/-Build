"""Import only captured experiment evidence from an Actions artifact; never execute it."""
from pathlib import Path, PurePosixPath
import json, re, shutil, sys, uuid, zipfile
home = Path(__file__).resolve().parent
stage = home / 'evidence' / ('.import-' + uuid.uuid4().hex)
try:
 with zipfile.ZipFile(sys.argv[1]) as archive:
  experiments = {}
  for name in archive.namelist():
   p = PurePosixPath(name)
   if not name.startswith('evidence/'): continue
   if p.is_absolute() or '..' in p.parts or '\\' in name or ':' in name: raise ValueError('Unsafe artifact path')
   if len(p.parts) < 3 or not re.fullmatch(r'experiment-[a-z0-9-]+', p.parts[1]): continue
   if p.name == 'experiment.json' and len(p.parts) == 3:
    e = json.loads(archive.read(name))
    if e.get('execution', {}).get('platform') != 'github-actions' or e['id'] != p.parts[1]: raise ValueError('Missing hosted provenance')
    experiments[e['id']] = e
  if not experiments: raise ValueError('No hosted experiments found')
  for entry in archive.infolist():
   p = PurePosixPath(entry.filename)
   if len(p.parts) < 3 or p.parts[0] != 'evidence' or p.parts[1] not in experiments: continue
   if p.is_absolute() or '..' in p.parts or '\\' in entry.filename or ':' in entry.filename: raise ValueError('Unsafe artifact path')
   if ((entry.external_attr >> 16) & 0o170000) == 0o120000: raise ValueError('Artifact symlink rejected')
   target = stage.joinpath(*p.parts[1:])
   if entry.is_dir(): target.mkdir(parents=True, exist_ok=True)
   else:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(archive.read(entry))
  for experiment in experiments:
   target = home / 'evidence' / experiment
   if target.exists():
    for f in (stage / experiment).rglob('*'):
     if f.is_file() and f.read_bytes() != (target / f.relative_to(stage / experiment)).read_bytes(): raise ValueError('Existing evidence differs; refusing overwrite')
   else: (stage / experiment).rename(target)
  print(json.dumps({'imported': list(experiments), 'next': 'Run node v2/audit.mjs to verify captured source and results.'}))
finally:
 if stage.exists(): shutil.rmtree(stage)
