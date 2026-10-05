import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PublicSite } from "@/lib/types";

export function ContentEndCta({ site, isPage = false }: { site: PublicSite; isPage?: boolean }) {
  const visible = isPage ? site.cta_show_on_pages === true : site.cta_show_on_posts !== false;
  if (!visible) return null;
  if (!site.cta_heading && !site.cta_button_text) return null;

  return (
    <section className="mt-14 rounded-2xl border border-border/80 bg-muted/20 p-6 sm:p-8 text-center space-y-4">
      {site.cta_heading ? (
        <h3 className="text-2xl font-bold tracking-tight text-foreground">
          {site.cta_heading}
        </h3>
      ) : null}
      {site.cta_description ? (
        <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed whitespace-pre-wrap">
          {site.cta_description}
        </p>
      ) : null}
      {site.cta_button_text && site.cta_button_url ? (
        <div className="pt-2">
          <Button
            asChild
            className="h-10 min-h-10 w-full touch-manipulation font-semibold shadow-xs sm:h-10 sm:min-h-10 sm:w-auto sm:min-w-[7.5rem] sm:shrink-0"
            data-button-variant={site.button_variant || "solid"}
            data-button-radius="true"
          >
            <Link
              href={site.cta_button_url}
              target={site.cta_button_url.startsWith("http") ? "_blank" : undefined}
              rel={site.cta_button_url.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {site.cta_button_text}
            </Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}