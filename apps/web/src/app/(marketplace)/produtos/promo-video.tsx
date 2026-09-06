import Link from "next/link";

// Vídeo de propaganda ao lado do carrossel de banners, mesma proporção e
// cantos arredondados — toca em loop, mudo (autoplay no navegador exige
// mudo), sem controles, pra combinar com o resto do topo da home. O botão
// "Anunciar" fica por cima, no mesmo esquema do CTA dos banners (pílula
// colorida, texto branco em negrito).
export function PromoVideo() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border shadow-lg">
      <video
        className="aspect-[12/5] w-full object-cover sm:aspect-[5/2]"
        src="/video/propaganda-bazariano.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      <Link
        href="/vender"
        className="absolute bottom-3 left-3 w-fit rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold text-white shadow-md sm:bottom-4 sm:left-4 sm:px-3.5 sm:py-1.5 sm:text-xs lg:px-5 lg:py-2 lg:text-sm"
      >
        Anunciar
      </Link>
    </div>
  );
}
