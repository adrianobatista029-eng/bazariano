// Vídeo de propaganda ao lado do carrossel de banners, mesma proporção e
// cantos arredondados — toca em loop, mudo (autoplay no navegador exige
// mudo), sem controles, pra combinar com o resto do topo da home.
export function PromoVideo() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border shadow-lg">
      <video
        className="aspect-[12/5] w-full object-cover sm:aspect-[5/2]"
        src="/video/propaganda-bazariano.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
    </div>
  );
}
