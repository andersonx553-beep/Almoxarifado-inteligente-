/* ALMOX LAB — Correção estrutural da leitura de NF-e/DANFE
 * Mantém o leitor original, mas intercepta a seleção do documento para:
 * 1) preservar a estrutura das linhas do PDF;
 * 2) localizar a tabela DADOS DO PRODUTO/SERVIÇO;
 * 3) extrair código, descrição, unidade, quantidade, valor unitário e total;
 * 4) usar OCR quando o PDF não tiver texto útil;
 * 5) confirmar entrada somente após conferência.
 */
(() => {
  'use strict';
  if (window.__almoxNfStructuralFix) return;
  window.__almoxNfStructuralFix = true;

  const CDN = {
    pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs',
    pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs',
    tess: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
  };
  const state = { file:null, text:'', data:null, reading:false };
  const $ = id => document.getElementById(id);
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
  const digits = v => String(v || '').replace(/\D/g,'');
  const money = v => Number(String(v || '').replace(/\./g,'').replace(',','.')) || 0;
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function setStatus(text, cls='') {
    const el=$('alnReadStatus'); if(!el) return;
    el.className='aln-status'+(cls?' '+cls:''); el.textContent=text;
  }
  function loadPdf(){
    if(!window.__alnFixPdfPromise) window.__alnFixPdfPromise=import(CDN.pdf).then(m=>{m.GlobalWorkerOptions.workerSrc=CDN.pdfWorker;return m;});
    return window.__alnFixPdfPromise;
  }
  function loadTess(){
    if(window.Tesseract) return Promise.resolve(window.Tesseract);
    if(window.__alnFixTessPromise) return window.__alnFixTessPromise;
    window.__alnFixTessPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=CDN.tess;s.onload=()=>resolve(window.Tesseract);s.onerror=reject;document.head.appendChild(s);});
    return window.__alnFixTessPromise;
  }

  async function pdfStructuredText(file){
    const pdfjs=await loadPdf();
    const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
    const pages=[];
    for(let pno=1;pno<=pdf.numPages;pno++){
      const page=await pdf.getPage(pno);
      const tc=await page.getTextContent();
      const items=tc.items.filter(x=>String(x.str||'').trim());
      const rows=[];
      for(const it of items){
        const x=Number(it.transform?.[4]||0), y=Number(it.transform?.[5]||0);
        let row=rows.find(r=>Math.abs(r.y-y)<=3.5);
        if(!row){row={y,items:[]};rows.push(row);}
        row.items.push({x,text:String(it.str||'').trim()});
      }
      rows.sort((a,b)=>b.y-a.y);
      pages.push(rows.map(r=>r.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ').replace(/\s+/g,' ').trim()).filter(Boolean).join('\n'));
    }
    return pages.join('\n');
  }
  async function pdfOCR(file){
    const pdfjs=await loadPdf();
    const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
    const tess=await loadTess(); const worker=await tess.createWorker('por');
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'); const out=[];
    try{
      for(let pno=1;pno<=Math.min(pdf.numPages,8);pno++){
        const page=await pdf.getPage(pno); const viewport=page.getViewport({scale:2.6});
        canvas.width=viewport.width;canvas.height=viewport.height;
        await page.render({canvasContext:ctx,viewport}).promise;
        const r=await worker.recognize(canvas);out.push(r.data.text||'');
      }
    } finally { await worker.terminate(); }
    return out.join('\n');
  }
  async function readFile(file){
    if(file.type==='application/pdf'||/\.pdf$/i.test(file.name)){
      const text=await pdfStructuredText(file);
      if(text.replace(/\s/g,'').length>=120) return text;
      return pdfOCR(file);
    }
    const tess=await loadTess(); const r=await tess.recognize(file,'por'); return r.data.text||'';
  }

  function parseSupplier(text){
    const t=norm(text);
    let m=t.match(/RECEBEMOS DE\s+(?:\d+\s+)?(.+?)\s+OS PRODUTOS\/SERVI[CÇ]OS/);
    if(m && m[1].length>2) return m[1].trim();
    const lines=text.split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
    const cnpjIndex=lines.findIndex(x=>/CNPJ\s*[:\-]?\s*\d{2}[.\s]?\d{3}/i.test(x));
    if(cnpjIndex>0){
      for(let i=Math.max(0,cnpjIndex-4);i<cnpjIndex;i++){
        const x=lines[i];
        if(x && !/DANFE|DOCUMENTO AUXILIAR|NOTA FISCAL|RECEBEMOS DE|CHAVE|CONTROLE|CNPJ|IE|INSCRI|ENDERE|CEP|FONE|TELEFONE/i.test(x) && /[A-Za-zÀ-ÿ]{3,}/.test(x)) return x;
      }
    }
    return '';
  }
  function parseCnpj(text){
    const m=text.match(/\b\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}\b/g)||[];
    return (m.map(digits).find(x=>x.length===14)||'');
  }
  function parseNF(text){
    const pats=[/(?:N[ÚU]MERO|N[º°.]|N[º°.]\s*NF(?:-?E)?|NF-?E)\s*[:#\-]?\s*(\d{1,15})/i, /NF-e[\s\S]{0,20}?N[º°.]?\s*(\d{1,15})/i];
    for(const p of pats){const m=text.match(p);if(m)return m[1].replace(/^0+(?=\d)/,'')||'0';}
    return '';
  }
  function cleanProduct(v){return String(v||'').replace(/\s+/g,' ').replace(/^[-:;]+|[-:;]+$/g,'').trim();}
  function parseRow(line){
    let l=String(line||'').replace(/\s+/g,' ').trim();
    if(!l || /^(CÓD\.?|COD\.?|DADOS DO PRODUTO|CÁLCULO|CALCULO|DADOS ADICIONAIS|VALOR TOTAL|TRANSPORTADOR|ICMS|IPI|ISSQN|FRETE|PAGAMENTO|FATURA|DUPLICATA)/i.test(l)) return null;
    let m=l.match(/^(\d{4,14})\s+(.+?)\s+(\d{4,8})\s+(\d{2,4})\s+(\d{3,4})\s+(UN|UND|UNID|PC|PÇ|PCA|CX|CAIXA|FD|FARDO|KG|G|GR|LT|L|ML|M|MT|M2|M3|PAR|PCT|PACOTE|DZ|DUZ|ROLO|RL|GAL|GL|BALDE|SACO|SC|FR|FRASCO|KIT)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:\.\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)\s+(\d+(?:\.\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)(?:\s+.*)?$/i);
    if(m) return {code:m[1],product:cleanProduct(m[2]),unit:m[6].toUpperCase(),qty:money(m[7]),value:money(m[8]),total:money(m[9])};
    m=l.match(/^(\d{4,14})\s+(.+?)\s+(?:\d{4,8}\s+)?(?:\d{2,4}\s+)?(?:\d{3,4}\s+)?(UN|UND|UNID|PC|PÇ|PCA|CX|FD|KG|LT|L|ML|M|MT|M2|M3|PAR|PCT|DZ|RL|GAL|GL|BALDE|SACO|SC|FR|KIT)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:\.\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)(?:\s+(\d+(?:\.\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?))?(?:\s+.*)?$/i);
    if(m) return {code:m[1],product:cleanProduct(m[2]),unit:m[3].toUpperCase(),qty:money(m[4]),value:money(m[5]),total:m[6]?money(m[6]):0};
    return null;
  }
  function parseItems(text){
    const raw=text.split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
    const start=raw.findIndex(x=>/DADOS DO PRODUTO\/SERVI[CÇ]O/i.test(x));
    const end=raw.findIndex((x,i)=>i>start&&/^(CÁLCULO DO ISSQN|CALCULO DO ISSQN|DADOS ADICIONAIS|CÁLCULO|CALCULO)/i.test(x));
    const lines=start>=0?raw.slice(start+1,end>start?end:raw.length):raw;
    const items=[];
    for(let i=0;i<lines.length;i++){
      let item=parseRow(lines[i]);
      if(item){items.push(item);continue;}
      for(let n=2;n<=3 && i+n<=lines.length;n++){
        item=parseRow(lines.slice(i,i+n).join(' '));
        if(item){items.push(item);i+=n-1;break;}
      }
    }
    const seen=new Set();
    return items.filter(x=>x.product.length>2&&x.qty>0&&!seen.has(norm(x.product))&&(seen.add(norm(x.product)),true)).slice(0,200);
  }
  function parse(text){return {supplier:parseSupplier(text),cnpj:parseCnpj(text),nf:parseNF(text),items:parseItems(text)};}

  function getDb(){try{return typeof db!=='undefined'?db:(window.db||null);}catch(e){return window.db||null;}}
  function suppliers(){const d=getDb();return Array.isArray(d?.suppliers)?d.suppliers:[];}
  function supplierMatch(name){const n=norm(name).replace(/[^A-Z0-9]/g,'');if(!n)return null;return suppliers().find(s=>['legalName','razaoSocial','tradeName','name'].some(k=>norm(s[k]).replace(/[^A-Z0-9]/g,'')===n))||null;}
  function materials(){const d=getDb();return Array.isArray(d?.materials)?d.materials:[];}
  function materialMatch(name){const n=norm(name);if(!n)return null;const ms=materials();return ms.find(m=>norm(m.name||m.material||m.description||m.descricao)===n)||ms.find(m=>{const a=norm(m.name||m.material||m.description||m.descricao);return a.length>4&&(a.includes(n)||n.includes(a));})||null;}
  function fmt(v){return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}

  function render(){
    const d=state.data||{}; const sm=supplierMatch(d.supplier);
    const rows=(d.items||[]).map(it=>{const mm=materialMatch(it.product);it._materialId=mm?.id||mm?._id||'';it._materialName=mm?.name||mm?.material||'';return `<tr class="${mm?'aln-row-match':'aln-row-error'}"><td>${esc(it.product)}${mm?`<div class="aln-mini">↳ ${esc(it._materialName)}</div>`:'<div class="aln-mini">⚠ Material não localizado</div>'}</td><td>${esc(it.unit)} / ${fmt(it.qty)}</td><td>R$ ${fmt(it.value)}</td></tr>`}).join('');
    $('alnResult').innerHTML=`<div class="aln-meta"><div class="aln-field"><b>Fornecedor</b>${esc(d.supplier||'Não identificado')}</div><div class="aln-field"><b>NF</b>${esc(d.nf||'Não identificada')}</div></div><div class="aln-table"><table><thead><tr><th>Produto</th><th>Un/Qtd</th><th>Valor do produto</th></tr></thead><tbody>${rows||'<tr><td colspan="3">Nenhum produto foi identificado com segurança.</td></tr>'}</tbody></table></div><div class="aln-status ${sm?'ok':'warn'}">${sm?'🟢 Fornecedor encontrado na lista.':'🟡 Fornecedor não encontrado na lista de fornecedores.'}</div>`;
    if(!sm&&d.supplier){$('alnRegisterPrompt').className='aln-register show';$('alnRegisterPrompt').innerHTML='<b>Fornecedor não encontrado na lista de fornecedores.</b><div class="aln-muted" style="margin-top:4px">Deseja cadastrá-lo?</div><div class="aln-actions" style="justify-content:flex-start;margin-top:8px"><button class="aln-btn warn" id="alnFixRegisterBtn">＋ Cadastrar fornecedor</button></div>';$('alnFixRegisterBtn').onclick=()=>{try{if(typeof window.openSupplier==='function')window.openSupplier();setTimeout(()=>{const n=state.data?.supplier||'';['sLegalName','sTradeName'].forEach(id=>{const el=$(id);if(el)el.value=n;});const c=$('sCnpj');if(c&&!c.value)c.value=state.data?.cnpj||'';},100);}catch(e){console.error(e);}};}else $('alnRegisterPrompt').className='aln-register';
    $('alnConfirm').disabled=!(d.supplier&&d.nf&&d.items?.length&&d.items.every(x=>x._materialId));
    $('alnConfirm').onclick=confirm;
  }

  function persistDb(){
    const d=getDb();if(!d)return false;let saved=false;
    const candidates=['saveDB','saveDb','saveData','persist','persistDB','persistDb','saveDatabase','persistData','saveState'];
    for(const k of candidates){try{if(typeof window[k]==='function'){window[k]();saved=true;break;}}catch(e){}}
    if(!saved){for(const k of Object.keys(localStorage)){try{const raw=localStorage.getItem(k);if(!raw)continue;const parsed=JSON.parse(raw);if(parsed&&typeof parsed==='object'&&Array.isArray(parsed.materials)&&Array.isArray(parsed.movements)){localStorage.setItem(k,JSON.stringify(d));saved=true;break;}}catch(e){}}}
    return saved;
  }
  function updateStock(d,it){const m=materials().find(x=>String(x.id||x._id)===String(it._materialId));if(!m)return false;const keys=['current','estoqueAtual','estoque','stock','quantity','quantidade','qty'];const key=keys.find(k=>m[k]!==undefined&&m[k]!==null)||'current';const before=Number(m[key]||0);m[key]=before+Number(it.qty||0);it._before=before;it._after=m[key];return true;}
  function refresh(){['renderMaterials','renderMovements','renderHistory','renderHome','updateDashboard'].forEach(k=>{try{if(typeof window[k]==='function')window[k]();}catch(e){}});}
  function confirm(){
    const d=getDb();if(!d||!state.data)return;
    if(!state.data.items.every(x=>x._materialId)){alert('Há produto(s) não localizado(s) no cadastro de materiais. Nenhuma entrada foi feita.');return;}
    if(!state.data.nf){alert('NF não identificada. Nenhuma entrada foi feita.');return;}
    if(!Array.isArray(d.invoiceDocuments))d.invoiceDocuments=[];
    const dup=d.invoiceDocuments.find(x=>norm(x.nf)===norm(state.data.nf)&&norm(x.supplier)===norm(state.data.supplier));
    if(dup){alert('Esta NF já possui uma entrada registrada.');return;}
    const items=state.data.items.map(x=>({...x}));
    try{
      items.forEach(x=>{if(!updateStock(d,x))throw new Error('MATERIAL_NAO_ENCONTRADO');});
      d.invoiceDocuments.push({id:'nfd_'+Date.now(),documentType:'NOTA_FISCAL_ENTRADA',status:'entrada_confirmada',nf:state.data.nf,supplier:state.data.supplier,cnpj:state.data.cnpj||'',fileName:state.file?.name||'',createdAt:new Date().toISOString(),items:items.map(x=>({materialId:x._materialId,product:x.product,unit:x.unit,qty:x.qty,value:x.value,before:x._before,after:x._after}))});
      if(!Array.isArray(d.movements))d.movements=[];const now=new Date().toISOString();items.forEach(x=>d.movements.push({id:'mov_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),type:'Entrada',movementType:'entrada_nf',materialId:x._materialId,qty:x.qty,before:x._before,after:x._after,reason:`Entrada por NF ${state.data.nf}`,nf:state.data.nf,supplier:state.data.supplier,productValue:x.value,createdAt:now}));
      if(!Array.isArray(d.history))d.history=[];d.history.push({id:'nf_'+Date.now(),type:'entrada_nf',action:'Entrada de estoque por NF',nf:state.data.nf,supplier:state.data.supplier,fileName:state.file?.name||'',items:items.map(x=>({materialId:x._materialId,product:x.product,unit:x.unit,qty:x.qty,value:x.value})),createdAt:now});
      if(!persistDb())throw new Error('PERSISTENCIA_NAO_LOCALIZADA');
      refresh();alert(`Entrada confirmada: NF ${state.data.nf} — ${items.length} produto(s).`);if($('almoxNfModal'))$('almoxNfModal').classList.remove('open');
    }catch(e){
      items.forEach(x=>{const m=materials().find(y=>String(y.id||y._id)===String(x._materialId));if(m&&x._before!==undefined){const key=['current','estoqueAtual','estoque','stock','quantity','quantidade','qty'].find(k=>m[k]!==undefined&&m[k]!==null)||'current';m[key]=x._before;}});
      console.error(e);alert(e.message==='NF_DUPLICADA'?'Esta NF já possui uma entrada registrada.':'A entrada não foi concluída. O sistema não confirmou a operação.');
    }
  }

  async function handle(file){
    if(!file)return;
    state.file=file;state.data=null;state.reading=true;
    if($('alnStep2'))$('alnStep2').style.display='none';if($('alnStep1'))$('alnStep1').style.display='block';
    setStatus('Lendo NF-e e reconstruindo a estrutura da tabela de produtos…');
    try{
      const text=await readFile(file);state.text=text;state.data=parse(text);state.reading=false;
      if(!state.data.items.length){setStatus('Documento lido, mas os produtos não foram identificados com segurança. Nenhuma entrada foi feita.','warn');return;}
      setStatus(`Leitura concluída: ${state.data.items.length} produto(s) identificado(s).`,'ok');render();
      if($('alnStep1'))$('alnStep1').style.display='none';if($('alnStep2'))$('alnStep2').style.display='block';
    }catch(e){state.reading=false;setStatus('Não foi possível ler este documento. Nenhuma entrada foi feita.','error');console.error(e);}
  }

  function install(){
    const file=$('alnFile'),camera=$('alnCamera');
    if(!file||!camera){setTimeout(install,200);return;}
    const intercept=e=>{e.preventDefault();e.stopImmediatePropagation();const f=e.target.files?.[0];if(f)handle(f);};
    file.addEventListener('change',intercept,true);camera.addEventListener('change',intercept,true);
    const close=$('alnClose');if(close)close.addEventListener('click',()=>{state.file=null;state.data=null;});
  }
  install();
})();
