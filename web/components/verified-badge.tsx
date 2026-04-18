import { MdVerified } from "react-icons/md";

/** Material `MdVerified` — sized in `em` so it aligns with adjacent text. */
export function VerifiedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center justify-center leading-none" title="Verified" aria-label="Verified">
      <MdVerified
        className="block h-[1.2em] w-[1.2em] text-[#1D9BF0] drop-shadow-[0_2px_10px_rgba(29,155,240,0.45)] dark:text-[#38bdf8]"
        aria-hidden
      />
    </span>
  );
}
