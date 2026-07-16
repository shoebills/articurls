import type { PublicUser } from "@/lib/types";
import { assetUrl } from "@/lib/env";
import { transformImageUrl } from "@/lib/image-transform";

export function PublicProfileFooter({ user }: { user: PublicUser }) {
  if (!user.footer_enabled) return null;

  return (
    <section className="mt-12 border-t border-border/80 pt-8 text-center">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">{user.about_title || "About the author"}</h1>
      {user.bio ? <p className="whitespace-pre-line text-base text-muted-foreground">{user.bio}</p> : null}
    </section>
  );
}
