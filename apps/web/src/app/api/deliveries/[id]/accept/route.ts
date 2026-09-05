import { NextRequest, NextResponse } from "next/server";
import { assertBridgeSecret, deliveryBridgeClient } from "@/lib/delivery-bridge";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!assertBridgeSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { courier_id: courierId } = await req.json();
  if (!courierId) {
    return NextResponse.json({ error: "courier_id é obrigatório" }, { status: 400 });
  }

  const supabase = deliveryBridgeClient();
  // O filtro por status=pending garante que dois entregadores não aceitem
  // o mesmo pedido em corrida — só o primeiro update vence.
  const { data, error } = await supabase
    .from("orders")
    .update({ courier_id: courierId, status: "accepted" })
    .eq("id", params.id)
    .eq("status", "pending")
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "pedido já foi aceito por outro entregador ou não existe" },
      { status: 409 }
    );
  }

  return NextResponse.json(data);
}
