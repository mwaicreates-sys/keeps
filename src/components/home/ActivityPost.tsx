import { MapPin, Navigation } from "lucide-react";

/**
 * Reference shows a live map for an "is at" post. Keeps has no map
 * integration and the product rule against faking external
 * dependencies means this stays a static, honest visual — not a real
 * map — until a real provider is wired up.
 */
export function ActivityPost({ place }: { place: string }) {
  return (
    <div className="relative h-[240px] w-full overflow-hidden rounded-[20px] bg-gradient-to-br from-[#dcece3] via-[#e8f0e0] to-[#d9e7ee]">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(#c7d9cd 1px, transparent 1px), linear-gradient(90deg, #c7d9cd 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <span className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white text-[#3a362f] shadow-md">
        <Navigation size={19} />
      </span>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
        <MapPin size={30} className="fill-[#3b82f6] text-[#3b82f6]" />
        <p className="rounded-full bg-white/90 px-3.5 py-1.5 text-[15px] font-semibold text-[#3a362f] shadow-sm">{place}</p>
      </div>
    </div>
  );
}
