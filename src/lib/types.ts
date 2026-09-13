export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          space_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          space_id: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          space_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          added_at: string
          collection_id: string
          post_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          post_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          space_id: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          space_id: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          space_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          favorite_type: string
          id: string
          item_name: string
          note: string | null
          post_id: string | null
          space_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          favorite_type: string
          id?: string
          item_name: string
          note?: string | null
          post_id?: string | null
          space_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          favorite_type?: string
          id?: string
          item_name?: string
          note?: string | null
          post_id?: string | null
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_answers: {
        Row: {
          answer: Json
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          answer: Json
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          answer?: Json
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_results: {
        Row: {
          computed_at: string
          result: Json
          session_id: string
        }
        Insert: {
          computed_at?: string
          result: Json
          session_id: string
        }
        Update: {
          computed_at?: string
          result?: Json
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          game_type: string
          id: string
          prompt: Json
          space_id: string
          status: string
          topic: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          game_type: string
          id?: string
          prompt?: Json
          space_id: string
          status?: string
          topic: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          game_type?: string
          id?: string
          prompt?: Json
          space_id?: string
          status?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      match_fixtures: {
        Row: {
          away_crest_url: string | null
          away_team: string
          created_at: string
          created_by: string
          external_id: string | null
          home_crest_url: string | null
          home_team: string
          id: string
          kickoff_at: string
          result: Json | null
          source: string
          space_id: string
        }
        Insert: {
          away_crest_url?: string | null
          away_team: string
          created_at?: string
          created_by: string
          external_id?: string | null
          home_crest_url?: string | null
          home_team: string
          id?: string
          kickoff_at: string
          result?: Json | null
          source?: string
          space_id: string
        }
        Update: {
          away_crest_url?: string | null
          away_team?: string
          created_at?: string
          created_by?: string
          external_id?: string | null
          home_crest_url?: string | null
          home_team?: string
          id?: string
          kickoff_at?: string
          result?: Json | null
          source?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_fixtures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_fixtures_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      match_predictions: {
        Row: {
          btts: string | null
          created_at: string
          fixture_id: string
          id: string
          over_under: string | null
          user_id: string
          winner_pick: string
        }
        Insert: {
          btts?: string | null
          created_at?: string
          fixture_id: string
          id?: string
          over_under?: string | null
          user_id: string
          winner_pick: string
        }
        Update: {
          btts?: string | null
          created_at?: string
          fixture_id?: string
          id?: string
          over_under?: string | null
          user_id?: string
          winner_pick?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_predictions_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "match_fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          data: Json | null
          id: string
          read_at: string | null
          space_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          space_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          space_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      play_content_cache: {
        Row: {
          expires_at: string
          image_url: string | null
          item_id: string
          item_type: string
          metadata: Json
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          expires_at: string
          image_url?: string | null
          item_id: string
          item_type: string
          metadata?: Json
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          expires_at?: string
          image_url?: string | null
          item_id?: string
          item_type?: string
          metadata?: Json
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      play_item_signals: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          signal_type: string
          source: string
          space_id: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          signal_type: string
          source: string
          space_id: string
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          signal_type?: string
          source?: string
          space_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "play_item_signals_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_item_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      play_taste_profiles: {
        Row: {
          music_artist_ids: Json
          music_genres: string[]
          space_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          music_artist_ids?: Json
          music_genres?: string[]
          space_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          music_artist_ids?: Json
          music_genres?: string[]
          space_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_taste_profiles_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "play_taste_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_favorite_metadata: {
        Row: {
          favorite_type: string
          item_name: string
          note: string | null
          post_id: string
        }
        Insert: {
          favorite_type: string
          item_name: string
          note?: string | null
          post_id: string
        }
        Update: {
          favorite_type?: string
          item_name?: string
          note?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_favorite_metadata_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          height: number | null
          id: string
          media_type: string
          order_index: number
          post_id: string
          url: string
          width: number | null
        }
        Insert: {
          height?: number | null
          id?: string
          media_type: string
          order_index?: number
          post_id: string
          url: string
          width?: number | null
        }
        Update: {
          height?: number | null
          id?: string
          media_type?: string
          order_index?: number
          post_id?: string
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_song_metadata: {
        Row: {
          album: string | null
          artist: string | null
          artwork_url: string | null
          note: string | null
          post_id: string
          title: string
          url: string | null
        }
        Insert: {
          album?: string | null
          artist?: string | null
          artwork_url?: string | null
          note?: string | null
          post_id: string
          title: string
          url?: string | null
        }
        Update: {
          album?: string | null
          artist?: string | null
          artwork_url?: string | null
          note?: string | null
          post_id?: string
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_song_metadata_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          caption: string | null
          category: string | null
          created_at: string
          id: string
          occurred_at: string
          place: string | null
          saved_to_memories: boolean
          space_id: string
          type: string
          updated_at: string
        }
        Insert: {
          author_id: string
          caption?: string | null
          category?: string | null
          created_at?: string
          id?: string
          occurred_at?: string
          place?: string | null
          saved_to_memories?: boolean
          space_id: string
          type: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          caption?: string | null
          category?: string | null
          created_at?: string
          id?: string
          occurred_at?: string
          place?: string | null
          saved_to_memories?: boolean
          space_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          handle: string
          id: string
          interests: string[]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          handle: string
          id: string
          interests?: string[]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          handle?: string
          id?: string
          interests?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          post_id: string
          space_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          space_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_items_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      space_members: {
        Row: {
          joined_at: string
          role: string
          space_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role?: string
          space_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_members_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code: string
          name?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          author_id: string
          created_at: string
          expires_at: string
          id: string
          media_url: string | null
          saved_to_memories: boolean
          song_artist: string | null
          song_artwork_url: string | null
          song_title: string | null
          song_url: string | null
          space_id: string
          text_content: string | null
          type: string
        }
        Insert: {
          author_id: string
          created_at?: string
          expires_at?: string
          id?: string
          media_url?: string | null
          saved_to_memories?: boolean
          song_artist?: string | null
          song_artwork_url?: string | null
          song_title?: string | null
          song_url?: string | null
          space_id: string
          text_content?: string | null
          type: string
        }
        Update: {
          author_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          media_url?: string | null
          saved_to_memories?: boolean
          song_artist?: string | null
          song_artwork_url?: string | null
          song_title?: string | null
          song_url?: string | null
          space_id?: string
          text_content?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      story_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          story_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          story_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          story_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          space_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          space_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      top5_items: {
        Row: {
          id: string
          item_meta: Json | null
          item_name: string
          list_id: string
          rank: number
        }
        Insert: {
          id?: string
          item_meta?: Json | null
          item_name: string
          list_id: string
          rank: number
        }
        Update: {
          id?: string
          item_meta?: Json | null
          item_name?: string
          list_id?: string
          rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "top5_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "top5_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      top5_lists: {
        Row: {
          created_at: string
          id: string
          session_id: string | null
          space_id: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id?: string | null
          space_id: string
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string | null
          space_id?: string
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "top5_lists_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "top5_lists_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "top5_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_space_member: { Args: { target_space: string }; Returns: boolean }
      join_space_by_invite: { Args: { code: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
