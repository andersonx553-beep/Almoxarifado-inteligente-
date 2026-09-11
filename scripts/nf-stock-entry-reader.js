/* ALMOX LAB — Entrada de estoque por Nota Fiscal
 * Fluxo: documento -> leitura -> identificação -> conferência -> entrada.
 * Não cadastra fornecedor nem material automaticamente.
 */
(() => {
  'use strict';
  if (window.__almoxNfEntryLoaded) return;
  window.__almoxNfEntryLoaded = true;

  const CDN = {
    pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs',
    pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs',
    tess: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
  };
  const state = { file: null, text: '', data: null, reading: false };
  const $ = id => document.getElementById(id);
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
  const money = v => Number(String(v || '').replace(/\./g,'').replace(',','.')) || 0;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function ensureStyles(){
    if ($('almoxNfStyles')) return;
    const s=document.createElement('style'); s.id='almoxNfStyles'; s.textContent=`
      #almoxNfModal{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;padding:16px;z-index:100}
      #almoxNfModal.open{display:flex}.aln-box{background:#fff;width:min(1050px,100%);max-height:92vh;overflow:auto;border-radius:18px;padding:20px;box-shadow:0 18px 60px rgba(0,0,0,.22)}
      .aln-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.aln-head h2{margin:0 0 4px}.aln-muted{color:#687585;font-size:13px}.aln-drop{border:2px dashed #b8c7da;border-radius:14px;padding:24px;text-align:center;background:#fbfcfe;margin:14px 0}.aln-drop input{display:none}
      .aln-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:15px}.aln-btn{border:0;border-radius:10px;padding:11px 14px;background:#2457d6;color:#fff;font-weight:800;cursor:pointer}.aln-btn.secondary{background:#eef2f7;color:#18212b}.aln-btn.success{background:#147a43}.aln-btn.warn{background:#b26a00}.aln-btn:disabled{opacity:.5;cursor:not-allowed}
      .aln-status{padding:11px 13px;border-radius:10px;background:#f5f7fa;margin:10px 0;font-size:13px}.aln-status.ok{background:#e7f7ee;color:#146c3b}.aln-status.warn{background:#fff4df;color:#8a5200}.aln-status.error{background:#fdecec;color:#9d2222}
      .aln-meta{display:grid;grid-template-columns:1fr 1fr;gap:10px}.aln-field{border:1px solid #e2e7ed;border-radius:12px;padding:12px}.aln-field b{display:block;font-size:11px;color:#687585;text-transform:uppercase;margin-bottom:4px}.aln-table{overflow:auto;border:1px solid #e2e7ed;border-radius:12px;margin-top:12px}.aln-table table{min-width:720px;width:100%;border-collapse:collapse}.aln-table th,.aln-table td{padding:10px;border-bottom:1px solid #e5e9ef;text-align:left}.aln-table th{font-size:11px;color:#687585;background:#f8fafc}.aln-row-match{background:#f2fbf5}.aln-row-error{background:#fff4f4}.aln-mini{font-size:12px;color:#687585}.aln-register{margin-top:10px;padding:11px 13px;border:1px solid #ead8aa;background:#fff9eb;border-radius:10px;display:none}.aln-register.show{display:block}
      @media(max-width:650px){.aln-box{padding:15px}.aln-meta{grid-template-columns:1fr}.aln-drop{padding:18px 12px}}
    `; document.head.appendChild(s);
  }

  function ensureUI(){
    ensureStyles();
    if ($('almoxNfModal')) return;
    const m=document.createElement('div'); m.id='almoxNfModal'; m.innerHTML=`<div class="aln-box">
      <div class="aln-head"><div><h2>🧾 Entrada de estoque por NF</h2><div class="aln-muted">Leia a nota, confira os produtos e só então confirme a entrada.</div></div><button class="aln-btn secondary" id="alnClose">Fechar</button></div>
      <div id="alnStep1">
        <div class="aln-drop"><div style="font-size:34px">🧾</div><b>Selecione a NF ou use a câmera</b><div class="aln-muted" style="margin:6px 0 14px">PDF, JPG, JPEG ou PNG</div><div class="aln-actions" style="justify-content:center"><label class="aln-btn">Selecionar documento<input id="alnFile" type="file" accept="application/pdf,image/jpeg,image/png,image/jpg"></label><label class="aln-btn secondary">📷 Câmera<input id="alnCamera" type="file" accept="image/*" capture="environment"></label></div></div>
        <div id="alnReadStatus" class="aln-status">Nenhum documento selecionado.</div>
      </div>
      <div id="alnStep2" style="display:none"><div id="alnResult"></div><div id="alnRegisterPrompt" class="aln-register"></div><div class="aln-actions"><button class="aln-btn secondary" id="alnBack">Voltar</button><button class="aln-btn success" id="alnConfirm" disabled>✓ Confirmar entrada</button></div></div>
    </div>`; document.body.appendChild(m);
    $('alnClose').onclick=close; $('alnBack').onclick=()=>{ $('alnStep2').style.display='none'; $('alnStep1').style.display='block'; };
    $('alnFile').onchange=e=>handleFile(e.target.files?.[0]); $('alnCamera').onchange=e=>handleFile(e.target.files?.[0]); $('alnConfirm').onclick=confirmEntry;
  }

  function addButton(){
    const sec=$('materials'); if(!sec) return;
    const top=sec.querySelector('.top'); if(!top || $('almoxNfButton')) return;
    const b=document.createElement('button'); b.id='almoxNfButton'; b.className='import-btn'; b.textContent='🧾 Entrada por NF'; b.onclick=open;
    const wrap=top.querySelector('div:last-child') || top; wrap.insertBefore(b, wrap.firstChild);
  }

  async function loadPdf(){
    if(!window.__alnPdfPromise){ window.__alnPdfPromise=import(CDN.pdf).then(m=>{m.GlobalWorkerOptions.workerSrc=CDN.pdfWorker; return m;}); }
    return window.__alnPdfPromise;
  }
  async function loadTess(){
    if(window.Tesseract) return window.Tesseract;
    if(window.__alnTessPromise) return window.__alnTessPromise;
    window.__alnTessPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=CDN.tess;s.onload=()=>resolve(window.Tesseract);s.onerror=reject;document.head.appendChild(s);});
    return window.__alnTessPromise;
  }

  async function pdfText(file){
    const pdfjs=await loadPdf(); const buf=await file.arrayBuffer(); const pdf=await pdfjs.getDocument({data:buf}).promise; let out=[];
    for(let i=1;i<=pdf.numPages;i++){ const page=await pdf.getPage(i); const c=await page.getTextContent(); out.push(c.items.map(x=>x.str).join(' ')); }
    const text=out.join('\n');
    if(text.replace(/\s/g,'').length>120) return text;
    const canvas=document.createElement('canvas'); const ctx=canvas.getContext('2d'); let ocr=[]; const tess=await loadTess(); const worker=await tess.createWorker('por');
    try{for(let i=1;i<=Math.min(pdf.numPages,8);i++){const p=await pdf.getPage(i);const v=p.getViewport({scale:2});canvas.width=v.width;canvas.height=v.height;await p.render({canvasContext:ctx,viewport:v}).promise;const r=await worker.recognize(canvas);ocr.push(r.data.text);}}finally{await worker.terminate();}
    return ocr.join('\n');
  }
  async function imageText(file){ const tess=await loadTess(); const r=await tess.recognize(file,'por'); return r.data.text||''; }

  function parseName(lines){
    const bad=/DANFE|DOCUMENTO AUXILIAR|NOTA FISCAL|CHAVE DE ACESSO|CONTROLE DO FISCO|CNPJ|ENDERECO|ENDEREÇO|CEP|INSCRICAO|INSCRIÇÃO|FONE|TELEFONE|E-MAIL|VALOR TOTAL/i;
    for(const line of lines){ const x=line.replace(/\s+/g,' ').trim(); if(!x||bad.test(x)) continue; if(/^(RECEBEMOS DE|RECEBIDO DE|FORNECEDOR|EMITENTE)\b/i.test(x)){let n=x.replace(/^(RECEBEMOS DE|RECEBIDO DE|FORNECEDOR|EMITENTE)\s*[:\-]?\s*/i,'').trim(); n=n.split(/\b(?:DANFE|NF-?E|NOTA FISCAL|CONTROLE DO FISCO)\b/i)[0].trim(); if(n.length>=3)return n;}}
    return '';
  }
  function parseCnpj(text){ const m=text.match(/\b\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}\b/); return m?m[0].replace(/\D/g,''):''; }
  function parseNF(text){ const pats=[/(?:N[ÚU]MERO|N[º°.]?\s*NF(?:-?E)?|NOTA FISCAL)\s*[:\-]?\s*(\d{1,15})/i, /NF-?E\s*[:\-]?\s*(\d{1,15})/i]; for(const p of pats){const m=text.match(p);if(m)return m[1].replace(/^0+(?=\d)/,'')||'0';} return ''; }
  function parseItems(text){
    const lines=text.split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean); const items=[]; const stop=/^(VALOR TOTAL|CÁLCULO|CALCULO|DADOS ADICIONAIS|TRANSPORTADOR|ICMS|IPI|ISS|FRETE|PAGAMENTO|FATURA|DUPLICATA)/i; const unit=/^(UN|UND|UNID|PC|PÇ|PCA|CX|CAIXA|FD|FARDO|KG|G|GR|LT|L|ML|M|MT|M2|M3|PAR|PCT|PACOTE|DZ|DUZ|ROLO|RL|GAL|GL|BALDE|SACO|SC|FR|FRASCO|KIT)$/i;
    for(const l of lines){ if(stop.test(l)) continue; let m=l.match(/^(?:\d{1,14}\s+)?(.+?)\s+([A-ZÀ-Ú]{1,8})\s+(\d+(?:[.,]\d+)?)\s+(?:R\$\s*)?(\d+(?:\.\d{3})*(?:,\d{2})|\d+(?:[.,]\d{2}))(?:\s+(?:R\$\s*)?(\d+(?:\.\d{3})*(?:,\d{2})|\d+(?:[.,]\d{2})))?$/i); if(m&&unit.test(m[2])&&!/^(TOTAL|DESCONTO|BC|ALIQ|VALOR|TRIBUTOS)/i.test(m[1])){items.push({product:m[1].trim(),unit:m[2].toUpperCase(),qty:money(m[3]),value:money(m[4])});continue;} m=l.match(/^(?:\d{1,14}\s+)?(.+?)\s+(UN|UND|UNID|PC|PÇ|PCA|CX|FD|KG|LT|L|ML|M|M2|M3|PAR|PCT|DZ|RL|GAL|GL)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:\.\d{3})*(?:,\d{2})|\d+(?:[.,]\d{2}))\s+(\d+(?:\.\d{3})*(?:,\d{2})|\d+(?:[.,]\d{2}))$/i); if(m)items.push({product:m[1].trim(),unit:m[2].toUpperCase(),qty:money(m[3]),value:money(m[4]),total:money(m[5])}); }
    const seen=new Set(); return items.filter(x=>x.product.length>2&&x.qty>0&&!seen.has(norm(x.product))&&(seen.add(norm(x.product)),true)).slice(0,200);
  }
  function parse(text){const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);return {supplier:parseName(lines),cnpj:parseCnpj(text),nf:parseNF(text),items:parseItems(text)};}

  function getDb(){ try{return typeof db!=='undefined'?db:(window.db||null);}catch(e){return window.db||null;} }
  function suppliers(){const d=getDb();return Array.isArray(d?.suppliers)?d.suppliers:[];}
  function supplierMatch(name){const n=norm(name).replace(/[^A-Z0-9]/g,'');if(!n)return null;return suppliers().find(s=>['legalName','razaoSocial','tradeName','name'].some(k=>norm(s[k]).replace(/[^A-Z0-9]/g,'')===n))||null;}
  function materials(){const d=getDb();return Array.isArray(d?.materials)?d.materials:[];}
  function materialMatch(name){const n=norm(name);if(!n)return null;const ms=materials();return ms.find(m=>norm(m.name||m.material||m.description||m.descricao)===n)||ms.find(m=>{const a=norm(m.name||m.material||m.description||m.descricao);return a.length>4&&(a.includes(n)||n.includes(a));})||null;}
  function fmt(v){return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}

  function renderResult(){
    const d=state.data||{}; const sm=supplierMatch(d.supplier); const rows=(d.items||[]).map(it=>{const mm=materialMatch(it.product);it._materialId=mm?.id||mm?._id||'';it._materialName=mm?.name||mm?.material||'';return `<tr class="${mm?'aln-row-match':'aln-row-error'}"><td>${esc(it.product)}${mm?`<div class="aln-mini">↳ ${esc(it._materialName)}</div>`:'<div class="aln-mini">⚠ Material não localizado</div>'}</td><td>${esc(it.unit)} / ${fmt(it.qty)}</td><td>R$ ${fmt(it.value)}</td></tr>`}).join('');
    $('alnResult').innerHTML=`<div class="aln-meta"><div class="aln-field"><b>Fornecedor</b>${esc(d.supplier||'Não identificado')}</div><div class="aln-field"><b>NF</b>${esc(d.nf||'Não identificada')}</div></div><div class="aln-table"><table><thead><tr><th>Produto</th><th>Un/Qtd</th><th>Valor do produto</th></tr></thead><tbody>${rows||'<tr><td colspan="3">Nenhum produto foi identificado com segurança.</td></tr>'}</tbody></table></div><div class="aln-status ${sm?'ok':'warn'}">${sm?'🟢 Fornecedor encontrado na lista.':'🟡 Fornecedor não encontrado na lista de fornecedores.'}</div>`;
    if(!sm && d.supplier){$('alnRegisterPrompt').className='aln-register show';$('alnRegisterPrompt').innerHTML=`<b>Fornecedor não encontrado na lista de fornecedores.</b><div class="aln-muted" style="margin-top:4px">Deseja cadastrá-lo?</div><div class="aln-actions" style="justify-content:flex-start;margin-top:8px"><button class="aln-btn warn" id="alnRegisterBtn">＋ Cadastrar fornecedor</button></div>`;$('alnRegisterBtn').onclick=registerSupplier;} else $('alnRegisterPrompt').className='aln-register';
    $('alnConfirm').disabled=!(d.supplier&&d.nf&&d.items?.length&&d.items.every(x=>x._materialId));
  }

  async function handleFile(file){
    if(!file)return; state.file=file; state.data=null; state.reading=true; $('alnStep2').style.display='none';$('alnStep1').style.display='block';$('alnReadStatus').className='aln-status';$('alnReadStatus').textContent='Lendo documento…';
    try{const text=file.type==='application/pdf'||/\.pdf$/i.test(file.name)?await pdfText(file):await imageText(file);state.text=text;state.data=parse(text);state.reading=false;if(!state.data.items.length){$('alnReadStatus').className='aln-status warn';$('alnReadStatus').textContent='Documento lido, mas os produtos não foram identificados com segurança. Nenhuma entrada foi feita.';}else{$('alnReadStatus').className='aln-status ok';$('alnReadStatus').textContent=`Leitura concluída: ${state.data.items.length} produto(s) identificado(s).`;renderResult();$('alnStep1').style.display='none';$('alnStep2').style.display='block';}}
    catch(e){state.reading=false;$('alnReadStatus').className='aln-status error';$('alnReadStatus').textContent='Não foi possível ler este documento. Nenhuma entrada foi feita.';console.error(e);}
  }

  function registerSupplier(){
    if(supplierMatch(state.data?.supplier))return;
    try{if(typeof window.openSupplier==='function')window.openSupplier();setTimeout(()=>{const n=state.data?.supplier||'';['sLegalName','sTradeName'].forEach(id=>{const el=$(id);if(el)el.value=n;});const c=$('sCnpj');if(c&&!c.value)c.value=state.data?.cnpj||'';},100);}catch(e){console.error(e);}
  }

  function persistDb(){
    const d=getDb();if(!d)return false;let saved=false;const candidates=['saveDB','saveDb','saveData','persist','persistDB','persistDb','saveDatabase','persistData','saveState'];
    for(const k of candidates){try{if(typeof window[k]==='function'){window[k]();saved=true;break;}}catch(e){}}
    if(!saved){for(const k of Object.keys(localStorage)){try{const raw=localStorage.getItem(k);if(!raw)continue;const parsed=JSON.parse(raw);if(parsed&&typeof parsed==='object'&&Array.isArray(parsed.materials)&&Array.isArray(parsed.movements)){localStorage.setItem(k,JSON.stringify(d));saved=true;break;}}catch(e){}}}return saved;
  }
  function addHistory(d,items){if(!Array.isArray(d.history))d.history=[];d.history.push({id:'nf_'+Date.now(),type:'entrada_nf',action:'Entrada de estoque por NF',nf:state.data.nf,supplier:state.data.supplier,fileName:state.file?.name||'',items:items.map(x=>({materialId:x._materialId,product:x.product,unit:x.unit,qty:x.qty,value:x.value})),createdAt:new Date().toISOString()});}
  function updateStock(d,it){const m=materials().find(x=>String(x.id||x._id)===String(it._materialId));if(!m)return false;const keys=['current','estoqueAtual','estoque','stock','quantity','quantidade','qty'];const key=keys.find(k=>m[k]!==undefined&&m[k]!==null)||'current';const before=Number(m[key]||0);m[key]=before+Number(it.qty||0);it._before=before;it._after=m[key];return true;}
  function saveInvoiceDocument(d,items){if(!Array.isArray(d.invoiceDocuments))d.invoiceDocuments=[];const dup=d.invoiceDocuments.find(x=>norm(x.nf)===norm(state.data.nf)&&norm(x.supplier)===norm(state.data.supplier));if(dup)throw new Error('NF_DUPLICADA');d.invoiceDocuments.push({id:'nfd_'+Date.now(),documentType:'NOTA_FISCAL_ENTRADA',status:'entrada_confirmada',nf:state.data.nf,supplier:state.data.supplier,cnpj:state.data.cnpj||'',fileName:state.file?.name||'',createdAt:new Date().toISOString(),items:items.map(x=>({materialId:x._materialId,product:x.product,unit:x.unit,qty:x.qty,value:x.value,before:x._before,after:x._after}))});}
  function addMovementRecord(d,items){if(!Array.isArray(d.movements))d.movements=[];const now=new Date().toISOString();items.forEach(x=>d.movements.push({id:'mov_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),type:'Entrada',movementType:'entrada_nf',materialId:x._materialId,qty:x.qty,before:x._before,after:x._after,reason:`Entrada por NF ${state.data.nf}`,nf:state.data.nf,supplier:state.data.supplier,productValue:x.value,createdAt:now}));}
  function refresh(){['renderMaterials','renderMovements','renderHistory','renderHome','updateDashboard'].forEach(k=>{try{if(typeof window[k]==='function')window[k]();}catch(e){}});}
  function confirmEntry(){
    const d=getDb();if(!d||!state.data)return;if(!state.data.items.every(x=>x._materialId)){alert('Há produto(s) não localizado(s) no cadastro de materiais. Nenhuma entrada foi feita.');return;}if(!state.data.nf){alert('NF não identificada. Nenhuma entrada foi feita.');return;}const existing=Array.isArray(d.invoiceDocuments)&&d.invoiceDocuments.find(x=>norm(x.nf)===norm(state.data.nf)&&norm(x.supplier)===norm(state.data.supplier));if(existing){alert('Esta NF já possui uma entrada registrada.');return;}
    const items=state.data.items.map(x=>({...x}));try{items.forEach(x=>{if(!updateStock(d,x))throw new Error('MATERIAL_NAO_ENCONTRADO')});saveInvoiceDocument(d,items);addMovementRecord(d,items);addHistory(d,items);if(!persistDb())throw new Error('PERSISTENCIA_NAO_LOCALIZADA');refresh();alert(`Entrada confirmada: NF ${state.data.nf} — ${items.length} produto(s).`);close();}catch(e){items.forEach(x=>{const m=materials().find(y=>String(y.id||y._id)===String(x._materialId));if(m&&x._before!==undefined){const key=['current','estoqueAtual','estoque','stock','quantity','quantidade','qty'].find(k=>m[k]!==undefined&&m[k]!==null)||'current';m[key]=x._before;}});console.error(e);alert(e.message==='NF_DUPLICADA'?'Esta NF já possui uma entrada registrada.':'A entrada não foi concluída. O sistema não confirmou a operação.');}
  }
  function open(){ensureUI();$('almoxNfModal').classList.add('open');} function close(){const m=$('almoxNfModal');if(m)m.classList.remove('open');}
  ensureUI();addButton();const obs=new MutationObserver(addButton);obs.observe(document.documentElement,{childList:true,subtree:true});setInterval(addButton,1000);
})();
