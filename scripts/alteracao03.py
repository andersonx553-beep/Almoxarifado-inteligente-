from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
original=s

start=s.index('function supplierNormalize')
end=s.index('async function openSupplierDocument', start)
new=r'''function supplierNormalize(v){return normalizeImportText(v).replace(/\s+/g,' ').trim()}
function supplierFold(v){return supplierNormalize(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function supplierDigits(v){return String(v||'').replace(/\D/g,'')}
function supplierFormatPhone(v){const d=supplierDigits(v);if(d.length===11)return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;if(d.length===10)return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;return String(v||'').trim()}
function supplierFormatCnpj(v){const d=supplierDigits(v);return d.length===14?`${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`:String(v||'').trim()}
function supplierValidCnpj(v){const d=supplierDigits(v);if(d.length!==14||/^([0-9])\1{13}$/.test(d))return false;let calc=(base,factor)=>{let sum=0;for(let i=0;i<base.length;i++)sum+=Number(base[i])*factor--;let r=(sum*10)%11;return r===10?0:r};return calc(d.slice(0,12),5)===Number(d[12])&&calc(d.slice(0,13),6)===Number(d[13])}
function supplierFieldFromLines(lines,labels){const folds=labels.map(supplierFold);for(let i=0;i<lines.length;i++){const raw=supplierNormalize(lines[i]);const f=supplierFold(raw);const idx=folds.findIndex(l=>f===l||f.startsWith(l+':')||f.startsWith(l+' -'));if(idx<0)continue;let value=raw.replace(new RegExp('^'+labels[idx].replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'\\s*[:\\-]?\\s*','i'),'').trim();if(value)return value;for(let j=i+1;j<Math.min(lines.length,i+3);j++){const nxt=supplierNormalize(lines[j]);if(nxt&&!/^(fornecedor|razao social|nome fantasia|cnpj|endereco|numero|bairro|fone|telefone|whatsapp|e-?mail|contato|responsavel|cidade|estado|uf|cep)\s*:/i.test(nxt))return nxt}}return ''}
function supplierNfePreDest(lines){const idx=lines.findIndex(x=>/DESTINAT[ÁA]RIO\s*\/\s*REMETENTE/i.test(x));return idx>=0?lines.slice(0,idx):lines}
function supplierExtractNfeName(text,lines){const m=text.match(/RECEBEMOS\s+DE\s+(?:\d+\s+)?(.+?)(?=\s+OS\s+PRODUTOS(?:\/|\s)|\s+OS\s+SERVI[ÇC]OS|$)/i);if(m)return m[1].replace(/\s+/g,' ').trim();const candidates=lines.filter(x=>/\b(LTDA|Ltda|S\.A\.?|S\/A|ME|EIRELI|COM[ÉE]RCIO|COMERCIO|SUPERMERCADO|DISTRIBUIDORA|INDUSTRIA|IND[ÚU]STRIA)\b/i.test(x));return candidates[0]||''}
function supplierExtractAddress(lines){for(let i=0;i<lines.length;i++){const x=supplierNormalize(lines[i]);if(/^(rua|r\.?|avenida|av\.?|travessa|tv\.?|rodovia|rod\.?|estrada|alameda|pra[çc]a)\b/i.test(x)){let address=x.replace(/\s+-\s*$/,'').trim(),number='';const nm=address.match(/(?:,|\s)\s*(\d{1,6})\b/);if(nm){number=nm[1];address=address.replace(new RegExp('\\s*,?\\s*'+number+'\\b'),'').trim()}return {address,number,index:i}}}return {address:'',number:'',index:-1}}
function supplierExtractCityUf(lines){for(const x0 of lines){const x=supplierNormalize(x0);const m=x.match(/(?:^|\s)([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][A-ZÁÀÂÃÉÊÍÓÔÕÚÇ\s.'-]{2,})\s*-\s*([A-Z]{2})(?:\s|$)/i);if(m)return {city:m[1].trim().replace(/\s+/g,' '),uf:m[2].toUpperCase()}}return {city:'',uf:''}}
function supplierExtractCep(lines){for(const x of lines){const m=supplierNormalize(x).match(/\b\d{5}-?\d{3}\b/);if(m)return m[0].replace(/^(\d{5})-?(\d{3})$/,'$1-$2')}return ''}
function supplierExtractPhone(lines){for(const x of lines){if(!/\b(fone|telefone|tel\.?|celular)\b/i.test(x))continue;const m=supplierNormalize(x).match(/(?:fone(?:\/fax)?|telefone|tel\.?|celular)\s*[:\-]?\s*([()\d\s.-]{10,16})/i);if(m&&supplierDigits(m[1]).length>=10)return supplierFormatPhone(m[1])}return ''}
function extractSupplierData(lines){
  const all=lines.map(supplierNormalize).filter(Boolean),text=all.join('\n'),pre=supplierNfePreDest(all),preText=pre.join('\n');
  const isNfe=/DANFE|DOCUMENTO AUXILIAR DA NOTA FISCAL ELETR[ÔO]NICA|DESTINAT[ÁA]RIO\s*\/\s*REMETENTE|CHAVE DE ACESSO DA NF-?E/i.test(text);
  const data={legalName:'',tradeName:'',name:'',cnpj:'',phone:'',whatsapp:'',email:'',contact:'',address:'',number:'',neighborhood:'',city:'',uf:'',cep:'',cityState:'',isNfe};
  if(isNfe){
    data.name=supplierExtractNfeName(preText,pre);data.legalName=data.name;data.tradeName=data.name;
    const keys=[...preText.replace(/\s/g,'').matchAll(/\d{44}/g)].map(m=>m[0]);
    for(const k of keys){const c=k.slice(6,20);if(supplierValidCnpj(c)){data.cnpj=supplierFormatCnpj(c);break}}
    if(!data.cnpj){for(const m of preText.matchAll(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g)){if(supplierValidCnpj(m[0])){data.cnpj=supplierFormatCnpj(m[0]);break}}}
    data.phone=supplierExtractPhone(pre);
    const em=preText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);if(em)data.email=em[0];
    const addr=supplierExtractAddress(pre);data.address=addr.address;data.number=addr.number;
    const cu=supplierExtractCityUf(pre);data.city=cu.city;data.uf=cu.uf;data.cityState=cu.city&&cu.uf?`${cu.city} / ${cu.uf}`:'';
    data.cep=supplierExtractCep(pre);
    if(addr.index>=0){for(let i=addr.index+1;i<Math.min(pre.length,addr.index+5);i++){const x=supplierNormalize(pre[i]);if(!x||/^(cnpj|inscri|fone|telefone|tel|cep|cidade|uf)\b/i.test(x))continue;if(/\b\d{5}-?\d{3}\b/.test(x)||/\s-\s[A-Z]{2}\b/i.test(x))continue;if(x.length<=60){data.neighborhood=x;break}}}
    const c=pre.find(x=>/^CONTATO\s*[:\-]/i.test(x));if(c)data.contact=c.replace(/^CONTATO\s*[:\-]?\s*/i,'').trim();
    const wa=pre.find(x=>/^WHATSAPP\s*[:\-]/i.test(x));if(wa){const m=wa.match(/(\(?\d{2}\)?\s*\d{4,5}[\s-]?\d{4})/);if(m)data.whatsapp=supplierFormatPhone(m[1])}
  }else{
    data.legalName=supplierFieldFromLines(all,['RAZÃO SOCIAL','RAZAO SOCIAL']);data.tradeName=supplierFieldFromLines(all,['NOME FANTASIA']);data.name=supplierFieldFromLines(all,['FORNECEDOR'])||data.tradeName||data.legalName;
    const c=supplierFieldFromLines(all,['CNPJ']);if(c&&supplierValidCnpj(c))data.cnpj=supplierFormatCnpj(c);const em=supplierFieldFromLines(all,['E-MAIL','EMAIL']);if(em){const m=em.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);if(m)data.email=m[0]}
    data.phone=supplierExtractPhone(all);data.contact=supplierFieldFromLines(all,['CONTATO','RESPONSÁVEL','RESPONSAVEL']);data.address=supplierFieldFromLines(all,['ENDEREÇO','ENDERECO']);data.cityState=supplierFieldFromLines(all,['CIDADE/ESTADO','CIDADE / ESTADO']);
  }
  if(!data.name)data.name=data.tradeName||data.legalName||'';if(!data.legalName)data.legalName=data.name||'';if(!data.tradeName)data.tradeName=data.name||'';return data;
}
function findExistingSupplier(data){const c=supplierFold(data.cnpj);const name=supplierFold(data.tradeName||data.legalName||data.name);return db.suppliers.find(s=>(c&&supplierFold(s.cnpj)===c)||(name&&[s.name,s.tradeName,s.legalName].some(v=>supplierFold(v)===name))||(data.email&&supplierFold(s.email)===supplierFold(data.email)))||null}
'''
s=s[:start]+new+s[end:]

