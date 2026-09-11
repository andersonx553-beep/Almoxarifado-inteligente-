from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')
original=s

# Replace current supplier reader block with the structured NF-e/DANFE reader.
start=s.index('function supplierNormalize')
end=s.index('function findExistingSupplier',start)
new=r'''function supplierNormalize(v){return normalizeImportText(v).replace(/\s+/g,' ').trim()}
function supplierFold(v){return supplierNormalize(v).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function supplierDigits(v){return String(v||'').replace(/\D/g,'')}
function supplierFormatCnpj(value){const d=supplierDigits(value);return d.length===14?`${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`:supplierNormalize(value)}
function supplierFormatPhone(value){const d=supplierDigits(value);return d.length===11?`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`:d.length===10?`(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`:supplierNormalize(value)}
function supplierValidCnpj(value){const d=supplierDigits(value);if(d.length!==14||/^([0-9])\1{13}$/.test(d))return false;const calc=(base,factor)=>{let sum=0;for(let i=0;i<base.length;i++)sum+=Number(base[i])*factor--;const r=(sum*10)%11;return r===10?0:r};return calc(d.slice(0,12),5)===Number(d[12])&&calc(d.slice(0,13),6)===Number(d[13])}
function supplierCleanCompanyName(value){return supplierNormalize(value).replace(/^\d+\s+/,'').replace(/\bLTOA\b/ig,'LTDA').trim()}
function supplierFieldFromLines(lines,labels){const folds=labels.map(supplierFold);for(let i=0;i<lines.length;i++){const raw=supplierNormalize(lines[i]),f=supplierFold(raw),idx=folds.findIndex(l=>f===l||f.startsWith(l+':')||f.startsWith(l+' -'));if(idx<0)continue;let value=raw.replace(new RegExp('^'+labels[idx].replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'\s*[:\-]?\s*','i'),'').trim();if(value)return value;for(let j=i+1;j<Math.min(lines.length,i+3);j++){const nxt=supplierNormalize(lines[j]);if(nxt&&!/^(fornecedor|razao social|nome fantasia|cnpj|endereco|numero|bairro|fone|telefone|whatsapp|e-?mail|contato|responsavel|cidade|estado|uf|cep)\s*:/i.test(nxt))return nxt}}return ''}
function supplierNfePreDest(lines){const idx=lines.findIndex(x=>supplierFold(x).includes('DESTINATARIO/REMETENTE'));return idx>=0?lines.slice(0,idx):lines}
function supplierExtractNfeName(text,lines){const m=text.match(/RECEBEMOS\s+DE(?:\s+\d+)?\s+(.+?)(?=\s+OS\s+PRODUTOS(?:\/SERVI[ÇC]OS)?|$)/i);if(m)return supplierCleanCompanyName(m[1]);const c=lines.find(x=>/\b(LTDA|LTOA|S\.?A\.?|EIRELI|ME|EPP|COM[ÉE]RCIO|COMERCIO|SUPERMERCADO|DISTRIBUIDORA|IND[ÚU]STRIA|INDUSTRIA)\b/i.test(x)&&!/(DANFE|DESTINAT[ÁA]RIO|REMETENTE)/i.test(x));return c?supplierCleanCompanyName(c):''}
function supplierExtractAddress(lines){for(let i=0;i<lines.length;i++){const x=supplierNormalize(lines[i]);if(!/^(rua|r\.?|avenida|av\.?|travessa|tv\.?|rodovia|rod\.?|estrada|alameda|pra[çc]a)\b/i.test(x))continue;let raw=x.replace(/\s+-\s*$/,'').trim(),number='';const nm=raw.match(/(?:,|\s)(\d{1,6})\b/);if(nm){number=nm[1];raw=raw.replace(new RegExp('\\s*,?\\s*'+number+'\\b'),'').trim()}return {address:raw,number,index:i}}return {address:'',number:'',index:-1}}
function supplierExtractCityUf(lines){for(const x0 of lines){const x=supplierNormalize(x0),m=x.match(/^(.{2,45}?)\s*[-/]\s*([A-Z]{2})(?:\s|$)/i);if(m&&!/^(UF|ESTADO|CIDADE)$/i.test(m[1].trim()))return {city:m[1].trim().replace(/\s+/g,' '),uf:m[2].toUpperCase()}}return {city:'',uf:''}}
function supplierExtractCep(lines){for(const x of lines){const m=supplierNormalize(x).match(/\b\d{5}-?\d{3}\b/);if(m)return m[0].replace(/^(\d{5})-?(\d{3})$/,'$1-$2')}return ''}
function supplierExtractPhone(lines){for(const x of lines){if(!/\b(fone|telefone|tel\.?|celular)\b/i.test(x))continue;const m=supplierNormalize(x).match(/(?:fone(?:\s*[\/j|]\s*fax)?|telefone|tel\.?|celular)\s*[:\-]?\s*([()\d\s.-]{10,18})/i);if(m&&supplierDigits(m[1]).length>=10)return supplierFormatPhone(m[1])}return ''}
function extractSupplierData(lines){
  const all=lines.map(supplierNormalize).filter(Boolean),text=all.join('\n'),pre=supplierNfePreDest(all),preText=pre.join('\n');
  const isNfe=/DANFE|DOCUMENTO AUXILIAR DA NOTA FISCAL ELETR[ÔO]NICA|DESTINAT[ÁA]RIO\s*\/\s*REMETENTE|CHAVE DE ACESSO DA NF-?E/i.test(text);
  const data={legalName:'',tradeName:'',name:'',cnpj:'',phone:'',whatsapp:'',email:'',contact:'',address:'',number:'',neighborhood:'',city:'',uf:'',cep:'',cityState:'',isNfe};
  if(isNfe){
    data.name=supplierExtractNfeName(preText,pre);data.legalName=data.name;data.tradeName=data.name;
    const keyLines=pre.filter(x=>/CHAVE DE ACESSO/i.test(x)||supplierDigits(x).length>=40);for(const line of keyLines){const k=supplierDigits(line).match(/\d{44}/);if(k&&supplierValidCnpj(k[0].slice(6,20))){data.cnpj=supplierFormatCnpj(k[0].slice(6,20));break}}
    if(!data.cnpj){for(const m of preText.matchAll(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g)){if(supplierValidCnpj(m[0])){data.cnpj=supplierFormatCnpj(m[0]);break}}}
    data.phone=supplierExtractPhone(pre);
    const em=preText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);if(em)data.email=em[0];
    const addr=supplierExtractAddress(pre);data.address=addr.address;data.number=addr.number;
    const cu=supplierExtractCityUf(pre);data.city=cu.city;data.uf=cu.uf;data.cityState=cu.city&&cu.uf?`${cu.city} / ${cu.uf}`:'';
    data.cep=supplierExtractCep(pre);
    if(addr.index>=0){for(let i=addr.index+1;i<Math.min(pre.length,addr.index+5);i++){let x=supplierNormalize(pre[i]);if(!x||/^(cnpj|inscri|fone|telefone|tel|cep|cidade|uf|municipio|município)\b/i.test(x))continue;if(/\b\d{5}-?\d{3}\b/.test(x)||/\s[-/]\s[A-Z]{2}\b/i.test(x))continue;x=x.replace(/\b\d{5}-?\d{3}\b/,'').trim();if(x&&x.length<=60){data.neighborhood=x;break}}}
    const contact=pre.find(x=>/^(CONTATO|RESPONS[ÁA]VEL)\s*[:\-]/i.test(x));if(contact)data.contact=contact.replace(/^(CONTATO|RESPONS[ÁA]VEL)\s*[:\-]?\s*/i,'').trim();
    const wa=pre.find(x=>/^WHATSAPP\s*[:\-]/i.test(x));if(wa){const m=wa.match(/(\(?\d{2}\)?\s*\d{4,5}[\s-]?\d{4})/);if(m)data.whatsapp=supplierFormatPhone(m[1])}
  }else{
    data.legalName=supplierFieldFromLines(all,['RAZÃO SOCIAL','RAZAO SOCIAL']);data.tradeName=supplierFieldFromLines(all,['NOME FANTASIA']);data.name=supplierFieldFromLines(all,['FORNECEDOR'])||data.tradeName||data.legalName;
    const c=supplierFieldFromLines(all,['CNPJ']).match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/);if(c&&supplierValidCnpj(c[0]))data.cnpj=supplierFormatCnpj(c[0]);
    data.phone=supplierExtractPhone(all);data.email=(all.join('\n').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||'';data.contact=supplierFieldFromLines(all,['CONTATO','RESPONSÁVEL','RESPONSAVEL']);data.address=supplierFieldFromLines(all,['ENDEREÇO','ENDERECO']);data.cityState=supplierFieldFromLines(all,['CIDADE/ESTADO','CIDADE / ESTADO']);
  }
  if(!data.name)data.name=data.tradeName||data.legalName||'';if(!data.legalName)data.legalName=data.name||'';if(!data.tradeName)data.tradeName=data.name||'';return data;
}
'''
s=s[:start]+new+s[end:]

