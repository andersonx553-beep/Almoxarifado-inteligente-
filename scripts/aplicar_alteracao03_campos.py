from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
original=s

# 1) Manual supplier editor: expose the same structured fields used by the importer.
if 'id="sCep"' not in s or 'id="sNeighborhood"' not in s or 'id="sNumber"' not in s:
    start=s.index('function openSupplier(id){')
    end=s.index('async function saveSupplier(id){', start)
    block=s[start:end]
    pattern=r'<div class="field"><label>Cidade/Estado</label><input id="sCityState" value="\$\{esc\(s\.cityState\|\|\x27\x27\)\}"></div>'
    replacement='''<div class="field"><label>Cidade</label><input id="sCity" value="${esc(s.city||'')}"></div>
 <div class="field"><label>UF</label><input id="sUf" value="${esc(s.uf||'')}"></div>
 <div class="field"><label>CEP</label><input id="sCep" value="${esc(s.cep||'')}"></div>
 <div class="field"><label>Bairro</label><input id="sNeighborhood" value="${esc(s.neighborhood||'')}"></div>
 <div class="field"><label>Número</label><input id="sNumber" value="${esc(s.number||'')}"></div>'''
    newblock,n=re.subn(pattern,replacement,block,count=1)
    if n==0:
        raise SystemExit('Não foi localizado o campo Cidade/Estado no editor manual.')
    s=s[:start]+newblock+s[end:]

# 2) Persist structured fields in manual supplier saves.
old="cityState:sCityState.value.trim(),address:sAddress.value.trim(),notes:sNotes.value.trim()"
new="city:sCity.value.trim(),uf:sUf.value.trim().toUpperCase(),cep:sCep.value.trim(),neighborhood:sNeighborhood.value.trim(),number:sNumber.value.trim(),cityState:sCityState.value.trim(),address:sAddress.value.trim(),notes:sNotes.value.trim()"
if old in s and 'number:sNumber.value.trim()' not in s:
    s=s.replace(old,new,1)

# 3) Backward-compatible migration for already saved suppliers.
marker="let db=JSON.parse(localStorage.getItem(KEY)||'null')||{materials:[],suppliers:[],quotes:[],history:[],movements:[],settings:{},count:null};"
if marker in s and 's.number=s.number||' not in s:
    migration="""\nif(Array.isArray(db.suppliers)){db.suppliers.forEach(s=>{s.number=s.number||'';s.neighborhood=s.neighborhood||'';s.city=s.city||'';s.uf=s.uf||'';s.cep=s.cep||'';s.cityState=s.cityState||((s.city&&s.uf)?s.city+' / '+s.uf:'');});}\n"""
    s=s.replace(marker,marker+migration,1)

# 4) Make neighborhood extraction robust for DANFE OCR ordering.
old_neighborhood=r'''if(addr.index>=0){for(let i=addr.index+1;i<Math.min(pre.length,addr.index+5);i++){let x=supplierNormalize(pre[i]);if(!x||/^(cnpj|inscri|fone|telefone|tel|cep|cidade|uf|municipio|município)\b/i.test(x))continue;if(/\b\d{5}-?\d{3}\b/.test(x)||/\s[-/]\s[A-Z]{2}\b/i.test(x))continue;x=x.replace(/\b\d{5}-?\d{3}\b/,'').trim();if(x&&x.length<=60){data.neighborhood=x;break}}}'''
new_neighborhood=r'''if(addr.index>=0){for(let i=addr.index+1;i<Math.min(pre.length,addr.index+7);i++){let x=supplierNormalize(pre[i]);if(!x)continue;x=x.replace(/\b\d{5}-?\d{3}\b/g,'').replace(/\b(?:sa[ií]da|entrada)\s*:\s*\d+\b/ig,'').replace(/\s{2,}/g,' ').replace(/^[,;\-\s]+|[,;\-\s]+$/g,'').trim();if(!x||/^(cnpj|inscri|fone|telefone|tel|cep|cidade|uf|municipio|município|natureza|série|serie|n[ºo]|número|numero|danfe|documento auxiliar)\b/i.test(x))continue;if(/\s[-/]\s[A-Z]{2}\b/i.test(x)||/^(rua|r\.?|avenida|av\.?|travessa|tv\.?|rodovia|rod\.?|estrada|alameda|pra[çc]a)\b/i.test(x))continue;if(/\b(?:fatura|protocolo|autorização|autorizacao|controle do fisco|chave de acesso)\b/i.test(x))continue;if(/[A-Za-zÀ-ÿ]{3,}/.test(x)&&x.length<=60){data.neighborhood=x;break}}}'''
if old_neighborhood in s:
    s=s.replace(old_neighborhood,new_neighborhood,1)

if s==original:
    raise SystemExit('Nenhuma alteração aplicada.')
p.write_text(s,encoding='utf-8')
print('Alteração 03 — campos estruturados e leitura de bairro aplicada.')
