/* ALMOX LAB — leitor inteligente: cadastro enxuto do fornecedor. */
(() => {
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const digits=v=>String(v||'').replace(/\D/g,'');
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const formatCnpj=v=>{const d=digits(v);return d.length===14?d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5'):clean(v)};
  const formatCep=v=>{const d=digits(v);return d.length===8?d.replace(/(\d{5})(\d{3})/,'$1-$2'):clean(v)};
  const formatPhone=v=>{const d=digits(v);if(d.length===11)return d.replace(/(\d{2})(\d{5})(\d{4})/,'($1) $2-$3');if(d.length===10)return d.replace(/(\d{2})(\d{4})(\d{4})/,'($1) $2-$3');return clean(v)};
  const validCnpj=v=>{const c=digits(v);if(c.length!==14||/^([0-9])\1+$/.test(c))return false;let s=0,p=5;for(let i=0;i<12;i++){s+=+c[i]*p;if(--p<2)p=9}let d=s%11<2?0:11-s%11;if(d!==+c[12])return false;s=0;p=6;for(let i=0;i<13;i++){s+=+c[i]*p;if(--p<2)p=9}d=s%11<2?0:11-s%11;return d===+c[13]};
  function status(t,p){const e=$('#almoxReaderStatus');if(e)e.innerHTML=`<strong>${t}</strong><div class="alr-progress"><span style="width:${Math.max(0,Math.min(100,p||0))}%"></span></div>`}
  function field(id,value){const e=document.getElementById(id);if(!e||value===undefined||value===null)return false;e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true}
  function duplicate(cnpj){try{if(typeof db==='undefined'||!Array.isArray(db.suppliers))return null;const d=digits(cnpj);return db.suppliers.find(s=>digits(s.cnpj)===d)||null}catch{return null}}
  async function load(src,test){if(test())return;await new Promise((ok,bad)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>bad(new Error('Biblioteca de leitura indisponível.'));document.head.appendChild(s)})}
  async function ocr(source){await load('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',()=>!!window.Tesseract);const r=await Tesseract.recognize(source,'por',{logger:m=>{if(typeof m.progress==='number')status('Reconhecendo texto...',Math.round(m.progress*100))}});return r.data.text||''}
  async function readPdf(file){await load('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',()=>!!window.pdfjsLib);pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let text='';for(let i=1;i<=pdf.numPages;i++){status(`Lendo PDF — página ${i}/${pdf.numPages}...`,Math.round(i/pdf.numPages*35));const page=await pdf.getPage(i);const tc=await page.getTextContent();text+=tc.items.map(x=>x.str||'').join(' ')+'\n'}if(text.replace(/\s/g,'').length>=80)return text;let o='';for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const v=page.getViewport({scale:2});const c=document.createElement('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);await page.render({canvasContext:c.getContext('2d'),viewport:v}).promise;o+=await ocr(c)+'\n'}return o}
  function normalizeSupplierName(value){
    let s=clean(value).replace(/^[^A-Za-zÀ-ÿ]*[|:;\-]*\s*/,'');
    s=s.replace(/^(?:RECEBEMOS\s+DE|RECEBIDO\s+DE|EMITENTE|FORNECEDOR|DESTINAT[ÁA]RIO|REMETENTE)\s*/i,'');
    s=s.replace(/^[0-9|Il1]+(?=[A-ZÀ-Ý])/,'');
    s=s.replace(/\b(?:LTDA\.?|LTD\.?|EIRELI|MEI|ME|EPP|S\.?\s*A\.?)\s*$/i,'').trim();
    s=s.replace(/[\s,.;:/\-]+$/,'').trim();
    return s;
  }
  function extract(raw){
    const text=String(raw||'').replace(/\u00a0/g,' '),lines=text.split(/\r?\n/).map(clean).filter(Boolean),out={razaoSocial:'',cnpj:'',cep:'',endereco:'',telefone:'',email:''};
    for(const m of text.matchAll(/\b\d{2}[.\s]?\d{3}[.\s]?\d{3}\/?\d{4}[-\s]?\d{2}\b/g)){if(validCnpj(m[0])){out.cnpj=formatCnpj(m[0]);break}}
    const cep=text.match(/\b\d{5}[-.\s]?\d{3}\b/);if(cep)out.cep=formatCep(cep[0]);
    const ph=[...text.matchAll(/(?:\(?\d{2}\)?\s*)?9?\d{4}[-.\s]?\d{4}/g)].map(x=>x[0]).find(x=>[10,11].includes(digits(x).length));if(ph)out.telefone=formatPhone(ph);
    const em=text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);if(em)out.email=clean(em[0]);
    const idx=out.cnpj?lines.findIndex(x=>x.includes(out.cnpj.split('/')[0])):-1;
    const cand=idx>=0?lines.slice(Math.max(0,idx-7),idx):lines.slice(0,15);
    const bad=/^(CNPJ|CPF|INSCRI|IE\b|DANFE|DOCUMENTO|NOTA|ENDERE|CEP|FONE|TELEFONE|TEL|EMAIL|E-MAIL|CHAVE|EMITENTE|DESTINAT)/i;
    // Prioriza a linha de contexto "RECEBEMOS DE ..." e remove o texto do documento e a razão jurídica.
    const contextName=cand.find(x=>/\bRECEBEMOS\s+DE\b/i.test(x));
    if(contextName){
      const m=contextName.match(/\bRECEBEMOS\s+DE\s+(.+?)(?=\s+(?:CNPJ|CPF|IE|INSCRI|ENDERE|CEP|FONE|TEL|EMAIL|E-MAIL)\b|$)/i);
      if(m)out.razaoSocial=normalizeSupplierName(m[1]);
    }
    if(!out.razaoSocial){
      const candidate=cand.find(x=>x.length>2&&!bad.test(x)&&!/^\d/.test(x)&&/[A-Za-zÀ-ÿ]/.test(x)&&digits(x).length<10);
      out.razaoSocial=normalizeSupplierName(candidate||'');
    }
    // Se a linha contém o nome comercial seguido de LTDA, conserva apenas o nome comercial.
    out.razaoSocial=normalizeSupplierName(out.razaoSocial);
    const a=text.match(/(?:RUA|AVENIDA|AV\.?|RODOVIA|ROD\.?|ALAMEDA|TRAVESSA|ESTRADA|PRA[CÇ]A|TV\.?)\s+[^\n]{3,120}/i);
    if(a){let s=clean(a[0]);const n=s.match(/(?:,|\s)N?[º°]?\s*(\d{1,6})(?=\s|,|$)/i);if(n){s=s.replace(n[0],'').replace(/,\s*$/,'');s=`${s}, ${n[1]}`}out.endereco=clean(s)}
    return out;
  }
  function render(data){const box=$('#almoxReaderResult');if(!box)return;const labels={razaoSocial:'Razão social',cnpj:'CNPJ',cep:'CEP',endereco:'Endereço',telefone:'Telefone',email:'E-mail'};box.innerHTML=Object.entries(data).filter(([,v])=>v).map(([k,v])=>`<div class="alr-row"><span>${labels[k]}</span><strong>${v}</strong></div>`).join('')||'<div class="alr-empty">Nenhum dado cadastral confiável foi identificado.</div>'}
  function hideExtraSupplierFields(){
    const ids=['sTradeName','sIe','sNumber','sNeighborhood','sCity','sUf','sPurpose'];
    ids.forEach(id=>{const e=document.getElementById(id);const wrap=e?.closest('.field');if(wrap)wrap.style.display='none'});
    // Mantém somente: Razão social, CNPJ, CEP, Endereço, Telefone e E-mail.
    ['sLegalName','sCnpj','sCep','sAddress','sPhone','sEmail'].forEach(id=>{const e=document.getElementById(id);const wrap=e?.closest('.field');if(wrap)wrap.style.display='' });
  }
  async function processReal(file){
    try{
      status('Preparando documento...',5);let raw='';if(file.type==='application/pdf'||/\.pdf$/i.test(file.name))raw=await readPdf(file);else if(file.type.startsWith('image/'))raw=await ocr(file);else throw new Error('Formato não suportado. Use PDF, JPG, JPEG ou PNG.');
      status('Identificando fornecedor...',90);const data=extract(raw);window.__alrData=data;render(data);if(!data.cnpj&&!data.razaoSocial)throw new Error('Fornecedor não identificado com segurança.');
      const dup=duplicate(data.cnpj);if(dup){status('Fornecedor já cadastrado — nenhum duplicado criado.',100);$('#almoxReaderResult').insertAdjacentHTML('afterbegin','<div class="alr-warning">⚠️ Já existe fornecedor com este CNPJ.</div>');return}
      if(typeof openSupplier!=='function')throw new Error('Cadastro de fornecedor não encontrado.');
      openSupplier('');
      setTimeout(()=>{
        hideExtraSupplierFields();
        field('sLegalName',data.razaoSocial);field('sTradeName',data.razaoSocial);field('sCnpj',data.cnpj);field('sCep',data.cep);field('sAddress',data.endereco);field('sPhone',data.telefone);field('sEmail',data.email);
        field('sIe','');field('sNumber','');field('sNeighborhood','');field('sCity','');field('sUf','');field('sPurpose','');
        const overlay=$('#almoxReaderOverlay');if(overlay)overlay.classList.remove('open');if($('#modal'))$('#modal').classList.add('open');status('Dados extraídos: razão social, CNPJ, CEP, endereço, telefone e e-mail.',100);
        const save=$$('#modal button').find(b=>/^Salvar$/i.test(clean(b.textContent)));if(save){save.dataset.alrAuto='1';save.focus()}
      },120);
    }catch(e){console.error(e);status('Leitura não concluída.',0);const box=$('#almoxReaderResult');if(box)box.innerHTML=`<div class="alr-error">${clean(e.message||'Erro ao processar documento.')}</div>`}
  }
  function bind(){const file=$('#almoxReaderFile'),cam=$('#almoxReaderCamera');if(!file||file.dataset.alrFix)return;file.dataset.alrFix='1';if(cam)cam.dataset.alrFix='1';file.onchange=e=>{const f=e.target.files?.[0];if(f)processReal(f)};if(cam)cam.onchange=e=>{const f=e.target.files?.[0];if(f)processReal(f)}}
  const timer=setInterval(()=>{bind();if($('#almoxReaderFile'))clearInterval(timer)},100);
})();
