"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Video, Type, Camera, Sparkles, ArrowLeft, SwitchCamera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createStory, storyStoragePath, uploadStoryMedia } from "@marketplace/supabase/queries";
import { upscaleToFullHdIfNeeded } from "@/lib/image-resize";

export const JUST_PUBLISHED_STORY_KEY = "bazariano-just-published-story-id";

type StoryTabType = "photo" | "video" | "texto";

const TEXT_STORY_SIZE = { width: 1080, height: 1350 };

type BackgroundPreset = { id: string; label: string; colors: [string, string] };

const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: "brand", label: "Marca", colors: ["#f37021", "#1b75bc"] },
  { id: "sunset", label: "Pôr do sol", colors: ["#ff512f", "#f09819"] },
  { id: "ocean", label: "Oceano", colors: ["#2193b0", "#6dd5ed"] },
  { id: "night", label: "Noite", colors: ["#0f2027", "#2c5364"] },
  { id: "candy", label: "Doce", colors: ["#ff9a9e", "#fecfef"] },
  { id: "forest", label: "Floresta", colors: ["#134e5e", "#71b280"] },
  { id: "mono", label: "Preto", colors: ["#18181c", "#18181c"] },
];

const TEXT_COLORS = ["#ffffff", "#000000", "#f37021", "#1b75bc", "#ffd60a", "#22c55e"];

type FontOption = { id: string; label: string; family: string; italic: boolean };

const FONT_OPTIONS: FontOption[] = [
  { id: "sans", label: "Padrão", family: "system-ui, sans-serif", italic: false },
  { id: "serif", label: "Serifada", family: "Georgia, serif", italic: false },
  { id: "mono", label: "Mono", family: "ui-monospace, monospace", italic: false },
  { id: "italic", label: "Itálico", family: "system-ui, sans-serif", italic: true },
];

function backgroundCss(bg: BackgroundPreset) {
  return `linear-gradient(135deg, ${bg.colors[0]}, ${bg.colors[1]})`;
}

function pickRecorderMimeType() {
  return ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((type) =>
    MediaRecorder.isTypeSupported(type)
  );
}

type TextPos = { x: number; y: number };

// Desenha o texto (quebrado em linhas) num canvas de qualquer tamanho, na
// posição escolhida pelo usuário (x/y em % arrastando o texto na prévia) —
// usada tanto pro fundo colorido (modo Texto) quanto pra escrever em cima de
// uma foto/vídeo já existente.
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  textColor: string,
  bold: boolean,
  shadow: boolean,
  font: FontOption,
  fontSize: number,
  pos: TextPos = { x: 50, y: 50 }
) {
  ctx.fillStyle = textColor;
  ctx.font = `${font.italic ? "italic " : ""}${bold ? 800 : 600} ${fontSize}px ${font.family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (shadow) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = fontSize * 0.22;
    ctx.shadowOffsetY = fontSize * 0.06;
  } else {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  }

  const maxWidth = width - width * 0.15;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (currentLine && ctx.measureText(testLine).width > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const centerX = (width * pos.x) / 100;
  const centerY = (height * pos.y) / 100;
  const lineHeight = fontSize * 1.2;
  const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => ctx.fillText(line, centerX, startY + i * lineHeight));
}

// Renderiza o texto num canvas com o fundo/cor/fonte/sombra escolhidos e
// converte pra imagem — story de texto vira uma foto normal (mesmo pipeline
// de upload/exibição das outras, sem precisar de coluna nova no banco).
function generateTextStoryImage(
  text: string,
  bg: BackgroundPreset,
  textColor: string,
  bold: boolean,
  shadow: boolean,
  font: FontOption,
  pos: TextPos,
  scale: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = TEXT_STORY_SIZE.width;
    canvas.height = TEXT_STORY_SIZE.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Não foi possível gerar a imagem do texto."));
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, bg.colors[0]);
    gradient.addColorStop(1, bg.colors[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawWrappedText(ctx, text, canvas.width, canvas.height, textColor, bold, shadow, font, 64 * scale, pos);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível gerar a imagem do texto."));
          return;
        }
        resolve(new File([blob], `story-texto-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  });
}