# Import preview fields
s=s.replace('<div class="field"><label>Cidade/Estado</label><input id="siCityState" value="${esc(d.cityState||\'\')}"></div><div class="field full"><label>Endereço</label><input id="siAddress" value="${esc(d.address||\'\')}"></div>', '<div class="field"><label>Cidade</label><input id="siCity" value="${esc(d.city||\'\')}"></div><div class="field"><label>UF</label><input id="siUf" value="${esc(d.uf||\'\')}"></div><div class="field"><label>CEP</label><input id="siCep" value="${esc(d.cep||\'\')}"></div><div class="field"><label>Bairro</label><input id="siNeighborhood" value="${esc(d.neighborhood||\'\')}"></div><div class="field"><label>Número</label><input id="siNumber" value="${esc(d.number||\'\')}"></div><div class="field full"><label>Endereço</label><input id="siAddress" value="${esc(d.address||\'\')}"></div><div class="field full"><label>Cidade/Estado (compatibilidade)</label><input id="siCityState" value="${esc(d.cityState||((d.city&&d.uf)?d.city+\' / \'+d.uf:\'\'))}"></div>',1)
old="function collectSupplierImportForm(){supplierImportState.data={...supplierImportState.data,legalName:document.getElementById('siLegalName').value.trim(),tradeName:document.getElementById('siTradeName').value.trim(),cnpj:document.getElementById('siCnpj').value.trim(),phone:document.getElementById('siPhone').value.trim(),whatsapp:document.getElementById('siWhatsapp').value.trim(),email:document.getElementById('siEmail').value.trim(),contact:document.getElementById('siContact').value.trim(),cityState:document.getElementById('siCityState').value.trim(),address:document.getElementById('siAddress').value.trim()}}"
new="function collectSupplierImportForm(){supplierImportState.data={...supplierImportState.data,legalName:document.getElementById('siLegalName').value.trim(),tradeName:document.getElementById('siTradeName').value.trim(),cnpj:document.getElementById('siCnpj').value.trim(),phone:document.getElementById('siPhone').value.trim(),whatsapp:document.getElementById('siWhatsapp').value.trim(),email:document.getElementById('siEmail').value.trim(),contact:document.getElementById('siContact').value.trim(),cityState:document.getElementById('siCityState').value.trim(),city:document.getElementById('siCity').value.trim(),uf:document.getElementById('siUf').value.trim().toUpperCase(),cep:document.getElementById('siCep').value.trim(),neighborhood:document.getElementById('siNeighborhood').value.trim(),number:document.getElementById('siNumber').value.trim(),address:document.getElementById('siAddress').value.trim()}}"
if old not in s: raise SystemExit('collect marker not found')
s=s.replace(old,new,1)
old="const supplier={id,name:displayName,legalName:d.legalName||'',tradeName:d.tradeName||'',cnpj:d.cnpj||'',phone:d.phone||'',whatsapp:d.whatsapp||'',email:d.email||'',contact:d.contact||'',address:d.address||'',cityState:d.cityState||'',notes:'Importado de '+supplierImportState.sourceMeta.name,purpose:'',image:'',documents:[]};"
new="const supplier={id,name:displayName,legalName:d.legalName||'',tradeName:d.tradeName||'',cnpj:d.cnpj||'',phone:d.phone||'',whatsapp:d.whatsapp||'',email:d.email||'',contact:d.contact||'',address:d.address||'',number:d.number||'',neighborhood:d.neighborhood||'',city:d.city||'',uf:d.uf||'',cep:d.cep||'',cityState:d.cityState||((d.city&&d.uf)?d.city+' / '+d.uf:''),notes:'Importado de '+supplierImportState.sourceMeta.name,purpose:'',image:'',documents:[]};"
if old not in s: raise SystemExit('supplier object marker not found')
s=s.replace(old,new,1)

