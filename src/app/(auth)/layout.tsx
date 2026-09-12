export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 py-12">
      <div className="mb-8 text-center">
        <p className="font-display text-3xl italic tracking-tight text-ink">keeps</p>
        <p className="mt-1 text-sm text-ink-soft">fun now. worth keeping later.</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
