import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef } from "react";
export function Lightbox({
  photos,
  index,
  title,
  setIndex,
  close,
}: {
  photos: string[];
  index: number;
  title: string;
  setIndex: (index: number) => void;
  close: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<number | null>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft")
        setIndex((index - 1 + photos.length) % photos.length);
      if (event.key === "ArrowRight") setIndex((index + 1) % photos.length);
      if (event.key === "Tab") {
        const buttons = [
          ...document.querySelectorAll<HTMLButtonElement>(".lightbox button"),
        ];
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close, index, photos.length, setIndex]);
  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${title}，第 ${index + 1} 张照片`}
      onTouchStart={(e) => {
        touchStart.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStart.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(delta) > 60)
          setIndex(
            (index + (delta < 0 ? 1 : -1) + photos.length) % photos.length,
          );
        touchStart.current = null;
      }}
    >
      <div className="lightbox-top">
        <span>
          {title}{" "}
          <small>
            {index + 1} / {photos.length}
          </small>
        </span>
        <button ref={closeRef} onClick={close} aria-label="关闭大图">
          <X size={24} />
        </button>
      </div>
      <div
        className="lightbox-stage"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <img src={photos[index]} alt={`${title} · 第 ${index + 1} 张`} />
      </div>
      {photos.length > 1 && (
        <>
          <button
            className="lightbox-prev"
            onClick={() =>
              setIndex((index - 1 + photos.length) % photos.length)
            }
            aria-label="上一张"
          >
            <ChevronLeft />
          </button>
          <button
            className="lightbox-next"
            onClick={() => setIndex((index + 1) % photos.length)}
            aria-label="下一张"
          >
            <ChevronRight />
          </button>
        </>
      )}
      <p className="lightbox-hint">方向键切换 · ESC 退出 · 手机可左右滑动</p>
    </div>
  );
}
