/**
 * Shown only for the moment a route inside the authenticated shell is
 * still fetching its data — the header/nav shell (from layout.tsx)
 * stays mounted the whole time, only this content slot swaps in. Kept
 * deliberately light: a few pulsing placeholder shapes echoing the
 * page's own rhythm (a title row, then card-sized blocks), not a
 * spinner and not an animated splash — this should barely be visible
 * on a fast connection.
 */
export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-xl animate-pulse pb-4 md:max-w-2xl md:py-4" aria-hidden>
      <div className="flex h-16 items-center justify-center px-3">
        <div className="h-5 w-20 rounded-full bg-[#eee9e2]" />
      </div>
      <div className="space-y-2.5 px-4 pt-2">
        <div className="h-24 rounded-2xl bg-[#eee9e2]" />
        <div className="h-24 rounded-2xl bg-[#eee9e2]" />
      </div>
    </div>
  );
}