// Queima o texto em cima da foto escolhida (a imagem final já sai com o
// texto — não existe campo separado de legenda no banco).
function applyTextOverlayToImage(
  file: File,
  text: string,
  textColor: string,
  bold: boolean,
  shadow: boolean,
  font: FontOption,
  pos: TextPos,
  scale: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Não foi possível aplicar o texto na foto."));
        return;
      }
      ctx.drawImage(img, 0, 0);
      drawWrappedText(ctx, text, canvas.width, canvas.height, textColor, bold, shadow, font, canvas.width * 0.07 * scale, pos);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Não foi possível aplicar o texto na foto."));
            return;
          }
          resolve(new File([blob], `story-foto-texto-${Date.now()}.jpg`, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => reject(new Error("Não foi possível carregar a foto."));
    img.src = URL.createObjectURL(file);
  });
}

// Regrava o vídeo redesenhando cada quadro num canvas com o texto por cima —
// preserva o áudio original quando o navegador suporta `captureStream` no
// elemento de vídeo (Chrome/Firefox; sem isso, sai só sem áudio).
function applyTextOverlayToVideo(
  file: File,
  text: string,
  textColor: string,
  bold: boolean,
  shadow: boolean,
  font: FontOption,
  pos: TextPos,
  scale: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Não foi possível aplicar o texto no vídeo."));
        return;
      }

      const canvasStream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(30);
      let outputStream: MediaStream = canvasStream;
      try {
        const videoElStream = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
        const audioTracks = videoElStream?.getAudioTracks() ?? [];
        if (audioTracks.length > 0) {
          outputStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
        }
      } catch {
        // sem áudio pra preservar — segue só com o vídeo mesmo.
      }

      const mimeType = pickRecorderMimeType();
      const recorder = new MediaRecorder(outputStream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 2_500_000,
        audioBitsPerSecond: 128_000,
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        resolve(new File([blob], `story-video-texto-${Date.now()}.webm`, { type: "video/webm" }));
      };

      let raf: number;
      function drawFrame() {
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawWrappedText(ctx, text, canvas.width, canvas.height, textColor, bold, shadow, font, canvas.width * 0.07 * scale, pos);
        if (!video.paused && !video.ended) {
          raf = requestAnimationFrame(drawFrame);
        }
      }

      video.onended = () => {
        cancelAnimationFrame(raf);
        recorder.stop();
      };

      try {
        recorder.start();
        await video.play();
        drawFrame();
      } catch {
        reject(new Error("Não foi possível aplicar o texto no vídeo."));
      }
    };

    video.onerror = () => reject(new Error("Não foi possível carregar o vídeo."));
  });
}

