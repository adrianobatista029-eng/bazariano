import { NextRequest, NextResponse } from "next/server";
import { assertBridgeSecret, deliveryBridgeClient } from "@/lib/delivery-bridge";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!assertBridgeSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { status } = await req.json();
  if (!status) {
    return NextResponse.json({ error: "status é obrigatório" }, { status: 400 });
  }

  const supabase = deliveryBridgeClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", params.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });
  }

  return NextResponse.json(data);
}
