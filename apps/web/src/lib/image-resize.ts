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
