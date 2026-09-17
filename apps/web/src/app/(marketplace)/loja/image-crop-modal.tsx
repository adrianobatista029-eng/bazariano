"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { loadImage, cropToDataUrl } from "@/lib/image-resize";

async function getCroppedImageDataUrl(
  imageSrc: string,
  crop: Area,
  outputSize: number,
  quality: number
): Promise<string> {
  const image = await loadImage(imageSrc);
  return cropToDataUrl(image, crop, outputSize, quality);
}

export function ImageCropModal({
  file,
  aspect,
  cropShape,
  outputSize,
  quality = 0.86,
  onCancel,
  onConfirm,
}: {
  file: File;
  aspect: number;
  cropShape: "round" | "rect";
  outputSize: number;
  quality?: number;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  // O object URL só existe pra essa sessão do modal — libera assim que ele
  // fecha, mas só nos fechamentos reais (cancelar/aplicar), nunca num
  // useEffect de cleanup: no Strict Mode do React (dev) o efeito roda
  // duas vezes ("monta → desmonta simulado → monta de novo"), o que
  // revogava a URL antes da imagem carregar e deixava o preview preto.
  function handleCancel() {
    URL.revokeObjectURL(imageSrc);
    onCancel();
  }

  const handleCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const dataUrl = await getCroppedImageDataUrl(imageSrc, croppedAreaPixels, outputSize, quality);
      URL.revokeObjectURL(imageSrc);
      onConfirm(dataUrl);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="surface-panel w-full max-w-lg overflow-hidden rounded-2xl">
        <div className="relative h-72 w-full bg-black sm:h-96">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={cropShape === "rect"}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-full border border-border px-4 py-2 text-sm text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving || !croppedAreaPixels}
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {saving ? "Aplicando..." : "Aplicar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
