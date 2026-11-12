/* Isolated UI prototype. No Gemini calls, no production storage mutations. */
const $ = selector => document.querySelector(selector);
const page = $('#page');
const nav = $('#sideNav');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const routes = [
  ['landing','⌁','Landing'],
  ['home','✦','Beranda AI'],
  ['dashboard','▦','Dashboard'],
  ['subjects','▤','Mata Pelajaran'],
  ['notes','▣','Catatan'],
  ['exams','◉','Ujian'],
  ['streaks','♨','Streaks'],
  ['leaderboard','♜','Leaderboard'],
  ['pinned','◇','Disematkan'],
  ['lesson','▧','Ruang Belajar'],
  ['profile','♙','Profil'],
  ['updates','↻','Update List']
];
const routeNames = Object.fromEntries(routes.map(item => [item[0],item[2]]));
const seed = () => ({
  notes: [
    {id:'sample-1',title:'Ekosistem dan Interaksi Makhluk Hidup',subject:'Biologi',kind:'Ringkasan',date:6,
      summary:'Kenali komponen ekosistem, rantai makanan, dan hubungan antarmakhluk hidup.',sourceFile:'materi_ekosistem_kelas_10.pdf',
      chapters:[
        {title:'Mengenal Ekosistem',body:'Ekosistem adalah kesatuan antara makhluk hidup dan lingkungan tempat mereka berinteraksi.\nContoh ekosistem meliputi hutan, sawah, danau, dan halaman sekolah.',example:'Sebuah kolam terdiri dari ikan, tumbuhan air, air, cahaya, dan mikroorganisme.'},
        {title:'Komponen Biotik dan Abiotik',body:'Komponen biotik terdiri dari makhluk hidup seperti tumbuhan, hewan, dan mikroorganisme.\nKomponen abiotik meliputi air, cahaya, suhu, tanah, dan udara.'},
        {title:'Rantai dan Jaring Makanan',body:'Rantai makanan menunjukkan perpindahan energi dari satu organisme ke organisme lain.\nBeberapa rantai makanan yang saling terhubung membentuk jaring-jaring makanan.',example:'Rumput → belalang → katak → ular.'}
      ]},
    {id:'sample-2',title:'Memahami Limit Fungsi',subject:'Matematika',kind:'Catatan',date:5,
      summary:'Pengertian limit, cara membaca notasi, dan contoh soal langkah demi langkah.',sourceFile:'modul_limit_xi_semester1.pdf',
      chapters:[
        {title:'Pengertian Limit',body:'Limit menjelaskan nilai yang didekati suatu fungsi ketika variabel mendekati nilai tertentu.\nUntuk fungsi yang kontinu, limit bisa dihitung lewat substitusi langsung.',example:'Saat x mendekati 2, nilai x + 3 mendekati 5.',formula:'lim x→2 (x + 3) = 5'},
        {title:'Sifat Dasar Limit',body:'Limit penjumlahan dapat dihitung dari penjumlahan limit masing-masing bagian, ketika kedua limitnya ada.\nHal yang sama berlaku untuk pengurangan dan perkalian.',example:'Jika lim f(x)=2 dan lim g(x)=3, maka lim (f(x)+g(x))=5.'},
        {title:'Contoh Soal dan Pembahasan',body:'Tentukan lim x→2 (x² + 1).\nLangkah 1: Periksa bahwa fungsi polinomial kontinu.\nLangkah 2: Substitusikan x = 2.\nHasil: 2² + 1 = 5.',formula:'lim x→2 (x² + 1) = 5'}
      ]},
    {id:'sample-3',title:'Memahami Regular dan Irregular Verbs',subject:'Bahasa Inggris',kind:'Flashcard',date:4,
      summary:'Perbedaan bentuk kata kerja dan contohnya dalam kalimat sederhana.',sourceFile:'english_verbs_presentation.pptx',
      chapters:[{title:'Regular Verbs',body:'Regular verbs membentuk past tense dengan menambahkan -ed atau -d.\nContoh: play → played; live → lived.'},
        {title:'Irregular Verbs',body:'Irregular verbs tidak selalu mengikuti aturan -ed.\nContoh: go → went; eat → ate; take → took.'}]},
    {id:'sample-4',title:'Unsur dan Tabel Periodik',subject:'Kimia',kind:'Ringkasan',date:3,
      summary:'Cara membaca tabel periodik serta mengenal periode dan golongan.',sourceFile:'tabel_periodik_versi_sekolah.pdf',
      chapters:[{title:'Struktur Tabel Periodik',body:'Tabel periodik menyusun unsur berdasarkan nomor atom yang meningkat.\nBaris disebut periode, sedangkan kolom disebut golongan.'},
        {title:'Sifat Unsur',body:'Unsur dengan golongan yang sama sering memiliki kemiripan sifat kimia.\nContohnya, unsur golongan gas mulia relatif stabil.'}]},
    {id:'sample-5',title:'Perubahan Sosial pada Revolusi Industri',subject:'Sejarah',kind:'Catatan',date:2,
      summary:'Perubahan produksi, teknologi, dan kehidupan masyarakat akibat industrialisasi.',sourceFile:'sejarah_revolusi_industri.docx',
      chapters:[{title:'Awal Revolusi Industri',body:'Revolusi Industri mendorong perubahan dari pekerjaan manual menuju produksi dengan mesin.\nPerubahan ini berkembang pesat di Inggris pada akhir abad ke-18.'},
        {title:'Dampak bagi Masyarakat',body:'Perkembangan pabrik meningkatkan produksi sekaligus mengubah pola kerja dan perpindahan penduduk ke kota.'}]},
    {id:'sample-6',title:'Gaya, Gerak, dan Hukum Newton',subject:'Fisika',kind:'Latihan',date:1,
      summary:'Hubungan gaya dan percepatan, disertai contoh penggunaan Hukum Newton.',sourceFile:'rangkuman_fisika_gerak.pdf',
      chapters:[{title:'Gaya dan Percepatan',body:'Gaya adalah interaksi yang dapat mengubah gerak suatu benda.\nHukum II Newton menyatakan gaya resultan sebanding dengan massa dan percepatan.',formula:'ΣF = m × a'},
        {title:'Contoh Penerapan',body:'Benda bermassa 2 kg yang mendapat resultan gaya 6 N mengalami percepatan sebesar 3 m/s².',formula:'a = 6 N ÷ 2 kg = 3 m/s²'}]}
  ],
  subjects:[],draft:'',theme:'dark',layout:'grid',chapter:0,profileTab:0,
  noteFilter:'all',search:'',sort:'new',examStarted:false,examAnswer:'',selectedNote:'sample-2'
});
const defaultChapter = () => ({title:'Catatan awal',body:'',example:'',formula:''});
const normalizeNote = raw => {
  const note = {...raw};
  if (/\.(pdf|pptx?|docx?|jpe?g|png|txt)$/i.test(String(note.title||''))) {
    note.sourceFile ||= note.title;
    note.title = 'Materi belum diberi judul';
  }
  if (!Array.isArray(note.chapters) || !note.chapters.length) note.chapters = [defaultChapter()];
  note.summary ||= 'Materi baru. Buka untuk menyusun catatan berdasarkan topik.';
  return note;
};
const storageKey = 'omnilearn-design-preview-v1';
let state = seed();
try {
  const fromStorage = JSON.parse(sessionStorage.getItem(storageKey)||'null');
  if(fromStorage && typeof fromStorage==='object' &&
    Array.isArray(fromStorage.notes) && Array.isArray(fromStorage.subjects))
    state = {...seed(), ...fromStorage};
} catch {}
state.notes=state.notes.map(normalizeNote);
const store = () => {try{sessionStorage.setItem(storageKey,JSON.stringify(state));}catch{}};
const validRoute = route => Object.hasOwn(routeNames,route) ? route : 'home';
const activeRoute = () => validRoute(location.hash.replace('#',''));
let timer={remaining:1500,running:false,endAt:0};
let toastTimeout;
const notify = message => {
  const n=$('#toast'); n.textContent=message; n.hidden=false;
  clearTimeout(toastTimeout); toastTimeout=setTimeout(()=>{n.hidden=true;},4700);
};
const robot = () => '<div class="robot" aria-hidden="true"><div class="head"><div class="face"><i class="eye"></i><i class="eye"></i></div></div><i class="ear left"></i><i class="ear right"></i><div class="body"></div></div>';
const linkButton = (text, url, cls='button-ghost') =>
  '<a class="button '+cls+'" href="'+url+'">'+text+'</a>';
