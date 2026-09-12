import { initials } from "@/lib/utils";

export function Avatar({
  name,
  url,
  size = 36,
  shape = "circle",
}: {
  name: string;
  url?: string | null;
  size?: number;
  shape?: "circle" | "square";
}) {
  const radius = shape === "circle" ? "rounded-full" : "rounded-2xl";

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className={`${radius} object-cover`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center ${radius} bg-accent-soft font-display text-accent`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </div>
  );
}
