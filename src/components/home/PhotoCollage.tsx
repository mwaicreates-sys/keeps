type Media = { id: string; url: string; media_type: string };

/**
 * The reference's signature collage: a large tilted primary photo, a
 * second photo peeking from the upper right, and a smaller third photo
 * overlapping lower-center — with a soft "+N" bubble for the rest.
 * Falls back gracefully for 1 or 2 photos.
 */
export function PhotoCollage({ media }: { media: Media[] }) {
  if (media.length === 1) {
    return media[0].media_type === "video" ? (
      <video src={media[0].url} controls className="w-full rounded-[22px] bg-black" style={{ maxHeight: 420 }} />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={media[0].url} alt="" loading="lazy" className="w-full rounded-[22px] object-cover" style={{ maxHeight: 420 }} />
    );
  }

  const extra = media.length - 3;

  return (
    <div className="relative aspect-[4/5] w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media[0].url}
        alt=""
        loading="lazy"
        className="absolute left-0 top-0 h-[78%] w-[58%] -rotate-2 rounded-[20px] border-[3px] border-white object-cover shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)]"
      />
      {media[1] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media[1].url}
          alt=""
          loading="lazy"
          className="absolute right-0 top-0 h-[46%] w-[46%] rotate-1 rounded-[18px] border-[3px] border-white object-cover shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)]"
        />
      )}
      {media[2] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media[2].url}
          alt=""
          loading="lazy"
          className="absolute bottom-[6%] right-[4%] h-[34%] w-[36%] rotate-2 rounded-[16px] border-[3px] border-white object-cover shadow-[0_10px_20px_-6px_rgba(0,0,0,0.3)]"
        />
      )}
      {extra > 0 && (
        <span className="absolute bottom-2 right-2 grid h-9 min-w-9 place-items-center rounded-full bg-white px-2 text-xs font-semibold text-[#3a362f] shadow-md">
          +{extra}
        </span>
      )}
    </div>
  );
}
