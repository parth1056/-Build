from pathlib import Path
from shutil import copyfile
Path('dist').mkdir(exist_ok=True)
for name in ['app.py', 'orders.csv', 'release.json']:
    copyfile(name, Path('dist') / name)
print('CSV summary runtime packaged')
