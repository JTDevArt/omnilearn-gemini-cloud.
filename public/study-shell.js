(() => {
  const labels = {chat:'Tanya AI',summary:'Ringkasan',cards:'Flashcard',quiz:'Latihan soal',map:'Mindmap',plan:'Rencana belajar',translate:'Terjemahan',research:'Riset'};
  function mount(workspace) {
    workspace.classList.add('study-workspace');
    const body=workspace.querySelector('.workspace-body');
    const center=body.querySelector('.content-panel');
    const legacySources=body.querySelector('.side-panel');
    const settings=document.createElement('details');
    settings.className='study-settings';
    const summary=document.createElement('summary');summary.textContent='Sumber dan bahasa hasil';settings.append(summary);
    settings.append(document.querySelector('#materialLabel'),document.querySelector('#aiStatus'),document.querySelector('#dropzone'),document.querySelector('#languageToolbar'),legacySources);
    center.prepend(settings);
    const chapters=document.createElement('nav');chapters.className='study-chapters';chapters.setAttribute('aria-label','Daftar bab');
    const tools=document.createElement('aside');tools.className='study-tools';tools.setAttribute('aria-label','Alat belajar');
    const title=document.createElement('h2');title.textContent='Alat belajar';tools.append(title);
    for(const [route,label] of [['journey','Materi dan bab'],['summary','Ringkas dengan AI'],['note-editor','Buat catatan'],['cards','Flashcard'],['quiz','Latihan soal'],['chat','Tanya AI'],['map','Mindmap']]) {
      const link=document.createElement('a');link.href='/dashboard?view='+route;link.dataset.view=route;link.textContent=label;tools.append(link);
    }
    const more=document.createElement('details');more.innerHTML='<summary>Alat lainnya</summary>';
    for(const route of ['plan','translate','research']) {
      const link=document.createElement('a');link.href='/dashboard?view='+route;link.dataset.view=route;link.textContent=labels[route];more.append(link);
    }
    tools.append(more);
    body.replaceChildren(chapters,center,tools);
    const heading=workspace.querySelector('.workspace-head h3');
    const h1=document.createElement('h1');h1.className='study-title';heading.replaceWith(h1);
    const context=document.createElement('p');context.className='study-context';h1.after(context);
    return {update(view,source,title,api) {
      document.body.dataset.studyTool=view;
      h1.textContent=source?title:'Ruang belajar';
      context.textContent=[labels[view],source?.subject || (source?'Tanpa mata pelajaran':'Pilih sumber atau gunakan pertanyaan bebas')].join(' · ');
      chapters.replaceChildren();
      const h2=document.createElement('h2');h2.textContent='Daftar bab';chapters.append(h2);
      const items=source?.journey?.chapters;
      if(Array.isArray(items) && items.length) {
        items.forEach((chapter,index)=>{
          const button=document.createElement('button');button.textContent=(index+1)+'. '+chapter.title;
          button.setAttribute('aria-current',String(source.activeChapter===chapter.id?'page':'false'));
          button.onclick=async()=>{
            const old=source.activeChapter;button.disabled=true;
            source.activeChapter=chapter.id;
            try {await api.persistAsync();api.navigate('journey');}
            catch(error){source.activeChapter=old;button.disabled=false;status.textContent='Bab belum tersimpan: '+error.message;}
          };
          chapters.append(button);
        });
      } else {
        const empty=document.createElement('p');empty.textContent=source?'Bab belum disusun. Buka materi untuk meninjau atau menyusun bab.':'Pilih materi dari Catatan untuk melihat daftar bab.';chapters.append(empty);
      }
      const sourceLink=document.createElement('a');sourceLink.href='/dashboard?view=notes';sourceLink.dataset.view='notes';sourceLink.textContent='Pilih materi';chapters.append(sourceLink);
      const status=document.createElement('p');status.setAttribute('role','status');chapters.append(status);
    }};
  }
  window.OmniStudyShell={mount};
})();
