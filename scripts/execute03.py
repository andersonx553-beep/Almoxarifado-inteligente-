from pathlib import Path
import runpy,re
p=Path('scripts/alteracao03.py')
s=p.read_text(encoding='utf-8')
s=re.sub(r'# Manual supplier editor:.*?# Migrate old supplier objects', '# Migrate old supplier objects', s, flags=re.S)
p.write_text(s,encoding='utf-8')
runpy.run_path(str(p),run_name='__main__')
html=Path('index.html').read_text(encoding='utf-8')
a=html.index('function renderSupplierImportPreview');b=html.index('function collectSupplierImportForm',a)
html=html[:a]+html[a:b].replace('\\"','"')+html[b:]
Path('index.html').write_text(html,encoding='utf-8')
