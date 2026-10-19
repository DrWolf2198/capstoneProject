import { useEffect } from "react";

export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(url);
}

export function isPdfUrl(url: string): boolean {
  return /\.pdf$/i.test(url);
}

interface Props {
  url: string;
  deskripsi?: string | null;
  onClose: () => void;
}

/** Overlay full-size untuk media (foto/video/pdf). Tutup dengan klik / tombol / Esc. */
export default function MediaLightbox({ url, deskripsi, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Tutup"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white text-2xl leading-none hover:bg-white/20 transition"
        onClick={onClose}
      >
        ×
      </button>

      {isVideoUrl(url) ? (
        <video
          src={url}
          controls
          autoPlay
          className="max-w-full max-h-[85vh] rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      ) : isPdfUrl(url) ? (
        <iframe
          src={url}
          title={deskripsi ?? "PDF"}
          className="w-[90vw] h-[85vh] rounded-lg bg-white"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img
          src={url}
          alt={deskripsi ?? ""}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
