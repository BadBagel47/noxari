import sourceImages from '../data/object-images.json';

export type ObjectImage = {
  id: string;
  file: string;
  downloadUrl: string;
  sha256: string;
  sourceUrl: string;
  credit: string;
  license: string;
  licenseUrl: string;
  altEn: string;
  altSv: string;
  note?: string;
};

export const objectImages: Record<string, ObjectImage> = Object.fromEntries(
  (sourceImages as ObjectImage[]).map(image => [image.id, image]),
);
