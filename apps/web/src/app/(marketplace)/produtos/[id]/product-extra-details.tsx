import Image from "next/image";
import type { Database } from "@marketplace/supabase";

type Media = Database["public"]["Tables"]["product_media"]["Row"];
type Spec = { label: string; value: string };

// Seção "de baixo" que os grandes marketplaces têm: ficha técnica +
// segunda galeria de fotos de detalhe, separada da capa/vitrine principal
// (essa fica em ProductGallery, lá em cima).
export function ProductExtraDetails({ specs, media }: { specs: unknown; media: Media[] }) {
  const specList = Array.isArray(specs) ? (specs as Spec[]).filter((s) => s?.label && s?.value) : [];
  const detailPhotos = media.filter((m) => m.section === "details" && m.type === "photo");

  if (specList.length === 0 && detailPhotos.length === 0) return null;

  return (
    <div className="grid gap-8 border-t border-border pt-8 md:grid-cols-2">
      {specList.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-bold text-foreground">Especificações</h3>
          <table className="w-full text-sm">
            <tbody>
              {specList.map((spec, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4 font-medium text-muted-foreground">{spec.label}</td>
                  <td className="py-2 text-foreground">{spec.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailPhotos.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-bold text-foreground">Mais fotos</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {detailPhotos.map((photo) => (
              <div key={photo.id} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                <Image src={photo.url} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