# Replace preview with individual destination fields.
a=s.index('function renderSupplierImportPreview');b=s.index('function collectSupplierImportForm',a)
preview=r'''function renderSupplierImportPreview(){const d=supplierImportState.data||{},existing=findExistingSupplier(d);supplierImportState.existingId=existing?.id||'';importContent.innerHTML=`<h2>Conferir fornecedor</h2><div class="muted"><b>Documento:</b> ${esc(supplierImportState.sourceMeta.name)} ${supplierImportState.sourceMeta.pages?`• <b>Páginas:</b> ${supplierImportState.sourceMeta.pages}`:''}</div><div class="import-summary"><span class="badge">${existing?'🟡 Fornecedor possivelmente existente':'🟢 Novo fornecedor'}</span></div>${existing?`<div class="card" style="margin-bottom:14px;background:#fffaf0;border-color:#f0d59b"><b>Possível duplicidade</b><div class="muted">Fornecedor existente: ${esc(existing.name||existing.tradeName||existing.legalName)}</div><div class="muted">CNPJ: ${esc(existing.cnpj||'Não informado')}</div></div>`:''}<div class="card"><div class="formgrid"><div class="field"><label>Razão social</label><input id="siLegalName" value="${esc(d.legalName||'')}"></div><div class="field"><label>Nome fantasia</label><input id="siTradeName" value="${esc(d.tradeName||'')}"></div><div class="field"><label>CNPJ</label><input id="siCnpj" value="${esc(d.cnpj||'')}"></div><div class="field"><label>Telefone</label><input id="siPhone" value="${esc(d.phone||'')}"></div><div class="field"><label>WhatsApp</label><input id="siWhatsapp" value="${esc(d.whatsapp||'')}"></div><div class="field"><label>E-mail</label><input id="siEmail" value="${esc(d.email||'')}"></div><div class="field"><label>Responsável / Contato</label><input id="siContact" value="${esc(d.contact||'')}"></div><div class="field"><label>Endereço</label><input id="siAddress" value="${esc(d.address||'')}"></div><div class="field"><label>Número</label><input id="siNumber" value="${esc(d.number||'')}"></div><div class="field"><label>Bairro</label><input id="siNeighborhood" value="${esc(d.neighborhood||'')}"></div><div class="field"><label>Cidade</label><input id="siCity" value="${esc(d.city||'')}"></div><div class="field"><label>UF</label><input id="siUf" value="${esc(d.uf||'')}"></div><div class="field"><label>CEP</label><input id="siCep" value="${esc(d.cep||'')}"></div><div class="field full"><label>Cidade/Estado (compatibilidade)</label><input id="siCityState" value="${esc(d.cityState||((d.city&&d.uf)?d.city+' / '+d.uf:''))}"></div></div></div><div class="card" style="margin-top:14px;background:#f8fbff;border-color:#dce7f7"><b>Documento original</b><div class="muted" style="margin-top:5px">${esc(supplierImportState.sourceMeta.name)} • ${formatFileSize(supplierImportState.file?.size)}</div><div class="muted" style="margin-top:5px">O arquivo original será mantido associado ao fornecedor após a confirmação.</div></div><div class="actions"><button class="secondary" onclick="renderSupplierImportUpload()">← Escolher outro</button><button class="secondary" onclick="closeImportModal()">Cancelar</button><button onclick="confirmSupplierImport()">✓ Confirmar cadastro</button></div>`}
'''
s=s[:a]+preview+s[b:]

