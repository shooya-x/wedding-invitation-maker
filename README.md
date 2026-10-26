# Pembuat Undangan

Situs statis: form untuk mengisi data calon pengantin, lalu mengunduh undangan jadi **satu file HTML** siap diunggah ke hosting mana pun (atau dikirim langsung ke tamu).

- `/` (index.html) — form + pratinjau
- `/demo/` — contoh undangan hasilnya (juga jadi sumber template)

## Pakai

1. Buka `index.html` (dobel-klik, atau lewat hosting).
2. Isi data mempelai, acara, lokasi, rekening.
3. **Unduh Undangan** → dapat `undangan-{nama}.html`.
4. Unggah file itu ke hosting apa pun. Semua CSS, JS, motif batik, dan galeri sudah di dalamnya.

Isian tersimpan otomatis sebagai draf di browser yang sama. Musik latar boleh dilepas kalau ingin file kecil (≈75 KB); dengan musik file jadi ≈5,6 MB karena lagu ikut ditanam di dalam file.

Untuk memberi tamu link, unggah file hasilnya ke folder repo, mis. `undangan/surya-fransiska.html`, lalu bagikan `https://username.github.io/nama-repo/undangan/surya-fransiska.html`.

## Ubah desain undangan

Desain tinggal di `demo/index.html` + `css/style.css` + `js/main.js`. Setelah salah satunya diubah, jalankan:

```
node tools/build-template.mjs
```

Perintah itu memperbarui `template.js` (HTML + CSS + JS + motif galeri yang sudah ditanam) dan `audio.js` (lagu, dimuat hanya saat dibutuhkan). Tanpa langkah ini, unduhan masih memakai desain lama.

Field yang bisa diisi form terhubung lewat `id` di `demo/index.html` (mis. `#cover-pria`, `#pria-nama`, `#akad-jam`). Menambah field berarti menambah `id` di `demo/index.html`, entri di `FIELD_DEFS` + markup input di `index.html`, lalu pemetaan di `bangunDokumen()` pada `app.js`.

## Isi folder

```
index.html      form + pratinjau (iframe sandbox)
app.js          validasi, draf, penyusunan dokumen, unduhan
builder.css     tampilan form
template.js     HASIL GENERATE — jangan diedit manual
audio.js        HASIL GENERATE — jangan diedit manual
demo/index.html undangan contoh (sumber template)
css/ js/        gaya & skrip undangan
assets/         motif batik, galeri SVG, lagu
tools/build-template.mjs  pembuat template.js + audio.js
```

## Nanti: link otomatis

Fungsi `bangunDokumen()` di `app.js` hanya butuh objek data dan menghasilkan HTML utuh — backend tinggal memanggil logika yang sama (port ke Node) untuk menyajikan `/undangan/{slug}`. Saat ini berbagi dilakukan dengan mengunggah file hasil unduhan.
