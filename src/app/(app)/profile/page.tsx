import { Images } from "lucide-react";
import { getSessionContext } from "@/services/session";
import { daysSince } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getAlbums } from "@/services/collections-server";
import { HomeHeader } from "@/components/home/HomeHeader";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { AlbumCard } from "@/components/profile/AlbumCard";
import { CreateAlbumButton } from "@/components/profile/CreateAlbumButton";
import { AccountSwitcher } from "@/components/profile/AccountSwitcher";
import { EmptyState } from "@/components/EmptyState";

// Same minimal (logo-only) header as Search/Memories -- Profile doesn't
// need its own shortcut back to Search/Notifications.

export default async function ProfilePage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;
  const supabase = await createClient();

  const [{ count: dropCount }, { count: memoryCount }, albums] = await Promise.all([
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("space_id", ctx.space.id)
      .eq("author_id", ctx.userId),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("space_id", ctx.space.id)
      .eq("author_id", ctx.userId)
      .eq("saved_to_memories", true),
    getAlbums(ctx.space.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-xl pb-4 md:max-w-2xl md:py-4">
      <HomeHeader minimal />

      <ProfileHeader
        profile={ctx.profile}
        otherMember={ctx.otherMember}
        dropCount={dropCount ?? 0}
        memoryCount={memoryCount ?? 0}
        daysTogether={daysSince(ctx.space.created_at)}
        spaceCreatedAt={ctx.space.created_at}
      />

      <div className="px-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[16px] font-bold text-[#3a362f]">Albums</p>
          <CreateAlbumButton spaceId={ctx.space.id} userId={ctx.userId} />
        </div>
        {albums.length === 0 ? (
          <EmptyState icon={Images} title="No albums yet" body="Group your favorite Drops into a collection." />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-6">
        <AccountSwitcher />
      </div>
    </div>
  );
}
