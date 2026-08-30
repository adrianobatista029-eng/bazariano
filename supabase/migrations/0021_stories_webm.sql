-- O botão "Câmera" do story agora grava vídeo de verdade no navegador
-- (MediaRecorder), que no Chrome/Edge só produz webm — libera esse mime type
-- no bucket "stories" (antes só aceitava mp4/quicktime, vindos de upload de
-- arquivo já pronto).
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
where id = 'stories';