const tag = '<span class="preview-pill">CONTOH DATA · BUKAN DATA AKUN</span>';
const titleBlock = (name,desc,cta='') =>
  '<div class="page-head"><div><p class="eyebrow">OMNILEARN AI · DESIGN EXPLORATION</p>'+
  '<h1>'+escapeHtml(name)+'</h1><p>'+desc+'</p></div>'+cta+'</div>';
function syncNavigation(route){
  nav.innerHTML='<div class="nav-list">'+routes.map(item =>
    '<a class="nav-link'+(item[0]===route?' active':'')+'" href="#'+item[0]+'"'+
    (item[0]===route?' aria-current="page"':'')+'>'+
    '<span class="nav-icon" aria-hidden="true">'+item[1]+'</span>'+item[2]+'</a>'
  ).join('')+'</div>';
  $('#topTitle').textContent=routeNames[route];
  $('#modeSwitch').setAttribute('aria-label',route==='home'?'Beralih ke Dashboard':'Beralih ke Beranda AI');
  document.title=routeNames[route]+' · OmniLearn AI Design Preview';
}
function closeMenu(){
  $('#app').classList.remove('menu-open');
  $('#backdrop').hidden=true; $('#mobileMenu').setAttribute('aria-expanded','false');
}
function notesList(notes=state.notes){
  const term=String(state.search||'').toLocaleLowerCase('id').trim();
  const visible=notes.filter(note =>
    (state.noteFilter==='all' || note.kind===state.noteFilter) &&
    (!term || (note.title+' '+note.subject+' '+note.kind+' '+(note.summary||''))
      .toLocaleLowerCase('id').includes(term)));
  visible.sort((a,b)=>state.sort==='old' ? a.date-b.date : b.date-a.date);
  if(!visible.length) return '<div class="empty"><div class="empty-art">▤</div><h2>Belum ada catatan yang cocok</h2><p>Ubah pencarian atau buat catatan baru.</p>'+ 
    '<button class="button button-primary" data-action="add-note">+ Buat Catatan</button></div>';
  return '<div class="content-grid three-cols lesson-collection '+(state.layout==='list'?'list-layout':'')+'">'+visible.map(note=> {
    const chapters=note.chapters||[];
    return '<button class="note-card saved-lesson-card" type="button" data-note="'+escapeHtml(note.id)+'" aria-label="Buka materi '+escapeHtml(note.title)+'">'+
      '<div class="saved-cover" aria-hidden="true"><div class="saved-cover-top"><span>OMNILEARN · MATERI</span><span>✦</span></div>'+ 
      '<div class="saved-cover-paper"><div class="saved-paper-category">'+escapeHtml(note.subject)+'</div>'+ 
      '<div class="saved-paper-heading">'+escapeHtml(note.title)+'</div>'+ 
      '<div class="saved-paper-rule"></div><div class="saved-paper-line"></div><div class="saved-paper-line short"></div>'+ 
      '<div class="saved-paper-section">'+(chapters.length>1?'01 / '+chapters.length+' BAB':'CATATAN')+'</div></div></div>'+ 
      '<div class="saved-lesson-info"><span class="saved-category">'+escapeHtml(note.subject)+'</span>'+ 
      '<h3>'+escapeHtml(note.title)+'</h3>'+ 
      '<p class="saved-summary">'+escapeHtml(note.summary)+'</p>'+ 
      '<div class="note-foot"><span>'+escapeHtml(note.kind)+'</span><span>'+chapters.length+' bab <b aria-hidden="true">↗</b></span></div></div></button>';
  }).join('')+'</div>';
}
function noteControls(){
  const kinds=['all','Ringkasan','Catatan','Flashcard','Latihan','Materi'];
  return '<div class="toolbar">'+
    '<input class="field" id="noteSearch" type="search" placeholder="Cari catatan..." aria-label="Cari catatan" value="'+escapeHtml(state.search)+'">'+
    '<select class="field" id="noteKind" aria-label="Jenis catatan">'+kinds.map((k,i)=>
      '<option value="'+escapeHtml(k)+'"'+(state.noteFilter===k?' selected':'')+'>'+ (i===0?'Semua jenis':escapeHtml(k))+'</option>').join('')+'</select>'+
    '<select class="field" id="noteSort" aria-label="Urutkan catatan">'+
    '<option value="new"'+(state.sort==='new'?' selected':'')+'>Terbaru</option>'+
    '<option value="old"'+(state.sort==='old'?' selected':'')+'>Terlama</option></select>'+
    '<div class="view-buttons" role="group" aria-label="Tampilan catatan">'+
    '<button type="button" data-layout="grid" class="'+(state.layout==='grid'?'active':'')+'" aria-pressed="'+(state.layout==='grid')+'">▦</button>'+
    '<button type="button" data-layout="list" class="'+(state.layout==='list'?'active':'')+'" aria-pressed="'+(state.layout==='list')+'">☷</button></div></div>';
}
function renderNotesGrid(){
  const container=$('#noteResults');
  if(container) container.innerHTML=notesList();
}
function renderLanding(){
  page.innerHTML='<div class="panel brand-hero">'+
    '<p class="eyebrow" style="color:#ffbd83!important">PLATFORM BELAJAR BERBASIS AI</p>'+
    '<h1>Belajar lebih efektif<br>dengan <em>AI.</em></h1>'+
    '<p>Bangun kebiasaan belajar, simpan materimu, dan siapkan latihan dalam satu ruang yang konsisten.</p>'+
    '<div class="actions">'+linkButton('Mulai jelajahi UI →','#home','button-primary')+
    linkButton('Buka dashboard','#dashboard')+'</div>'+
    '<div class="hero-orbit"></div>'+
    '<div class="landing-device" aria-hidden="true">'+
    '<div class="device-topbar"><span class="device-dot"></span><span class="device-dot"></span><span class="device-dot"></span><b>OmniLearn</b></div>'+
    '<div class="device-ui"><div class="device-side"><span class="active">▦</span><span>▤</span><span>▣</span><span>◉</span><span>✦</span></div>'+
    '<div class="device-main">'+
    '<span class="device-kicker">SELAMAT DATANG</span><strong>Belajar lebih cerdas.</strong>'+
    '<div class="device-prompt">✦ Tanyakan apa yang ingin kamu pelajari… <i>➜</i></div>'+
    '<div class="device-row"><span><em>▤</em> Catatan</span><span><em>✦</em> Tutor AI</span><span><em>◉</em> Ujian</span></div>'+
    '</div></div></div>'+
    '<div class="brand-features"><span>✦ AI Assistant</span><span>▣ Catatan</span><span>✓ Latihan & Ujian</span><span>▤ Pantau Progres</span></div></div>'+
    '<div class="subhead"><div><h2>Rangka produk</h2><p>Komponen awal berdasarkan showcase; bukan pengganti aplikasi produksi.</p></div>'+tag+'</div>'+
    '<div class="quick-grid">'+[
      ['✦','Tanya & belajar','#home'],['▣','Kelola catatan','#notes'],
      ['◉','Latihan ujian','#exams'],['▦','Pantau progres','#dashboard']
    ].map(x=>'<a class="panel quick-card" href="'+x[2]+'"><span class="quick-icon">'+x[0]+'</span><strong>'+x[1]+'</strong></a>').join('')+'</div>';
}
function renderHome(){
  page.innerHTML='<div class="hero-home">'+robot()+
    '<p class="eyebrow">OMNILEARN · LEARNING ASSISTANT</p><h1>Halo, siap belajar hari ini?</h1>'+
    '<p>Tanyakan apa saja, unggah materi, atau gunakan tautan video untuk memulai. Di preview ini AI tidak dipanggil.</p></div>'+
    '<form class="composer" id="composerForm">'+
    '<label for="homePrompt" class="eyebrow">TANYAKAN SESUATU</label>'+
    '<textarea id="homePrompt" maxlength="2000" placeholder="Tanyakan materi, minta penjelasan, atau beri instruksi...">'+escapeHtml(state.draft)+'</textarea>'+
    '<div class="composer-bottom">'+
    '<button type="button" class="chip" data-action="recorder">● Rekam</button>'+
    '<button type="button" class="chip" data-action="upload">♧ Unggah</button>'+
    '<input id="previewFileInput" type="file" accept=".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg" hidden>'+
    '<button type="button" class="chip" data-action="youtube">▶ YouTube</button>'+
    '<button class="button button-primary send" type="submit" aria-label="Lanjutkan pertanyaan ke Tutor AI">Lanjut ke Tutor AI ↗</button></div></form>'+
    '<p class="home-notice">🔒 Prototipe aman: tidak mengirim pertanyaan, file, atau rekaman ke server. '+
    '<a href="https://omnilearnid.ai.studio/dashboard?view=chat" style="color:var(--blue)">Buka Tutor AI aplikasi asli</a>.</p>'+
    '<div class="subhead"><div><h2>Catatan Kamu</h2><p>Materi tersimpan sebagai catatan belajar dengan judul, ringkasan, dan bab.</p></div>'+
    '<button class="button button-primary" data-action="add-note">+ Catatan Baru</button></div>'+
    noteControls()+'<div id="noteResults">'+notesList()+'</div>';
}
function stat(icon,label,value){
  return '<article class="panel stat-card"><span class="stat-icon">'+icon+'</span><div><span>'+label+'</span>'+
    '<strong>'+value+'</strong></div></article>';
}
function timerMarkup(){
  const mm=String(Math.floor(timer.remaining/60)).padStart(2,'0');
  const ss=String(timer.remaining%60).padStart(2,'0');
  return '<div class="panel panel-pad"><h3>Focus Timer</h3><div class="timer-display" id="timerDisplay">'+mm+':'+ss+'</div>'+
    '<div class="timer-actions"><button type="button" class="button button-primary" data-action="timer-toggle">'+
    (timer.running?'Ⅱ Jeda':'▶ Mulai')+'</button>'+
    '<button class="button button-ghost" type="button" data-action="timer-reset">Reset</button></div>'+
    '<p class="meta" style="margin-top:12px">25 menit · hanya pada preview ini</p></div>';
}
function chartHtml(){
  const values=[40,58,52,78,45,72,91];
  return '<div class="chart">'+values.map((h,i)=>
    '<div class="chart-bar" style="height:'+h+'%"><span>'+['Sen','Sel','Rab','Kam','Jum','Sab','Min'][i]+'</span></div>'
  ).join('')+'</div><p class="meta" style="padding-top:21px">Data aktivitas ilustratif</p>';
}
function renderDashboard(){
  page.innerHTML=titleBlock('Selamat datang di OmniLearn! 👋','Lanjutkan perjalanan belajarmu. Angka di layar ini hanyalah contoh desain.',tag)+
    '<div class="content-grid four-cols">'+
    stat('▣','Mata pelajaran','12')+stat('▤','Catatan contoh',String(state.notes.length))+
    stat('◉','Latihan ujian','27')+stat('★','Total XP','3.420')+'</div>'+
    '<div class="dashboard-grid"><div class="panel xp-card"><div class="xp-top"><div><span class="kicker">★ LEVEL 8</span><h3>Progres Belajar</h3></div>'+
    '<span class="meta">3.420 / 4.000 XP</span></div><div class="xp-rail"><div class="xp-fill" style="width:85.5%"></div></div>'+
    '<p class="meta" style="margin-top:12px">Angka ilustrasi. Astra harus menghubungkan ke learning-activity.js.</p></div>'+
    timerMarkup()+'</div>'+
    '<div class="dashboard-grid">'+
    '<section class="panel panel-pad"><h3>Progres Mingguan</h3>'+chartHtml()+'</section>'+
    '<section class="panel panel-pad"><h3>Aktivitas Terakhir</h3><div class="activity-list" style="margin-top:23px">'+
    '<div class="activity-row"><span class="activity-mark">✓</span>Menyelesaikan latihan <time>10 m lalu · contoh</time></div>'+
    '<div class="activity-row"><span class="activity-mark">▤</span>Membuat catatan <time>1 jam lalu · contoh</time></div></div></section></div>';
}
function renderSubjects(){
  const subjects=state.subjects;
  page.innerHTML=titleBlock('Mata Pelajaran','Kelola dan jelajahi semua mata pelajaranmu di satu tempat.',
    '<button class="button button-primary" data-action="add-subject">+ Tambah</button>')+
    '<div class="toolbar"><input id="subjectSearch" class="field" type="search" placeholder="Cari mata pelajaran..." aria-label="Cari mata pelajaran">'+
    '<span class="chip active">Aktif</span><span class="chip">Arsip · demo</span></div>'+
    '<div id="subjectResults">'+(subjects.length?subjectCards(subjects):subjectEmpty())+'</div>';
}
function subjectEmpty(){
  return '<div class="empty"><div class="empty-art">📚</div><h2>Belum ada mata pelajaran</h2>'+
    '<p>Tambahkan mata pelajaran untuk mulai mengatur materi, catatan, dan latihanmu.</p>'+
    '<button class="button button-primary" data-action="add-subject">+ Tambah Mata Pelajaran</button></div>';
}
function subjectCards(subjects){
  return '<div class="content-grid three-cols">'+subjects.map(subject=>
    '<div class="note-card"><span class="note-icon">▤</span><h3>'+escapeHtml(subject.name)+'</h3>'+
    '<p class="meta">Subjek lokal · contoh</p>'+
    '<button class="button button-ghost button-mini" data-action="remove-subject" data-subject="'+escapeHtml(subject.id)+'">Hapus contoh</button></div>'
  ).join('')+'</div>';
}
function renderFilteredSubjects(){
  const input=$('#subjectSearch'), target=$('#subjectResults');
  if(!input||!target)return;
  const q=input.value.trim().toLocaleLowerCase('id');
  const filtered=state.subjects.filter(s=>s.name.toLocaleLowerCase('id').includes(q));
  target.innerHTML=filtered.length?subjectCards(filtered):subjectEmpty();
}
function renderNotes(){
  page.innerHTML=titleBlock('Catatan','Judul topik dan bab belajar ditampilkan rapi; nama berkas hanya ada di bagian sumber.',
    '<button class="button button-primary" data-action="add-note">+ Buat Catatan</button>')+
    noteControls()+'<div id="noteResults">'+notesList()+'</div>';
}
function renderExams(){
  page.innerHTML=titleBlock('Ujian','Latihan soal, tryout, dan simulasi ujian. Belum terhubung ke backend pada preview ini.',tag)+
    '<div class="chip-row" style="margin-bottom:18px"><span class="chip active">Latihan Soal</span><span class="chip">Tryout · rancangan</span><span class="chip">Simulasi · rancangan</span></div>'+
    '<div class="exam-layout"><form id="examForm" class="panel exam-form"><h3>Atur Latihan Soal</h3>'+
    '<label for="examSubject">Mata Pelajaran</label><select id="examSubject" class="field"><option>Matematika</option><option>Biologi</option><option>Fisika</option></select>'+
    '<label for="examCount">Jumlah Soal</label><select id="examCount" class="field"><option>10 soal</option><option>25 soal</option><option>50 soal</option></select>'+
    '<label for="examType">Tipe Ujian</label><select id="examType" class="field"><option>Pilihan Ganda</option><option>Campuran</option></select>'+
    '<p class="meta" style="margin:17px 0">Demo interaksi satu soal, bukan ujian AI asli.</p>'+
    '<button class="button button-primary" type="submit" style="width:100%">▶ Mulai Simulasi UI</button></form>'+
    '<div class="panel exam-preview" id="examResult">'+examDemoMarkup()+'</div></div>'+
    '<div class="subhead"><div><h2>Mesin ujian sebenarnya</h2><p>Milestone 08 sudah memiliki engine ujian di aplikasi utama.</p></div>'+
    linkButton('Buka Ujian asli ↗','/dashboard?view=exams','button-blue')+'</div>';
}
function examDemoMarkup(){
  if(!state.examStarted)return '<div class="icon-large">📋</div><h3>Latihan Terarah</h3>'+
    '<p>Antarmuka contoh untuk memilih subjek, jumlah soal, dan memulai ujian.</p>'+
    '<div class="activity-list"><div class="activity-row">✓ Pembahasan lengkap</div>'+
    '<div class="activity-row">✓ Pilihan soal fleksibel</div><div class="activity-row">✓ Analisis hasil</div></div>';
  return '<div style="width:100%;text-align:left"><p class="eyebrow">SIMULASI UI · 1 PERTANYAAN STATIS</p>'+
    '<h3>Berapakah 2 + 3?</h3>'+
    '<div class="actions" style="margin:17px 0">'+[4,5,6].map(n=>
    '<button type="button" class="button '+(state.examAnswer===String(n)?'button-primary':'button-ghost')+
    '" data-answer="'+n+'">'+n+'</button>').join('')+'</div>'+
    (state.examAnswer?'<p class="meta">'+(state.examAnswer==='5'?'✓ Benar.':'Belum tepat. Jawaban contoh: 5.')+'</p>':'')+
    '<p class="meta" style="margin-top:12px">Ini bukan soal dari Gemini. Gunakan Ujian asli untuk latihan sungguhan.</p></div>';
}
function renderStreaks(){
  const heat=Array.from({length:84},(_,i)=>'<div class="heat h'+((i*17+Math.floor(i/6))%5)+
    '" title="Aktivitas ilustrasi hari '+(i+1)+'" aria-label="Aktivitas ilustrasi"></div>').join('');
  page.innerHTML=titleBlock('Streaks & Aktivitas','Bangun konsistensi belajarmu dan lihat perjalanan belajar dari waktu ke waktu.',tag)+
    '<div class="content-grid three-cols">'+stat('🔥','Streak belajar','12 hari')+
    stat('🏆','Peringkat contoh','#42')+stat('◆','Total XP','3.420 XP')+'</div>'+
    '<div class="streak-layout" style="margin-top:17px">'+
    '<section class="panel panel-pad"><h3>Aktivitas Belajar</h3>'+chartHtml()+'</section>'+
    '<section class="panel panel-pad"><h3>Kalender Aktivitas</h3><p class="meta">12 minggu · data ilustrasi</p><div class="heatmap">'+heat+'</div></section></div>'+
    '<div class="subhead"><p>Data nyata harus diambil dari modul learning-activity, bukan dari angka demo ini.</p>'+
    linkButton('Lihat streak asli ↗','/dashboard?view=streaks')+'</div>';
}
function renderLesson(){
  const note=state.notes.find(item => item.id===state.selectedNote) || state.notes[0];
  if(!note){ location.hash='#notes'; return; }
  const chapters=Array.isArray(note.chapters)&&note.chapters.length?note.chapters:[defaultChapter()];
  const active=Math.max(0,Math.min(chapters.length-1,Number(state.chapter)||0));
  const chapter=chapters[active];
  const paras=String(chapter.body||'').split(/\n+/).map(p=>p.trim()).filter(Boolean);
  const chapterBody=paras.length
    ? paras.map(p=>'<p>'+escapeHtml(p)+'</p>').join('')
    : '<div class="chapter-empty">Belum ada isi bab. Klik <strong>Edit isi bab</strong> untuk menulis catatanmu.</div>';
  const source=note.sourceFile
    ? '<details class="source-disclosure"><summary>Sumber asli</summary><p>'+escapeHtml(note.sourceFile)+'</p>'+ 
      '<small>Berkas asal hanya dicatat sebagai metadata dalam prototipe. Tidak diunggah atau diproses oleh AI.</small></details>'
    : '<details class="source-disclosure"><summary>Sumber asli</summary><p>Catatan dibuat manual.</p></details>';
  page.innerHTML='<div class="lesson-breadcrumb"><a href="#notes">Catatan</a><span>›</span><span>'+escapeHtml(note.subject)+'</span><span>›</span><strong>'+escapeHtml(note.title)+'</strong></div>'+ 
    '<div class="page-head lesson-page-head"><div><p class="eyebrow">RUANG BELAJAR · MATERI TERSIMPAN</p><h1>'+escapeHtml(note.title)+'</h1>'+ 
    '<p>'+escapeHtml(note.summary)+'</p><div class="lesson-meta"><span>'+escapeHtml(note.subject)+'</span><span>'+chapters.length+' bab</span><span>'+escapeHtml(note.kind)+'</span></div></div>'+ 
    '<button class="button button-ghost" data-action="edit-note" type="button">✎ Edit judul</button></div>'+ 
    '<div class="lesson-grid lesson-grid-upgraded">'+
    '<aside class="panel lesson-nav"><h3>Daftar Bab</h3><p class="meta" style="margin:7px 0 12px">Susunan catatanmu</p>'+ 
    chapters.map((item,i)=>'<button class="chapter-btn '+(i===active?'active':'')+'" type="button" data-chapter="'+i+'" aria-current="'+(i===active?'step':'false')+'"><span class="chapter-no">'+(i+1)+'</span>'+escapeHtml(item.title)+'</button>').join('')+'</aside>'+ 
    '<article class="panel lesson-reader structured-reader"><div class="reader-overline">BAB '+String(active+1).padStart(2,'0')+' · '+escapeHtml(note.subject)+'</div>'+ 
    '<h2>'+escapeHtml(chapter.title)+'</h2><div class="reader-text">'+chapterBody+'</div>'+ 
    (chapter.example?'<div class="reader-example"><strong>Contoh</strong><p>'+escapeHtml(chapter.example)+'</p></div>':'')+ 
    (chapter.formula?'<div class="formula">'+escapeHtml(chapter.formula)+'</div>':'')+ 
    '<div class="reader-edit-actions"><button type="button" class="button button-ghost" data-action="edit-chapter">✎ Edit isi bab</button></div>'+ 
    '<div id="chapterEditor" class="chapter-editor" hidden><label for="chapterBody">Isi catatan</label>'+ 
    '<textarea id="chapterBody" class="field" rows="8">'+escapeHtml(chapter.body||'')+'</textarea>'+ 
    '<button type="button" class="button button-primary" data-action="save-chapter">Simpan catatan</button></div>'+ 
    source+'</article>'+ 
    '<aside class="panel lesson-tools"><h3>Alat Belajar</h3><p class="meta" style="margin:9px 0 15px">Pakai fitur aplikasi asli</p>'+ 
    [['✦','Ringkas dengan AI','summary'],['▤','Buat Catatan','notes'],['▣','Buat Flashcard','cards'],['◉','Latihan Soal','quiz'],['☏','Tanya AI','chat']].map(x=>
      '<a class="tool-link" href="https://omnilearnid.ai.studio/dashboard?view='+x[2]+'">'+x[0]+' '+x[1]+' ↗</a>').join('')+'</aside></div>';
}
function renderLeaderboard(){
  page.innerHTML=titleBlock('Leaderboard','Peringkat hanya boleh menggunakan data pengguna nyata yang mengizinkan tampil di papan peringkat.',tag)+
    '<div class="empty"><div class="empty-art">🏆</div><h2>Belum ada peringkat terverifikasi</h2>'+
    '<p>Prototipe tidak membuat akun atau pesaing palsu. Sambungkan leaderboard asli hanya setelah sistem opt-in dan privasi tersedia.</p>'+
    linkButton('Buka leaderboard aplikasi ↗','/dashboard?view=leaderboard')+'</div>';
}
function renderPinned(){
  page.innerHTML=titleBlock('Disematkan','Area khusus materi favorit dan catatan penting.',tag)+
    '<div class="empty"><div class="empty-art">◇</div><h2>Belum ada pin di prototipe</h2>'+
    '<p>Astra perlu memakai status pinned dari local-library yang sudah ada, bukan membuat penyimpanan baru.</p>'+
    linkButton('Buka pin aplikasi asli ↗','/dashboard?view=pinned')+'</div>';
}
function renderProfile(){
  const tab=Number(state.profileTab)||0;
  const tabs=['Preferensi','Penggunaan','Akun'];
  let body='';
  if(tab===0)body='<div class="setting-row"><strong>Mode Tampilan</strong><button class="button button-ghost" data-action="theme">'+(state.theme==='dark'?'☾ Gelap':'☀ Terang')+' ↻</button></div>'+
    '<div class="setting-row"><strong>Bahasa</strong><span>Indonesia · contoh</span></div>'+
    '<div class="setting-row"><strong>Pengingat Belajar</strong><span>Belum tersedia pada prototipe</span></div>';
  if(tab===1)body='<div class="setting-row"><strong>Catatan contoh</strong><span>'+state.notes.length+'</span></div>'+
    '<div class="setting-row"><strong>XP contoh</strong><span>3.420</span></div>'+
    '<div class="setting-row"><strong>Streak contoh</strong><span>12 hari</span></div>'+
    '<p class="meta" style="padding:16px">Tidak mewakili penggunaan akun atau kuota Gemini sebenarnya.</p>';
  if(tab===2)body='<div class="setting-row"><strong>Akun</strong><span>Demo tanpa login</span></div>'+
    '<div class="setting-row"><strong>Penyimpanan</strong><span>sessionStorage prototipe saja</span></div>'+
    '<div class="setting-row"><strong>Fitur akun asli</strong>'+linkButton('Buka pengaturan ↗','/dashboard?view=account')+'</div>';
  page.innerHTML=titleBlock('Profil','Kelola akun, preferensi, dan pengaturan belajarmu.',tag)+
    '<div class="panel profile-top"><span class="profile-avatar" aria-hidden="true">O</span>'+
    '<div><h2>Pelajar OmniLearn</h2><p>Profil contoh · bukan akun asli</p></div>'+
    '<span class="chip active" style="margin-left:auto">★ Level 8 · demo</span></div>'+
    '<div class="content-grid four-cols">'+stat('★','Total XP','3.420')+
    stat('🔥','Streak','12 hari')+stat('▣','Catatan',String(state.notes.length))+stat('◉','Ujian','27')+'</div>'+
    '<div class="tabs" role="tablist" aria-label="Bagian profil">'+tabs.map((name,i)=>
    '<button class="tab '+(tab===i?'active':'')+'" role="tab" type="button" data-profile-tab="'+i+
    '" aria-selected="'+(tab===i)+'">'+name+'</button>').join('')+'</div>'+
    '<section class="panel">'+body+'</section>';
}
async function renderUpdates(){
  page.innerHTML=titleBlock('Update List','Riwayat perubahan aplikasi asli, bukan daftar fitur palsu dari prototipe.',tag)+
    '<div id="releaseResults" class="panel panel-pad"><p role="status">Mengambil manifest versi asli…</p></div>';
  const container=$('#releaseResults');
  try{
    const inlineManifest=document.querySelector('#previewReleaseData');
    let manifest;
    if(inlineManifest) manifest=JSON.parse(inlineManifest.textContent);
    else {
      const response=await fetch('/data/releases.json',{cache:'no-store'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      manifest=await response.json();
    }
    if(!Array.isArray(manifest.releases))throw new Error('Data versi tidak lengkap');
    if(activeRoute()!=='updates')return;
    container.className='';container.replaceChildren();
    for(const release of manifest.releases){
      const el=document.createElement('article');el.className='panel update-card';
      const h=document.createElement('h3');h.textContent='v'+release.version+' · '+release.title;
      const p=document.createElement('p');
      p.textContent=(release.status==='released'?'Dirilis':'Masih dikembangkan')+' · '+release.summary;
      const details=document.createElement('details');
      const summary=document.createElement('summary');
      summary.textContent='Detail perubahan ('+(release.changes?.length||0)+')';
      details.append(summary);
      const list=document.createElement('ul');
      for(const item of (release.changes||[])){
        const row=document.createElement('li');row.textContent=item.category+' · '+item.title+' ('+item.status+')';list.append(row);
      }
      details.append(list);el.append(h,p,details);container.append(el);
    }
  } catch{
    if(activeRoute()==='updates')container.textContent='Riwayat belum bisa dimuat dari aplikasi. Lihat Update List di aplikasi utama.';
  }
}
function render(){
  const route=activeRoute();
  syncNavigation(route);
  document.documentElement.dataset.theme=state.theme==='light'?'light':'dark';
  $('#themeToggle').textContent=state.theme==='dark'?'☀':'☾';
  closeMenu();
  const renderer={landing:renderLanding,home:renderHome,dashboard:renderDashboard,
    subjects:renderSubjects,notes:renderNotes,exams:renderExams,streaks:renderStreaks,
    lesson:renderLesson,leaderboard:renderLeaderboard,pinned:renderPinned,
    profile:renderProfile,updates:renderUpdates}[route];
  renderer();
}
let pendingFileName = null;
function openAddDialog(kind){
  const dialog=$('#editDialog');
  dialog.dataset.kind=kind;
  const note=state.notes.find(n=>n.id===state.selectedNote);
  const edit=kind==='edit';
  $('#dialogTitle').textContent=kind==='subject'?'Tambah Mata Pelajaran':
    edit?'Edit judul materi':kind==='upload'?'Simpan Materi dari Berkas':'Buat Catatan Belajar';
  const label=$('label[for="itemName"]');
  label.textContent=kind==='subject'?'Nama mata pelajaran':'Judul topik belajar';
  $('#itemName').placeholder=kind==='subject'?'Misalnya: Biologi':'Misalnya: Ekosistem dan Interaksi Makhluk Hidup';
  $('#itemName').value=edit?note?.title||'':'';
  const subjectRow=$('#subjectRow');
  subjectRow.hidden=kind==='subject';
  const select=$('#itemSubject');
  const available=['Biologi','Matematika','Bahasa Inggris','Kimia','Sejarah','Fisika','Tanpa pelajaran',...state.subjects.map(s=>s.name)];
  select.replaceChildren(...[...new Set(available)].map(name=>{
    const option=document.createElement('option');option.value=name;option.textContent=name;return option;
  }));
  select.value=edit?note?.subject||'Tanpa pelajaran':'Tanpa pelajaran';
  $('#sourceHint').hidden=kind!=='upload';
  $('#sourceHint').textContent=kind==='upload'
    ? 'Sumber: '+(pendingFileName||'berkas dipilih')+'. Berkas tidak diproses AI dalam prototipe. Isi judul berdasarkan topiknya, bukan nama berkas.'
    : '';
  dialog.showModal();
  $('#itemName').focus();
}
function saveDialog(){
  const value=$('#itemName').value.trim();
  if(!value){notify('Isi judul topik dulu.');return;}
  const kind=$('#editDialog').dataset.kind;
  const id='demo-'+Date.now()+'-'+Math.floor(Math.random()*10000);
  if(kind==='subject'){
    if(state.subjects.some(s=>s.name.toLowerCase()===value.toLowerCase())){
      notify('Mata pelajaran ini sudah ada di prototipe.');return;
    }
    state.subjects.push({id,name:value});
  } else if(kind==='edit'){
    const note=state.notes.find(n=>n.id===state.selectedNote);
    if(!note){notify('Materi tidak ditemukan.');return;}
    note.title=value;
    note.subject=$('#itemSubject').value;
    note.date=Date.now();
  } else {
    // An uploaded file is kept only as filename metadata; no PDF parsing or AI
    // inference occurs in the standalone demo. User-supplied topic is the title.
    state.notes.unshift({id,title:value,subject:$('#itemSubject').value,
      kind:kind==='upload'?'Materi':'Catatan',date:Date.now(),
      summary:'Catatan baru — isi materi dan susun penjelasan sesuai topikmu.',
      sourceFile:kind==='upload'?pendingFileName:null,chapters:[defaultChapter()]});
    state.selectedNote=id;
    state.chapter=0;
  }
  pendingFileName=null;
  store();$('#editDialog').close();
  if(kind==='edit')renderLesson();
  else if(kind==='subject')render();
  else {if(location.hash==='#lesson')renderLesson();else location.hash='#lesson';}
  notify('Materi tersimpan sebagai catatan terstruktur dalam prototipe.');
}
function resetDemo(){
  state=seed();store();timer={remaining:1500,running:false,endAt:0};
  location.hash='#home';render();notify('Data contoh dipulihkan. Data aplikasi asli tidak disentuh.');
}
function updateTimer(){
  if(!timer.running)return;
  timer.remaining=Math.max(0,Math.ceil((timer.endAt-Date.now())/1000));
  const display=$('#timerDisplay');
  if(display){
    const m=String(Math.floor(timer.remaining/60)).padStart(2,'0');
    const s=String(timer.remaining%60).padStart(2,'0');
    display.textContent=m+':'+s;
  }
  if(timer.remaining===0){timer.running=false;notify('Sesi fokus contoh selesai.');if(activeRoute()==='dashboard')render();}
}
setInterval(updateTimer,500);
window.addEventListener('hashchange',render);
$('#themeToggle').addEventListener('click',()=>{
  state.theme=state.theme==='dark'?'light':'dark';store();render();
});
$('#mobileMenu').addEventListener('click',()=>{
  const open=$('#app').classList.toggle('menu-open');$('#backdrop').hidden=!open;
  $('#mobileMenu').setAttribute('aria-expanded',String(open));
});
$('#backdrop').addEventListener('click',closeMenu);
$('#modeSwitch').addEventListener('click',()=>{location.hash=activeRoute()==='home'?'#dashboard':'#home';});
$('#resetDemo').addEventListener('click',resetDemo);
$('#closeDialog').addEventListener('click',()=>$('#editDialog').close());
$('#cancelDialog').addEventListener('click',()=>$('#editDialog').close());
$('#editForm').addEventListener('submit',event=>{event.preventDefault();saveDialog();});
document.addEventListener('input',event=>{
  if(event.target.id==='homePrompt'){state.draft=event.target.value;store();}
  if(event.target.id==='noteSearch'){state.search=event.target.value;store();renderNotesGrid();}
  if(event.target.id==='subjectSearch')renderFilteredSubjects();
});
document.addEventListener('change',event=>{
  if(event.target.id==='previewFileInput'){
    const file=event.target.files?.[0];
    if(file){pendingFileName=file.name;openAddDialog('upload');}
    return;
  }
  if(event.target.id==='noteKind'){state.noteFilter=event.target.value;store();renderNotesGrid();}
  if(event.target.id==='noteSort'){state.sort=event.target.value;store();renderNotesGrid();}
});
document.addEventListener('submit',event=>{
  if(event.target.id==='composerForm'){
    event.preventDefault();state.draft=$('#homePrompt').value;store();
    notify('Pertanyaan tersimpan di preview. Klik "Buka Tutor AI aplikasi asli" untuk memakai Gemini.');
  }
  if(event.target.id==='examForm'){
    event.preventDefault();state.examStarted=true;state.examAnswer='';store();
    $('#examResult').innerHTML=examDemoMarkup();notify('Simulasi antarmuka dimulai. Tidak memakai kuota AI.');
  }
});
document.addEventListener('click',event=>{
  const note=event.target.closest('[data-note]');
  if(note){state.selectedNote=note.dataset.note;state.chapter=0;store();location.hash='#lesson';return;}
  const chapter=event.target.closest('[data-chapter]');
  if(chapter){state.chapter=Number(chapter.dataset.chapter);store();renderLesson();return;}
  const tab=event.target.closest('[data-profile-tab]');
  if(tab){state.profileTab=Number(tab.dataset.profileTab);store();renderProfile();return;}
  const layout=event.target.closest('[data-layout]');
  if(layout){state.layout=layout.dataset.layout;store();render();return;}
  const answer=event.target.closest('[data-answer]');
  if(answer){state.examAnswer=answer.dataset.answer;store();$('#examResult').innerHTML=examDemoMarkup();return;}
  const action=event.target.closest('[data-action]');
  if(!action)return;
  switch(action.dataset.action){
    case 'add-note':openAddDialog('note');break;
    case 'edit-note':openAddDialog('edit');break;
    case 'edit-chapter': {
      const editor=$('#chapterEditor');
      if(editor){editor.hidden=!editor.hidden;if(!editor.hidden)$('#chapterBody').focus();}
      break;
    }
    case 'save-chapter': {
      const note=state.notes.find(n=>n.id===state.selectedNote);
      if(!note)break;
      note.chapters[state.chapter].body=$('#chapterBody').value.trim();
      store();renderLesson();notify('Isi bab tersimpan dalam sesi demo.');break;
    }
    case 'add-subject':openAddDialog('subject');break;
    case 'remove-subject':
      state.subjects=state.subjects.filter(s=>s.id!==action.dataset.subject);
      store();renderSubjects();notify('Mata pelajaran contoh dihapus.');break;
    case 'theme':state.theme=state.theme==='dark'?'light':'dark';store();render();break;
    case 'timer-toggle':
      if(timer.running)timer.running=false;
      else {timer.endAt=Date.now()+timer.remaining*1000;timer.running=true;}
      renderDashboard();break;
    case 'timer-reset':
      timer={remaining:1500,running:false,endAt:0};renderDashboard();break;
    case 'recorder':notify('Rekam mikrofon belum disambungkan di preview. Gunakan fitur asli di aplikasi.');break;
    case 'upload':$('#previewFileInput')?.click();break;
    case 'youtube':notify('YouTube tersedia pada aplikasi asli, jika caption/transkrip diizinkan.');break;
  }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
if(!location.hash)location.replace('#home');
else render();
