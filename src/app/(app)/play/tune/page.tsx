import { getSessionContext } from "@/services/session";
import { getTasteProfileServer } from "@/services/taste-profile-server";
import { TunePlay } from "@/components/play/TunePlay";

// "Tune your Play" -- a one-time (re-visitable from Play Preferences)
// taste-seeding flow. Reached from the gentle nudge on the Play hub,
// or from Play Preferences to edit an existing profile.

export default async function TunePlayPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const { edit } = await searchParams;

  const { artists, genres } = await getTasteProfileServer(ctx.space.id, ctx.userId);

  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <TunePlay initialArtists={artists} initialGenres={genres} editing={edit === "1" || artists.length > 0} />
    </div>
  );
}
