from pathlib import Path
import runpy,re
p=Path('scripts/alteracao03.py')
s=p.read_text(encoding='utf-8')
s=re.sub(r'# Manual supplier editor:.*?# Migrate old supplier objects', '# Migrate old supplier objects', s, flags=re.S)
p.write_text(s,encoding='utf-8')
runpy.run_path(str(p),run_name='__main__')