# Collect fields.
a=s.index('function collectSupplierImportForm');b=s.index('async function handleSupplierImportFile',a)
s=s[:a]+"function collectSupplierImportForm(){supplierImportState.data={...supplierImportState.data,legalName:siLegalName.value.trim(),tradeName:siTradeName.value.trim(),cnpj:siCnpj.value.trim(),phone:siPhone.value.trim(),whatsapp:siWhatsapp.value.trim(),email:siEmail.value.trim(),contact:siContact.value.trim(),address:siAddress.value.trim(),number:siNumber.value.trim(),neighborhood:siNeighborhood.value.trim(),city:siCity.value.trim(),uf:siUf.value.trim().toUpperCase(),cep:siCep.value.trim(),cityState:siCityState.value.trim()}}\n"+s[b:]

# Persist fields from import.
s=s.replace("const supplier={id,name:displayName,legalName:d.legalName||'',tradeName:d.tradeName||'',cnpj:d.cnpj||'',phone:d.phone||'',whatsapp:d.whatsapp||'',email:d.email||'',contact:d.contact||'',address:d.address||'',cityState:d.cityState||'',notes:","const supplier={id,name:displayName,legalName:d.legalName||'',tradeName:d.tradeName||'',cnpj:d.cnpj||'',phone:d.phone||'',whatsapp:d.whatsapp||'',email:d.email||'',contact:d.contact||'',address:d.address||'',number:d.number||'',neighborhood:d.neighborhood||'',city:d.city||'',uf:d.uf||'',cep:d.cep||'',cityState:d.cityState||((d.city&&d.uf)?d.city+' / '+d.uf:''),notes:",1)

