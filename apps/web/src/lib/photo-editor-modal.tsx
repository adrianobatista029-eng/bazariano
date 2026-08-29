"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Canvas,
  FabricImage,
  Rect,
  Textbox,
  Group,
  Shadow,
  filters,
} from "fabric";

// Editor de fotos client-side (Fabric.js). Remoção de fundo usa
// @imgly/background-removal, que roda 100% no navegador (WASM + modelo de
// segmentação), sem servidor/API própria — importado sob demanda (só quando o
// usuário clica) pra não pesar o bundle inicial da página.

const CANVAS_SIZE = { width: 520, height: 520 };

type AspectPreset = "1:1" | "4:5" | "16:9" | "original";

const ASPECT_RATIOS: Record<Exclude<AspectPreset, "original">, number> = {
  "1:1": 1,
  "4:5": 4 / 5,
  "16:9": 16 / 9,
};

type Adjustments = {
  brightness: number; // -100..100
  contrast: number; // -100..100
  saturation: number; // -100..100
  temperature: number; // -100..100 (frio..quente)
  shadows: number; // -100..100
  sharpness: number; // 0..100
};

const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  shadows: 0,
  sharpness: 0,
};

type FilterPreset = "nenhum" | "pb" | "sepia" | "vivido" | "quente" | "frio";

const BADGE_PRESETS: { label: string; bg: string; color: string }[] = [
  { label: "NOVO", bg: "#16a34a", color: "#ffffff" },
  { label: "PROMOÇÃO", bg: "#dc2626", color: "#ffffff" },
  { label: "USADO", bg: "#6b7280", color: "#ffffff" },
  { label: "FRETE GRÁTIS", bg: "#2563eb", color: "#ffffff" },
];

const FRAME_PRESETS: { label: string; color: string; width: number }[] = [
  { label: "Fina branca", color: "#ffffff", width: 10 },
  { label: "Grossa preta", color: "#111111", width: 24 },
  { label: "Colorida", color: "#f97316", width: 18 },
];

function buildImageFilters(adj: Adjustments) {
  const list: InstanceType<typeof filters.BaseFilter>[] = [];
  if (adj.brightness !== 0) {
    list.push(new filters.Brightness({ brightness: adj.brightness / 100 }));
  }
  if (adj.contrast !== 0) {
    list.push(new filters.Contrast({ contrast: adj.contrast / 100 }));
  }
  if (adj.saturation !== 0) {
    list.push(new filters.Saturation({ saturation: adj.saturation / 100 }));
  }
  if (adj.temperature !== 0) {
    // Aproximação de temperatura: aquece puxando o vermelho pra cima e o azul
    // pra baixo (ou o inverso pro "frio") via HueRotation leve + Gamma por canal.
    const t = adj.temperature / 100;
    list.push(
      new filters.Gamma({
        gamma: [1 - t * 0.25, 1, 1 + t * 0.25],
      })
    );
  }
  if (adj.shadows !== 0) {
    // Aproximação de sombras: Gamma uniforme levanta/afunda os tons escuros.
    const s = adj.shadows / 100;
    const g = 1 - s * 0.4;
    list.push(new filters.Gamma({ gamma: [g, g, g] }));
  }
  if (adj.sharpness > 0) {
    const amount = adj.sharpness / 100;
    const k = amount * 1.5;
    list.push(
      new filters.Convolute({
        matrix: [0, -k, 0, -k, 1 + 4 * k, -k, 0, -k, 0],
      })
    );
  }
  return list;
}

function applyPreset(preset: FilterPreset, adj: Adjustments): Adjustments {
  switch (preset) {
    case "pb":
      return { ...DEFAULT_ADJUSTMENTS, saturation: -100 };
    case "sepia":
      return { ...DEFAULT_ADJUSTMENTS, temperature: 60, saturation: -30 };
    case "vivido":
      return { ...adj, saturation: 45, contrast: 20 };
    case "quente":
      return { ...adj, temperature: 55 };
    case "frio":
      return { ...adj, temperature: -55 };
    default:
      return DEFAULT_ADJUSTMENTS;
  }
}

