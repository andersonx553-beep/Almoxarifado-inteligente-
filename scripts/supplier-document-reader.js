/* ALMOX LAB — Leitor Inteligente de Documentos / Fornecedores
 * Alteração 04. Sem IA externa obrigatória.
 * Entradas: PDF, JPG/JPEG/PNG e câmera. Saída: dados cadastrais normalizados.
 */
(() => {
  'use strict';

  const CFG = {
    pdfUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    pdfWorkerUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    tesseractUrl: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  };

  const state = { busy:false, overlay:null, lastResult:null };

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const clean = v => String(v || '').replace(/\s+/g,' ').trim();
  const digits = v => String(v || '').replace(/\D/g,'');

  function loadScript(src, test) {
    if (test()) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src; s.async=true;
      s.onload=()=>resolve(); s.onerror=()=>reject(new Error('Não foi possível carregar '+src));
      document.head.appendChild(s);
    });
  }

  async function ensurePdf() {
    await loadScript(CFG.pdfUrl, ()=>!!window.pdfjsLib);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc=CFG.pdfWorkerUrl;
  }
  async function ensureOcr() {
    await loadScript(CFG.tesseractUrl, ()=>!!window.Tesseract);
  }

  function setStatus(text, progress) {
    const el=$('#almoxReaderStatus');
    if(!el) return;
    el.innerHTML=`<strong>${text}</strong>${Number.isFinite(progress)?`<div class="alr-progress"><span style="width:${Math.max(0,Math.min(100,progress))}%"></span></div>`:''}`;
  }

  function validCnpj(v) {
    const c=digits(v); if(c.length!==14 || /^([0-9])\1+$/.test(c)) return false;
    let sum=0, pos=5;
    for(let i=0;i<12;i++){sum+=+c[i]*pos;pos--;if(pos<2)pos=9;}
    let d=sum%11<2?0:11-(sum%11); if(d!==+c[12]) return false;
    sum=0; pos=6;
    for(let i=0;i<13;i++){sum+=+c[i]*pos;pos--;if(pos<2)pos=9;}
    d=sum%11<2?0:11-(sum%11); return d===+c[13];
  }
  const formatCnpj=v=>{const d=digits(v);return d.length===14?d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5'):clean(v)};
  const formatCep=v=>{const d=digits(v);return d.length===8?d.replace(/(\d{5})(\d{3})/,'$1-$2'):clean(v)};
  const formatPhone=v=>{const d=digits(v);if(d.length===11)return d.replace(/(\d{2})(\d{5})(\d{4})/,'($1) $2-$3');if(d.length===10)return d.replace(/(\d{2})(\d{4})(\d{4})/,'($1) $2-$3');return clean(v)};

  function extract(raw) {
    const text=raw.replace(/\u00a0/g,' ');
    const lines=text.split(/\r?\n/).map(clean).filter(Boolean);
    const upper=text.toUpperCase();
    const out={razaoSocial:'',cnpj:'',ie:'',telefone:'',endereco:'',numero:'',bairro:'',cidade:'',uf:'',cep:''};

    const cnpjMatches=[...text.matchAll(/\b\d{2}[.\s]?\d{3}[.\s]?\d{3}\/?\d{4}[-\s]?\d{2}\b/g)];
    for(const m of cnpjMatches){ if(validCnpj(m[0])){out.cnpj=formatCnpj(m[0]);break;} }
    const cep=text.match(/\b\d{5}[-.\s]?\d{3}\b/); if(cep) out.cep=formatCep(cep[0]);
    const phones=[...text.matchAll(/(?:\(?\d{2}\)?\s*)?9?\d{4}[-.\s]?\d{4}/g)].map(m=>m[0]);
    const phone=phones.find(p=>digits(p).length===10||digits(p).length===11); if(phone) out.telefone=formatPhone(phone);

    const iePatterns=[
      /(?:INSCRI[ÇC][ÃA]O\s+ESTADUAL|I\.?E\.?)\s*[:\-]?\s*([0-9.\-\/]{6,20})/i,
      /(?:IE)\s*[:\-]?\s*([0-9.\-\/]{6,20})/i
    ];
    for(const re of iePatterns){const m=text.match(re);if(m){out.ie=clean(m[1]);break;}}

    const idxC=out.cnpj?lines.findIndex(l=>l.includes(out.cnpj.split('/')[0])):-1;
    const nameCandidates=[];
    if(idxC>=0){for(let i=Math.max(0,idxC-6);i<idxC;i++) nameCandidates.push(lines[i]);}
    for(const l of lines.slice(0,20)) nameCandidates.push(l);
    const blacklist=/^(CNPJ|CPF|INSCRI|IE\b|DANFE|DOCUMENTO|NOTA|N[ÚU]MERO|ENDERE[CÇ]O|CEP|FONE|TELEFONE|CHAVE|EMITENTE|DESTINAT)/i;
    out.razaoSocial=clean(nameCandidates.find(l=>l.length>3 && !blacklist.test(l) && !/^\d/.test(l) && /[A-Za-zÀ-ÿ]/.test(l))||'');

    const addrMatch=text.match(/(?:RUA|AVENIDA|AV\.?|RODOVIA|ROD\.?|ALAMEDA|TRAVESSA|ESTRADA|PRA[CÇ]A|TV\.?)\s+[^\n]{3,120}/i);
    if(addrMatch){
      let a=clean(addrMatch[0]).replace(/\s{2,}/g,' ');
      const num=a.match(/(?:,|\s)N?[º°]?\s*(\d{1,6})(?=\s|,|$)/i);
      if(num){out.numero=num[1]; a=a.replace(num[0], '').replace(/,\s*$/,'');}
      out.endereco=a;
    }

    const bairro=text.match(/(?:BAIRRO|B\.)\s*[:\-]?\s*([^\n,;]{2,60})/i); if(bairro) out.bairro=clean(bairro[1]);
    const cityUf=text.match(/(?:MUNIC[IÍ]PIO|CIDADE)\s*[:\-]?\s*([A-Za-zÀ-ÿ .'-]{2,50})\s*[-\/]\s*([A-Z]{2})/i);
    if(cityUf){out.cidade=clean(cityUf[1]);out.uf=cityUf[2].toUpperCase();}
    if(!out.uf){const uf=text.match(/(?:\/|[-\s])([A-Z]{2})(?:\s|$)/g);const known=new Set(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']);const hit=uf?.map(x=>x.trim().replace(/^[^A-Z]*/,'')).find(x=>known.has(x));if(hit)out.uf=hit;}

    return out;
  }

  async function ocrImage(source, label='imagem') {
    await ensureOcr();
    setStatus(`Reconhecendo texto de ${label}...`,10);
    const result=await Tesseract.recognize(source,'por',{logger:m=>{
      if(m.status && typeof m.progress==='number') setStatus('Reconhecendo texto...',Math.round(m.progress*100));
    }});
    return result.data.text||'';
  }

  async function pdfText(file) {
    await ensurePdf();
    const buf=await file.arrayBuffer();
    const pdf=await window.pdfjsLib.getDocument({data:buf}).promise;
    let text='';
    for(let p=1;p<=pdf.numPages;p++){
      setStatus(`Lendo PDF — página ${p}/${pdf.numPages}...`,Math.round((p-1)/pdf.numPages*40));
      const page=await pdf.getPage(p);
      const tc=await page.getTextContent();
      text += tc.items.map(x=>x.str||'').join(' ')+'\n';
    }
    if(text.replace(/\s/g,'').length>=80) return text;
    let ocr='';
    for(let p=1;p<=pdf.numPages;p++){
      setStatus(`Processando página ${p}/${pdf.numPages} para OCR...`,45+Math.round((p-1)/pdf.numPages*20));
      const page=await pdf.getPage(p,{intent:'display'});
      const viewport=page.getViewport({scale:2});
      const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      ocr += await ocrImage(canvas,`página ${p}`)+'\n';
    }
    return ocr;
  }

  function fieldCandidates(kind){
    const map={
      razaoSocial:['#siName','#siRazaoSocial','#supplierName','input[name="razaoSocial"]','input[name="supplierName"]'],
      cnpj:['#siCnpj','#siCNPJ','#supplierCnpj','input[name="cnpj"]'],
      ie:['#siIe','#siIE','#supplierIe','input[name="ie"]','input[name="inscricaoEstadual"]'],
      telefone:['#siPhone','#siTelefone','#supplierPhone','input[name="telefone"]','input[name="phone"]'],
      endereco:['#siAddress','#siEndereco','#supplierAddress','input[name="endereco"]'],
      numero:['#siNumber','#supplierNumber','input[name="numero"]'],
      bairro:['#siNeighborhood','#siBairro','#supplierNeighborhood','input[name="bairro"]'],
      cidade:['#siCity','#siCidade','#supplierCity','input[name="cidade"]'],
      uf:['#siUf','#siUF','#supplierUf','select[name="uf"]','input[name="uf"]'],
      cep:['#siCep','#siCEP','#supplierCep','input[name="cep"]']
    };return map[kind]||[];
  }
  function findField(kind){for(const s of fieldCandidates(kind)){const el=$(s);if(el)return el;}return null;}
  function fillField(kind,value){const el=findField(kind);if(!el || !value)return false;el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;}

  function existingSuppliers(){
    const keys=['fornecedores','suppliers','almox_fornecedores','almoxarifado_fornecedores'];
    const arr=[];for(const k of keys){try{const v=JSON.parse(localStorage.getItem(k)||'null');if(Array.isArray(v))arr.push(...v);}catch{}}
    return arr;
  }
  function duplicate(cnpj){const d=digits(cnpj);return existingSuppliers().find(s=>digits(s.cnpj||s.CNPJ||s.documento)===d)||null;}

  function renderResult(data){
    const box=$('#almoxReaderResult');if(!box)return;
    const rows=Object.entries(data).filter(([,v])=>v).map(([k,v])=>`<div class="alr-row"><span>${({razaoSocial:'Razão social',cnpj:'CNPJ',ie:'Inscrição estadual',telefone:'Telefone',endereco:'Endereço',numero:'Número',bairro:'Bairro',cidade:'Cidade',uf:'UF',cep:'CEP'})[k]||k}</span><strong>${v}</strong></div>`).join('');
    box.innerHTML=rows||'<div class="alr-empty">Nenhum dado cadastral confiável foi identificado.</div>';
  }

  function fillAndMaybeSave(data){
    let filled=0;for(const [k,v] of Object.entries(data)){if(fillField(k,v))filled++;}
    const dup=duplicate(data.cnpj);
    if(dup){
      setStatus('Fornecedor já cadastrado — nenhum duplicado criado.',100);
      $('#almoxReaderResult').insertAdjacentHTML('afterbegin','<div class="alr-warning">⚠️ CNPJ já encontrado no cadastro. Revise o fornecedor existente.</div>');
      return {filled,duplicate:true};
    }
    return {filled,duplicate:false};
  }

  async function process(file){
    if(state.busy)return; state.busy=true;
    try{
      const type=file.type||''; let raw='';
      if(type==='application/pdf'||/\.pdf$/i.test(file.name)){raw=await pdfText(file);}
      else if(type.startsWith('image/')||/\.(jpe?g|png|webp)$/i.test(file.name)){raw=await ocrImage(file,'imagem');}
      else throw new Error('Formato não suportado. Use PDF, JPG, JPEG ou PNG.');
      setStatus('Identificando fornecedor...',88);
      const data=extract(raw); state.lastResult=data; renderResult(data);
      if(!data.cnpj && !data.razaoSocial) throw new Error('Não foi possível identificar o fornecedor com segurança.');
      const r=fillAndMaybeSave(data);
      setStatus(r.duplicate?'Fornecedor já cadastrado.':'Dados extraídos e preenchidos no cadastro.',100);
      const save=$('#almoxReaderSave');if(save)save.style.display=r.duplicate?'none':'inline-flex';
    }catch(err){
      console.error('[ALMOX Reader]',err); setStatus('Leitura não concluída.',0);
      const box=$('#almoxReaderResult');if(box)box.innerHTML=`<div class="alr-error">${clean(err.message||'Erro ao processar documento.')}</div>`;
    }finally{state.busy=false;}
  }

  function ui(){
    if($('#almoxReaderButton'))return;
    const style=document.createElement('style');style.textContent=`
      .alr-launch{background:#0f766e!important;margin-left:8px}.alr-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:none;align-items:center;justify-content:center;padding:16px}.alr-overlay.open{display:flex}.alr-box{background:#fff;width:min(760px,100%);max-height:92vh;overflow:auto;border-radius:18px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.2)}.alr-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.alr-drop{border:2px dashed #b8c7da;border-radius:14px;padding:26px;text-align:center;margin:16px 0;background:#fbfcfe}.alr-actions{display:flex;gap:8px;flex-wrap:wrap}.alr-status{padding:11px 13px;border-radius:10px;background:#f4f7fb;margin:10px 0}.alr-progress{height:6px;background:#e5e7eb;border-radius:99px;margin-top:8px;overflow:hidden}.alr-progress span{display:block;height:100%;background:#0f766e}.alr-row{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #e5e7eb}.alr-row span{color:#64748b}.alr-row strong{max-width:65%;text-align:right}.alr-warning{background:#fff7ed;color:#9a3412;padding:10px;border-radius:10px;margin-bottom:10px}.alr-error{background:#fef2f2;color:#b91c1c;padding:10px;border-radius:10px}.alr-empty{color:#64748b;padding:14px 0}.alr-note{font-size:12px;color:#64748b;margin-top:8px}`;document.head.appendChild(style);
    const overlay=document.createElement('div');overlay.className='alr-overlay';overlay.id='almoxReaderOverlay';overlay.innerHTML=`<div class="alr-box"><div class="alr-head"><div><h2 style="margin:0 0 4px">📄 Leitor inteligente</h2><div class="muted">PDF, imagem ou foto da câmera → fornecedor → cadastro.</div></div><button type="button" class="secondary" id="almoxReaderClose">Fechar</button></div><div class="alr-drop"><div style="font-size:36px">📄 📷</div><p><strong>Envie a nota ou tire uma foto</strong></p><div class="alr-actions" style="justify-content:center"><label class="button" style="display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border-radius:10px;padding:11px 15px;background:#2457d6;color:#fff;font-weight:700">📄 Selecionar arquivo<input id="almoxReaderFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden></label><label style="display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border-radius:10px;padding:11px 15px;background:#0f766e;color:#fff;font-weight:700">📷 Tirar foto<input id="almoxReaderCamera" type="file" accept="image/*" capture="environment" hidden></label></div><div class="alr-note">O processamento usa leitura de PDF e OCR. Nenhum dado é inventado.</div></div><div id="almoxReaderStatus" class="alr-status">Aguardando documento.</div><div id="almoxReaderResult"></div><div class="actions"><button type="button" class="secondary" id="almoxReaderCancel">Cancelar</button><button type="button" id="almoxReaderSave" style="display:none">✓ Confirmar cadastro</button></div></div>`;document.body.appendChild(overlay);state.overlay=overlay;
    $('#almoxReaderClose').onclick=close;$('#almoxReaderCancel').onclick=close;
    $('#almoxReaderFile').onchange=e=>e.target.files[0]&&process(e.target.files[0]);
    $('#almoxReaderCamera').onchange=e=>e.target.files[0]&&process(e.target.files[0]);
    $('#almoxReaderSave').onclick=()=>{const btns=$$('button');const save=btns.find(b=>/salvar|cadastrar|adicionar/i.test(b.textContent)&&b.id!=='almoxReaderSave');if(save){save.click();setStatus('Cadastro confirmado.',100);}else{setStatus('Dados preenchidos. Use o botão de salvar do cadastro existente.',100);}};
    function close(){overlay.classList.remove('open');}
  }
  function open(){ui();$('#almoxReaderOverlay').classList.add('open');}

  function mount(){
    ui();
    const section=$('#suppliers');
    if(section && !$('#almoxReaderButton')){
      const btn=document.createElement('button');btn.id='almoxReaderButton';btn.className='alr-launch';btn.textContent='📄 Ler documento';btn.onclick=open;
      const top=section.querySelector('.top'); if(top) top.appendChild(btn); else section.prepend(btn);
    }
    const nav=$$('nav button');nav.forEach(b=>b.addEventListener('click',()=>setTimeout(mount,50)));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
  window.AlmoxSupplierReader={open,process,extract};
})();
