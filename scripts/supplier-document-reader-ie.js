/* ALMOX LAB — preserva IE como dado cadastral do fornecedor sem reescrever o formulário legado. */
(() => {
  const $=s=>document.querySelector(s);let wrapped=false;
  function mountField(){
    const c=$('#sCnpj');if(!c||$('#sIe'))return;
    const wrap=document.createElement('div');wrap.className='field';wrap.innerHTML='<label>Inscrição estadual</label><input id="sIe" value="">';
    c.closest('.field')?.insertAdjacentElement('afterend',wrap);
    try{const id=window.__alrEditingSupplierId;const s=typeof db!=='undefined'&&Array.isArray(db.suppliers)&&id?db.suppliers.find(x=>x.id===id):null;if(s)$('#sIe').value=s.ie||''}catch{}
  }
  function wrapSave(){
    if(wrapped||typeof saveSupplier!=='function')return;
    wrapped=true;const original=saveSupplier;
    window.saveSupplier=async function(id){
      const ie=$('#sIe')?.value?.trim()||'';await original(id);if(typeof db!=='undefined'&&Array.isArray(db.suppliers)){
        const target=id?db.suppliers.find(x=>x.id===id):db.suppliers[db.suppliers.length-1];if(target&&ie){target.ie=ie;try{save()}catch{}}
      }
    };
  }
  new MutationObserver(()=>{mountField();wrapSave()}).observe(document.documentElement,{subtree:true,childList:true});
  setInterval(()=>{mountField();wrapSave()},300);
})();
