(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(id) { return document.getElementById(id); }

  /* ---------- 0. Musik latar ---------- */
  var music = $('bg-music');
  var musicBtn = $('music-toggle');

  function syncMusicBtn() {
    if (!music || !musicBtn) return;
    var playing = !music.paused;
    musicBtn.classList.toggle('is-muted', !playing);
    musicBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    musicBtn.setAttribute('aria-label', playing ? 'Jeda musik' : 'Putar musik');
  }

  if (music && musicBtn) {
    musicBtn.addEventListener('click', function () {
      if (music.paused) {
        music.play().catch(function () { /* diblokir browser — biarkan tombol sebagai jalan manual */ });
      } else {
        music.pause();
      }
    });
    music.addEventListener('play', syncMusicBtn);
    music.addEventListener('pause', syncMusicBtn);
    music.addEventListener('error', function () { musicBtn.hidden = true; });
  }

  /* ---------- 1. Cover / buka undangan ---------- */
  var cover = $('cover');
  var openBtn = $('open-btn');

  // Konten di belakang cover tidak boleh dijangkau Tab selama cover terbuka
  var behindCover = document.querySelectorAll('.site-header, main, .site-footer');
  function setBehindInert(state) {
    Array.prototype.forEach.call(behindCover, function (el) { el.inert = state; });
  }

  if (openBtn && cover) {
    setBehindInert(true);
    openBtn.addEventListener('click', function () {
      cover.classList.add('is-open');
      document.body.classList.remove('cover-open');
      cover.setAttribute('aria-hidden', 'true');
      setBehindInert(false);
      if (music && musicBtn) {
        musicBtn.hidden = false;
        music.play().catch(function () { /* autoplay ditolak — tombol musik tetap bisa dipakai */ });
      }
      // Fokus ke konten utama agar navigasi keyboard lanjut dari sini
      var heroTitle = document.getElementById('hero-title');
      if (heroTitle) {
        heroTitle.setAttribute('tabindex', '-1');
        heroTitle.focus({ preventScroll: true });
      }
    });
  }

  /* ---------- 2. Countdown ---------- */
  var TANGGAL = (document.body && document.body.getAttribute('data-tanggal')) || '2028-02-06T08:00:00+07:00';
  var TARGET = new Date(TANGGAL).getTime();
  var cd = {
    hari: $('cd-hari'), jam: $('cd-jam'), menit: $('cd-menit'), detik: $('cd-detik')
  };
  var cdStatus = $('countdown-status');
  var announced = false;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function tick() {
    var diff = Math.max(0, TARGET - Date.now());
    var s = Math.floor(diff / 1000);
    var d = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;

    if (cd.hari) cd.hari.textContent = pad(d);
    if (cd.jam) cd.jam.textContent = pad(h);
    if (cd.menit) cd.menit.textContent = pad(m);
    if (cd.detik) cd.detik.textContent = pad(sec);

    if (cdStatus && !announced) {
      announced = true;
      cdStatus.textContent = diff === 0
        ? 'Hari bahagia telah tiba.'
        : 'Menuju hari bahagia: ' + d + ' hari lagi.';
    }
    return diff;
  }

  if (cd.hari || cd.jam || cd.menit || cd.detik) {
    tick();
    window.setInterval(tick, 1000);
  }

  /* ---------- 3. Scroll reveal ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window && !REDUCED) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('revealed'); });
  }

  /* ---------- 4. Ucapan & RSVP (localStorage) ---------- */
  var STORAGE_KEY = 'rsvp-ucapan';
  var form = $('rsvp-form');
  var listEl = $('rsvp-list');
  var countEl = $('rsvp-count');
  var errNama = $('err-nama');
  var errKehadiran = $('err-kehadiran');

  function loadEntries() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveEntries(entries) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      /* localStorage bisa gagal (mode privat/penuh) — daftar tetap tampil di sesi ini */
    }
  }

  function badgeClass(value) {
    return 'rsvp-item__badge badge--' + value.toLowerCase().replace(/\s+/g, '-');
  }

  function entryToItem(entry) {
    var li = document.createElement('li');
    li.className = 'rsvp-item';

    var head = document.createElement('div');
    head.className = 'rsvp-item__head';

    var name = document.createElement('span');
    name.className = 'rsvp-item__name';
    name.textContent = entry.nama;

    var badge = document.createElement('span');
    badge.className = badgeClass(entry.kehadiran);
    badge.textContent = entry.kehadiran;

    head.appendChild(name);
    head.appendChild(badge);
    li.appendChild(head);

    if (entry.pesan) {
      var msg = document.createElement('p');
      msg.className = 'rsvp-item__msg';
      msg.textContent = entry.pesan;
      li.appendChild(msg);
    }

    var time = document.createElement('time');
    time.className = 'rsvp-item__time';
    time.setAttribute('datetime', entry.waktuIso);
    time.textContent = entry.waktuTeks;
    li.appendChild(time);

    return li;
  }

  function render() {
    if (!listEl || !countEl) return;
    var entries = loadEntries();
    listEl.textContent = '';
    entries.forEach(function (entry) {
      listEl.appendChild(entryToItem(entry));
    });
    countEl.textContent = entries.length + ' ucapan diterima';
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  }

  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();

      var namaInput = $('rsvp-nama');
      var pesanInput = $('rsvp-pesan');
      var kehadiranInput = form.querySelector('input[name="kehadiran"]:checked');

      var nama = namaInput ? namaInput.value.trim() : '';
      var pesan = pesanInput ? pesanInput.value.trim() : '';
      var kehadiran = kehadiranInput ? kehadiranInput.value : '';

      var valid = true;
      if (errNama) errNama.hidden = true;
      if (errKehadiran) errKehadiran.hidden = true;

      if (!nama) {
        if (errNama) errNama.hidden = false;
        valid = false;
      }
      if (!kehadiran) {
        if (errKehadiran) errKehadiran.hidden = false;
        valid = false;
      }
      if (!valid) return;

      var now = new Date().toISOString();
      var entries = loadEntries();
      entries.unshift({
        nama: nama,
        kehadiran: kehadiran,
        pesan: pesan,
        waktuIso: now,
        waktuTeks: formatTime(now)
      });
      saveEntries(entries);
      render();

      form.reset();
      if (pesanInput) pesanInput.focus();
    });
  }

  render();

  /* ---------- 5. Salin nomor rekening ---------- */
  var copyBtn = $('copy-btn');
  var bankEl = $('bank-number');
  var BANK_NUMBER = bankEl ? bankEl.textContent.trim() : '';
  var copyTimer = null;

  function showCopied() {
    if (!copyBtn) return;
    copyBtn.textContent = 'Tersalin \u2713';
    if (copyTimer) window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(function () {
      if (copyBtn) copyBtn.textContent = 'Salin Nomor';
    }, 2000);
  }

  function copyFallback(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showCopied();
    } catch (e) {
      if (copyBtn) copyBtn.textContent = 'Gagal menyalin';
    }
    document.body.removeChild(ta);
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      if (!BANK_NUMBER) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(BANK_NUMBER).then(showCopied, function () {
          copyFallback(BANK_NUMBER);
        });
      } else {
        copyFallback(BANK_NUMBER);
      }
    });
  }
})();
