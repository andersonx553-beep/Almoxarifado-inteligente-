from pathlib import Path
import runpy
p=Path('scripts/alteracao03.py')
s=p.read_text(encoding='utf-8')
s=s.replace("old='<div class=\"field\"><label>Cidade/Estado</label><input id=\"sCityState\" value=\"${esc(s.cityState||\\'')}\"></div>'", "old=\"\"\"<div class=\\\"field\\\"><label>Cidade/Estado</label><input id=\\\"sCityState\\\" value=\\\"${esc(s.cityState||'')}\\\"></div>\"\"\"")
p.write_text(s,encoding='utf-8')
runpy.run_path(str(p),run_name='__main__')
