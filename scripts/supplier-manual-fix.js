/* ALMOX LAB — correção do cadastro manual de fornecedores.
 * Remove a dependência rígida da finalidade e corrige a compatibilidade cidade/UF.
 * Não altera a estrutura do banco nem substitui o saveSupplier original: apenas normaliza
 * os campos antes de entregar o fluxo ao cadastro existente.
 */
(() => {
  'use strict';

  const PURPOSE_DEFAULT = 'Outros';
  let wrapped = false;

  function ensureCompatField() {
    let el = document.getElementById('sCityState');
    if (!el) {
      el = document.createElement('input');
      el.type = 'hidden';
      el.id = 'sCityState';
      el.name = 'sCityState';
      document.body.appendChild(el);
    }
    const city = document.getElementById('sCity')?.value?.trim() || '';
    const uf = document.getElementById('sUf')?.value?.trim()?.toUpperCase() || '';
    el.value = [city, uf].filter(Boolean).join(' / ');
    return el;
  }

  function normalizePurpose() {
    const el = document.getElementById('sPurpose');
    if (!el) return;
    if (!el.value.trim()) el.value = PURPOSE_DEFAULT;
    const label = el.closest('.field')?.querySelector('label');
    if (label) label.textContent = 'Finalidade / área de fornecimento';
    el.placeholder = 'Ex.: Limpeza, Elétrica, EPI... (opcional)';
  }

  function patchModal() {
    const el = document.getElementById('sPurpose');
    if (!el) return;
    normalizePurpose();
    ensureCompatField();
  }

  function wrapSave() {
    if (wrapped || typeof window.saveSupplier !== 'function') return;
    const original = window.saveSupplier;
    window.saveSupplier = async function(id) {
      normalizePurpose();
      ensureCompatField();
      const purpose = document.getElementById('sPurpose');
      if (purpose && !purpose.value.trim()) purpose.value = PURPOSE_DEFAULT;
      return original.call(this, id);
    };
    wrapped = true;
  }

  const observer = new MutationObserver(() => {
    wrapSave();
    patchModal();
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });

  const timer = setInterval(() => {
    wrapSave();
    patchModal();
    if (wrapped && document.getElementById('sPurpose')) clearInterval(timer);
  }, 100);

  setTimeout(() => clearInterval(timer), 30000);
  wrapSave();
})();
