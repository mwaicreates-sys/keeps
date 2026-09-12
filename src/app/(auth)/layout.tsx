import { StickerField } from "@/components/StickerField";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#0b0b0d] px-6 py-12">
      <StickerField />
      <div className="relative z-10 mb-8 text-center">
        <p className="font-chunky text-4xl font-extrabold tracking-tight text-white">keeps</p>
        <span className="mt-3 inline-block rounded-full bg-[#4ade80] px-3.5 py-1 text-xs font-bold text-[#0b0b0d]">
          fun now · worth keeping later
        </span>
      </div>
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  );
}
