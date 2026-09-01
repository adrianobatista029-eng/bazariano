"use client";

import { useRef, useState } from "react";

// Segurar uma miniatura levanta ela (efeito "balão") e ela flutua livre por
// cima da grade, seguindo o mouse OU o dedo (Pointer Events unifica os
// dois), sem empurrar as outras fotos. Ao soltar em cima de outra, as duas
// trocam de lugar direto; solto fora, ela volta flutuando pra posição
// original.
export function useDragReorder<T>(setItems: (updater: (prev: T[]) => T[]) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [settleIndex, setSettleIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const suppressClickRef = useRef(false);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setItemRef(index: number) {
    return (el: HTMLElement | null) => {
      itemRefs.current[index] = el;
    };
  }

  // excludeIndex pula a própria foto arrastada: como ela flutua com
  // "transform", o retângulo dela acompanha o dedo/mouse e pode cobrir o
  // alvo embaixo — sem excluir, ela "encontra a si mesma" em vez do que
  // está por baixo.
  function findIndexAt(clientX: number, clientY: number, excludeIndex?: number) {
    return itemRefs.current.findIndex((el, i) => {
      if (!el || i === excludeIndex) return false;
      const rect = el.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    });
  }

  function swap(a: number, b: number) {
    setItems((prev) => {
      if (a < 0 || b < 0 || a >= prev.length || b >= prev.length) return prev;
      const next = [...prev];
      const temp = next[a]!;
      next[a] = next[b]!;
      next[b] = temp;
      return next;
    });
  }

  function onPointerDown(index: number) {
    return (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // Evita o navegador iniciar o próprio drag nativo de imagem (que
      // sequestra o gesto do mouse antes do nosso pointermove customizado
      // conseguir acompanhar) ou selecionar texto ao segurar.
      e.preventDefault();
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
      const startX = e.clientX;
      const startY = e.clientY;
      let dragging = false;
      let finished = false;

      const onMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (!dragging && Math.hypot(dx, dy) > 8) {
          dragging = true;
          setDragIndex(index);
        }
        if (!dragging) return;
        moveEvent.preventDefault();
        setDragOffset({ x: dx, y: dy });

        const overIndex = findIndexAt(moveEvent.clientX, moveEvent.clientY, index);
        setHoverIndex(overIndex !== -1 ? overIndex : null);
      };

      // Não usa setPointerCapture: reposicionar elementos no DOM durante um
      // arraste ativo faz a captura se soltar sozinha, de forma inconsistente
      // entre navegadores. Os listeners já estão no window, então não
      // dependem de captura pra continuar recebendo os eventos.
      function finish(upEvent?: PointerEvent) {
        if (finished) return;
        finished = true;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);

        if (dragging) {
          if (upEvent) {
            const finalIndex = findIndexAt(upEvent.clientX, upEvent.clientY, index);
            if (finalIndex !== -1) {
              swap(index, finalIndex);
            }
          }
          suppressClickRef.current = true;
          setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);

          // Solta a "captura visual" mas mantém o deslocamento acumulado por
          // mais um instante — assim que o CSS de transição entrar (porque
          // dragIndex já não é mais essa foto), anima suavemente de volta pra
          // 0, dando a sensação do balão assentando no lugar novo.
          setDragIndex(null);
          setHoverIndex(null);
          setSettleIndex(index);
          requestAnimationFrame(() => {
            setDragOffset({ x: 0, y: 0 });
          });
          settleTimeoutRef.current = setTimeout(() => {
            setSettleIndex(null);
            setDragOffset(null);
          }, 220);
          return;
        }

        setDragIndex(null);
        setHoverIndex(null);
        setDragOffset(null);
      }

      const onUp = (upEvent: PointerEvent) => finish(upEvent);
      const onCancel = () => finish();

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
    };
  }

  function shouldSuppressClick() {
    return suppressClickRef.current;
  }

  return { dragIndex, settleIndex, hoverIndex, dragOffset, setItemRef, onPointerDown, shouldSuppressClick };
}
