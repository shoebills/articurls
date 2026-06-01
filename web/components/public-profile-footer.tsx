import type { PublicUser } from "@/lib/types";
import { assetUrl } from "@/lib/env";

export function PublicProfileFooter({ user }: { user: PublicUser }) {
  if (!user.footer_enabled) return null;

  return (
    <section className="mt-12 border-t border-border/80 pt-8">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">About the author</h2>
      <div className="flex items-center gap-3">
        {user.profile_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(user.profile_image_url)} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover ring-1 ring-border/70" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted ring-1 ring-border/70" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 font-semibold leading-tight">
            <span className="min-w-0 break-words">{user.name}</span>
          </p>
        </div>
      </div>

      {user.bio ? <p className="mt-5 whitespace-pre-line text-base text-muted-foreground">{user.bio}</p> : null}
    </section>
  );
}
