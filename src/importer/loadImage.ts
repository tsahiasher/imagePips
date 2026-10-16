import * as jpeg from 'jpeg-js';
import { ImageDataLike } from './types';

/**
 * Loads an image from File, Blob, or URL into ImageDataLike.
 * Uses deterministic JPEG decoding (jpeg-js) for JPEG inputs across both browser and Node.js
 * so browser ICC color profiles / GPU chroma upsampling never alter pixel values,
 * with HTMLCanvasElement fallback for PNG/WebP images.
 */
export interface LoadedImageContext {
  canvas?: HTMLCanvasElement;
  ctx?: CanvasRenderingContext2D;
  imageData: ImageDataLike;
  width: number;
  height: number;
  dataUrl: string;
}

function decodeJpegBytes(bytes: Uint8Array): { width: number; height: number; data: Uint8Array } {
  const decodeFn =
    typeof jpeg.decode === 'function'
      ? jpeg.decode
      : (jpeg as unknown as { default: typeof jpeg }).default.decode;
  return decodeFn(bytes, { useTArray: true, formatAsRGBA: true });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read blob as data URL'));
    reader.readAsDataURL(blob);
  });
}

export async function loadImageFromSource(
  source: File | Blob | string | Uint8Array
): Promise<LoadedImageContext> {
  // Check if running in Node.js environment (e.g. Vitest)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const fsModuleName = 'node:fs';
    const fs = await import(/* @vite-ignore */ fsModuleName);
    let bytes: Uint8Array;
    if (typeof source === 'string') {
      bytes = new Uint8Array(fs.readFileSync(source));
    } else if (source instanceof Uint8Array) {
      bytes = source;
    } else {
      throw new Error('Unsupported image source type in Node environment');
    }
    const decoded = decodeJpegBytes(bytes);
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

  // Browser environment: check if source is a JPEG (0xFF 0xD8) and decode deterministically via jpeg-js
  try {
    let bytes: Uint8Array | null = null;
    let dataUrl = '';

    if (source instanceof Blob || source instanceof File) {
      const ab = await source.arrayBuffer();
      bytes = new Uint8Array(ab);
      if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
        dataUrl = await blobToDataUrl(source);
      }
    } else if (source instanceof Uint8Array) {
      bytes = source;
      if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
        dataUrl = await blobToDataUrl(new Blob([source as unknown as BlobPart], { type: 'image/jpeg' }));
      }
    } else if (typeof source === 'string') {
      const res = await fetch(source);
      const ab = await res.arrayBuffer();
      bytes = new Uint8Array(ab);
      dataUrl = source;
    }

    if (bytes && bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
      const decoded = decodeJpegBytes(bytes);
      return {
        imageData: {
          width: decoded.width,
          height: decoded.height,
          data: decoded.data
        },
        width: decoded.width,
        height: decoded.height,
        dataUrl
      };
    }
  } catch {
    // Fall through to HTMLCanvasElement decoder for non-JPEGs or if fetch/decode fails
  }

  // Browser fallback for PNG / WebP / other image formats
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

        const ctx = canvas.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });
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