// Texto arrastável em cima da prévia (fundo colorido ou foto/vídeo): um dedo
// (ou o mouse) move a posição; dois dedos fazem pinça pra aumentar/diminuir
// (rastreado via Pointer Events, funciona igual em touch e mouse — mouse só
// não consegue "pinçar" com um dedo só, por isso o slider de tamanho no
// painel abaixo é a opção equivalente pro desktop).
function DraggableTextArea({
  containerRef,
  text,
  onTextChange,
  placeholder,
  pos,
  onPosChange,
  scale,
  onScaleChange,
  textColor,
  bold,
  shadow,
  font,
  textSizeClass,
}: {
  containerRef: React.RefObject<HTMLDivElement>;
  text: string;
  onTextChange: (v: string) => void;
  placeholder: string;
  pos: TextPos;
  onPosChange: (p: TextPos) => void;
  scale: number;
  onScaleChange: (s: number) => void;
  textColor: string;
  bold: boolean;
  shadow: boolean;
  font: FontOption;
  textSizeClass: string;
}) {
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartScale = useRef(1);
  const downPos = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Sem isso, o navegador tenta selecionar o texto (marcar/arrastar a
    // seleção) em vez de mover o adesivo — `user-select: none` sozinho não
    // basta porque textarea ignora essa propriedade.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    downPos.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinchStartDist.current = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      pinchStartScale.current = scale;
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (downPos.current && Math.hypot(e.clientX - downPos.current.x, e.clientY - downPos.current.y) > 4) {
      moved.current = true;
    }

    if (pointers.current.size === 2 && pinchStartDist.current) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      onScaleChange(Math.min(2.5, Math.max(0.5, (pinchStartScale.current * dist) / pinchStartDist.current)));
      return;
    }

    if (pointers.current.size === 1 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      onPosChange({ x: Math.min(95, Math.max(5, x)), y: Math.min(95, Math.max(5, y)) });
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStartDist.current = null;
    // Toque/clique rápido sem arrastar = queria digitar, não mover — foca o
    // campo (o preventDefault no pointerdown impediu o foco automático).
    if (!moved.current) {
      textareaRef.current?.focus();
    }
  }

  return (
    <div
      className="absolute cursor-move touch-none"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: "85%",
        transform: `translate(-50%, -50%) scale(${scale})`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full select-none resize-none bg-transparent text-center outline-none placeholder:text-white/60 ${textSizeClass}`}
        style={{
          color: textColor,
          fontFamily: font.family,
          fontStyle: font.italic ? "italic" : "normal",
          fontWeight: bold ? 800 : 600,
          textShadow: shadow ? "0 3px 10px rgba(0,0,0,0.6)" : "none",
        }}
        autoFocus
      />
    </div>
  );
}

export function CreateStoryModal({
  myActiveProducts,
  onClose,
}: {
  myActiveProducts: { id: string; title: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [productId, setProductId] = useState(myActiveProducts[0]?.id ?? "");
  const [tab, setTab] = useState<StoryTabType>("photo");
  const [text, setText] = useState("");
  const [bgId, setBgId] = useState(BACKGROUND_PRESETS[0]!.id);
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]!);
  const [bold, setBold] = useState(true);
  const [shadow, setShadow] = useState(true);
  const [fontId, setFontId] = useState(FONT_OPTIONS[0]!.id);
  const [showTextOverlay, setShowTextOverlay] = useState(false);
  const [textPos, setTextPos] = useState<TextPos>({ x: 50, y: 50 });
  const [textScale, setTextScale] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);
  const selectedBg = BACKGROUND_PRESETS.find((b) => b.id === bgId) ?? BACKGROUND_PRESETS[0]!;
  const selectedFont = FONT_OPTIONS.find((f) => f.id === fontId) ?? FONT_OPTIONS[0]!;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"photo" | "video" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isMobileDevice, setIsMobileDevice] = useState(false);
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

  // Botão de virar câmera só faz sentido em celular (frontal/traseira) — no
  // PC a webcam não tem essa troca, então usa "pointer: coarse" (touch como
  // entrada principal) em vez de user-agent pra decidir se mostra o botão.
  useEffect(() => {
    setIsMobileDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  function switchTab(next: StoryTabType) {
    stopCamera();
    setFile(null);
    setPreview(null);
    setMediaType(null);
    setError(null);
    setText("");
    setShowTextOverlay(false);
    setTextPos({ x: 50, y: 50 });
    setTextScale(1);
    setTab(next);
  }

  async function openCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio:
          tab === "video"
            ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            : false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setError("Não foi possível acessar a câmera — verifique a permissão no navegador.");
    }
  }

  async function flipCamera() {
    const next = facingMode === "environment" ? "user" : "environment";
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: next },
        audio:
          tab === "video"
            ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            : false,
      });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      setFacingMode(next);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError("Não foi possível trocar de câmera.");
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
    // Sem isso, o navegador escolhe o bitrate de áudio sozinho — no Chrome
    // costuma vir baixo o suficiente pra ficar abafado/robótico num vídeo
    // com mais ruído de fundo. 128kbps é o padrão de qualidade "boa" pra voz.
    const mimeType = pickRecorderMimeType();
    const recorder = new MediaRecorder(streamRef.current, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: 128_000,
      videoBitsPerSecond: 2_500_000,
    });
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
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm rounded-[28px] border border-border bg-card p-6 text-center shadow-2xl"
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
    // Se o arquivo escolhido não bate com a aba ativa (ex: usuário forçou um
    // vídeo com a aba "Foto" selecionada), a aba acompanha o tipo real do
    // arquivo — o que já é salvo/exibido corretamente de qualquer forma.
    setTab(isVideo ? "video" : "photo");
  }

  async function handlePost() {
    if (!productId) {
      setError("Selecione um anúncio ativo.");
      return;
    }

    let uploadFile = file;
    let uploadMediaType = mediaType;

    if (tab === "texto") {
      if (!text.trim()) {
        setError("Escreva algo pra postar.");
        return;
      }
      uploadFile = await generateTextStoryImage(
        text.trim(),
        selectedBg,
        textColor,
        bold,
        shadow,
        selectedFont,
        textPos,
        textScale
      );
      uploadMediaType = "photo";
    }

    if (!uploadFile || !uploadMediaType) {
      setError("Escolha uma foto ou vídeo.");
      return;
    }

    setUploading(true);
    setError(null);

    if (tab !== "texto" && showTextOverlay && text.trim()) {
      try {
        uploadFile =
          uploadMediaType === "video"
            ? await applyTextOverlayToVideo(
                uploadFile,
                text.trim(),
                textColor,
                bold,
                shadow,
                selectedFont,
                textPos,
                textScale
              )
            : await applyTextOverlayToImage(
                uploadFile,
                text.trim(),
                textColor,
                bold,
                shadow,
                selectedFont,
                textPos,
                textScale
              );
      } catch (e) {
        setUploading(false);
        setError(e instanceof Error ? e.message : "Não foi possível aplicar o texto.");
        return;
      }
    }

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado.");

      const path = storyStoragePath(user.id, uploadFile.name);
      const { url, error: uploadError } = await uploadStoryMedia(supabase, path, uploadFile);
      if (uploadError || !url) throw new Error(uploadError?.message ?? "Falha no upload.");

      const { data: created, error: insertError } = await createStory(supabase, {
        seller_id: user.id,
        product_id: productId,
        media_url: url,
        media_type: uploadMediaType,
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

  const canPost = tab === "texto" ? text.trim().length > 0 : !!file;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      onClick={() => {
        stopCamera();
        onClose();
      }}
    >
      <div
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[32px] border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 pt-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Criar Story</h2>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <Sparkles size={14} className="text-brand" />
              Compartilhe algo incrível
            </p>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            aria-label="Fechar"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground transition hover:bg-secondary/80 hover:text-foreground"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/letra-x.png" alt="" className="h-5 w-5" />
          </button>
        </div>

        {/* ANÚNCIO */}
        <div className="mx-6 mt-5">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {myActiveProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* TIPO DO STORY */}
        <div className="mx-6 mt-4 flex gap-2 rounded-2xl bg-secondary p-1.5">
          <StoryTab active={tab === "photo"} icon={<ImageIcon size={18} />} label="Foto" onClick={() => switchTab("photo")} />
          <StoryTab active={tab === "video"} icon={<Video size={18} />} label="Vídeo" onClick={() => switchTab("video")} />
          <StoryTab active={tab === "texto"} icon={<Type size={18} />} label="Texto" onClick={() => switchTab("texto")} />
        </div>

        {/* PREVIEW */}
        <div className="mx-6 mt-5">
          <div
            ref={previewRef}
            className="relative aspect-[9/12] overflow-hidden rounded-[26px] border border-border bg-secondary"
          >
            {tab === "texto" ? (
              <div className="relative h-full w-full" style={{ background: backgroundCss(selectedBg) }}>
                <DraggableTextArea
                  containerRef={previewRef}
                  text={text}
                  onTextChange={setText}
                  placeholder="Digite algo..."
                  pos={textPos}
                  onPosChange={setTextPos}
                  scale={textScale}
                  onScaleChange={setTextScale}
                  textColor={textColor}
                  bold={bold}
                  shadow={shadow}
                  font={selectedFont}
                  textSizeClass="text-3xl"
                />
              </div>
            ) : cameraOpen ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
                {!recording && (
                  <button
                    type="button"
                    onClick={stopCamera}
                    aria-label="Voltar"
                    className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                {!recording && isMobileDevice && (
                  <button
                    type="button"
                    onClick={flipCamera}
                    aria-label="Virar câmera"
                    className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
                  >
                    <SwitchCamera size={20} />
                  </button>
                )}
                <div className="absolute inset-x-0 bottom-4 flex items-center justify-center px-4">
                  {!recording ? (
                    <>
                      {tab === "photo" && (
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-white/20 text-white backdrop-blur-md"
                        >
                          <Camera size={22} />
                        </button>
                      )}
                      {tab === "video" && (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-red-500/80 text-white backdrop-blur-md"
                        >
                          <Video size={22} />
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white shadow-lg"
                    >
                      ⏹️ Parar e usar vídeo
                    </button>
                  )}
                </div>
              </>
            ) : preview ? (
              <>
                {mediaType === "video" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={preview} className="h-full w-full object-contain" controls />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Preview" className="h-full w-full object-contain" />
                )}
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setMediaType(null);
                    setText("");
                    setShowTextOverlay(false);
                    setTextPos({ x: 50, y: 50 });
                    setTextScale(1);
                  }}
                  aria-label="Trocar mídia"
                  className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/letra-x.png" alt="" className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowTextOverlay((v) => !v)}
                  aria-label="Adicionar texto"
                  className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition ${
                    showTextOverlay ? "bg-gradient-to-r from-brand to-primary text-primary-foreground" : "bg-black/45 text-white"
                  }`}
                >
                  <Type size={18} />
                </button>
                {showTextOverlay && (
                  <DraggableTextArea
                    containerRef={previewRef}
                    text={text}
                    onTextChange={setText}
                    placeholder="Digite algo..."
                    pos={textPos}
                    onPosChange={setTextPos}
                    scale={textScale}
                    onScaleChange={setTextScale}
                    textColor={textColor}
                    bold={bold}
                    shadow={shadow}
                    font={selectedFont}
                    textSizeClass="text-2xl"
                  />
                )}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand to-primary shadow-glow">
                  {tab === "video" ? <Video size={34} className="text-white" /> : <ImageIcon size={34} className="text-white" />}
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {tab === "video" ? "Adicionar vídeo" : "Adicionar foto"}
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={openCamera}
                    className="flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-brand hover:text-brand-foreground"
                  >
                    <Camera size={16} /> Câmera
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-brand hover:text-brand-foreground"
                  >
                    <ImageIcon size={16} /> Galeria
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {(tab === "texto" || ((tab === "photo" || tab === "video") && showTextOverlay)) && (
          <div className="mx-6 mt-4 flex flex-col gap-3">
            {tab === "texto" && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Fundo</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {BACKGROUND_PRESETS.map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => setBgId(bg.id)}
                      aria-label={bg.label}
                      title={bg.label}
                      className={`h-8 w-8 shrink-0 rounded-full border-2 transition ${
                        bgId === bg.id ? "border-foreground" : "border-transparent"
                      }`}
                      style={{ background: backgroundCss(bg) }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Texto</p>
              <div className="flex flex-wrap items-center gap-2">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTextColor(c)}
                    aria-label={`Cor ${c}`}
                    className={`h-7 w-7 shrink-0 rounded-full border-2 transition ${
                      textColor === c ? "border-brand" : "border-border"
                    }`}
                    style={{ background: c }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setBold((v) => !v)}
                  aria-label="Negrito"
                  className={`flex h-7 items-center justify-center rounded-full px-3 text-xs font-extrabold transition ${
                    bold ? "bg-foreground text-background" : "bg-secondary text-foreground"
                  }`}
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => setShadow((v) => !v)}
                  className={`flex h-7 items-center justify-center rounded-full px-3 text-xs font-medium transition ${
                    shadow ? "bg-foreground text-background" : "bg-secondary text-foreground"
                  }`}
                >
                  Sombra
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {FONT_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFontId(f.id)}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      fontId === f.id
                        ? "bg-gradient-to-r from-brand to-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                    style={{ fontFamily: f.family, fontStyle: f.italic ? "italic" : "normal" }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Tamanho — arraste o texto pra mover; no celular, belisque com dois dedos pra
                  aumentar. No computador, use o controle abaixo.
                </p>
                <input
                  type="range"
                  min={0.5}
                  max={2.5}
                  step={0.05}
                  value={textScale}
                  onChange={(e) => setTextScale(parseFloat(e.target.value))}
                  className="w-full accent-[#f37021]"
                />
              </div>
            </div>
          </div>
        )}

        <input
          ref={galleryInputRef}
          type="file"
          accept={tab === "video" ? "video/*" : "image/*"}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {error && <p className="mx-6 mt-3 text-sm text-destructive">{error}</p>}

        {/* AÇÕES */}
        <div className="flex gap-2 p-6">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-2xl bg-secondary px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary/80"
          >
            Cancelar
          </button>
          <button
            onClick={handlePost}
            disabled={!canPost || uploading || cameraOpen}
            className="group flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            {uploading ? "Postando..." : "Postar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StoryTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition ${
        active
          ? "bg-gradient-to-r from-brand to-primary text-primary-foreground shadow-lg"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
