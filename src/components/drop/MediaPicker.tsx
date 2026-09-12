"use client";

import { useEffect, useId, useMemo } from "react";
import { Camera, Plus, X } from "lucide-react";

/**
 * A visual stand-in for the raw `<input type="file">` control — the
 * native input stays mounted but visually hidden (`sr-only`) and every
 * tap routes through it, so the browser's real file/camera picker still
 * opens (a webapp has no other way to reach photos on the device); what
 * the user sees is a custom preview grid instead of "Choose Files / No
 * file chosen".
 */
export function MediaPicker({
  accept,
  multiple,
  files,
  onChange,
  kind,
}: {
  accept: string;
  multiple?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
  kind: "photo" | "video";
}) {
  const id = useId();
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p)), [previews]);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    onChange(multiple ? [...files, ...picked] : picked.slice(0, 1));
    e.target.value = "";
  }

  return (
    <div>
      <input id={id} type="file" accept={accept} multiple={multiple} onChange={pick} className="sr-only" />

      {files.length === 0 ? (
        <label
          htmlFor={id}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-[22px] bg-[#f2efe9] px-4 py-10 text-center transition active:scale-[0.99]"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#3a362f] shadow-sm">
            <Camera size={22} strokeWidth={1.8} />
          </span>
          <span className="text-[14.5px] font-medium text-[#7c766c]">
            Tap to choose {kind === "photo" ? "photo" : "video"}
            {multiple ? "s" : ""}
          </span>
        </label>
      ) : kind === "video" ? (
        <div className="relative overflow-hidden rounded-[22px] bg-black" style={{ aspectRatio: "16 / 9" }}>
          <video src={previews[0]} controls className="h-full w-full object-cover" />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <label
              htmlFor={id}
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm"
            >
              <Camera size={16} />
            </label>
            <button
              type="button"
              onClick={() => onChange([])}
              aria-label="Remove video"
              className="grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`} className="relative aspect-square overflow-hidden rounded-2xl bg-[#f2efe9]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previews[i]} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${file.name}`}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {multiple && (
            <label
              htmlFor={id}
              className="grid aspect-square cursor-pointer place-items-center rounded-2xl bg-[#f2efe9] text-[#7c766c]"
            >
              <Plus size={20} />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
