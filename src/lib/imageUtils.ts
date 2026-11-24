export const MAX_IMAGE_FILE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MIME_DEFAULT_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function generateRandomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getSafeImageExtension(file: File): string {
  const rawExt = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (rawExt === 'jpg' || rawExt === 'jpeg' || rawExt === 'png' || rawExt === 'webp') {
    return rawExt;
  }
  return MIME_DEFAULT_EXT[file.type] ?? 'jpg';
}

export function extractCarImagesStoragePath(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null;
  const marker = '/storage/v1/object/public/car-images/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

export async function resizeImageToMaxBounds(
  file: File,
  maxWidth = 800,
  maxHeight = 800
): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const imageEl = new Image();
      imageEl.onload = () => resolve(imageEl);
      imageEl.onerror = () => reject(new Error('image_load_failed'));
      imageEl.src = objectUrl;
    });

    const sourceWidth = img.naturalWidth || img.width;
    const sourceHeight = img.naturalHeight || img.height;

    if (!sourceWidth || !sourceHeight) {
      throw new Error('invalid_image_dimensions');
    }

    const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('canvas_unavailable');
    }

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const outputMime = ALLOWED_IMAGE_MIME_TYPES.has(file.type) ? file.type : 'image/jpeg';
    const quality = outputMime === 'image/png' ? undefined : 0.88;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('canvas_export_failed'));
          }
        },
        outputMime,
        quality
      );
    });

    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
