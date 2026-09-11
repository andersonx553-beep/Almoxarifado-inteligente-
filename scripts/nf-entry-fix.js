/* ALMOX LAB — FIX ÚNICO do leitor NF.
   Corrige o acionamento do seletor de arquivos, câmera e ciclo de nova leitura.
   Mantém o motor principal em scripts/nf-entry-intelligent.js.
*/
(()=>{'use strict';
if(window.__almoxNfEntryFix)return;window.__almoxNfEntryFix=true;

const $=id=>document.getElementById(id);

function resetReader(){
  const read=$('nfRead'),review=$('nfReview'),status=$('nfStatus'),file=$('nfFile'),cam=$('nfCam');
  if(read)read.style.display='block';
  if(review){review.style.display='none';review.innerHTML='';}
  if(status){status.className='card';status.textContent='Aguardando documento.';}
  if(file)file.value='';
  if(cam)cam.value='';
}

function bindPicker(inputId){
  const input=$(inputId);
  if(!input||input.dataset.nfPickerFix)return;
  const button=input.parentElement?.querySelector('button');
  if(!button)return;
  input.dataset.nfPickerFix='1';
  button.type='button';
  button.addEventListener('click',e=>{
    e.preventDefault();
    e.stopPropagation();
    input.value='';
    input.click();
  });
  input.addEventListener('click',()=>{input.value='';});
}

function bind(){
  const modal=$('almoxNfModal'),back=$('nfBack'),close=$('nfClose');
  if(!modal)return false;

  bindPicker('nfFile');
  bindPicker('nfCam');

  const file=$('nfFile'),cam=$('nfCam');
  if(file&&!file.dataset.nfChangeFix){
    file.dataset.nfChangeFix='1';
    file.addEventListener('change',()=>{
      const selected=file.files?.[0];
      if(selected)setTimeout(()=>{file.value='';},0);
    });
  }
  if(cam&&!cam.dataset.nfChangeFix){
    cam.dataset.nfChangeFix='1';
    cam.addEventListener('change',()=>{
      const selected=cam.files?.[0];
      if(selected)setTimeout(()=>{cam.value='';},0);
    });
  }

  if(back&&!back.dataset.nfResetFix){
    back.dataset.nfResetFix='1';
    back.addEventListener('click',resetReader,true);
  }
  if(close&&!close.dataset.nfResetFix){
    close.dataset.nfResetFix='1';
    close.addEventListener('click',()=>setTimeout(resetReader,0));
  }

  if(!modal.dataset.nfResetFix){
    modal.dataset.nfResetFix='1';
    const observer=new MutationObserver(()=>{
      bindPicker('nfFile');
      bindPicker('nfCam');
      const currentBack=$('nfBack');
      if(currentBack&&!currentBack.dataset.nfResetFix){
        currentBack.dataset.nfResetFix='1';
        currentBack.addEventListener('click',resetReader,true);
      }
    });
    observer.observe(modal,{childList:true,subtree:true});
  }
  return true;
}

function start(){
  if(bind())return;
  let tries=0;
  const timer=setInterval(()=>{if(bind()||++tries>40)clearInterval(timer);},250);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
