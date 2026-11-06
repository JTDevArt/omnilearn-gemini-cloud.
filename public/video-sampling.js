function waitFor(video, event, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Frame video belum tersedia.'));
      }, timeout),
      done = () => {
        cleanup();
        resolve();
      },
      cleanup = () => {
        clearTimeout(timer);
        video.removeEventListener(event, done);
      };
    video.addEventListener(event, done, { once: true });
  });
}
export async function sampleVideoScenes(
  video,
  { onProgress = () => {}, signal } = {}
) {
  if (video.readyState < 1) await waitFor(video, 'loadedmetadata');
  const duration = video.duration;
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error('Durasi video tidak tersedia.');
  const originalTime = video.currentTime,
    wasPlaying = !video.paused;
  video.pause();
  const sample = document.createElement('canvas');
  sample.width = 64;
  sample.height = 36;
  const ctx = sample.getContext('2d', { willReadFrequently: true }),
    thumb = document.createElement('canvas');
  thumb.width = 320;
  thumb.height = 180;
  const painter = thumb.getContext('2d');
  const step = Math.max(5, duration / 60),
    scenes = [];
  let previous = null,
    index = 0;
  try {
    for (let time = 0.1; time < duration; time += step) {
      signal?.throwIfAborted();
      if (!video.isConnected)
        throw new Error('Pemutar ditutup; pengambilan frame dibatalkan.');
      const target = Math.min(time, duration - 0.05);
      if (Math.abs(video.currentTime - target) > 0.01) {
        const ready = waitFor(video, 'seeked');
        video.currentTime = target;
        await ready;
      }
      if (video.readyState < 2) await waitFor(video, 'loadeddata');
      ctx.drawImage(video, 0, 0, 64, 36);
      const pixels = ctx.getImageData(0, 0, 64, 36).data;
      let delta = 0;
      if (previous)
        for (let i = 0; i < pixels.length; i += 4)
          delta +=
            Math.abs(pixels[i] - previous[i]) +
            Math.abs(pixels[i + 1] - previous[i + 1]) +
            Math.abs(pixels[i + 2] - previous[i + 2]);
      delta /= 64 * 36 * 3;
      if ((!previous || delta > 25) && scenes.length < 24) {
        painter.drawImage(video, 0, 0, 320, 180);
        scenes.push({
          start: target,
          thumbnail: thumb.toDataURL('image/jpeg', 0.65),
          method: 'sampled-pixel-difference',
          sampleStepSeconds: step,
        });
      }
      previous = pixels;
      onProgress({ completed: ++index, total: Math.ceil(duration / step) });
    }
    return scenes;
  } finally {
    if (video.isConnected) {
      video.currentTime = originalTime;
      if (wasPlaying) video.play().catch(() => {});
    }
  }
}
