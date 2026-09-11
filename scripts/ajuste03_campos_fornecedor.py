from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
original=s

# Add the structured supplier fields to the manual supplier editor only if they are not already present.
if 'id="sCep"' not in s or 'id="sNeighborhood"' not in s or 'id="sNumber"' not in s:
    start=s.index('function openSupplier(id){')
    end=s.index('async function saveSupplier(id){', start)
    block=s[start:end]
    old_city = '<div class="field"><label>Cidade/Estado</label><input id="sCityState" value="${esc(s.cityState||\'\')}"></div>'
    new_city = '''<div class="field"><label>Cidade</label><input id="sCity" value="${esc(s.city||'')}"></div>
 <div class="field"><label>UF</label><input id="sUf" value="${esc(s.uf||'')}"></div>
 <div class="field"><label>CEP</label><input id="sCep" value="${esc(s.cep||'')}"></div>
 <div class="field"><label>Bairro</label><input id="sNeighborhood" value="${esc(s.neighborhood||'')}"></div>
 <div class="field"><label>Número</label><input id="sNumber" value="${esc(s.number||'')}"></div>'''
    if old_city in block:
        block=block.replace(old_city,new_city,1)
    else:
        # Fallback: replace the label/input pair without depending on quote style.
        block=re.sub(r'<div class="field"><label>Cidade/Estado</label><input id="sCityState" value="\$\{esc\(s\.cityState\|\|[\'\"]\)[^<]*</div>',new_city,block,count=1)
    s=s[:start]+block+s[end:]

# Persist the structured fields in manual supplier saves.
old_obj="cityState:sCityState.value.trim(),address:sAddress.value.trim(),notes:sNotes.value.trim()"
new_obj="city:sCity.value.trim(),uf:sUf.value.trim().toUpperCase(),cep:sCep.value.trim(),neighborhood:sNeighborhood.value.trim(),number:sNumber.value.trim(),cityState:sCityState.value.trim(),address:sAddress.value.trim(),notes:sNotes.value.trim()"
if old_obj in s and 'number:sNumber.value.trim()' not in s:
    s=s.replace(old_obj,new_obj,1)

# Backward-compatible migration for old supplier objects.
marker="let db=JSON.parse(localStorage.getItem(KEY)||'null')||{materials:[],suppliers:[],quotes:[],history:[],movements:[],settings:{},count:null};"
if marker in s and 's.number=s.number||' not in s:
    migration="""\nif(Array.isArray(db.suppliers)){db.suppliers.forEach(s=>{s.number=s.number||'';s.neighborhood=s.neighborhood||'';s.city=s.city||'';s.uf=s.uf||'';s.cep=s.cep||'';s.cityState=s.cityState||((s.city&&s.uf)?s.city+' / '+s.uf:'');});}\n"""
    s=s.replace(marker,marker+migration,1)

if s==original:
    raise SystemExit('Nenhuma alteração aplicada aos campos estruturados do fornecedor.')

p.write_text(s,encoding='utf-8')
print('Campos estruturados do fornecedor aplicados.')