# Manual supplier editor: dedicated fields, backward-compatible cityState.
old='<div class="field"><label>Cidade/Estado</label><input id="sCityState" value="${esc(s.cityState||\'')}"></div>'
new='<div class="field"><label>Cidade</label><input id="sCity" value="${esc(s.city||\'')}"></div><div class="field"><label>UF</label><input id="sUf" value="${esc(s.uf||\'')}"></div><div class="field"><label>CEP</label><input id="sCep" value="${esc(s.cep||\'')}"></div><div class="field"><label>Bairro</label><input id="sNeighborhood" value="${esc(s.neighborhood||\'')}"></div><div class="field"><label>Número</label><input id="sNumber" value="${esc(s.number||\'')}"></div><div class="field"><label>Cidade/Estado (compatibilidade)</label><input id="sCityState" value="${esc(s.cityState||((s.city&&s.uf)?s.city+\' / \'+s.uf:\'\'))}"></div>'
if old in s:s=s.replace(old,new,1)
old2="let o={id:id||crypto.randomUUID(),name,legalName,tradeName,cnpj:sCnpj.value.trim(),phone:sPhone.value.trim(),whatsapp:sWhatsapp.value.trim(),email:sEmail.value.trim(),contact:sContact.value.trim(),cityState:sCityState.value.trim(),address:sAddress.value.trim(),notes:sNotes.value.trim(),purpose,image,documents:Array.isArray(current?.documents)?current.documents:[]};"
new2="let o={id:id||crypto.randomUUID(),name,legalName,tradeName,cnpj:sCnpj.value.trim(),phone:sPhone.value.trim(),whatsapp:sWhatsapp.value.trim(),email:sEmail.value.trim(),contact:sContact.value.trim(),city:sCity.value.trim(),uf:sUf.value.trim().toUpperCase(),cep:sCep.value.trim(),neighborhood:sNeighborhood.value.trim(),number:sNumber.value.trim(),cityState:sCityState.value.trim(),address:sAddress.value.trim(),notes:sNotes.value.trim(),purpose,image,documents:Array.isArray(current?.documents)?current.documents:[]};"
if old2 in s:s=s.replace(old2,new2,1)

# Migrate old supplier objects without changing existing values.
marker="let db=JSON.parse(localStorage.getItem(KEY)||'null')||{materials:[],suppliers:[],quotes:[],history:[],movements:[],settings:{},count:null};"
if marker in s and 's.neighborhood=s.neighborhood||' not in s:
    s=s.replace(marker,marker+"\nif(Array.isArray(db.suppliers)){db.suppliers.forEach(s=>{s.number=s.number||'';s.neighborhood=s.neighborhood||'';s.city=s.city||'';s.uf=s.uf||'';s.cep=s.cep||'';s.cityState=s.cityState||((s.city&&s.uf)?s.city+' / '+s.uf:'');});}",1)

# Stronger OCR for scanned DANFE.
a=s.index('async function ocrPdf(file)');b=s.index('async function extractDocx',a)
ocr=r'''async function ocrPdf(file){
  await ensurePdfJs();await ensureTesseract();if(!window.Tesseract)throw new Error('OCR não disponível neste navegador.');
  const data=await file.arrayBuffer(),pdf=await pdfjsLib.getDocument({data}).promise,worker=await Tesseract.createWorker('por'),pages=[];
  try{for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p),viewport=page.getViewport({scale:2.4});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d',{willReadFrequently:true}),viewport}).promise;const {data:res}=await worker.recognize(canvas);let text=res.text||'';const crop=document.createElement('canvas');crop.width=Math.ceil(canvas.width*.60);crop.height=Math.ceil(canvas.height*.38);crop.getContext('2d').drawImage(canvas,0,0,canvas.width*.60,canvas.height*.38,0,0,crop.width,crop.height);const {data:top}=await worker.recognize(crop);if(top.text)text+='\n'+top.text;pages.push(text)}}finally{await worker.terminate()}return pages.join('\n');
}
'''
s=s[:a]+ocr+s[b:]

if s==original: raise SystemExit('no changes')
p.write_text(s,encoding='utf-8')
print('updated',len(original),'->',len(s))
