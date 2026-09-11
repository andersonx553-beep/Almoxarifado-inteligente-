/* ALMOX LAB — FIX ÚNICO / temporário do ciclo de nova leitura NF.
   Corrige o reenvio do mesmo arquivo e limpa o estado da leitura anterior.
   Não cria outro motor nem substitui nf-entry-intelligent.js.
*/
(()=>{'use strict';
if(window.__almoxNfEntryFix)return;window.__almoxNfEntryFix=true;
const $=id=>document.getElementById(id);
function resetReader(){const read=$('nfRead'),review=$('nfReview'),status=$('nfStatus'),file=$('nfFile'),cam=$('nfCam');if(read)read.style.display='block';if(review){review.style.display='none';review.innerHTML='';}if(status){status.className='card';status.textContent='Aguardando documento.';}if(file)file.value='';if(cam)cam.value='';}
function bind(){const modal=$('almoxNfModal'),back=$('nfBack'),file=$('nfFile'),cam=$('nfCam'),close=$('nfClose'),pickers=document.querySelectorAll('[data-nf-file],label[for="nfFile"]');if(!modal)return false;
if(file&&!file.dataset.nfResetFix){file.dataset.nfResetFix='1';file.addEventListener('click',()=>{file.value='';});}
if(cam&&!cam.dataset.nfResetFix){cam.dataset.nfResetFix='1';cam.addEventListener('click',()=>{cam.value='';});}
if(back&&!back.dataset.nfResetFix){back.dataset.nfResetFix='1';back.addEventListener('click',resetReader,true);}
if(close&&!close.dataset.nfResetFix){close.dataset.nfResetFix='1';close.addEventListener('click',()=>setTimeout(resetReader,0));}
pickers.forEach(el=>{if(el.dataset.nfPickerFix)return;el.dataset.nfPickerFix='1';el.addEventListener('click',e=>{if(file&&e.target!==file){e.preventDefault();e.stopPropagation();file.value='';file.click();}},true);});
if(!modal.dataset.nfResetFix){modal.dataset.nfResetFix='1';const observer=new MutationObserver(()=>bind());observer.observe(modal,{childList:true,subtree:true});}
return true;}
function start(){if(bind())return;let tries=0;const timer=setInterval(()=>{if(bind()||++tries>40)clearInterval(timer);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