export function PhotoEditorModal({
  imageUrl,
  isCover = false,
  onCancel,
  onSave,
  onSetCover,
  onRemove,
}: {
  imageUrl: string;
  isCover?: boolean;
  onCancel: () => void;
  onSave: (file: File) => void;
  onSetCover?: () => void;
  onRemove?: () => void;
}) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const imageRef = useRef<FabricImage | null>(null);
  const frameRef = useRef<Rect | null>(null);
  const cropRectRef = useRef<Rect | null>(null);
  const historyRef = useRef<{ stack: string[]; index: number; silent: boolean }>({
    stack: [],
    index: -1,
    silent: false,
  });

  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState<
    | "ajustes"
    | "recorte"
    | "girar"
    | "zoom"
    | "filtros"
    | "texto"
    | "etiquetas"
    | "molduras"
    | "tamanho"
    | "fundo"
  >("ajustes");
  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [preset, setPreset] = useState<FilterPreset>("nenhum");
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [cropMode, setCropMode] = useState(false);
  const [aspect, setAspect] = useState<AspectPreset>("original");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [textStyle, setTextStyle] = useState<{
    color: string;
    bold: boolean;
    shadow: boolean;
    fontSize: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState<string | null>(null);
  const [bgError, setBgError] = useState<string | null>(null);
  const [bgRemoved, setBgRemoved] = useState(false);

  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.silent) return;
    const h = historyRef.current;
    const json = JSON.stringify(canvas.toObject(["selectable"]));
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(json);
    h.index = h.stack.length - 1;
    setCanUndo(h.index > 0);
    setCanRedo(false);
  }, []);

  const restoreHistory = useCallback(async (index: number) => {
    const canvas = canvasRef.current;
    const h = historyRef.current;
    const json = h.stack[index];
    if (!canvas || index < 0 || index >= h.stack.length || !json) return;
    h.silent = true;
    await canvas.loadFromJSON(json);
    canvas.getObjects().forEach((obj) => {
      if ((obj as FabricImage).type === "image") imageRef.current = obj as FabricImage;
      if ((obj as any)._isFrame) frameRef.current = obj as Rect;
    });
    canvas.renderAll();
    h.index = index;
    h.silent = false;
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.stack.length - 1);
  }, []);

  useEffect(() => {
    if (!canvasElRef.current) return;
    const canvas = new Canvas(canvasElRef.current, {
      width: CANVAS_SIZE.width,
      height: CANVAS_SIZE.height,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
    });
    canvasRef.current = canvas;

    FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" }).then((img) => {
      const scale = Math.min(
        CANVAS_SIZE.width / (img.width || 1),
        CANVAS_SIZE.height / (img.height || 1)
      );
      img.set({
        left: CANVAS_SIZE.width / 2,
        top: CANVAS_SIZE.height / 2,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
      });
      imageRef.current = img;
      canvas.add(img);
      canvas.sendObjectToBack(img);
      canvas.renderAll();
      setReady(true);
      pushHistory();
    });

    const onSelection = () => {
      setHasSelection(true);
      const active = canvas.getActiveObject();
      if (active instanceof Textbox) {
        setTextStyle({
          color: (active.fill as string) || "#ffffff",
          bold: active.fontWeight === "bold",
          shadow: !!active.shadow,
          fontSize: active.fontSize || 32,
        });
      } else {
        setTextStyle(null);
      }
    };
    const onSelectionCleared = () => {
      setHasSelection(false);
      setTextStyle(null);
    };
    const onModified = () => pushHistory();
    canvas.on("selection:created", onSelection);
    canvas.on("selection:updated", onSelection);
    canvas.on("selection:cleared", onSelectionCleared);
    canvas.on("object:modified", onModified);

    return () => {
      canvas.dispose();
      canvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aplica ajustes + preset na imagem sempre que mudarem.
  useEffect(() => {
    const img = imageRef.current;
    if (!img || !ready) return;
    img.filters = buildImageFilters(adjustments);
    img.applyFilters();
    canvasRef.current?.renderAll();
  }, [adjustments, ready]);

  const updateAdjustment = (key: keyof Adjustments, value: number) => {
    setPreset("nenhum");
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  };

  const commitAdjustment = () => pushHistory();

  const choosePreset = (p: FilterPreset) => {
    setPreset(p);
    setAdjustments((prev) => applyPreset(p, prev));
    setTimeout(() => pushHistory(), 0);
  };

  const rotateBy = (delta: number) => {
    const img = imageRef.current;
    if (!img) return;
    const next = rotation + delta;
    setRotation(next);
    img.rotate(next);
    canvasRef.current?.renderAll();
    pushHistory();
  };

  const setRotationSlider = (value: number) => {
    const img = imageRef.current;
    if (!img) return;
    setRotation(value);
    img.rotate(value);
    canvasRef.current?.renderAll();
  };

  const setZoomSlider = (value: number) => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    setZoom(value);
    const base = Math.min(
      CANVAS_SIZE.width / (img.width || 1),
      CANVAS_SIZE.height / (img.height || 1)
    );
    img.set({ scaleX: (base * value) / 100, scaleY: (base * value) / 100 });
    canvas.renderAll();
  };

  const startCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setCropMode(true);
    const rect = new Rect({
      left: CANVAS_SIZE.width * 0.15,
      top: CANVAS_SIZE.height * 0.15,
      width: CANVAS_SIZE.width * 0.7,
      height: CANVAS_SIZE.height * 0.7,
      originX: "left",
      originY: "top",
      fill: "rgba(0,0,0,0.15)",
      stroke: "#ffffff",
      strokeWidth: 2,
      strokeDashArray: [8, 6],
      cornerColor: "#ffffff",
      cornerStrokeColor: "#111111",
      transparentCorners: false,
      lockRotation: true,
    });
    rect.setControlsVisibility({ mtr: false });
    cropRectRef.current = rect;
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  };

  const applyCrop = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const rect = cropRectRef.current;
    if (!canvas || !img || !rect) return;

    const rectBounds = rect.getBoundingRect();
    const imgBounds = img.getBoundingRect();

    // Interseção do retângulo de corte com a área real da imagem.
    const left = Math.max(rectBounds.left, imgBounds.left);
    const top = Math.max(rectBounds.top, imgBounds.top);
    const right = Math.min(rectBounds.left + rectBounds.width, imgBounds.left + imgBounds.width);
    const bottom = Math.min(rectBounds.top + rectBounds.height, imgBounds.top + imgBounds.height);
    const width = Math.max(1, right - left);
    const height = Math.max(1, bottom - top);

    const scaleX = img.scaleX || 1;
    const scaleY = img.scaleY || 1;
    const cropX = (left - imgBounds.left) / scaleX;
    const cropY = (top - imgBounds.top) / scaleY;

    img.set({
      cropX,
      cropY,
      width: width / scaleX,
      height: height / scaleY,
      left: left + width / 2,
      top: top + height / 2,
      originX: "center",
      originY: "center",
    });

    canvas.remove(rect);
    cropRectRef.current = null;
    setCropMode(false);
    canvas.renderAll();
    pushHistory();
  };

  const cancelCrop = () => {
    const canvas = canvasRef.current;
    const rect = cropRectRef.current;
    if (canvas && rect) canvas.remove(rect);
    cropRectRef.current = null;
    setCropMode(false);
    canvasRef.current?.renderAll();
  };

  const addText = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const text = new Textbox("Toque para editar", {
      left: CANVAS_SIZE.width / 2,
      top: CANVAS_SIZE.height / 2,
      originX: "center",
      originY: "center",
      fontSize: 32,
      fill: "#ffffff",
      fontWeight: "bold",
      textAlign: "center",
      width: 260,
      shadow: new Shadow({ color: "rgba(0,0,0,0.6)", offsetX: 2, offsetY: 2, blur: 4 }),
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    setTextStyle({ color: "#ffffff", bold: true, shadow: true, fontSize: 32 });
    pushHistory();
  };

  const TEXT_COLORS = [
    "#ffffff",
    "#000000",
    "#ef4444",
    "#f59e0b",
    "#22c55e",
    "#3b82f6",
    "#a855f7",
  ];

  const updateTextColor = (color: string) => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !(active instanceof Textbox)) return;
    active.set({ fill: color });
    canvas.renderAll();
    setTextStyle((prev) => (prev ? { ...prev, color } : prev));
    pushHistory();
  };

  const toggleTextBold = () => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !(active instanceof Textbox)) return;
    const bold = active.fontWeight !== "bold";
    active.set({ fontWeight: bold ? "bold" : "normal" });
    canvas.renderAll();
    setTextStyle((prev) => (prev ? { ...prev, bold } : prev));
    pushHistory();
  };

  const toggleTextShadow = () => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !(active instanceof Textbox)) return;
    const shadow = !active.shadow;
    active.set({
      shadow: shadow ? new Shadow({ color: "rgba(0,0,0,0.6)", offsetX: 2, offsetY: 2, blur: 4 }) : undefined,
    });
    canvas.renderAll();
    setTextStyle((prev) => (prev ? { ...prev, shadow } : prev));
    pushHistory();
  };

  const updateTextFontSize = (fontSize: number) => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !(active instanceof Textbox)) return;
    active.set({ fontSize });
    canvas.renderAll();
    setTextStyle((prev) => (prev ? { ...prev, fontSize } : prev));
  };

  const addPriceTag = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const label = new Textbox("R$ 0,00", {
      fontSize: 30,
      fontWeight: "bold",
      fill: "#ffffff",
      originX: "center",
      originY: "center",
      textAlign: "center",
    });
    const bg = new Rect({
      width: 180,
      height: 60,
      rx: 10,
      ry: 10,
      fill: "#dc2626",
      originX: "center",
      originY: "center",
    });
    const group = new Group([bg, label], {
      left: CANVAS_SIZE.width * 0.22,
      top: CANVAS_SIZE.height * 0.18,
    });
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
    pushHistory();
  };

  const addBadge = (badge: (typeof BADGE_PRESETS)[number]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const label = new Textbox(badge.label, {
      fontSize: 22,
      fontWeight: "bold",
      fill: badge.color,
      originX: "center",
      originY: "center",
      textAlign: "center",
    });
    const bg = new Rect({
      width: Math.max(120, badge.label.length * 14),
      height: 42,
      rx: 21,
      ry: 21,
      fill: badge.bg,
      originX: "center",
      originY: "center",
    });
    const group = new Group([bg, label], {
      left: CANVAS_SIZE.width * 0.25,
      top: CANVAS_SIZE.height * 0.2,
    });
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
    pushHistory();
  };

  const applyFrame = (framePreset: (typeof FRAME_PRESETS)[number] | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (frameRef.current) {
      canvas.remove(frameRef.current);
      frameRef.current = null;
    }
    if (framePreset) {
      const rect = new Rect({
        left: 0,
        top: 0,
        width: CANVAS_SIZE.width,
        height: CANVAS_SIZE.height,
        originX: "left",
        originY: "top",
        fill: "transparent",
        stroke: framePreset.color,
        strokeWidth: framePreset.width,
        selectable: false,
        evented: false,
      });
      (rect as any)._isFrame = true;
      frameRef.current = rect;
      canvas.add(rect);
    }
    canvas.renderAll();
    pushHistory();
  };

  const changeAspect = (next: AspectPreset) => {
    setAspect(next);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = CANVAS_SIZE.width;
    const height = next === "original" ? CANVAS_SIZE.height : width / ASPECT_RATIOS[next];
    canvas.setDimensions({ width, height: Math.round(height) });
    const img = imageRef.current;
    if (img) {
      const scale = Math.min(width / (img.width || 1), height / (img.height || 1));
      img.set({
        left: width / 2,
        top: height / 2,
        scaleX: scale,
        scaleY: scale,
      });
    }
    if (frameRef.current) {
      frameRef.current.set({ width, height });
    }
    canvas.renderAll();
    pushHistory();
  };

  const deleteSelected = () => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (!canvas || !active || active === imageRef.current) return;
    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.renderAll();
    pushHistory();
  };

  const removeBg = async () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    setRemovingBg(true);
    setBgError(null);
    setBgProgress("Carregando modelo...");
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(imageUrl, {
        model: "isnet_fp16",
        output: { format: "image/png" },
        progress: (key, current, total) => {
          setBgProgress(
            key.startsWith("fetch") ? `Baixando modelo (${Math.round((current / total) * 100)}%)` : "Processando..."
          );
        },
      });
      const url = URL.createObjectURL(blob);
      // Mesmas dimensões da imagem original: crop/escala/rotação já aplicados
      // continuam válidos, só trocamos os pixels de baixo.
      await img.setSrc(url, { crossOrigin: "anonymous" });
      img.applyFilters();
      canvas.renderAll();
      setBgRemoved(true);
      pushHistory();
    } catch {
      setBgError("Não foi possível remover o fundo dessa foto. Tente novamente.");
    } finally {
      setRemovingBg(false);
      setBgProgress(null);
    }
  };

  const undo = () => {
    const h = historyRef.current;
    if (h.index > 0) restoreHistory(h.index - 1);
  };
  const redo = () => {
    const h = historyRef.current;
    if (h.index < h.stack.length - 1) restoreHistory(h.index + 1);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      canvas.discardActiveObject();
      canvas.renderAll();
      const dataUrl = canvas.toDataURL({ format: "jpeg", quality: 0.92, multiplier: 1 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `foto-editada-${Date.now()}.jpg`, { type: "image/jpeg" });
      onSave(file);
    } finally {
      setSaving(false);
    }
  };

  const sliderRow = (
    label: string,
    key: keyof Adjustments,
    min: number,
    max: number
  ) => (
    <div key={key} className="mb-4">
      <div className="mb-1 flex items-center justify-between text-sm text-[var(--muted-foreground)]">
        <span>{label}</span>
        <span>{adjustments[key]}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={adjustments[key]}
        onChange={(e) => updateAdjustment(key, Number(e.target.value))}
        onMouseUp={commitAdjustment}
        onTouchEnd={commitAdjustment}
        className="w-full accent-[var(--primary)]"
      />
    </div>
  );

  const tools: { id: typeof tool; label: string }[] = [
    { id: "ajustes", label: "Ajustes" },
    { id: "filtros", label: "Filtros" },
    { id: "recorte", label: "Recorte" },
    { id: "girar", label: "Girar" },
    { id: "zoom", label: "Zoom" },
    { id: "fundo", label: "Remover fundo" },
    { id: "texto", label: "Texto" },
    { id: "etiquetas", label: "Etiquetas" },
    { id: "molduras", label: "Molduras" },
    { id: "tamanho", label: "Formato" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#111318] shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Editar foto</h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 disabled:opacity-30"
            >
              ↶ Desfazer
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 disabled:opacity-30"
            >
              ↷ Refazer
            </button>
            {onSetCover && !isCover && (
              <button
                type="button"
                onClick={() => {
                  onSetCover();
                  onCancel();
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
              >
                Capa
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={() => {
                  onRemove();
                  onCancel();
                }}
                className="rounded-lg px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
              >
                Remover
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!ready || saving}
              className="rounded-lg bg-[var(--primary)] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex flex-1 items-center justify-center overflow-auto p-4">
          <div className="relative">
            <canvas ref={canvasElRef} />
          </div>
        </div>

        <div className="flex w-full flex-col border-t border-white/10 bg-[#111318] p-4 lg:h-auto lg:w-80 lg:border-l lg:border-t-0">
          <div className="mb-4 flex flex-wrap gap-2">
            {tools.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTool(t.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  tool === t.id
                    ? "bg-[var(--primary)] text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {tool === "ajustes" && (
              <div>
                {sliderRow("Brilho", "brightness", -100, 100)}
                {sliderRow("Contraste", "contrast", -100, 100)}
                {sliderRow("Saturação", "saturation", -100, 100)}
                {sliderRow("Temperatura", "temperature", -100, 100)}
                {sliderRow("Sombras", "shadows", -100, 100)}
                {sliderRow("Nitidez", "sharpness", 0, 100)}
              </div>
            )}

            {tool === "filtros" && (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["nenhum", "Nenhum"],
                    ["pb", "P&B"],
                    ["sepia", "Sépia"],
                    ["vivido", "Vívido"],
                    ["quente", "Quente"],
                    ["frio", "Frio"],
                  ] as [FilterPreset, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => choosePreset(id)}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      preset === id
                        ? "bg-[var(--primary)] text-white"
                        : "bg-white/10 text-white/80 hover:bg-white/15"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {tool === "recorte" && (
              <div className="space-y-3 text-sm text-white/80">
                <p>Ajuste o retângulo sobre a área que deseja manter.</p>
                {!cropMode ? (
                  <button
                    type="button"
                    onClick={startCrop}
                    className="w-full rounded-lg bg-[var(--primary)] px-3 py-2 font-medium text-white"
                  >
                    Iniciar recorte
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={applyCrop}
                      className="flex-1 rounded-lg bg-[var(--primary)] px-3 py-2 font-medium text-white"
                    >
                      Aplicar
                    </button>
                    <button
                      type="button"
                      onClick={cancelCrop}
                      className="flex-1 rounded-lg bg-white/10 px-3 py-2 font-medium text-white/80"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}

            {tool === "girar" && (
              <div>
                <div className="mb-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => rotateBy(-90)}
                    className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/15"
                  >
                    ⟲ 90°
                  </button>
                  <button
                    type="button"
                    onClick={() => rotateBy(90)}
                    className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/15"
                  >
                    ⟳ 90°
                  </button>
                </div>
                <div className="mb-1 flex items-center justify-between text-sm text-white/60">
                  <span>Rotação livre</span>
                  <span>{rotation}°</span>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  value={rotation}
                  onChange={(e) => setRotationSlider(Number(e.target.value))}
                  onMouseUp={commitAdjustment}
                  onTouchEnd={commitAdjustment}
                  className="w-full accent-[var(--primary)]"
                />
              </div>
            )}

            {tool === "zoom" && (
              <div>
                <div className="mb-1 flex items-center justify-between text-sm text-white/60">
                  <span>Zoom</span>
                  <span>{zoom}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={250}
                  value={zoom}
                  onChange={(e) => setZoomSlider(Number(e.target.value))}
                  onMouseUp={commitAdjustment}
                  onTouchEnd={commitAdjustment}
                  className="w-full accent-[var(--primary)]"
                />
              </div>
            )}

            {tool === "fundo" && (
              <div className="space-y-3 text-sm text-white/80">
                <p>
                  Remove o fundo da foto automaticamente (IA rodando no seu navegador, sem
                  enviar a imagem pra nenhum servidor). Fica com fundo branco, ideal pra
                  destacar o produto.
                </p>
                <button
                  type="button"
                  onClick={removeBg}
                  disabled={removingBg}
                  className="w-full rounded-lg bg-[var(--primary)] px-3 py-2 font-medium text-white disabled:opacity-50"
                >
                  {removingBg ? bgProgress || "Processando..." : "✂️ Remover fundo"}
                </button>
                {removingBg && (
                  <p className="text-xs text-white/50">
                    Na primeira vez baixa um modelo (pode levar alguns segundos); depois fica
                    em cache no navegador.
                  </p>
                )}
                {bgRemoved && !removingBg && (
                  <p className="text-xs text-green-400">Fundo removido com sucesso.</p>
                )}
                {bgError && <p className="text-xs text-destructive">{bgError}</p>}
              </div>
            )}

            {tool === "texto" && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={addText}
                  className="w-full rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-white"
                >
                  + Adicionar texto
                </button>
                <button
                  type="button"
                  onClick={addPriceTag}
                  className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/15"
                >
                  + Tag de preço
                </button>

                {textStyle && (
                  <div className="space-y-3 rounded-lg border border-white/10 p-3">
                    <div>
                      <p className="mb-1.5 text-xs text-white/60">Cor do texto</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {TEXT_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => updateTextColor(c)}
                            title={c}
                            style={{ background: c }}
                            className={`h-6 w-6 rounded-full border-2 ${
                              textStyle.color === c ? "border-[var(--primary)]" : "border-white/20"
                            }`}
                          />
                        ))}
                        <input
                          type="color"
                          value={textStyle.color}
                          onChange={(e) => updateTextColor(e.target.value)}
                          className="h-6 w-6 cursor-pointer rounded-full border-2 border-white/20 bg-transparent p-0"
                        />
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={toggleTextBold}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold ${
                          textStyle.bold
                            ? "bg-[var(--primary)] text-white"
                            : "bg-white/10 text-white/80 hover:bg-white/15"
                        }`}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={toggleTextShadow}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-sm ${
                          textStyle.shadow
                            ? "bg-[var(--primary)] text-white"
                            : "bg-white/10 text-white/80 hover:bg-white/15"
                        }`}
                      >
                        Sombra
                      </button>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-white/60">
                        <span>Tamanho</span>
                        <span>{textStyle.fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min={14}
                        max={96}
                        value={textStyle.fontSize}
                        onChange={(e) => updateTextFontSize(Number(e.target.value))}
                        onMouseUp={commitAdjustment}
                        onTouchEnd={commitAdjustment}
                        className="w-full accent-[var(--primary)]"
                      />
                    </div>
                  </div>
                )}

                {hasSelection && (
                  <button
                    type="button"
                    onClick={deleteSelected}
                    className="w-full rounded-lg bg-red-500/20 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/30"
                  >
                    Excluir selecionado
                  </button>
                )}
                <p className="pt-1 text-xs text-white/50">
                  Toque no texto na foto para arrastar, redimensionar ou girar.
                </p>
              </div>
            )}

            {tool === "etiquetas" && (
              <div className="space-y-2">
                {BADGE_PRESETS.map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => addBadge(b)}
                    className="flex w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/15"
                  >
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{ background: b.bg, color: b.color }}
                    >
                      {b.label}
                    </span>
                  </button>
                ))}
                {hasSelection && (
                  <button
                    type="button"
                    onClick={deleteSelected}
                    className="w-full rounded-lg bg-red-500/20 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-500/30"
                  >
                    Excluir selecionado
                  </button>
                )}
              </div>
            )}

            {tool === "molduras" && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => applyFrame(null)}
                  className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/15"
                >
                  Nenhuma
                </button>
                {FRAME_PRESETS.map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => applyFrame(f)}
                    className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/15"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {tool === "tamanho" && (
              <div className="space-y-2">
                {(
                  [
                    ["original", "Original"],
                    ["1:1", "Quadrado (1:1)"],
                    ["4:5", "Retrato (4:5)"],
                    ["16:9", "Paisagem (16:9)"],
                  ] as [AspectPreset, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => changeAspect(id)}
                    className={`w-full rounded-lg px-3 py-2 text-sm ${
                      aspect === id
                        ? "bg-[var(--primary)] text-white"
                        : "bg-white/10 text-white/80 hover:bg-white/15"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
