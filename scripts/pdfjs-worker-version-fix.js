/* ALMOX LAB — Compatibilidade PDF.js
 * Garante que a API PDF.js carregada use um Worker da MESMA versão.
 * Corrige principalmente versões antigas mantidas em cache pelo navegador/PWA.
 */
(() => {
  'use strict';
  if (window.__almoxPdfJsWorkerFix) return;
  window.__almoxPdfJsWorkerFix = true;

  const cdnBase = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/';

  function install(lib) {
    if (!lib || !lib.version || !lib.GlobalWorkerOptions) return false;
    const version = String(lib.version);
    const major = Number(version.split('.')[0]) || 3;
    const ext = major >= 4 ? 'mjs' : 'js';
    const worker = `${cdnBase}${version}/pdf.worker.min.${ext}?alv=${encodeURIComponent(version)}`;
    const opts = lib.GlobalWorkerOptions;
    if (opts.__almoxWorkerFixInstalled) return true;

    let current = worker;
    try {
      Object.defineProperty(opts, 'workerSrc', {
        configurable: true,
        enumerable: true,
        get() { return current; },
        set() { current = worker; }
      });
    } catch (e) {
      opts.workerSrc = worker;
    }
    opts.__almoxWorkerFixInstalled = true;
    opts.workerSrc = worker;
    window.__almoxPdfJsVersion = version;
    window.__almoxPdfJsWorker = worker;
    return true;
  }

  function scan() {
    try { install(window.pdfjsLib); } catch (e) { console.warn('[ALMOX] PDF.js worker fix:', e); }
  }

  scan();
  const timer = setInterval(() => {
    scan();
    if (window.pdfjsLib?.GlobalWorkerOptions?.__almoxWorkerFixInstalled) clearInterval(timer);
  }, 100);
})();
