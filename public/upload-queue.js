/* The queue keeps originals in the account-scoped library before extraction. */
(() => {
  const tasks=[];
  let running=false;
  const host=document.createElement('section');
  host.id='uploadQueue'; host.className='upload-queue'; host.setAttribute('aria-label','Antrean unggahan'); host.hidden=true;
  document.querySelector('#ruang-belajar .shell').prepend(host);
  const labels={queued:'Menunggu',running:'Memproses',completed:'Teks tersimpan',failed:'Perlu dicoba kembali',cancelled:'Dibatalkan'};
  const element=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  function draw() {
    host.replaceChildren(element('h2','Unggahan')); host.hidden=!tasks.length;
    for(const task of tasks) {
      const row=element('article'); row.className='upload-row';row.dataset.upload=task.sourceId;
      const title=element('strong',task.name),status=element('p',task.message || labels[task.state]);status.setAttribute('role','status');
      const progress=element('progress');progress.max=7;progress.value=task.stage || 0;progress.setAttribute('aria-label',`Tahap pemrosesan ${task.name}`);
      row.append(title,status,progress);
      if(['queued','running'].includes(task.state)) {
        const cancel=element('button','Batalkan');cancel.type='button';
        cancel.onclick=()=>{
          task.cancelled=true;task.controller?.abort();
          if(task.jobId) cancelJob(task.jobId);
          if(task.state==='queued') {task.state='cancelled';task.message=labels.cancelled;draw();}
        };row.append(cancel);
      }
      if(['failed','cancelled'].includes(task.state)) {
        const retry=element('button','Coba lagi');retry.type='button';retry.disabled=task.retryAt>Date.now();
        if(retry.disabled)row.append(element('p','Coba setelah '+new Date(task.retryAt).toLocaleString('id-ID')));
        retry.onclick=()=>{if(busy && !running){toast('Tunggu proses AI selesai.');return;}task.state='queued';task.cancelled=false;task.message='Menunggu';draw();pump();};row.append(retry);
      }
      if(['completed','failed','cancelled'].includes(task.state) && window.OmniProduct?.getSource(task.sourceId)) {
        const source=window.OmniProduct.getSource(task.sourceId);
        const form=element('form'),label=element('label','Judul topik'),input=element('input'),save=element('button','Simpan judul'),feedback=element('p');
        input.name='lessonTitle';input.maxLength=180;input.required=true;input.value=source.lessonTitle || '';
        input.placeholder='Tulis topik setelah memeriksa sumber';label.append(input);save.type='submit';feedback.setAttribute('role','status');
        if(source.text?.trim()) import('/lesson-label.js').then(({titleSuggestion})=>{
          const suggestion=titleSuggestion(source.text);
          if(!suggestion || !form.isConnected)return;
          const use=element('button','Gunakan baris pertama teks');use.type='button';
          use.onclick=()=>{input.value=suggestion;input.focus();};
          const description=element('p','Baris pertama hasil ekstraksi: '+suggestion+' · periksa sebelum menyimpan.');
          form.insertBefore(description,feedback);form.insertBefore(use,feedback);
        }).catch(()=>{});
        form.append(label,save,feedback);form.onsubmit=async event=>{
          event.preventDefault();save.disabled=true;
          try {await OmniProduct.renameLesson(task.sourceId,input.value);feedback.textContent='Judul tersimpan.';}
          catch(error){feedback.textContent='Judul belum tersimpan: '+error.message;}
          finally {save.disabled=false;}
        };row.append(form);
      }
      if(task.state==='completed') {
        const open=element('button','Tinjau sumber');open.type='button';
        open.onclick=()=>{if(OmniProduct.selectSource(task.sourceId))OmniProduct.navigate('sources');};row.append(open);
        const source=window.OmniProduct?.getSource(task.sourceId);
        if(source?.meta.partialRead || source?.meta.truncated)row.append(element('p',source.meta.partialReadNotice || 'Teks sebagian. Periksa sumber sebelum analisis AI.'));
        const preview=element('details');preview.append(element('summary','Pratinjau teks'),element('pre',source?.text.slice(0,5000) || ''));row.append(preview);
      }
      if(!['queued','running'].includes(task.state)) {
        const dismiss=element('button','Tutup status');dismiss.type='button';
        dismiss.onclick=()=>{tasks.splice(tasks.indexOf(task),1);draw();};row.append(dismiss);
      }
      host.append(row);
    }
  }
  function cancelJob(id) {
    return safeRequestJson('/api/upload/cancel/'+encodeURIComponent(id),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId})},{stageContext:'upload-cancel'}).catch(()=>{});
  }
  async function pump() {
    if(running || busy || uploadInFlight || !window.OmniProduct) return;
    running=true;
    try {
      for(const task of tasks) {
        if(task.state!=='queued')continue;
        task.state='running';task.controller=new AbortController();task.stage=1;task.message='Menyimpan file asli…';draw();
        try {
          task.file ||= await OmniLocalLibrary.readFile(task.sourceId,1);
          if(!task.file)throw new Error('File asli tidak tersedia. Pilih kembali file melalui Unggah.');
          await OmniProduct.stageUpload(task.file,task.sourceId);
          task.controller.signal.throwIfAborted();
          await uploadFile(task.file,{sourceId:task.sourceId,requestId:task.requestId,jobId:task.jobId,signal:task.controller.signal,
            onJob:id=>{task.jobId=id;if(task.cancelled)cancelJob(id);},
            onProgress:(stage,message)=>{task.stage=stage;task.message=message;draw();}});
          task.state='completed';task.stage=7;task.message='Teks dan file asli tersimpan. Tinjau sebelum analisis AI.';task.file=null;
        } catch(error) {
          task.state=task.cancelled || error.isCancelled || error.name==='AbortError'?'cancelled':'failed';
          task.message=task.state==='cancelled'?'Dibatalkan · file asli tetap tersedia.':error.message;
          task.retryAt=error.retryAt;
          if(error.isHttpError || task.state==='cancelled') {task.jobId=null;task.requestId=generateClientRequestId('upload');}
          await OmniProduct.uploadState(task.sourceId,task.state,task.message).catch(()=>{});
        } finally {task.controller=null;draw();}
      }
    } finally {running=false;if(tasks.some(t=>t.state==='queued'))queueMicrotask(pump);}
  }
  async function enqueue(files) {
    const selected=Array.from(files || []), limit=window.OmniCapabilities?.maxFilesPerQueue || 5;
    if(selected.length+tasks.filter(t=>['queued','running','failed','cancelled'].includes(t.state)).length>limit) {toast('Maksimal lima file aktif. Tutup status lama sebelum menambah file.');return;}
    if(busy || uploadInFlight) {toast('Tunggu proses saat ini sebelum menambah unggahan.');return;}
    const added=[];
    for(const file of selected) {
      const ext='.'+file.name.split('.').pop().toLowerCase();
      const allowed=window.OmniCapabilities?.extensions || ['.pdf','.docx','.pptx','.xlsx','.txt','.png','.jpg','.jpeg','.mp3','.wav','.mp4','.mov','.m4a','.webm','.srt','.vtt'];
      if(!allowed.includes(ext) || !file.size || file.size>(window.OmniCapabilities?.maxFileBytes || 15*1024*1024)) {toast(file.name+': format, ukuran, atau isi file tidak valid.');continue;}
      if(tasks.some(t=>t.file && t.file.name===file.name && t.file.size===file.size && t.file.lastModified===file.lastModified)) {toast('File sudah ada dalam antrean.');continue;}
      const task={sourceId:crypto.randomUUID(),file,name:file.name,state:'queued',requestId:generateClientRequestId('upload')};
      tasks.push(task);added.push(task);
    }
    draw();
    for(const task of added) {
      try {await OmniProduct.stageUpload(task.file,task.sourceId);}
      catch(error) {task.state='failed';task.message=error.message;}
    }
    draw();await pump();
  }
  document.addEventListener('paste',event=>{
    const files=Array.from(event.clipboardData?.files || []);
    if(files.length && !event.target.closest('input,textarea,[contenteditable=true]')) {event.preventDefault();enqueue(files);}
  });
  window.OmniUploads={enqueue,hasPending:()=>running || tasks.some(t=>t.state==='queued'),restore() {
    for(const source of OmniProduct.snapshot().sources) {
      if(source.meta?.uploadState && source.meta.uploadState!=='completed')
        tasks.push({sourceId:source.id,name:source.name,state:'failed',message:'Unggahan belum selesai. File asli dapat dicoba kembali.',requestId:generateClientRequestId('upload')});
    }
    draw();
  }};
})();
