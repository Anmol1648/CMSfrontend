/**
 * Shrinks a photo in the browser before upload (keeps the aspect ratio). A 4 MB phone photo of a
 * campus becomes a few hundred KB, uploads quickly and loads quickly on the sign-in page.
 */
export const resizeImage = async (file: File, maxSide: number, opts: { keepTransparency?: boolean; quality?: number } = {}): Promise<File> => {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // unknown format: let the server decide
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const png = opts.keepTransparency && file.type === "image/png";
  // Already small and in a good format: upload as is.
  if (scale === 1 && (png || file.size < 600_000)) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  if (!png) {
    ctx.fillStyle = "#ffffff"; // JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const type = png ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, opts.quality ?? 0.85));
  if (!blob) return file;
  const name = file.name.replace(/\.[^.]+$/, "") + (png ? ".png" : ".jpg");
  return new File([blob], name, { type });
};
