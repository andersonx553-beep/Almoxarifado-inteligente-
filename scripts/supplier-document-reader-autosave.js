/* ALMOX LAB — auto-cadastro seguro após leitura confiável. */
(() => {
  const digits=v=>String(v||'').replace(/\D/g,'');
  const validCnpj=v=>{const c=digits(v);if(c.length!==14||/^([0-9])\1+$/.test(c))return false;let s=0,p=5;for(let i=0;i<12;i++){s+=+c[i]*p;if(--p<2)p=9}let d=s%11<2?0:11-s%11;if(d!==+c[12])return false;s=0;p=6;for(let i=0;i<13;i++){s+=+c[i]*p;if(--p<2)p=9}d=s%11<2?0:11-s%11;return d===+c[13]};
  const ensurePurpose=()=>{
    const e=document.querySelector('#sPurpose');
    if(!e||String(e.value||'').trim())return;
    e.value='Importação de documento — finalidade não informada';
    e.dispatchEvent(new Event('input',{bubbles:true}));
    e.dispatchEvent(new Event('change',{bubbles:true}));
  };
  let done=false;
  const trySave=()=>{
    const btn=[...document.querySelectorAll('#modal button')].find(b=>b.dataset.alrAuto==='1');
    const cnpj=document.querySelector('#sCnpj')?.value;
    const name=document.querySelector('#sLegalName')?.value||document.querySelector('#sTradeName')?.value;
    if(!btn||done||!name||!validCnpj(cnpj))return;
    ensurePurpose();
    done=true;
    setTimeout(()=>{if(typeof saveSupplier==='function')saveSupplier('');},120);
  };
  new MutationObserver(trySave).observe(document.documentElement,{subtree:true,childList:true,attributes:true});
  setInterval(()=>{if(!document.querySelector('#modal.open'))done=false;trySave()},250);
})();
