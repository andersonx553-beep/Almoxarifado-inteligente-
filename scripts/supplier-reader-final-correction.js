/* ALMOX LAB — Correção final do leitor de fornecedor
 * Corrige identificação semântica do fornecedor e endereço completo.
 * Captura o arquivo antes do leitor limpar o input e reaproveita o texto real do documento.
 */
(() => {
  'use strict';
  let lastFile = null;
  let correcting = false;

  const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const digits = v => String(v ?? '').replace(/\D/g, '');

  function normalizeName(v) {
    let s = clean(v);
    s = s.replace(/^[^A-Za-zÀ-ÿ0-9]+/, '');
    s = s.replace(/^(?:RECEBEMOS\s+DE|RECEBIDO\s+DE|EMITENTE|FORNECEDOR|DESTINAT[ÁA]RIO|REMETENTE)\s*/i, '');
    s = s.replace(/^[0-9Il|]+(?=[A-ZÀ-Ý])/i, '');
    s = s.split(/\s+(?:DANFE|NF-E|NFE|NOTA\s+FISCAL|CONTROLE\s+DO\s+FISCO|CHAVE\s+DE\s+ACESSO)\b/i)[0];
    s = s.split(/\s+(?:OS\s+PRODUTOS|PRODUTOS|SERVI[ÇC]OS)\b/i)[0];
    s = s.replace(/\b(?:LTDA\.?|LTD\.?|EIRELI|MEI|ME|EPP|S\.?\s*A\.?)\s*$/i, '');
    return clean(s.replace(/[\s,.;:/\-]+$/, ''));
  }

  function extractName(text) {
    const t = String(text || '').replace(/\r/g, ' ');
    const patterns = [
      /RECEBEMOS\s+DE\s+(?:\d+\s*)?(.+?)(?=\s+(?:DANFE|NF-E|NFE|NOTA\s+FISCAL|OS\s+PRODUTOS|CNPJ|CONTROLE\s+DO\s+FISCO)\b|$)/i,
      /RECEBIDO\s+DE\s+(?:\d+\s*)?(.+?)(?=\s+(?:DANFE|NF-E|NFE|NOTA\s+FISCAL|OS\s+PRODUTOS|CNPJ)\b|$)/i,
      /(?:FORNECEDOR|EMITENTE)\s*[:\-]?\s*(.+?)(?=\s+(?:CNPJ|IE|INSCRI[ÇC][ÃA]O|ENDERE[CÇ]O|CEP|TELEFONE)\b|$)/i
    ];
    for (const re of patterns) {
      const m = t.match(re);
      if (m?.[1]) {
        const n = normalizeName(m[1]);
        if (isGoodName(n)) return n;
      }
    }

    const lines = t.split(/\n/).map(clean).filter(Boolean);
    const bad = /^(DATA|RECEBIMENTO|IDENTIFICA[CÇ][ÃA]O|ASSINATURA|DOCUMENTO|DANFE|NOTA|FISCAL|PRODUTOS|SERVI[CÇ]OS|DESCRI[CÇ][ÃA]O|QUANTIDADE|VALOR|TOTAL|PAGAMENTO|VENCIMENTO|EMISS[AÃ]O|NATUREZA|OPERA[CÇ][ÃA]O|DESTINAT[AÁ]RIO|REMETENTE|ENDERE[CÇ]O|CNPJ|CPF|CEP|FONE|TELEFONE|CHAVE|S[ÉE]RIE|N[ÚU]MERO|PEDIDO|C[ÓO]DIGO|INSCRI[CÇ][ÃA]O|ESTADUAL|RAZ[AÃ]O|SOCIAL)\b/i;
    return lines.map(normalizeName).find(n => isGoodName(n) && !bad.test(n)) || '';
  }

  function isGoodName(n) {
    if (!n || n.length < 3 || n.length > 100 || /^\d/.test(n) || !/[A-Za-zÀ-ÿ]/.test(n)) return false;
    if (/\b(?:DATA|RECEBIMENTO|IDENTIFICA[CÇ][ÃA]O|ASSINATURA|DANFE|NOTA|PRODUTOS|CONTROLE|FISCO|CNPJ|CEP|ENDERE[CÇ]O)\b/i.test(n)) return false;
    if (/^\d{1,2}[\s\/-]/.test(n)) return false;
    return true;
  }

  function extractAddress(text) {
    const t = String(text || '').replace(/\r/g, ' ');
    const patterns = [
      /(?:ENDERE[CÇ]O|ENDERECO)\s*[:\-]?\s*((?:RUA|R\.?|AVENIDA|AV\.?|RODOVIA|ROD\.?|ALAMEDA|AL\.?|TRAVESSA|TV\.?|ESTRADA|PRA[CÇ]A)\s+.+?)(?=\s+(?:BAIRRO|CEP|CNPJ|FONE|TELEFONE|TEL\.?|E-?MAIL|MUNIC[IÍ]PIO|CIDADE|UF)\b|$)/i,
      /((?:RUA|AVENIDA|AV\.?|RODOVIA|ROD\.?|ALAMEDA|AL\.?|TRAVESSA|TV\.?|ESTRADA|PRA[CÇ]A)\s+.+?)(?=\s+(?:BAIRRO|CEP|CNPJ|FONE|TELEFONE|TEL\.?|E-?MAIL|MUNIC[IÍ]PIO|CIDADE|UF)\b|$)/i
    ];
    for (const re of patterns) {
      const m = t.match(re);
      if (!m?.[1]) continue;
      let a = clean(m[1]);
      const number = a.match(/(?:,|\s)N?[º°]?\s*(\d{1,6})(?=\s|,|$)/i);
      if (number) {
        a = clean(a.replace(number[0], '').replace(/,\s*$/, '')) + ', ' + number[1];
      }
      if (/,\s*\d{1,6}\b/.test(a) && a.length >= 8) return a;
    }
    return '';
  }

  async function readText(file) {
    const ext = (file.name || '').split('.').pop().toLowerCase();
    if (ext === 'pdf' || file.type === 'application/pdf') {
      if (!window.pdfjsLib) throw new Error('Leitor PDF ainda não está disponível.');
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        text += tc.items.map(x => x.str || '').join(' ') + '\n';
      }
      return text;
    }
    if (!window.Tesseract) throw new Error('OCR ainda não está disponível.');
    const r = await Tesseract.recognize(file, 'por');
    return r.data.text || '';
  }

  function apply(name, address) {
    const modal = document.querySelector('#alrOfficialResultModal');
    if (!modal) return false;
    const nameEl = modal.querySelector('#alrLegal');
    const addressEl = modal.querySelector('#alrAddress');
    let changed = false;
    if (name && nameEl && nameEl.value !== name) { nameEl.value = name; nameEl.dispatchEvent(new Event('input', { bubbles:true })); changed = true; }
    if (address && addressEl && addressEl.value !== address) { addressEl.value = address; addressEl.dispatchEvent(new Event('input', { bubbles:true })); changed = true; }
    const label = modal.querySelector('label');
    if (label && /raz[aã]o\s+social/i.test(label.textContent)) label.textContent = 'Fornecedor';
    return changed;
  }

  document.addEventListener('change', e => {
    const el = e.target;
    if (el?.matches('#almoxReaderFile, #almoxReaderCamera')) lastFile = el.files?.[0] || lastFile;
  }, true);

  const observer = new MutationObserver(async () => {
    if (correcting || !lastFile || !document.querySelector('#alrOfficialResultModal')) return;
    correcting = true;
    try {
      const text = await readText(lastFile);
      const name = extractName(text);
      const address = extractAddress(text);
      apply(name, address);
    } catch (e) {
      console.warn('[ALMOX Reader correction]', e);
    } finally { correcting = false; }
  });
  observer.observe(document.documentElement, { childList:true, subtree:true });
})();
