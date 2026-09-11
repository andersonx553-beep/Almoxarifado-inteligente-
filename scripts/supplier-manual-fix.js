/* ALMOX LAB — correção do cadastro manual de fornecedores.
 * A finalidade é opcional no fluxo real. Quando vazia, usa "Outros"
 * para manter compatibilidade com a função legada de salvamento.
 * Não altera o modelo de dados nem a interface do cadastro.
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
    const value = String(el.value || '').trim();
    if (!value || /^importação de documento\s*[—-]\s*finalidade não informada$/i.test(value)) {
      el.value = PURPOSE_DEFAULT;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const label = el.closest('.field')?.querySelector('label');
    if (label) label.textContent = 'Finalidade / área de fornecimento';
    el.placeholder = 'Ex.: Limpeza, Elétrica, EPI... (opcional)';
  }

  function patchModal() {
    if (!document.getElementById('sPurpose')) return;
    normalizePurpose();
    ensureCompatField();
  }

  function wrapSave() {
    if (wrapped || typeof window.saveSupplier !== 'function') return;
    const original = window.saveSupplier;
    window.__almoxOriginalSaveSupplier = original;
    window.saveSupplier = async function(id) {
      normalizePurpose();
      ensureCompatField();
      const purpose = document.getElementById('sPurpose');
      if (purpose && !String(purpose.value || '').trim()) {
        purpose.value = PURPOSE_DEFAULT;
      }
      try {
        return await original.call(this, id);
      } catch (err) {
        console.error('[ALMOX LAB] Falha ao salvar fornecedor:', err);
        if (typeof toast === 'function') toast(err?.message || 'Não foi possível salvar o fornecedor.');
        throw err;
      }
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
