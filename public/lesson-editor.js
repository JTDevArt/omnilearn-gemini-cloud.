const fields = [['title','Judul bab'],['objective','Tujuan belajar'],['explanation','Penjelasan'],['example','Contoh'],['formula','Rumus'],['recap','Rangkuman bab'],['question','Pertanyaan latihan'],['answer','Jawaban latihan'],['practiceExplanation','Pembahasan latihan'],['sourceReferences','Referensi sumber (satu penanda per baris)']];
export function chapterEdit(values, sourceText) {
  const read = key => String(values[key] || '').trim().slice(0,20000);
  const result = Object.fromEntries(fields.slice(0,6).map(([key])=>[key,read(key)]));
  result.practice = {question:read('question'),answer:read('answer'),explanation:read('practiceExplanation')};
  if (![result.title,result.objective,result.explanation,...Object.values(result.practice)].every(Boolean)) throw new Error('Isi judul, tujuan, penjelasan, serta latihan dan pembahasannya.');
  const markers = new Set(String(sourceText).match(/\[(?:(?:Halaman|Page)\s+\d+|\d{1,2}:\d{2}(?::\d{2})?)\]/gi) || []);
  result.sourceReferences = [...new Set(read('sourceReferences').split('\n').map(s=>s.trim()).filter(Boolean))];
  if (result.sourceReferences.some(reference=>!markers.has(reference))) throw new Error('Gunakan hanya penanda halaman/waktu yang ada di sumber asli.');
  return result;
}
export function openChapterEditor(chapter, source, api, onSaved) {
  const dialog = document.createElement('dialog'); dialog.className = 'forge-dialog';
  const form = document.createElement('form');
  const title = document.createElement('h2'); title.textContent = 'Edit bab'; form.append(title);
  const values = {...chapter, ...chapter.practice, practiceExplanation:chapter.practice?.explanation, explanation:chapter.explanation,sourceReferences:chapter.sourceReferences?.join('\n')};
  for (const [key,label] of fields) {
    const row=document.createElement('label');row.textContent=label;
    const input=document.createElement('textarea'); input.name=key; input.value=values[key] || '';input.maxLength=20000;input.rows=key==='explanation'?6:2;
    row.append(input);form.append(row);
  }
  const status=document.createElement('p');status.setAttribute('role','status');
  const submit=document.createElement('button');submit.type='submit';submit.textContent='Simpan bab';
  const close=document.createElement('button');close.type='button';close.textContent='Batal';close.onclick=()=>dialog.close();
  form.append(status,submit,close);dialog.append(form);document.body.append(dialog);dialog.showModal();dialog.onclose=()=>dialog.remove();
  form.onsubmit=async event=>{
    event.preventDefault();submit.disabled=true;
    try {
      const edit=chapterEdit(Object.fromEntries(new FormData(form)),source.text);
      source.journeyOriginal ||= structuredClone(source.journey);
      Object.assign(chapter,edit,{editedAt:Date.now()});
      await api.persistAsync();dialog.close();onSaved();
    } catch(error) {status.textContent='Belum tersimpan. '+error.message;submit.disabled=false;}
  };
}
