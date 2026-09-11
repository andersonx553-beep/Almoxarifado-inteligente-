/* ALMOX LAB — Leitor inteligente de fornecedor (UI oficial + extração robusta)
 * Mantém o cadastro legado como camada de persistência, mas não expõe o modal legado.
 * Alteração: identificação do FORNECEDOR por contexto semântico e endereço completo.
 */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const digits = v => String(v ?? '').replace(/\D/g, '');

  const formatCnpj = v => {
    const d = digits(v);
    return d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : clean(v);
  };
  const formatCep = v => {
    const d = digits(v);
    return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, '$1-$2') : clean(v);
  };
  const formatPhone = v => {
    const d = digits(v);
    if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    return clean(v);
  };
  const validCnpj = v => {
    const c = digits(v);
    if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
    let sum = 0, pos = 5;
    for (let i = 0; i < 12; i++) { sum += +c[i] * pos; pos--; if (pos < 2) pos = 9; }
    let d = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (d !== +c[12]) return false;
    sum = 0; pos = 6;
    for (let i = 0; i < 13; i++) { sum += +c[i] * pos; pos--; if (pos < 2) pos = 9; }
    d = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return d === +c[13];
  };

  function status(text, progress = 0) {
    const el = $('#almoxReaderStatus');
    if (!el) return;
    const p = Math.max(0, Math.min(100, Number(progress) || 0));
    el.innerHTML = `<strong>${clean(text)}</strong><div class="alr-progress"><span style="width:${p}%"></span></div>`;
  }

  function ensureLegacyField(id, type = 'text') {
    let el = document.getElementById(id);
    if (el) return el;
    el = document.createElement('input');
    el.type = type;
    el.id = id;
    el.name = id;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }

  function setField(id, value) {
    const el = document.getElementById(id);
    if (!el) return false;
    el.value = value ?? '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function hideLegacyModal() {
    const modal = $('#modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.style.display = 'none';
  }

  function showLegacyModalHidden() {
    if (typeof openSupplier !== 'function') throw new Error('Cadastro de fornecedor não encontrado.');
    openSupplier('');
    const modal = $('#modal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
  }

  const GENERIC_NAME_WORDS = /^(DATA|RECEBIMENTO|IDENTIFICA[CÇ][ÃA]O|ASSINATURA|DOCUMENTO|DANFE|NOTA|FISCAL|PRODUTOS|SERVI[CÇ]OS|DESCRI[CÇ][ÃA]O|QUANTIDADE|VALOR|TOTAL|PAGAMENTO|VENCIMENTO|EMISS[AÃ]O|NATUREZA|OPERA[CÇ][ÃA]O|DESTINAT[AÁ]RIO|REMETENTE|EMITENTE|ENDERE[CÇ]O|CNPJ|CPF|CEP|FONE|TELEFONE|CHAVE|S[ÉE]RIE|N[ÚU]MERO|PEDIDO|C[ÓO]DIGO|INSCRI[CÇ][ÃA]O|ESTADUAL|RAZ[AÃ]O|SOCIAL)\b/i;
  const LEGAL_SUFFIX = /\b(?:LTDA\.?|LTD\.?|EIRELI|MEI|ME|EPP|S\.?\s*A\.?)\s*$/i;

  function normalizeSupplierName(value) {
    let s = clean(value);
    s = s.replace(/^[^A-Za-zÀ-ÿ0-9]+/, '');
    s = s.replace(/^(?:RECEBEMOS\s+DE|RECEBIDO\s+DE|EMITENTE|FORNECEDOR|DESTINAT[ÁA]RIO|REMETENTE)\s*/i, '');
    s = s.replace(/^[0-9Il|]+(?=[A-ZÀ-Ý])/i, '');
    s = s.replace(/\s+(?:OS\s+PRODUTOS(?:\/SERVI[ÇC]OS)?|OS\s+PRODUTOS|PRODUTOS(?:\/SERVI[ÇC]OS)?)\b.*$/i, '');
    s = s.replace(/\b(?:CNPJ|IE|INSCRI[ÇC][ÃA]O\s+ESTADUAL)\b.*$/i, '');
    s = s.replace(LEGAL_SUFFIX, '');
    s = s.replace(/[\s,.;:/\-]+$/, '').trim();
    return s;
  }

  function nameScore(value, source = '', index = 999) {
    const raw = clean(value);
    const n = normalizeSupplierName(raw);
    if (!n || n.length < 3 || n.length > 100) return -999;
    if (!/[A-Za-zÀ-ÿ]/.test(n) || /^\d/.test(n)) return -999;
    if (GENERIC_NAME_WORDS.test(n)) return -999;
    if (/^\d{1,2}[\s\/-]/.test(n) || /\d{2}\/\d{2}\/\d{2,4}/.test(n)) return -999;
    if (/^(?:R\.?|RUA|AV\.?|AVENIDA|ROD\.?|RODOVIA|AL\.?|ALAMEDA|TV\.?|TRAVESSA|ESTRADA|PRA[CÇ]A)\b/i.test(n)) return -999;
    if (/^(?:OS\s+PRODUTOS|PRODUTOS|SERVI[CÇ]OS)\b/i.test(n)) return -999;

    let score = 0;
    const u = n.toUpperCase();
    const src = String(source || '').toUpperCase();
    if (/RECEBEMOS\s+DE|RECEBIDO\s+DE/.test(src)) score += 70;
    if (/EMITENTE\s*[:\-]?/.test(src)) score += 60;
    if (/FORNECEDOR\s*[:\-]?/.test(src)) score += 80;
    if (LEGAL_SUFFIX.test(raw)) score += 45;
    if (/SUPERMERCADO|COMERCIAL|DISTRIBUIDORA|DISTRIBUIDOR|ATACADO|VAREJO|MERCADINHO|MERCADO|IND[ÚU]STRIA|INDUSTRIAL|CONSTRU[CÇ][AÃ]O|MATERIAL|SERVI[CÇ]OS/.test(u)) score += 20;
    if (/[A-ZÀ-Ý]/.test(raw)) score += 5;
    if (index < 8) score += 3;
    if (raw.length > 70) score -= 20;
    if (/\b(DATA|RECEBIMENTO|IDENTIFICA[CÇ][ÃA]O|ASSINATURA|P[ÁA]GINA|FRETE|VALOR|TOTAL|QUANTIDADE)\b/i.test(raw)) score -= 100;
    return score;
  }

  function extractName(text, lines, cnpj) {
    const candidates = [];
    const full = String(text || '');

    const contextPatterns = [
      /RECEBEMOS\s+DE\s+(?:\d+\s*)?(.+?)(?=\s+OS\s+PRODUTOS(?:\/SERVI[ÇC]OS)?\b|\s+CNPJ\b|\s+N[ÚU]MERO\b|$)/i,
      /RECEBIDO\s+DE\s+(?:\d+\s*)?(.+?)(?=\s+OS\s+PRODUTOS(?:\/SERVI[ÇC]OS)?\b|\s+CNPJ\b|$)/i,
      /(?:EMITENTE|FORNECEDOR)\s*[:\-]?\s*(.+?)(?=\s+CNPJ\b|\s+ENDERE[CÇ]O\b|\s+CEP\b|$)/i
    ];
    for (const re of contextPatterns) {
      const m = full.match(re);
      if (m?.[1]) candidates.push({ value: m[1], source: m[0], index: 0 });
    }

    if (cnpj) {
      const c = digits(cnpj);
      const idx = lines.findIndex(l => digits(l).includes(c));
      if (idx >= 0) {
        for (let i = Math.max(0, idx - 10); i < idx; i++) {
          candidates.push({ value: lines[i], source: lines[i], index: i });
        }
      }
    }

    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      candidates.push({ value: lines[i], source: lines[i], index: i });
    }

    const scored = candidates
      .map(c => ({ ...c, normalized: normalizeSupplierName(c.value), score: nameScore(c.value, c.source, c.index) }))
      .filter(c => c.score > -999 && c.normalized)
      .sort((a, b) => b.score - a.score || a.normalized.length - b.normalized.length);

    return scored[0]?.normalized || '';
  }

  function extractAddress(text) {
    const full = String(text || '').replace(/\u00a0/g, ' ');
    const patterns = [
      /(?:ENDERE[CÇ]O|ENDERECO)\s*[:\-]?\s*((?:RUA|R\.?|AVENIDA|AV\.?|RODOVIA|ROD\.?|ALAMEDA|AL\.?|TRAVESSA|TV\.?|ESTRADA|PRA[CÇ]A)\s+[^\n]{2,160})/i,
      /((?:RUA|R\.?|AVENIDA|AV\.?|RODOVIA|ROD\.?|ALAMEDA|AL\.?|TRAVESSA|TV\.?|ESTRADA|PRA[CÇ]A)\s+[^\n]{2,160})/i
    ];

    for (const re of patterns) {
      const m = full.match(re);
      if (!m?.[1]) continue;
      let a = clean(m[1]);
      a = a.split(/\s+(?:BAIRRO|CEP|CNPJ|FONE|TELEFONE|TEL\.?|E-?MAIL|MUNIC[IÍ]PIO|CIDADE|UF)\s*[:\-]?/i)[0];
      const n = a.match(/(?:,|\s)N?[º°]?\s*(\d{1,6})(?=\s|,|$)/i);
      if (n) {
        a = a.replace(n[0], '').replace(/,\s*$/, '').trim();
        a = `${a}, ${n[1]}`;
      }
      if (/,\s*\d{1,6}\b/.test(a)) return clean(a);
    }

    return '';
  }

  function extract(raw) {
    const text = String(raw || '').replace(/\u00a0/g, ' ');
    const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
    const out = { razaoSocial: '', cnpj: '', cep: '', endereco: '', telefone: '', email: '' };

    for (const m of text.matchAll(/\b\d{2}[.\s]?\d{3}[.\s]?\d{3}\/?\d{4}[-\s]?\d{2}\b/g)) {
      if (validCnpj(m[0])) { out.cnpj = formatCnpj(m[0]); break; }
    }
    const cep = text.match(/\b\d{5}[-.\s]?\d{3}\b/);
    if (cep) out.cep = formatCep(cep[0]);
    const phones = [...text.matchAll(/(?:\(?\d{2}\)?\s*)?9?\d{4}[-.\s]?\d{4}/g)]
      .map(x => x[0]).find(x => [10, 11].includes(digits(x).length));
    if (phones) out.telefone = formatPhone(phones);
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (email) out.email = clean(email[0]);

    out.razaoSocial = extractName(text, lines, out.cnpj);
    out.endereco = extractAddress(text);
    return out;
  }

  function renderResult(data) {
    const box = $('#almoxReaderResult');
    if (!box) return;
    const labels = { razaoSocial: 'Fornecedor', cnpj: 'CNPJ', cep: 'CEP', endereco: 'Endereço completo + número', telefone: 'Telefone', email: 'E-mail' };
    box.innerHTML = Object.entries(data).filter(([, v]) => v).map(([k, v]) =>
      `<div class="alr-row"><span>${labels[k]}</span><strong>${clean(v)}</strong></div>`
    ).join('') || '<div class="alr-empty">Nenhum dado cadastral confiável foi identificado.</div>';
  }

  function escapeAttr(v) {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function ensureReaderUiStyles() {
    if ($('#alrOfficialStyles')) return;
    const style = document.createElement('style');
    style.id = 'alrOfficialStyles';
    style.textContent = `
      #almoxReaderOverlay{z-index:99999!important}
      .alr-official-card{background:#fff;border-radius:20px;width:min(720px,100%);max-height:92vh;overflow:auto;box-shadow:0 24px 70px rgba(15,23,42,.28);padding:22px}
      .alr-official-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.alr-official-head h2{margin:0;font-size:23px}.alr-official-head p{margin:5px 0 0;color:#64748b}
      .alr-official-source{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.alr-source-chip{background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:800}
      .alr-official-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.alr-official-field{display:flex;flex-direction:column;gap:6px}.alr-official-field.full{grid-column:1/-1}.alr-official-field label{font-size:12px;font-weight:800;color:#64748b}.alr-official-field input{width:100%;padding:12px;border:1px solid #d5dbe3;border-radius:11px;background:#fff;outline:none}.alr-official-field input:focus{border-color:#2457d6;box-shadow:0 0 0 3px rgba(36,87,214,.10)}
      .alr-official-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap;margin-top:18px}.alr-btn-secondary{background:#eef2f7!important;color:#18212b!important}.alr-btn-success{background:#0f766e!important}.alr-reading{display:flex;gap:10px;align-items:center;padding:12px;border-radius:12px;background:#f8fafc;margin:12px 0;color:#475569}.alr-spin{width:18px;height:18px;border:3px solid #dbe4f0;border-top-color:#2457d6;border-radius:50%;animation:alrspin .8s linear infinite}@keyframes alrspin{to{transform:rotate(360deg)}}
      .alr-confidence{font-size:12px;color:#64748b;margin-top:8px}.alr-errorbox{padding:11px;border-radius:11px;background:#fef2f2;color:#991b1b;margin-top:12px}
      @media(max-width:650px){.alr-official-card{padding:17px;border-radius:16px}.alr-official-grid{grid-template-columns:1fr}.alr-official-field.full{grid-column:auto}.alr-official-actions button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function openOfficialResult(data, sourceName) {
    ensureReaderUiStyles();
    $('#alrOfficialResultModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'alrOfficialResultModal';
    modal.className = 'alr-overlay open';
    modal.style.zIndex = '100000';
    modal.innerHTML = `
      <div class="alr-official-card" role="dialog" aria-modal="true" aria-labelledby="alrOfficialTitle">
        <div class="alr-official-head">
          <div><h2 id="alrOfficialTitle">Cadastro do fornecedor</h2><p>Dados identificados pelo documento. Revise antes de salvar.</p></div>
          <button type="button" class="alr-btn-secondary" id="alrOfficialClose">✕</button>
        </div>
        <div class="alr-official-source"><span class="alr-source-chip">📄 ${clean(sourceName || 'Documento')}</span><span class="alr-source-chip">Leitura concluída</span></div>
        <div class="alr-official-grid">
          <div class="alr-official-field full"><label>Fornecedor</label><input id="alrLegal" value="${escapeAttr(data.razaoSocial)}" autocomplete="organization"></div>
          <div class="alr-official-field"><label>CNPJ</label><input id="alrCnpj" value="${escapeAttr(data.cnpj)}" inputmode="numeric"></div>
          <div class="alr-official-field"><label>CEP</label><input id="alrCep" value="${escapeAttr(data.cep)}" inputmode="numeric"></div>
          <div class="alr-official-field full"><label>Endereço completo + número</label><input id="alrAddress" value="${escapeAttr(data.endereco)}" autocomplete="street-address"></div>
          <div class="alr-official-field"><label>Telefone</label><input id="alrPhone" value="${escapeAttr(data.telefone)}" inputmode="tel"></div>
          <div class="alr-official-field"><label>E-mail</label><input id="alrEmail" value="${escapeAttr(data.email)}" inputmode="email" autocomplete="email"></div>
        </div>
        <div class="alr-confidence">O leitor não inventa campos ausentes. Se o documento não trouxer uma informação, ela permanece vazia.</div>
        <div id="alrOfficialError"></div>
        <div class="alr-official-actions"><button type="button" class="alr-btn-secondary" id="alrOfficialCancel">Cancelar</button><button type="button" class="alr-btn-success" id="alrOfficialSave">✓ Salvar fornecedor</button></div>
      </div>`;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    $('#alrOfficialClose', modal).onclick = close;
    $('#alrOfficialCancel', modal).onclick = close;
    $('#alrCnpj', modal).onblur = e => { e.target.value = formatCnpj(e.target.value); };
    $('#alrCep', modal).onblur = e => { e.target.value = formatCep(e.target.value); };
    $('#alrPhone', modal).onblur = e => { e.target.value = formatPhone(e.target.value); };
    $('#alrOfficialSave', modal).onclick = async () => {
      const legal = clean($('#alrLegal', modal).value);
      const cnpj = formatCnpj($('#alrCnpj', modal).value);
      const cep = formatCep($('#alrCep', modal).value);
      const address = clean($('#alrAddress', modal).value);
      const phone = formatPhone($('#alrPhone', modal).value);
      const email = clean($('#alrEmail', modal).value);
      const error = $('#alrOfficialError', modal);
      error.innerHTML = '';
      if (!legal) return error.innerHTML = '<div class="alr-errorbox">Informe o fornecedor identificado no documento.</div>';
      if (!validCnpj(cnpj)) return error.innerHTML = '<div class="alr-errorbox">CNPJ inválido ou não identificado com segurança.</div>';
      if (typeof db !== 'undefined' && Array.isArray(db.suppliers) && db.suppliers.some(s => digits(s.cnpj) === digits(cnpj))) {
        return error.innerHTML = '<div class="alr-errorbox">Este CNPJ já está cadastrado. Nenhum duplicado foi criado.</div>';
      }
      try {
        showLegacyModalHidden();
        ensureLegacyField('sCityState');
        setField('sLegalName', legal);
        setField('sTradeName', legal);
        setField('sCnpj', cnpj);
        setField('sCep', cep);
        setField('sAddress', address);
        setField('sPhone', phone);
        setField('sEmail', email);
        setField('sWhatsapp', '');
        setField('sContact', '');
        setField('sCity', '');
        setField('sUf', '');
        setField('sNeighborhood', '');
        setField('sNumber', '');
        setField('sCityState', '');
        setField('sNotes', `Importado por leitura inteligente de documento${sourceName ? `: ${sourceName}` : ''}`);
        setField('sPurpose', 'Outros');
        const img = document.getElementById('sImage');
        if (img?.files) img.value = '';
        if (typeof saveSupplier !== 'function') throw new Error('Função de cadastro de fornecedor indisponível.');
        hideLegacyModal();
        await saveSupplier('');
        close();
        status('Fornecedor salvo com sucesso.', 100);
      } catch (e) {
        console.error('[ALMOX Reader] save', e);
        hideLegacyModal();
        error.innerHTML = `<div class="alr-errorbox">Não foi possível salvar: ${clean(e.message || 'erro desconhecido')}.</div>`;
      }
    };
  }

  async function load(src, test) {
    if (test()) return;
    await new Promise((resolve, reject) => {
      const exists = [...document.scripts].find(s => s.src === src);
      if (exists) {
        if (test()) return resolve();
        exists.addEventListener('load', resolve, { once: true });
        exists.addEventListener('error', () => reject(new Error('Biblioteca de leitura indisponível.')), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = src; s.async = true; s.onload = resolve; s.onerror = () => reject(new Error('Biblioteca de leitura indisponível.'));
      document.head.appendChild(s);
    });
  }
  async function ocr(source) {
    await load('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', () => !!window.Tesseract);
    const r = await Tesseract.recognize(source, 'por', { logger: m => { if (typeof m.progress === 'number') status('Reconhecendo texto...', Math.round(m.progress * 100)); } });
    return r.data.text || '';
  }
  async function readPdf(file) {
    await load('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', () => !!window.pdfjsLib);
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      status(`Lendo PDF — página ${i}/${pdf.numPages}...`, Math.round(i / pdf.numPages * 35));
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      text += tc.items.map(x => x.str || '').join(' ') + '\n';
    }
    if (text.replace(/\s/g, '').length >= 80) return text;
    let out = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d', { willReadFrequently: true }), viewport }).promise;
      out += await ocr(canvas) + '\n';
    }
    return out;
  }

  async function processFile(file) {
    if (!file) return;
    try {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext) && !file.type.startsWith('image/')) throw new Error('Formato não suportado. Use PDF, JPG, JPEG ou PNG.');
      status('Preparando documento...', 5);
      const raw = ext === 'pdf' || file.type === 'application/pdf' ? await readPdf(file) : await ocr(file);
      status('Identificando fornecedor...', 90);
      const data = extract(raw);
      window.__alrData = data;
      renderResult(data);
      if (!data.cnpj && !data.razaoSocial) throw new Error('Não foi possível identificar o fornecedor com segurança.');
      openOfficialResult(data, file.name);
      status('Dados identificados. Revise e salve o cadastro.', 100);
    } catch (e) {
      console.error('[ALMOX Reader]', e);
      status('Leitura não concluída.', 0);
      const box = $('#almoxReaderResult');
      if (box) box.innerHTML = `<div class="alr-error">${clean(e.message || 'Erro ao processar documento.')}</div>`;
    }
  }

  function bind() {
    const file = $('#almoxReaderFile');
    const cam = $('#almoxReaderCamera');
    if (!file) return;
    if (file.dataset.alrOfficial === '1' && (!cam || cam.dataset.alrOfficial === '1')) return;
    file.dataset.alrOfficial = '1';
    file.onchange = e => { e.stopImmediatePropagation(); const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; };
    if (cam) {
      cam.dataset.alrOfficial = '1';
      cam.onchange = e => { e.stopImmediatePropagation(); const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; };
    }
  }

  const timer = setInterval(bind, 100);
  setTimeout(() => clearInterval(timer), 30000);
  ensureReaderUiStyles();
})();
