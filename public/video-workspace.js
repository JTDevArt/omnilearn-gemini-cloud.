import {
  parseSubtitles,
  segmentChapters,
  youtubeId,
  timeLabel,
} from './transcripts.js';
import { sampleVideoScenes } from './video-sampling.js';
const el = (tag, text) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  return n;
};
export async function renderVideo(host, api) {
  const heading = el('h1', 'Video learning');
  host.replaceChildren(heading);
  host.classList.add('video-learning');
  const source = api.getCurrentSource();
  if (!source) {
    host.append(
      el('p', 'Pilih video atau sumber dengan tautan YouTube dari pustaka.')
    );
    return;
  }
  let player, frame, objectUrl;
  const url = source.meta?.sourceUrl || source.meta?.youtubeUrl;
  const status = el('p');
  status.setAttribute('role', 'status');
  if (url) {
    try {
      const id = youtubeId(url);
      frame = el('iframe');
      frame.title = source.name;
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
      frame.allow = 'fullscreen; encrypted-media; picture-in-picture';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      host.append(frame);
      source.meta.videoId = id;
    } catch {
      status.textContent = 'Tautan video tidak valid.';
    }
  } else if (
    source.hasOriginal &&
    /video/.test(source.meta?.extractionMode || '')
  ) {
    const file = await window.OmniLocalLibrary.readFile(
      source.id,
      source.version
    );
    if (!heading.isConnected) return;
    if (file) {
      player = el('video');
      player.controls = true;
      player.preload = 'metadata';
      player.playsInline = true;
      objectUrl = URL.createObjectURL(file);
      player.src = objectUrl;
      player.onerror = () =>
        (status.textContent = 'Format video tidak didukung browser ini.');
      host.append(player);
    }
  }
  if (!player && !frame)
    host.append(
      el(
        'p',
        'File video asli belum tersedia. Sumber ini tetap dapat dipelajari; tambahkan video atau tautan YouTube untuk pemutaran.'
      )
    );
  const speed = el('select');
  speed.setAttribute('aria-label', 'Kecepatan putar');
  for (const rate of [0.5, 0.75, 1, 1.25, 1.5, 2]) {
    const option = el('option', `${rate}×`);
    option.value = rate;
    option.selected = rate === 1;
    speed.append(option);
  }
  speed.onchange = () => {
    if (player) player.playbackRate = Number(speed.value);
    else
      frame?.contentWindow?.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'setPlaybackRate',
          args: [Number(speed.value)],
        }),
        'https://www.youtube-nocookie.com'
      );
  };
  host.append(speed, status);
  const input = el('input');
  input.type = 'file';
  input.accept = '.vtt,.srt';
  input.setAttribute('aria-label', 'Subtitle SRT atau VTT');
  const transcript = el('section'),
    chapters = el('nav');
  chapters.setAttribute('aria-label', 'Bab video');
  host.append(
    el(
      'p',
      'Tambahkan subtitle SRT/VTT untuk navigasi waktu yang berasal dari subtitle. Pengelompokan bab mengikuti rentang waktu, bukan deteksi adegan.'
    ),
    input,
    chapters,
    transcript
  );
  function seek(seconds) {
    if (player) {
      player.currentTime = seconds;
      player.play().catch(() => {});
    } else
      frame?.contentWindow?.postMessage(
        JSON.stringify({
          event: 'command',
          func: 'seekTo',
          args: [seconds, true],
        }),
        'https://www.youtube-nocookie.com'
      );
  }
  function render() {
    transcript.replaceChildren();
    chapters.replaceChildren();
    const segments = source.meta?.transcriptSegments || [];
    for (const chapter of segmentChapters(segments)) {
      const b = el('button', `${timeLabel(chapter.start)} · ${chapter.title}`);
      b.onclick = () => seek(chapter.start);
      chapters.append(b);
    }
    for (const segment of segments) {
      const b = el('button', `${timeLabel(segment.start)} ${segment.text}`);
      b.className = 'transcript-segment';
      b.onclick = () => seek(segment.start);
      transcript.append(b);
    }
    if (player)
      player.ontimeupdate = () => {
        [...transcript.children].forEach((row, i) =>
          row.classList.toggle(
            'active',
            player.currentTime >= segments[i].start &&
              player.currentTime < segments[i].end
          )
        );
      };
  }
  input.onchange = async () => {
    try {
      if (!input.files[0]) return;
      const segments = parseSubtitles(await input.files[0].text());
      source.meta ||= {};
      source.meta.transcriptSegments = segments;
      source.meta.timestampOrigin = 'user-subtitles';
      api.persist();
      render();
      status.textContent = `${segments.length} segmen subtitle disimpan.`;
    } catch (error) {
      status.textContent = error.message;
    }
  };
  render();
  if (player) {
    const scan = el('button', 'Cari perubahan visual tersampel'),
      scenes = el('section');
    function showScenes() {
      scenes.replaceChildren();
      for (const scene of source.meta?.videoScenes || []) {
        const row = el('button', timeLabel(scene.start));
        row.onclick = () => seek(scene.start);
        if (
          typeof scene.thumbnail === 'string' &&
          /^data:image\/jpeg;base64,[\w+/=]+$/.test(scene.thumbnail) &&
          scene.thumbnail.length < 150000
        ) {
          const image = el('img');
          image.src = scene.thumbnail;
          image.width = 160;
          image.height = 90;
          image.alt = 'Frame video pada ' + timeLabel(scene.start);
          row.prepend(image);
        }
        scenes.append(row);
      }
    }
    scan.onclick = async () => {
      scan.disabled = true;
      try {
        source.meta.videoScenes = await sampleVideoScenes(player, {
          onProgress: (p) => {
            status.textContent = `Memeriksa frame ${p.completed}/${p.total}…`;
          },
        });
        api.persist();
        showScenes();
        status.textContent =
          'Perubahan visual tersampel disimpan. Ini bukan pengenalan makna adegan; perubahan singkat dapat terlewat.';
      } catch (error) {
        status.textContent = error.message;
      } finally {
        scan.disabled = false;
      }
    };
    host.append(scan, scenes);
    showScenes();
  }
  const learning = el('div');
  learning.className = 'panel-actions';
  for (const [view, label] of [
    ['summary', 'Ringkas materi'],
    ['cards', 'Flashcard'],
    ['quiz', 'Kuis'],
  ]) {
    const b = el('button', label);
    b.onclick = () => api.navigate(view);
    learning.append(b);
  }
  host.append(learning);
  const observer = new MutationObserver(() => {
    if (!player?.isConnected && objectUrl) {
      player.pause();
      URL.revokeObjectURL(objectUrl);
      observer.disconnect();
    }
  });
  if (player)
    observer.observe(document.body, { childList: true, subtree: true });
}
window.OmniVideo = { render: renderVideo };
