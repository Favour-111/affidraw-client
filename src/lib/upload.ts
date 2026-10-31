import { api, ApiError } from './api';

type Target = { method: 'POST' | 'PUT'; url: string; fields?: Record<string, string>; headers?: Record<string, string> };

export const ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime';
const LIMITS: Record<string, number> = { image: 5 * 1024 * 1024, video: 100 * 1024 * 1024 };

/**
 * 1) ask the API for a signed upload target, 2) send the file straight to storage (S3) with progress,
 * 3) ask the API to verify it. Resolves with the public URL.
 */
export async function uploadMedia(file: File, onProgress?: (pct: number) => void): Promise<{ url: string; kind: 'image' | 'video' }> {
  const kind = file.type.startsWith('video/') ? 'video' : 'image';
  if (!ACCEPT.split(',').includes(file.type)) throw new ApiError(400, 'UNSUPPORTED_TYPE', `${file.name}: only JPEG, PNG, WebP images or MP4, WebM, MOV videos.`);
  if (file.size > LIMITS[kind]) throw new ApiError(400, 'TOO_LARGE', `${file.name}: ${kind === 'video' ? 'videos' : 'images'} must be ${LIMITS[kind] / 1024 / 1024} MB or smaller.`);

  const p = await api<{ assetId: string; upload: Target }>('/uploads/presign', { body: { contentType: file.type, size: file.size } });
  await send(p.upload, file, onProgress);
  return api<{ url: string; kind: 'image' | 'video' }>('/uploads/complete', { body: { assetId: p.assetId } });
}

function send(t: Target, file: File, onProgress?: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(t.method, t.url);
    let body: XMLHttpRequestBodyInit = file;
    if (t.method === 'POST') {
      // S3 presigned POST: policy fields first, file last.
      const form = new FormData();
      Object.entries(t.fields ?? {}).forEach(([k, v]) => form.append(k, v));
      form.append('file', file);
      body = form;
    } else {
      Object.entries(t.headers ?? {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.withCredentials = true;
    }
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new ApiError(xhr.status, 'UPLOAD_FAILED', `Upload failed (${xhr.status}). Please try again.`)));
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK', 'Upload failed — check your connection and try again.'));
    xhr.send(body);
  });
}
