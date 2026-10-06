import { ImageDataLike } from './types';

/**
 * Loads an image from File, Blob, or URL into ImageDataLike.
 * Supports both browser offscreen canvas and Node.js testing environments.
 */
export interface LoadedImageContext {
  canvas?: HTMLCanvasElement;
  ctx?: CanvasRenderingContext2D;
  imageData: ImageDataLike;
  width: number;
  height: number;
  dataUrl: string;
}

export async function loadImageFromSource(
  source: File | Blob | string | Uint8Array
): Promise<LoadedImageContext> {
  // Check if running in Node.js environment (e.g. Vitest)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const fs = await import('fs');
    const jpeg = await import('jpeg-js');
    let buf: Buffer;
    if (typeof source === 'string') {
      buf = fs.readFileSync(source);
    } else if (source instanceof Uint8Array) {
      buf = Buffer.from(source);
    } else {
      throw new Error('Unsupported image source type in Node environment');
    }
    const decoded = jpeg.decode(buf);
    return {
      imageData: {
        width: decoded.width,
        height: decoded.height,
        data: decoded.data
      },
      width: decoded.width,
      height: decoded.height,
      dataUrl: typeof source === 'string' ? source : ''
    };
  }

  // Browser environment
  return new Promise((resolve, reject) => {
    let url: string;
    let needsRevoke = false;

    if (typeof source === 'string') {
      url = source;
    } else if (source instanceof Blob || source instanceof File) {
      url = URL.createObjectURL(source);
      needsRevoke = true;
    } else {
      const blob = new Blob([source as unknown as BlobPart]);
      url = URL.createObjectURL(blob);
      needsRevoke = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Failed to create 2D canvas rendering context.');
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);

        let dataUrl = url;
        if (needsRevoke) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          URL.revokeObjectURL(url);
        }

        resolve({
          canvas,
          ctx,
          imageData,
          width,
          height,
          dataUrl
        });
      } catch (err) {
        if (needsRevoke) URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => {
      if (needsRevoke) URL.revokeObjectURL(url);
      reject(new Error('Failed to load image into browser.'));
    };

    img.src = url;
  });
}
