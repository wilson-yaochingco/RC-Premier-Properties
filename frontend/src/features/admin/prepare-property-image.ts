import { UPLOAD_REQUEST_TARGET_BYTES } from "@rc/shared";

export async function preparePropertyImage(file: File): Promise<File> {
  if (file.size <= UPLOAD_REQUEST_TARGET_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      "Unable to prepare this photo. Choose a valid PNG, JPEG, or WebP image.",
    );
  }

  try {
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "Your browser could not prepare this photo. Choose a photo under 4 MiB.",
      );
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let mimeType = "image/webp";
    for (const quality of [0.9, 0.8, 0.7, 0.6, 0.5]) {
      let blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, mimeType, quality),
      );
      if (blob && blob.type !== mimeType && mimeType === "image/webp") {
        mimeType = "image/jpeg";
        blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, mimeType, quality),
        );
      }
      if (!blob) break;
      if (blob.type === mimeType && blob.size <= UPLOAD_REQUEST_TARGET_BYTES) {
        const extension = mimeType === "image/webp" ? "webp" : "jpg";
        return new File([blob], `${file.name.replace(/\.[^.]*$/, "")}.${extension}`, {
          type: blob.type,
          lastModified: file.lastModified,
        });
      }
    }
    throw new Error(
      "This photo could not be reduced below 4 MiB. Choose a smaller photo; nothing was uploaded.",
    );
  } finally {
    bitmap.close();
  }
}