# Manual supplier fields
old='<div class="field"><label>Cidade/Estado</label><input id="sCityState" value="${esc(s.cityState||\'\')}"></div>'
new='<div class="field"><label>Cidade</label><input id="sCity" value="${esc(s.city||\'\')}"></div><div class="field"><label>UF</label><input id="sUf" value="${esc(s.uf||\'\')}"></div><div class="field"><label>CEP</label><input id="sCep" value="${esc(s.cep||\'\')}"></div><div class="field"><label>Bairro</label><input id="sNeighborhood" value="${esc(s.neighborhood||\'\')}"></div><div class="field"><label>Número</label><input id="sNumber" value="${esc(s.number||\'\')}"></div><div class="field"><label>Cidade/Estado (compatibilidade)</label><input id="sCityState" value="${esc(s.cityState||((s.city&&s.uf)?s.city+\' / \'+s.uf:\'\'))}"></div>'
if old not in s: raise SystemExit('manual fields marker not found')
s=s.replace(old,new,1)
old="let o={id:id||crypto.randomUUID(),name,legalName,tradeName,cnpj:sCnpj.value.trim(),phone:sPhone.value.trim(),whatsapp:sWhatsapp.value.trim(),email:sEmail.value.trim(),contact:sContact.value.trim(),cityState:sCityState.value.trim(),address:sAddress.value.trim(),notes:sNotes.value.trim(),purpose,image,documents:Array.isArray(current?.documents)?current.documents:[]};"
new="let o={id:id||crypto.randomUUID(),name,legalName,tradeName,cnpj:sCnpj.value.trim(),phone:sPhone.value.trim(),whatsapp:sWhatsapp.value.trim(),email:sEmail.value.trim(),contact:sContact.value.trim(),city:sCity.value.trim(),uf:sUf.value.trim().toUpperCase(),cep:sCep.value.trim(),neighborhood:sNeighborhood.value.trim(),number:sNumber.value.trim(),cityState:sCityState.value.trim(),address:sAddress.value.trim(),notes:sNotes.value.trim(),purpose,image,documents:Array.isArray(current?.documents)?current.documents:[]};"
if old not in s: raise SystemExit('save supplier marker not found')
s=s.replace(old,new,1)

