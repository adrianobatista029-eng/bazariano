import { notFound, redirect } from "next/navigation";
import { getProductById } from "@marketplace/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { EditListingForm } from "./edit-form";

export default async function EditarAnuncioPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirectTo=/meus-anuncios/${params.id}/editar`);

  const { data: product, error } = await getProductById(supabase, params.id);

  if (error || !product) notFound();
  if (product.seller_id !== user.id) notFound();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-xl font-semibold">Editar anúncio</h1>
      <EditListingForm product={product} />
    </div>
  );
}
