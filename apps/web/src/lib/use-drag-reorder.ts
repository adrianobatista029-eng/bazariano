"use client";

import { useRef, useState } from "react";

// Reordenar a grade de mídia arrastando com o mouse OU o dedo (Pointer Events
// unifica os dois). Arrasta uma miniatura por cima de outra e ela troca de
// lugar em tempo real, sem precisar de biblioteca externa.
export function useDragReorder<T>(setItems: (updater: (prev: T[]) => T[]) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const suppressClickRef = useRef(false);

  function setItemRef(index: number) {
    return (el: HTMLElement | null) => {
      itemRefs.current[index] = el;
    };
  }

  function findIndexAt(clientX: number, clientY: number) {
    return itemRefs.current.findIndex((el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    });
  }

  function reorder(from: number, to: number) {
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (moved === undefined) return prev;
      next.splice(to, 0, moved);
      return next;
    });
  }

  function onPointerDown(index: number) {
    return (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const target = e.currentTarget as HTMLElement;
      const pointerId = e.pointerId;
      let dragging = false;
      let currentIndex = index;

      const onMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (!dragging && Math.hypot(dx, dy) > 8) {
          dragging = true;
          setDragIndex(currentIndex);
          try {
            target.setPointerCapture(pointerId);
          } catch {
            // ignore
          }
        }
        if (!dragging) return;
        moveEvent.preventDefault();

        const overIndex = findIndexAt(moveEvent.clientX, moveEvent.clientY);
        if (overIndex !== -1 && overIndex !== currentIndex) {
          reorder(currentIndex, overIndex);
          currentIndex = overIndex;
          setDragIndex(overIndex);
        }
      };

      const onUp = (upEvent: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        if (dragging) {
          // Um flick rápido pode pular direto pra posição final sem passar por
          // vários eventos de "move" — resolve a posição de soltura aqui
          // também, não só durante o arraste.
          const finalIndex = findIndexAt(upEvent.clientX, upEvent.clientY);
          if (finalIndex !== -1 && finalIndex !== currentIndex) {
            reorder(currentIndex, finalIndex);
          }
          suppressClickRef.current = true;
          setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        }
        setDragIndex(null);
      };

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
    };
  }

  function shouldSuppressClick() {
    return suppressClickRef.current;
  }

  return { dragIndex, setItemRef, onPointerDown, shouldSuppressClick };
}
