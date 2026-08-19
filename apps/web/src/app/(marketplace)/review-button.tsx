"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReviewForm } from "./review-form";

type OrderForReview = {
  id: string;
  buyer_id: string;
  seller_id: string;
  courier_id: string | null;
  order_items: { product_id: string; products: { id: string; title: string } | null }[];
};

export function ReviewButton({
  order,
  perspective,
  currentUserId,
  alreadyReviewedKeys,
}: {
  order: OrderForReview;
  perspective: "buyer" | "seller";
  currentUserId: string;
  alreadyReviewedKeys: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const alreadyReviewed = new Set(alreadyReviewedKeys);

  const hasPending =
    perspective === "buyer"
      ? !alreadyReviewed.has("seller") ||
        (!!order.courier_id && !alreadyReviewed.has("courier")) ||
        order.order_items.some(
          (i) => i.products && !alreadyReviewed.has(`product:${i.product_id}`)
        )
      : !alreadyReviewed.has("buyer") || (!!order.courier_id && !alreadyReviewed.has("courier"));

  if (!hasPending) {
    return <span className="text-sm text-muted-foreground">Avaliado ✓</span>;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
      >
        Avaliar
      </button>
      {open && (
        <ReviewForm
          order={order}
          perspective={perspective}
          currentUserId={currentUserId}
          alreadyReviewed={alreadyReviewed}
          onClose={() => setOpen(false)}
          onSubmitted={() => router.refresh()}
        />
      )}
    </>
  );
}
