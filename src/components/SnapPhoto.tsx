"use client";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { uploadPhoto } from "@/app/actions";
import { addDays, dayWord, HISTORY_DAYS } from "@/lib/days";
import styles from "./Photo.module.css";

const MAX_EDGE = 1280; // px on the long side: sharp on a phone, a few hundred KB as JPEG

// Shrinks the picked photo to a JPEG. Browsers apply the photo's rotation when drawing it.
async function shrink(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.85));
    if (!blob) throw new Error("couldn't encode the photo");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// A button that opens the phone's own menu (Photo Library / Take Photo / Choose File), then a Save
// screen: pick the day (today by default), Choose another or Save. Saving replaces that day's photo.
export default function SnapPhoto({ today, taken, className, children }: {
  today: string;
  taken: string[]; // days that already have a photo
  className?: string;
  children: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [day, setDay] = useState(today);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const open = !!preview || !!error;
  const word = dayWord(day, today);

  const pick = () => {
    if (!input.current) return;
    if (!open) setDay(today); // a fresh snap starts on today
    input.current.value = ""; // so picking the same photo again still fires onChange
    input.current.click();
  };

  const close = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setError("");
  };

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const blob = await shrink(file);
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { url: URL.createObjectURL(blob), blob };
      });
    } catch {
      setError("Couldn't open that photo. Try another.");
    }
  }

  function save() {
    if (!preview) return;
    startTransition(async () => {
      const form = new FormData();
      form.set("day", day);
      form.set("photo", new File([preview.blob], "photo.jpg", { type: "image/jpeg" }));
      const r = await uploadPhoto(form);
      if (!r.ok) return setError(r.error);
      close();
      router.refresh(); // shows the new photo on the calendar and progress page
    });
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <>
      <button type="button" className={className} onClick={pick}>{children}</button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      {open && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Progress photo">
          <div className={styles.top}>
            <button type="button" className={styles.close} onClick={close} disabled={pending} aria-label="Close">×</button>
            <label className={styles.dayPick}>
              <span>Saving to <strong>{word}</strong> ▾</span>
              <input
                type="date"
                value={day}
                min={addDays(today, -HISTORY_DAYS)}
                max={today}
                disabled={pending}
                aria-label="Day for this photo"
                onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
                onChange={(e) => e.target.value && setDay(e.target.value)}
              />
            </label>
            <span className={styles.close} aria-hidden="true" />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- a local preview blob */}
          {preview ? <img src={preview.url} alt="Your new progress photo" className={styles.preview} /> : <div className={styles.preview} />}
          <p className={error ? styles.error : styles.note} role={error ? "alert" : undefined}>
            {error || (taken.includes(day) ? `Replaces your photo from ${word}` : "Tap the day above to change it")}
          </p>
          <div className={styles.actions}>
            <button type="button" onClick={pick} disabled={pending}>Choose another</button>
            <button type="button" className="primary" onClick={save} disabled={!preview || pending}>{pending ? "Saving…" : "Save"}</button>
          </div>
        </div>
      )}
    </>
  );
}
