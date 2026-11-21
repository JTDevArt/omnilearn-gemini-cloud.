(() => {
  const labels = {chat:'Tanya AI',summary:'Ringkasan',cards:'Flashcard',quiz:'Latihan soal',map:'Mindmap',plan:'Rencana belajar',translate:'Terjemahan',research:'Riset'};
  const compactTools = matchMedia('(max-width: 900px)');

  function mountMaterialNavigation(nav) {
    const chooser = document.createElement('details');
    chooser.className = 'workspace-tool-chooser';
    const summary = document.createElement('summary');
    summary.textContent = 'Alat belajar';
    const links = document.createElement('div');
    links.className = 'workspace-tool-links';
    links.append(...nav.children);
    chooser.append(summary, links);
    nav.append(chooser);
    const more = links.querySelector(':scope > details');
    const secondaryLinks = more ? [...more.querySelectorAll('a')] : [];
    const secondaryHost = secondaryLinks[0]?.parentElement;
    const sync = () => {
      chooser.open = !compactTools.matches;
      if (!secondaryHost) return;
      more.hidden = compactTools.matches;
      more.open = false;
      if (compactTools.matches) more.before(...secondaryLinks);
      else secondaryHost.append(...secondaryLinks);
    };
    compactTools.addEventListener('change', sync);
    sync();
    chooser.addEventListener('click', event => {
      if (!event.target.closest('a[data-view]')) return;
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        event.stopPropagation();
        return;
      }
      if (compactTools.matches) chooser.open = false;
    });
    chooser.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !compactTools.matches || !chooser.open) return;
      event.preventDefault();
      chooser.open = false;
      summary.focus();
    });
    return chooser;
  }

  compactTools.addEventListener('change', () => {
    for (const outline of document.querySelectorAll('.journey-outline')) outline.open = !compactTools.matches;
  });

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
    const chatMode=document.createElement('section');
    chatMode.className='study-chat-mode';
    chatMode.setAttribute('aria-label','Konteks percakapan');
    const modeDescription=document.createElement('p');
    const modeAction=document.createElement('button');
    modeAction.type='button';
    chatMode.append(modeDescription,modeAction);
    center.prepend(chatMode);
    const chapters = document.createElement('nav');
    chapters.className = 'study-chapters';
    chapters.setAttribute('aria-label', 'Daftar bab');
    const outline = document.createElement('details');
    outline.className = 'study-outline';
    const outlineSummary = document.createElement('summary');
    outlineSummary.textContent = 'Daftar bab';
    outline.append(outlineSummary, chapters);
    const desktopOutline = matchMedia('(min-width: 1151px)');
    const syncOutline = () => { outline.open = desktopOutline.matches; };
    desktopOutline.addEventListener('change', syncOutline);
    syncOutline();
    const tools=document.createElement('nav');tools.className='study-tools';tools.setAttribute('aria-label','Alat belajar');
    for(const [route,label] of [['journey','Materi dan bab'],['summary','Ringkas dengan AI'],['note-editor','Buat catatan'],['cards','Flashcard'],['quiz','Latihan soal'],['chat','Tanya AI'],['map','Mindmap']]) {
      const link=document.createElement('a');link.href='/dashboard?view='+route;link.dataset.view=route;link.textContent=label;tools.append(link);
    }
    const more=document.createElement('details');more.className='study-tools-more';more.innerHTML='<summary>Alat lainnya</summary>';
    for(const [route,label] of [['sources','Sumber'],['podcast','Podcast'],['sticky','Catatan tempel'],['video','Video'],['plan',labels.plan],['translate',labels.translate],['research',labels.research],['recovery','Permintaan tersimpan']]) {
      const link=document.createElement('a');link.href='/dashboard?view='+route;link.dataset.view=route;link.textContent=label;more.append(link);
    }
    tools.append(more);
    const toolChooser = mountMaterialNavigation(tools);
    const toolsHeading = document.createElement('h2');
    toolsHeading.textContent = 'Alat belajar';
    tools.prepend(toolsHeading);
    const layout = () => {
      if (compactTools.matches) body.prepend(tools);
      else body.append(tools);
    };
    body.replaceChildren(outline, center, tools);
    compactTools.addEventListener('change', layout);
    layout();
    const heading=workspace.querySelector('.workspace-head h3');
    const h1=document.createElement('h1');h1.className='study-title';h1.tabIndex=-1;heading.replaceWith(h1);
    const context=document.createElement('p');context.className='study-context';h1.after(context);
    return {update(view,source,title,api) {
      document.body.dataset.studyTool=view;
      if (compactTools.matches) toolChooser.open=false;
      tools.querySelector('[data-view=video]').hidden=!(/video/.test(source?.meta?.extractionMode || '') || source?.meta?.youtubeUrl);
      workspace.querySelector('#teachingMode').hidden=view!=='chat';
      h1.textContent = source ? title : labels[view] || 'Ruang belajar';
      context.textContent = source
        ? [labels[view], source.subject || 'Tanpa mata pelajaran'].filter(Boolean).join(' · ')
        : 'Pilih sumber atau gunakan pertanyaan bebas';
      chatMode.hidden=view!=='chat';
      const documentChat = source && api.getChatScope() === 'document';
      modeDescription.textContent=documentChat
        ? 'Berdasarkan materi: '+title+'. Jawaban harus sesuai sumber ini.'
        : 'Tanya umum. Dokumen tersimpan tidak dikirim dalam percakapan ini.';
      modeAction.textContent=source?(documentChat?'Beralih ke tanya umum':'Pakai materi terpilih'):'Pilih materi untuk dibahas';
      if (source) {
        modeAction.dataset.chatScope = documentChat ? 'general' : 'document';
        delete modeAction.dataset.open;
      } else {
        delete modeAction.dataset.chatScope;
        modeAction.dataset.open = 'notes';
      }
      chapters.replaceChildren();
      const items = source?.journey?.chapters;
      outlineSummary.textContent = items?.length ? `Daftar bab (${items.length})` : 'Daftar bab';
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
  window.OmniStudyShell={mount,mountMaterialNavigation};
})();
