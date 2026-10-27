/* ============================================================
   Pembuat Undangan Pernikahan — logika formulir & unduhan
   Bergantung pada window.WEDDING_TEMPLATE dari template.js
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Definisi bidang & nilai contoh ---------- */

  var FIELD_DEFS = [
    { id: 'pria-panggilan',   label: 'Nama panggilan pria',   required: true },
    { id: 'pria-lengkap',     label: 'Nama lengkap pria',     required: true },
    { id: 'pria-ayah',        label: 'Nama ayah pria',        required: true },
    { id: 'pria-ibu',         label: 'Nama ibu pria',         required: true },
    { id: 'wanita-panggilan', label: 'Nama panggilan wanita', required: true },
    { id: 'wanita-lengkap',   label: 'Nama lengkap wanita',   required: true },
    { id: 'wanita-ayah',      label: 'Nama ayah wanita',      required: true },
    { id: 'wanita-ibu',       label: 'Nama ibu wanita',       required: true },
    { id: 'tanggal',          label: 'Tanggal pernikahan',    required: true },
    { id: 'akad-mulai',       label: 'Jam mulai akad',        required: true },
    { id: 'akad-selesai',     label: 'Jam selesai akad',      required: true },
    { id: 'resepsi-mulai',    label: 'Jam mulai resepsi',     required: true },
    { id: 'resepsi-selesai',  label: 'Jam selesai resepsi',   required: true },
    { id: 'lokasi',           label: 'Nama lokasi',           required: true },
    { id: 'maps',             label: 'Tautan Google Maps',    required: true },
    { id: 'bank',             label: 'Nama bank',             required: false },
    { id: 'rekening',         label: 'Nomor rekening',        required: true },
    { id: 'atasnama',         label: 'Atas nama rekening',    required: true },
    { id: 'hashtag',          label: 'Hashtag',               required: false },
    { id: 'pembuka',          label: 'Kalimat pembuka',       required: false },
    { id: 'kutipan',          label: 'Kutipan',               required: false },
    { id: 'kutipan-sumber',   label: 'Sumber kutipan',        required: false }
  ];

  var DEFAULTS = {
    'pria-panggilan': '',
    'pria-lengkap': '',
    'pria-ayah': '',
    'pria-ibu': '',
    'wanita-panggilan': '',
    'wanita-lengkap': '',
    'wanita-ayah': '',
    'wanita-ibu': '',
    'tanggal': '',
    'akad-mulai': '',
    'akad-selesai': '',
    'resepsi-mulai': '',
    'resepsi-selesai': '',
    'lokasi': '',
    'maps': '',
    'bank': '',
    'rekening': '',
    'atasnama': '',
    'hashtag': '',
    'pembuka': 'Bismillahirrahmanirrahim',
    'kutipan': 'Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.',
    'kutipan-sumber': 'QS. Ar-Rum: 21'
  };

  var DRAFT_KEY = 'undangan-draft';
  var AUDIO_RE = /<audio\b[^>]*>[\s\S]*?<\/audio>/i;
  var AUDIO_FALLBACK_SRC = '__AUDIO_SRC__';

  /* ---------- Elemen ---------- */

  var preview = $('preview');
  var statusEl = $('status');
  var btnPreview = $('btn-preview');
  var btnUnduh = $('btn-unduh');
  var btnContoh = $('btn-contoh');
  var musik = $('musik');
  var form = $('builder-form');
  var fotoInput = $('foto');
  var fotoThumb = $('foto-thumb');
  var fotoPratinjau = $('foto-pratinjau');
  var fotoHapus = $('foto-hapus');
  var fotoData = '';

  /* ---------- Util kecil ---------- */

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('is-error', isError === true);
  }

  function initial(nama) {
    var s = (nama || '').trim();
    return s ? s.charAt(0).toUpperCase() : '';
  }

  /* "2028-02-06" -> "Minggu, 6 Februari 2028" */
  function formatTanggal(value) {
    var d = new Date(value + 'T00:00:00');
    if (isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(d);
  }

  /* "08:00" -> "08.00" */
  function formatJam(value) {
    return (value || '').replace(':', '.');
  }

  /* ["08:00","10:00"] -> "08.00–10.00 WIB" (en dash U+2013) */
  function formatRentang(mulai, selesai) {
    return formatJam(mulai) + '\u2013' + formatJam(selesai) + ' WIB';
  }

  function buatSlug(pria, wanita) {
    var a = (pria || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    var b = (wanita || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    var slug = [a, b].filter(Boolean).join('-');
    return slug || 'undangan';
  }

  /* Foto dikecilkan ke maks 1200 px lalu disimpan sebagai JPEG di dalam HTML. */
  function siapkanFoto(file, selesai) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var skala = Math.min(1, 1200 / Math.max(img.width, img.height));
      var kanvas = document.createElement('canvas');
      kanvas.width = Math.round(img.width * skala);
      kanvas.height = Math.round(img.height * skala);
      kanvas.getContext('2d').drawImage(img, 0, 0, kanvas.width, kanvas.height);
      URL.revokeObjectURL(url);
      selesai(kanvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      selesai('');
    };
    img.src = url;
  }

  /* ---------- Penyimpanan draf ---------- */

  var simpanDraf = debounce(function () {
    try {
      var data = {};
      FIELD_DEFS.forEach(function (f) {
        data[f.id] = $(f.id).value;
      });
      data.musik = musik.checked;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch (e) {
      /* localStorage bisa gagal (mode privat/penuh) — draf saja yang dilewati */
    }
  }, 500);

  function muatDraf() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function isiFormulir(data) {
    FIELD_DEFS.forEach(function (f) {
      $(f.id).value = Object.prototype.hasOwnProperty.call(data, f.id) ? data[f.id] : DEFAULTS[f.id];
    });
    musik.checked = Object.prototype.hasOwnProperty.call(data, 'musik') ? !!data.musik : true;
  }

  /* ---------- Tautan error per bidang ---------- */

  FIELD_DEFS.forEach(function (f) {
    var input = $(f.id);
    var err = document.createElement('p');
    err.className = 'field__error';
    err.id = 'err-' + f.id;
    err.hidden = true;
    input.parentNode.appendChild(err);
    input.setAttribute('aria-describedby', err.id);
    input.addEventListener('input', simpanDraf);
    input.addEventListener('change', simpanDraf);
  });
  musik.addEventListener('change', simpanDraf);

  function tampilkanError(errors) {
    FIELD_DEFS.forEach(function (f) {
      var input = $(f.id);
      var err = $('err-' + f.id);
      err.textContent = '';
      err.hidden = true;
      input.removeAttribute('aria-invalid');
    });
    errors.forEach(function (e) {
      var input = $(e.id);
      var err = $('err-' + e.id);
      err.textContent = e.msg;
      err.hidden = false;
      input.setAttribute('aria-invalid', 'true');
    });
  }

  /* ---------- Validasi ---------- */

  function validasi() {
    var errors = [];
    FIELD_DEFS.forEach(function (f) {
      if (!f.required) return;
      if (!$(f.id).value.trim()) {
        errors.push({ id: f.id, msg: 'Mohon isi ' + f.label.toLowerCase() + '.' });
      }
    });

    var maps = $('maps').value.trim();
    if (maps && !/^https?:\/\/\S+$/i.test(maps)) {
      errors.push({ id: 'maps', msg: 'Tautan harus diawali http:// atau https://.' });
    }

    [['akad', 'akad'], ['resepsi', 'resepsi']].forEach(function (pair) {
      var mulai = $(pair[0] + '-mulai').value;
      var selesai = $(pair[1] + '-selesai').value;
      if (mulai && selesai && selesai <= mulai) {
        errors.push({ id: pair[1] + '-selesai', msg: 'Jam selesai harus setelah jam mulai.' });
      }
    });

    return errors;
  }

  /* ---------- Penyusunan dokumen undangan ---------- */

  function setText(doc, sel, val) {
    var el = doc.querySelector(sel);
    if (el) el.textContent = val;
  }

  function bangunDokumen(v) {
    if (!window.WEDDING_TEMPLATE || !window.WEDDING_TEMPLATE.html) {
      return { error: 'template.js belum termuat — coba muat ulang halaman.' };
    }

    var doc = new DOMParser().parseFromString(window.WEDDING_TEMPLATE.html, 'text/html');

    var priaPanggil = v['pria-panggilan'].trim();
    var wanitaPanggil = v['wanita-panggilan'].trim();
    var priaLengkap = v['pria-lengkap'].trim();
    var wanitaLengkap = v['wanita-lengkap'].trim();
    var tanggalPanjang = formatTanggal(v.tanggal);
    var hashtag = v.hashtag.trim() ||
      '#' + priaPanggil.replace(/\s+/g, '') + wanitaPanggil.replace(/\s+/g, '');

    setText(doc, '#cover-pria', priaPanggil);
    setText(doc, '#cover-wanita', wanitaPanggil);
    setText(doc, '#cover-date', tanggalPanjang);
    setText(doc, '#brand-pria', initial(priaPanggil));
    setText(doc, '#brand-wanita', initial(wanitaPanggil));
    setText(doc, '#monogram-pria', initial(priaPanggil));
    setText(doc, '#monogram-wanita', initial(wanitaPanggil));
    setText(doc, '#hero-title', priaLengkap + ' & ' + wanitaLengkap);
    setText(doc, '#hero-date', tanggalPanjang);
    setText(doc, '#pembuka', v.pembuka.trim());
    setText(doc, '#quote-teks', '\u201C' + v.kutipan.trim() + '\u201D');
    setText(doc, '#quote-sumber', v['kutipan-sumber'].trim());
    setText(doc, '#pria-badge', initial(priaPanggil));
    setText(doc, '#wanita-badge', initial(wanitaPanggil));
    setText(doc, '#pria-nama', priaLengkap);
    setText(doc, '#wanita-nama', wanitaLengkap);
    setText(doc, '#pria-orangtua',
      'Putra dari Bapak ' + v['pria-ayah'].trim() + ' & Ibu ' + v['pria-ibu'].trim());
    setText(doc, '#wanita-orangtua',
      'Putri dari Bapak ' + v['wanita-ayah'].trim() + ' & Ibu ' + v['wanita-ibu'].trim());
    setText(doc, '#akad-tanggal', tanggalPanjang);
    setText(doc, '#resepsi-tanggal', tanggalPanjang);
    setText(doc, '#akad-jam', formatRentang(v['akad-mulai'], v['akad-selesai']));
    setText(doc, '#resepsi-jam', formatRentang(v['resepsi-mulai'], v['resepsi-selesai']));
    setText(doc, '#akad-lokasi', v.lokasi.trim());
    setText(doc, '#resepsi-lokasi', v.lokasi.trim());
    setText(doc, '#bank-nama', v.bank.trim() ? 'Bank ' + v.bank.trim() : '');
    setText(doc, '#bank-number', v.rekening.trim());
    setText(doc, '#bank-atasnama', 'a.n. ' + v.atasnama.trim());
    setText(doc, '#closing-names', priaPanggil + ' & ' + wanitaPanggil);
    setText(doc, '#closing-hashtag', hashtag);
    setText(doc, '#footer-hashtag', hashtag);

    var mapsAkad = doc.querySelector('#akad-maps');
    if (mapsAkad) mapsAkad.setAttribute('href', v.maps.trim());
    var mapsResepsi = doc.querySelector('#resepsi-maps');
    if (mapsResepsi) mapsResepsi.setAttribute('href', v.maps.trim());

    doc.body.setAttribute('data-tanggal', v.tanggal + 'T' + v['akad-mulai'] + ':00+07:00');
    doc.title = 'Undangan Pernikahan \u2014 ' + priaPanggil + ' & ' + wanitaPanggil;

    var meta = doc.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content',
        'Undangan pernikahan ' + priaLengkap + ' & ' + wanitaLengkap +
        ' \u2014 ' + tanggalPanjang + ', ' + v.lokasi.trim() + '.');
    }

    if (fotoData) {
      var bingkai = doc.querySelector('.hero__photo');
      if (bingkai) {
        var monogram = bingkai.querySelector('.hero__monogram');
        if (monogram) monogram.parentNode.removeChild(monogram);
        var foto = doc.createElement('img');
        foto.className = 'hero__photo-img';
        foto.src = fotoData;
        foto.alt = 'Foto ' + priaLengkap + ' & ' + wanitaLengkap;
        bingkai.appendChild(foto);
      }
    }

    return { html: '<!DOCTYPE html>\n' + doc.documentElement.outerHTML };
  }

  /* ---------- Pratinjau ---------- */

  function perbaruiPratinjau() {
    var v = {};
    FIELD_DEFS.forEach(function (f) { v[f.id] = $(f.id).value; });
    var built = bangunDokumen(v);
    if (built.error) {
      setStatus(built.error, true);
      return;
    }
    preview.srcdoc = built.html.replace(AUDIO_RE, '');
    setStatus('Pratinjau diperbarui.');
  }

  var perbaruiPratinjauDebounce = debounce(perbaruiPratinjau, 400);

  FIELD_DEFS.forEach(function (f) {
    var input = $(f.id);
    input.addEventListener('input', perbaruiPratinjauDebounce);
    input.addEventListener('change', perbaruiPratinjauDebounce);
  });
  // Di ponsel pratinjau ada di bawah formulir; tombol ini membawanya ke layar.
  btnPreview.addEventListener('click', function () {
    perbaruiPratinjau();
    if (!window.matchMedia('(min-width: 1024px)').matches) {
      preview.scrollIntoView({ block: 'start' });
    }
  });

  /* ---------- Foto (opsional) ---------- */

  function bersihkanFoto() {
    fotoData = '';
    fotoThumb.removeAttribute('src');
    fotoPratinjau.hidden = true;
    fotoInput.value = '';
  }

  fotoInput.addEventListener('change', function () {
    var file = fotoInput.files && fotoInput.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setStatus('Berkas yang dipilih bukan gambar.', true);
      fotoInput.value = '';
      return;
    }
    setStatus('Menyiapkan foto\u2026');
    siapkanFoto(file, function (uri) {
      fotoData = uri;
      if (uri) {
        fotoThumb.src = uri;
        fotoPratinjau.hidden = false;
      } else {
        bersihkanFoto();
      }
      perbaruiPratinjau();
      setStatus(uri
        ? 'Foto dipakai di undangan. Tekan "Buka Undangan" di pratinjau untuk melihatnya.'
        : 'Foto gagal dibaca. Undangan tetap dibuat tanpa foto.', !uri);
    });
  });

  fotoHapus.addEventListener('click', function () {
    bersihkanFoto();
    perbaruiPratinjau();
    setStatus('Foto dilepas. Undangan kembali memakai ornamen bawaan.');
  });

  /* ---------- Musik latar (dimuat hanya saat diunduh) ---------- */

  var audioPromise = null;

  function muatAudio() {
    if (!audioPromise) {
      audioPromise = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = 'audio.js';
        s.addEventListener('load', function () { resolve(); });
        s.addEventListener('error', function () { reject(new Error('audio.js gagal dimuat')); });
        document.head.appendChild(s);
      });
    }
    return audioPromise;
  }

  /* ---------- Unduh ---------- */

  btnUnduh.addEventListener('click', function () {
    unduh();
  });

  async function unduh() {
    var errors = validasi();
    tampilkanError(errors);
    if (errors.length) {
      var first = $(errors[0].id);
      first.focus();
      setStatus('Periksa kembali isian yang ditandai.', true);
      return;
    }

    var v = {};
    FIELD_DEFS.forEach(function (f) { v[f.id] = $(f.id).value; });
    var built = bangunDokumen(v);
    if (built.error) {
      setStatus(built.error, true);
      return;
    }

    var html = built.html;
    var pakaiMusik = musik.checked;

    if (pakaiMusik && !window.WEDDING_AUDIO) {
      btnUnduh.disabled = true;
      setStatus('Menyiapkan berkas musik\u2026');
      try {
        await muatAudio();
      } catch (e) {
        pakaiMusik = false;
      }
      btnUnduh.disabled = false;
    }

    var pesanMusik = '';
    if (pakaiMusik && window.WEDDING_AUDIO) {
      html = html.split(window.WEDDING_TEMPLATE.audioPlaceholder || AUDIO_FALLBACK_SRC)
        .join(window.WEDDING_AUDIO);
    } else {
      html = html.replace(AUDIO_RE, '');
      if (musik.checked) {
        pesanMusik = ' Musik latar gagal disertakan, undangan diunduh tanpa musik.';
      }
    }

    var slug = buatSlug(v['pria-panggilan'], v['wanita-panggilan']);
    var namaBerkas = 'undangan-' + slug + '.html';
    var url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = namaBerkas;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);

    setStatus('Unduhan dimulai: ' + namaBerkas + '.' + pesanMusik, musik.checked && pesanMusik !== '');
  }

  /* ---------- Muat ulang contoh ---------- */

  btnContoh.addEventListener('click', function () {
    if (!window.confirm('Kosongkan semua isian dan mulai dari awal?')) return;
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) {
      /* biarkan: penghapusan draf tidak wajib berhasil */
    }
    isiFormulir(DEFAULTS);
    bersihkanFoto();
    perbaruiPratinjau();
    setStatus('Formulir dikosongkan.');
  });

  /* ---------- Mulai: draf atau contoh ---------- */

  var draf = muatDraf();
  isiFormulir(draf || DEFAULTS);
  perbaruiPratinjau();
  setStatus(draf ? 'Draf sebelumnya dimuat kembali.' : 'Isi data mempelai dan acara, lalu unduh undangannya.');

  form.addEventListener('submit', function (e) { e.preventDefault(); });
})();
