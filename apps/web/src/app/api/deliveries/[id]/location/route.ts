import { NextRequest, NextResponse } from "next/server";
import { assertBridgeSecret, deliveryBridgeClient } from "@/lib/delivery-bridge";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!assertBridgeSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { lat, lng } = await req.json();
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "lat e lng são obrigatórios" }, { status: 400 });
  }

  const supabase = deliveryBridgeClient();
  const { error } = await supabase
    .from("orders")
    .update({ courier_lat: lat, courier_lng: lng })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
