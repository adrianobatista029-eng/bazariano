"use client";

import { useState } from "react";
import { createReview } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import { StarRating } from "@/lib/star-rating";
import {
  REVIEW_DIMENSIONS,
  REVIEW_TAGS,
  REVIEW_TARGET_LABEL,
  averageRating,
  type ReviewTargetType,
} from "@/lib/review-config";

type OrderForReview = {
  id: string;
  buyer_id: string;
  seller_id: string;
  courier_id: string | null;
  order_items: { product_id: string; products: { id: string; title: string } | null }[];
};

type Block = {
  key: string;
  target: ReviewTargetType;
  revieweeId: string | null;
  productId: string | null;
  title: string;
};

type BlockState = {
  dimensions: Record<string, number>;
  tags: string[];
  comment: string;
};

export function ReviewForm({
  order,
  perspective,
  currentUserId,
  alreadyReviewed,
  onClose,
  onSubmitted,
}: {
  order: OrderForReview;
  perspective: "buyer" | "seller";
  currentUserId: string;
  alreadyReviewed: Set<string>;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const blocks: Block[] = [];

  if (perspective === "buyer") {
    if (!alreadyReviewed.has("seller")) {
      blocks.push({
        key: "seller",
        target: "seller",
        revieweeId: order.seller_id,
        productId: null,
        title: REVIEW_TARGET_LABEL.seller,
      });
    }
    if (order.courier_id && !alreadyReviewed.has("courier")) {
      blocks.push({
        key: "courier",
        target: "courier",
        revieweeId: order.courier_id,
        productId: null,
        title: REVIEW_TARGET_LABEL.courier,
      });
    }
  } else {
    if (!alreadyReviewed.has("buyer")) {
      blocks.push({
        key: "buyer",
        target: "buyer",
        revieweeId: order.buyer_id,
        productId: null,
        title: REVIEW_TARGET_LABEL.buyer,
      });
    }
    if (order.courier_id && !alreadyReviewed.has("courier")) {
      blocks.push({
        key: "courier",
        target: "courier",
        revieweeId: order.courier_id,
        productId: null,
        title: REVIEW_TARGET_LABEL.courier,
      });
    }
  }

  const [state, setState] = useState<Record<string, BlockState>>(() =>
    Object.fromEntries(blocks.map((b) => [b.key, { dimensions: {}, tags: [], comment: "" }]))
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setDimension(blockKey: string, dimKey: string, value: number) {
    setState((prev) => ({
      ...prev,
      [blockKey]: {
        ...prev[blockKey]!,
        dimensions: { ...prev[blockKey]!.dimensions, [dimKey]: value },
      },
    }));
  }

  function toggleTag(blockKey: string, tagCode: string) {
    setState((prev) => {
      const current = prev[blockKey]!;
      const has = current.tags.includes(tagCode);
      return {
        ...prev,
        [blockKey]: {
          ...current,
          tags: has ? current.tags.filter((t) => t !== tagCode) : [...current.tags, tagCode],
        },
      };
    });
  }

  function setComment(blockKey: string, comment: string) {
    setState((prev) => ({ ...prev, [blockKey]: { ...prev[blockKey]!, comment } }));
  }

  async function handleSubmit() {
    setError(null);
    for (const block of blocks) {
      const dims = REVIEW_DIMENSIONS[block.target];
      const blockState = state[block.key]!;
      if (dims.some((d) => !blockState.dimensions[d.key])) {
        setError(`Preencha todas as notas de "${block.title}" antes de enviar.`);
        return;
      }
    }

    setLoading(true);
    const supabase = createClient();

    for (const block of blocks) {
      const blockState = state[block.key]!;
      const { error: insertError } = await createReview(supabase, {
        order_id: order.id,
        reviewer_id: currentUserId,
        reviewee_id: block.revieweeId,
        target_type: block.target,
        product_id: block.productId,
        dimension_ratings: blockState.dimensions,
        overall_rating: averageRating(blockState.dimensions),
        tags: blockState.tags,
        comment: blockState.comment.trim() || null,
      });
      if (insertError) {
        setLoading(false);
        setError(`Erro ao enviar avaliação de "${block.title}": ${insertError.message}`);
        return;
      }
    }

    setLoading(false);
    onSubmitted();
    onClose();
  }

  if (blocks.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Avaliar pedido</h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {blocks.map((block) => (
          <div key={block.key} className="flex flex-col gap-3 rounded-xl border border-border p-4">
            <h4 className="font-semibold text-foreground">{block.title}</h4>
            {REVIEW_DIMENSIONS[block.target].map((dim) => (
              <div key={dim.key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{dim.label}</span>
                <StarRating
                  value={state[block.key]!.dimensions[dim.key] ?? 0}
                  onChange={(v) => setDimension(block.key, dim.key, v)}
                />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {REVIEW_TAGS[block.target].map((tag) => {
                const active = state[block.key]!.tags.includes(tag.code);
                return (
                  <button
                    key={tag.code}
                    type="button"
                    onClick={() => toggleTag(block.key, tag.code)}
                    className={
                      active
                        ? "rounded-full bg-brand px-3 py-1 text-xs font-medium text-brand-foreground"
                        : "rounded-full bg-secondary px-3 py-1 text-xs text-foreground"
                    }
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
            <textarea
              placeholder="Comentário (opcional)"
              value={state[block.key]!.comment}
              onChange={(e) => setComment(block.key, e.target.value)}
              rows={2}
              className="rounded-lg border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ))}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-brand to-primary py-3 font-bold text-primary-foreground shadow-glow disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar avaliação"}
        </button>
      </div>
    </div>
  );
}
