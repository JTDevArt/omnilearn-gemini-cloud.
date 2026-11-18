/* Classify responses without showing proxy HTML or replaying a request. */
(() => {
  const cleanReason = value => {
    if (typeof value !== 'string') return '';
    const text = value.replace(/\s*\(ID:[^)]*\)/gi, '').trim();
    return text.length <= 220 && !/[<>]|api[_ -]?key|traceback|https?:|\bat \S+\(/i.test(text) ? text : '';
  };

  function failure({status = 0, data = {}, requestId = '', contentType = '', retryAfter = '', method = '', url = ''} = {}) {
    const code = typeof data.code === 'string' ? data.code.slice(0,80) : '';
    const sourceMismatch = /EVIDENCE|SOURCE_ANALYSIS|BLUEPRINT|SOURCE_MISMATCH|PARTIAL_SOURCE|INSUFFICIENT_SOURCE/.test(code);
    let kind = 'unexpected', title = 'Respons belum bisa dibaca', message = 'Coba lagi. Jika tetap terjadi, muat ulang halaman.';
    if (code === 'CROSS_SITE_REQUEST') {
      kind = 'origin'; title = 'Permintaan lintas situs ditolak';
      message = 'Buka OmniLearn langsung di tab browser dan kirim ulang dari sana.';
    } else if (code === 'GEMINI_AUTH_ERROR' || code === 'MISSING_SECRET' || data.failureKind === 'authentication') {
      kind = 'provider-auth'; title = 'Izin layanan AI bermasalah';
      message = 'Admin perlu memeriksa kunci dan izin model Gemini. Pertanyaan dan materi tetap tersimpan.';
    } else if (code === 'GEMINI_TIMEOUT' || data.failureKind === 'timeout') {
      kind = 'timeout'; title = 'Waktu tunggu layanan AI habis';
      message = 'Coba lagi dengan materi lebih pendek atau jumlah soal lebih sedikit.';
    } else if (code === 'INVALID_AI_OUTPUT' || code === 'OUTPUT_TRUNCATED') {
      kind = 'result'; title = 'Hasil AI belum lengkap';
      message = cleanReason(data.error) || 'Periksa materi atau turunkan jumlah soal atau kartu, lalu coba buat kembali.';
    } else if (sourceMismatch) {
      kind = 'source'; title = 'Materi perlu ditinjau';
      message = 'Hasil belum lolos pemeriksaan sumber. Periksa teks materi atau pilih jawaban umum.';
    } else if (status === 401) {
      kind = 'signin'; title = 'Masuk kembali'; message = 'Sesi masukmu tidak berlaku. Buka akun, lalu coba lagi.';
    } else if (status === 403) {
      kind = 'access'; title = 'Akses belum diizinkan'; message = 'Periksa sesi masuk dan izin aplikasi. Pertanyaanmu tetap disimpan.';
    } else if (status === 429) {
      kind = 'limit'; title = 'Batas permintaan tercapai'; message = 'Tunggu sebentar sebelum mencoba lagi. Permintaan tidak dikirim ulang otomatis.';
    } else if (status === 413) {
      kind = 'upload'; title = 'File terlalu besar'; message = cleanReason(data.error) || 'Pilih file yang lebih kecil sesuai batas unggahan.';
    } else if (status >= 500) {
      kind = 'unavailable'; title = 'Layanan sedang tidak tersedia'; message = 'Coba lagi nanti. Pertanyaan dan materi tetap tersimpan.';
    } else if (status >= 400) {
      kind = 'input'; title = 'Permintaan belum dapat diproses'; message = cleanReason(data.error) || 'Periksa isian dan materi, lalu coba lagi.';
    }
    const error = new Error(message);
    const seconds = /^\d+$/.test(retryAfter) ? Number(retryAfter) : NaN;
    const retryAt = Number.isFinite(data.retryAt) ? data.retryAt
      : Number.isFinite(seconds) ? Date.now() + seconds * 1000 : Date.parse(retryAfter);
    Object.assign(error, {
      kind, title, status, code: code || 'UNEXPECTED_RESPONSE', isHttpError: true,
      requestId: String(typeof data.requestId === 'string' ? data.requestId : requestId).slice(0, 100), contentType,
      method, url: String(url).split(/[?#]/)[0].slice(0,500),
      reason: !sourceMismatch && (status === 400 || status === 422) ? cleanReason(data.error) : '',
      retryAt: Number.isFinite(retryAt) && retryAt > Date.now() ? retryAt : null,
      retryable: data.retryable ?? (status === 429 || status >= 500),
      stage: data.stage, failureKind: data.failureKind,
      isCancelled: code === 'REQUEST_CANCELLED',
    });
    return error;
  }

  async function read(response, requestId = '', request = {}) {
    const contentType = response.headers.get('content-type') || '';
    const metadata = {
      status: response.status, contentType,
      requestId: response.headers.get('X-Request-Id') || requestId,
      retryAfter: response.headers.get('Retry-After') || '',
      method: request.method || '', url: request.url || '',
    };
    const json = /\bapplication\/(?:[\w.-]+\+)?json\b/i.test(contentType);
    if (!json) {
      await response.text().catch(() => '');
      throw failure(metadata);
    }
    let data;
    try { data = await response.json(); }
    catch { throw failure(metadata); }
    if (response.status < 200 || response.status >= 300)
      throw failure({...metadata, data: data && typeof data === 'object' ? data : {}});
    if (!data || typeof data !== 'object') throw failure(metadata);
    return data;
  }

  function transport(error, requestId = '') {
    const cancelled = error?.isCancelled === true;
    const timeout = error?.name === 'AbortError' || error?.isTimeout === true;
    const result = new Error(cancelled ? 'Permintaan dibatalkan. Pertanyaanmu tetap tersedia.'
      : timeout ? 'Waktu tunggu habis. Coba lagi saat koneksi dan layanan siap.'
      : 'Koneksi terputus. Periksa jaringan, lalu coba lagi.');
    Object.assign(result, {
      kind: cancelled ? 'cancelled' : timeout ? 'timeout' : 'network',
      title: cancelled ? 'Jawaban dibatalkan' : timeout ? 'Belum ada jawaban' : 'Koneksi belum tersedia',
      requestId, isCancelled: cancelled, isTimeout: timeout && !cancelled,
    });
    return result;
  }

  function render(host, error, {onScope} = {}) {
    host.replaceChildren();
    host.classList.add('ai-error');
    host.setAttribute('role', 'alert');
    const heading = document.createElement('h3');
    heading.textContent = error.title || 'Jawaban belum tersedia';
    const message = document.createElement('p'); message.textContent = error.message;
    host.append(heading, message);
    if (error.reason && error.reason !== error.message) {
      const reason = document.createElement('p'); reason.textContent = error.reason; host.append(reason);
    }
    if (error.kind === 'source' && onScope) {
      const actions = document.createElement('div'); actions.className = 'panel-actions';
      for (const [scope, label] of [['general', 'Jawab umum'], ['document', 'Pakai materi ini']]) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
        button.onclick = () => onScope(scope); actions.append(button);
      }
      host.append(actions);
    }
    if (error.kind === 'signin' || error.kind === 'access') {
      const button = document.createElement('button'); button.type = 'button';
      button.dataset.open = 'account'; button.textContent = 'Periksa akun dan akses'; host.append(button);
    }
    if (error.retryAt) {
      const retry = document.createElement('p');
      retry.textContent = 'Coba lagi setelah ' + new Date(error.retryAt).toLocaleTimeString('id-ID') + '.';
      host.append(retry);
    }
    if (error.requestId || error.status) {
      const detail = document.createElement('details'), summary = document.createElement('summary');
      summary.textContent = 'Detail diagnostik';
      const info = document.createElement('p');
      info.textContent = [error.url ? (error.method + ' ' + error.url).trim() : '', error.status ? 'HTTP ' + error.status : '', error.contentType,
        error.requestId ? 'ID: ' + error.requestId : ''].filter(Boolean).join(' · ');
      detail.append(summary, info); host.append(detail);
    }
  }
  window.OmniAIResponse = Object.freeze({read, failure, transport, render});
})();
