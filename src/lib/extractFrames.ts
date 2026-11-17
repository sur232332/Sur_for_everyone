/**
 * Turns a phone "walk-around" video into evenly spaced JPEG frames, fully inside the browser.
 * The frames then become the 360° view of a listing.
 */
export interface ExtractOptions {
  count?: number;
  maxWidth?: number;
  quality?: number;
  onProgress?: (done: number, total: number) => void;
  /** Called once the video is read, so the form can warn about a bad recording */
  onInfo?: (info: { width: number; height: number; duration: number }) => void;
}

export async function extractFrames(file: File, opts: ExtractOptions = {}): Promise<Blob[]> {
  const count = opts.count ?? 48;
  const maxWidth = opts.maxWidth ?? 960;
  const quality = opts.quality ?? 0.78;

  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('This video could not be read'));
    });
    const duration = video.duration;
    opts.onInfo?.({ width: video.videoWidth, height: video.videoHeight, duration });
    if (!isFinite(duration) || duration < 2) throw new Error('The video is too short');
    if (duration > 120) throw new Error('The video is longer than 2 minutes');

    const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
    const w = Math.round((video.videoWidth || maxWidth) * scale);
    const h = Math.round((video.videoHeight || maxWidth * 0.5625) * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');

    const frames: Blob[] = [];
    for (let i = 0; i < count; i++) {
      const t = Math.min(duration - 0.05, (i / count) * duration);
      await new Promise<void>((resolve, reject) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        video.onerror = () => reject(new Error('Seeking failed'));
        video.currentTime = t;
      });
      ctx.drawImage(video, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality));
      if (!blob) throw new Error('Could not create a frame');
      frames.push(blob);
      opts.onProgress?.(i + 1, count);
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute('src');
    video.load();
  }
}
