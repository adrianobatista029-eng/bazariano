"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createStory,
  storyStoragePath,
  uploadStoryMedia,
  type StoryContentType,
} from "@marketplace/supabase/queries";
import { upscaleToFullHdIfNeeded } from "@/lib/image-resize";
import { STORY_TYPES, StoryTypeIcon } from "./story-type-icons";

export const JUST_PUBLISHED_STORY_KEY = "bazariano-just-published-story-id";

export function CreateStoryModal({
  myActiveProducts,
  onClose,
}: {
  myActiveProducts: { id: string; title: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [productId, setProductId] = useState(myActiveProducts[0]?.id ?? "");
  const [storyType, setStoryType] = useState<StoryContentType | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"photo" | "video" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setRecording(false);
  }

  // Some ao fechar o modal (troca de tela, cancelar, etc.) pra não deixar a
  // câmera ligada em segundo plano.
  useEffect(() => stopCamera, []);

  async function openCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setError("Não foi possível acessar a câmera — verifique a permissão no navegador.");
    }
  }

  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOpen]);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        handleFile(new File([blob], `story-${Date.now()}.jpg`, { type: "image/jpeg" }));
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  }

  function startRecording() {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      handleFile(new File([blob], `story-${Date.now()}.webm`, { type: "video/webm" }));
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    stopCamera();
  }

  if (myActiveProducts.length === 0) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-elevated"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-foreground">Você precisa ter um anúncio ativo pra postar um story.</p>
          <a
            href="/vender"
            className="mt-4 inline-block rounded-full bg-gradient-to-r from-brand to-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-glow"
          >
            Anunciar agora
          </a>
          <button onClick={onClose} className="mt-3 block w-full text-sm text-muted-foreground">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  async function handleFile(f: File | undefined) {
    if (!f) return;
    const isVideo = f.type.startsWith("video/");
    const finalFile = isVideo ? f : await upscaleToFullHdIfNeeded(f);
    setFile(finalFile);
    setMediaType(isVideo ? "video" : "photo");
    setPreview(URL.createObjectURL(finalFile));
    setError(null);
  }

  async function handlePost() {
    if (!file || !mediaType) {
      setError("Escolha uma foto ou vídeo.");
      return;
    }
    if (!productId) {
      setError("Selecione um anúncio ativo.");
      return;
    }
    if (!storyType) {
      setError("Escolha uma etiqueta pro story.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado.");

      const path = storyStoragePath(user.id, file.name);
      const { url, error: uploadError } = await uploadStoryMedia(supabase, path, file);
      if (uploadError || !url) throw new Error(uploadError?.message ?? "Falha no upload.");

      const { data: created, error: insertError } = await createStory(supabase, {
        seller_id: user.id,
        product_id: productId,
        media_url: url,
        media_type: mediaType,
        story_type: storyType,
      });
      if (insertError) throw new Error(insertError.message);

      if (created?.id) {
        sessionStorage.setItem(JUST_PUBLISHED_STORY_KEY, created.id);
      }
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível postar o story.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
      onClick={() => {
        stopCamera();
        onClose();
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-lg font-bold text-foreground">Postar story</h3>

        <label className="mb-1 block text-sm font-medium text-foreground">Anúncio</label>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="mb-4 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {myActiveProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-sm font-medium text-foreground">Etiqueta do story</label>
        <div className="mb-4 flex flex-wrap gap-2">
          {STORY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setStoryType(t.value)}
              className={
                storyType === t.value
                  ? "flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand to-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  : "flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-brand/20"
              }
            >
              <StoryTypeIcon type={t.value} className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {cameraOpen ? (
          <div className="mb-4 overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} autoPlay muted playsInline className="h-64 w-full object-contain" />
            <div className="flex gap-2 bg-black/80 p-2">
              {!recording ? (
                <>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 rounded-xl bg-white py-2 text-sm font-medium text-black"
                  >
                    📸 Foto
                  </button>
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex-1 rounded-xl bg-destructive py-2 text-sm font-medium text-white"
                  >
                    ⏺️ Gravar
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="flex-1 rounded-xl bg-secondary py-2 text-sm font-medium text-foreground"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex-1 rounded-xl bg-destructive py-2 text-sm font-medium text-white"
                >
                  ⏹️ Parar e usar vídeo
                </button>
              )}
            </div>
          </div>
        ) : preview ? (
          <div className="mb-4 overflow-hidden rounded-xl bg-black">
            {mediaType === "video" ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={preview} className="h-64 w-full object-contain" controls />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-64 w-full object-contain" />
            )}
          </div>
        ) : (
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={openCamera}
              className="flex-1 rounded-xl bg-secondary py-3 text-sm font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
            >
              📷 Câmera
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex-1 rounded-xl bg-secondary py-3 text-sm font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
            >
              🖼️ Galeria
            </button>
          </div>
        )}

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-medium text-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={handlePost}
            disabled={!file || !storyType || uploading || cameraOpen}
            className="flex-1 rounded-xl bg-gradient-to-r from-brand to-primary py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Postando..." : "Postar"}
          </button>
        </div>
      </div>
    </div>
  );
}