# Migration for existing records.
marker="let db=JSON.parse(localStorage.getItem(KEY)||'null')||{materials:[],suppliers:[],quotes:[],history:[],movements:[],settings:{},count:null};"
if marker not in s: raise SystemExit('db marker not found')
s=s.replace(marker,marker+"\nif(Array.isArray(db.suppliers)){db.suppliers.forEach(s=>{s.number=s.number||'';s.neighborhood=s.neighborhood||'';s.city=s.city||'';s.uf=s.uf||'';s.cep=s.cep||'';s.cityState=s.cityState||((s.city&&s.uf)?s.city+' / '+s.uf:'');});}",1)

# Stronger OCR: high-resolution full page + upper-left issuer crop.
start=s.index('async function ocrPdf(file){')
end=s.index('async function extractDocx',start)
newocr=r'''async function ocrPdf(file){
  await ensurePdfJs();await ensureTesseract();
  if(!window.Tesseract)throw new Error('OCR não disponível neste navegador.');
  const data=await file.arrayBuffer(),pdf=await pdfjsLib.getDocument({data}).promise,worker=await Tesseract.createWorker('por'),pages=[];
  try{for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p),viewport=page.getViewport({scale:2.4});
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
    await page.render({canvasContext:canvas.getContext('2d',{willReadFrequently:true}),viewport}).promise;
    const {data:res}=await worker.recognize(canvas);let text=res.text||'';
    const crop=document.createElement('canvas');crop.width=Math.ceil(canvas.width*.60);crop.height=Math.ceil(canvas.height*.38);
    crop.getContext('2d').drawImage(canvas,0,0,canvas.width*.60,canvas.height*.38,0,0,crop.width,crop.height);
    const {data:top}=await worker.recognize(crop);if(top.text)text+='\n'+top.text;pages.push(text);
  }}finally{await worker.terminate()}
  return pages.join('\n');
}
'''
s=s[:start]+newocr+s[end:]

if s==original: raise SystemExit('no changes')
p.write_text(s,encoding='utf-8')
print('updated',len(original),'to',len(s))
