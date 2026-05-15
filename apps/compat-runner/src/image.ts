import type { ImageDimensions } from "./types";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

const readUint32BE = (bytes: Uint8Array, offset: number): number =>
  ((bytes[offset] ?? 0) << 24) |
  ((bytes[offset + 1] ?? 0) << 16) |
  ((bytes[offset + 2] ?? 0) << 8) |
  (bytes[offset + 3] ?? 0);

const isPng = (bytes: Uint8Array): boolean =>
  PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);

const parsePngDimensions = (bytes: Uint8Array): ImageDimensions | null => {
  if (bytes.length < 24 || !isPng(bytes)) {
    return null;
  }

  return {
    width: readUint32BE(bytes, 16),
    height: readUint32BE(bytes, 20)
  };
};

const isJpegStartOfFrame = (marker: number): boolean =>
  marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);

const parseJpegDimensions = (bytes: Uint8Array): ImageDimensions | null => {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    if (marker === undefined || marker === 0xd9 || marker === 0xda) {
      return null;
    }

    const length = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
    if (length < 2) {
      return null;
    }

    if (isJpegStartOfFrame(marker)) {
      return {
        height: ((bytes[offset + 5] ?? 0) << 8) | (bytes[offset + 6] ?? 0),
        width: ((bytes[offset + 7] ?? 0) << 8) | (bytes[offset + 8] ?? 0)
      };
    }

    offset += 2 + length;
  }

  return null;
};

export const parseImageDimensions = (bytes: Uint8Array): ImageDimensions | null =>
  parsePngDimensions(bytes) ?? parseJpegDimensions(bytes);
