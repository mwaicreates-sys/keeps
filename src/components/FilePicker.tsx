"use client";

import { useId } from "react";
import { UploadCloud, X } from "lucide-react";

export function FilePicker({
  accept,
  multiple,
  required,
  files,
  onChange,
  label,
}: {
  accept: string;
  multiple?: boolean;
  required?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
  label: string;
}) {
  const id = useId();

  return (
    <div>
      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        required={required && files.length === 0}
        onChange={(e) => onChange(Array.from(e.target.files ?? []))}
        className="sr-only"
      />
      {files.length === 0 ? (
        <label
          htmlFor={id}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line px-4 py-8 text-center transition hover:border-accent/50 hover:bg-accent-soft/30"
        >
          <UploadCloud size={22} className="text-ink-soft" />
          <span className="text-sm text-ink-soft">
            Tap to choose {label.toLowerCase()}
            {multiple ? "s" : ""}
          </span>
        </label>
      ) : (
        <ul className="space-y-1.5">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-line bg-paper px-3.5 py-2.5"
            >
              <span className="truncate text-sm">{file.name}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${file.name}`}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-accent-soft hover:text-accent"
              >
                <X size={14} />
              </button>
            </li>
          ))}
          <label
            htmlFor={id}
            className="block cursor-pointer text-center text-xs font-medium text-accent"
          >
            {multiple ? "Add more" : "Choose a different file"}
          </label>
        </ul>
      )}
    </div>
  );
}
