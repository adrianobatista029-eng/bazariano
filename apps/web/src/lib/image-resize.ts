// Sem bucket de Storage: a foto vira base64 direto na coluna avatar_url.
// Reduzimos antes de converter pra não inflar a tabela profiles com
// imagens gigantes.
export async function resizeImageToDataUrl(
  file: File,
  maxSize = 256,
  quality = 0.82
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      image.src = objectUrl;
    });

    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas não suportado.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

const FULL_HD_MIN_SIDE = 1920;

// Se a foto vier com qualidade abaixo de Full HD, redimensiona (upscale) até
// o lado maior chegar em 1920px. Importante: isso deixa a imagem maior em
// pixels, mas não recupera nitidez que não existia — é interpolação, não
// super-resolução com IA. Fotos que já são Full HD ou maiores não são
// tocadas (nunca reduzimos qualidade aqui).
export async function upscaleToFullHdIfNeeded(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      image.src = objectUrl;
    });

    const maxSide = Math.max(img.width, img.height);
    if (maxSide >= FULL_HD_MIN_SIDE || maxSide === 0) return file;

    const scale = FULL_HD_MIN_SIDE / maxSide;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!blob) return file;
    return new File([blob], file.name, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
