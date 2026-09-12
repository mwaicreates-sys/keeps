/**
 * The one page-title block every primary route uses (Home and Profile are
 * the two deliberate exceptions — Home's feed and Profile's identity card
 * open the page instead). Before this existed, each page hand-rolled its
 * own h1/p with slightly different sizes (27px/29px/32px titles, 15px/16px
 * subtitles) — close enough to look intentional in isolation, different
 * enough that switching between pages felt like different apps.
 */
export function PageIntro({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-4 pb-4 pt-1">
      <h1 className="text-[32px] font-bold leading-[1.1] tracking-tight text-[#3a362f]">{title}</h1>
      <p className="mt-1 text-[16px] leading-[1.45] text-[#a39d92]">{subtitle}</p>
    </div>
  );
}
