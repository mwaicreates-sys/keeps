import type { Tables } from "@/lib/types";

export type FeedPost = Tables<"posts"> & {
  author: Tables<"profiles">;
  media: Tables<"post_media">[];
  song: Tables<"post_song_metadata"> | null;
  favorite: Tables<"post_favorite_metadata"> | null;
  reactions: Tables<"reactions">[];
  commentCount: number;
  isSaved: boolean;
};
