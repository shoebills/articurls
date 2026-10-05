/* eslint-disable react-hooks/static-components -- theme layouts are module-scope singletons resolved from the themes registry (stable references, not created during render) */
import { cache } from "react";
import { notFound, redirect, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { API_URL, UGC_ORIGIN, assetUrl } from "@/lib/env";
import {
  buildRuntimeHostsFromEnv,
  isInternalHost,
} from "@/lib/request-host";
import type { PublicBlog, PublicSite, UserPage, Category, PublicCategoryBlogsResponse, DomainLookupResponse, PublicAuthorDetail, PublicResolvedContent } from "@/lib/types";
import { resolveBlogOgImage } from "@/lib/blog-images";
import { transformImageUrl } from "@/lib/image-transform";
import { excerptFromHtml } from "@/lib/text";
import { faviconIcons } from "@/lib/favicon";
import { ThemeStyleWrapper } from "@/components/themes/theme-wrapper";
import { getLayout } from "@/components/themes/registry";
import { loadPublicSite } from "@/lib/public-site";
import { resolveSiteName, withTrailingSlash } from "@/lib/public-page-helpers";

type Props = { params: Promise<{ domain: string; slug?: string[] }> };

export function generateStaticParams() {
  return [];
}
export const dynamicParams = true;
export const revalidate = 86400;

// ── Helpers ──────────────────────────────────────────────────────────────────

function resolveSiteOgImage(site: PublicSite | null | undefined): string | undefined {
  if (site?.og_image_url) return transformImageUrl(assetUrl(site.og_image_url), { width: 1200, height: 630, fit: "cover" });
  return undefined;
}

function resolvePageDescription(page: UserPage): string | undefined {
  const metaDescription = (page.meta_description || "").trim();
  if (metaDescription) return metaDescription;
  const contentDescription = excerptFromHtml(page.content || "").trim();
  return contentDescription || undefined;
}

function resolveNoindex(noindex: boolean): { index: false; follow: true } | undefined {
  return noindex ? { index: false, follow: true } : undefined;
}

function isSiteIndexingOff(site?: PublicSite | null): boolean {
  return site?.seo_indexing_enabled === false;
}

function resolveGoogleVerification(site?: PublicSite | null): Metadata["verification"] {
  const token = (site?.search_console_verification_token || "").trim();
  return token ? { google: token } : undefined;
}

function resolveRoutingSegments(
  rawSegments: string[],
  customSubpath?: string | null
): { segments: string[]; basePath: string } {
  const base = (customSubpath || "").trim().replace(/^\/+/, "").replace(/\/+$/, "");
  if (!base) {
    return { segments: rawSegments, basePath: "" };
  }

  const baseParts = base.split("/");
  const matches = baseParts.every((part, idx) => rawSegments[idx] === part);
  if (matches) {
    return {
      segments: rawSegments.slice(baseParts.length),
      basePath: `/${base}`,
    };
  }
  return { segments: rawSegments, basePath: `/${base}` };
}

const resolveDomainInfo = cache(async (host: string): Promise<DomainLookupResponse | null> => {
  const ugcHost = new URL(UGC_ORIGIN).hostname;
  const RESERVED = new Set(["www", "app", "api", "admin", "mail", "support"]);
  if (host.endsWith(`.${ugcHost}`)) {
    const subdomain = host.split(".")[0];
    if (subdomain && !RESERVED.has(subdomain)) {
      return { subdomain: subdomain, domain_status: "active", redirect_to: null, custom_subpath: null };
    }
  }
  try {
    const res = await fetch(
      `${API_URL}/internal/domain-lookup?hostname=${encodeURIComponent(host)}`,
      {
        next: {
          revalidate: 86400,
          tags: [`domain-${host}`, "domains"],
        },
        headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET || "" },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      subdomain: data.subdomain,
      domain_status: data.domain_status,
      redirect_to: data.redirect_to ?? null,
      custom_subpath: data.custom_subpath ?? null,
    };
  } catch {
    return null;
  }
});

const loadSite = loadPublicSite;

const loadBlogs = cache(async (subdomain: string): Promise<PublicBlog[]> => {
  const res = await fetch(`${API_URL}/${encodeURIComponent(subdomain)}/blogs`, {
    next: {
      revalidate: 86400,
      tags: [`subdomain-${subdomain}`, "posts-list", "home"],
    },
  });
  if (!res.ok) return [];
  return res.json();
});

const loadContent = cache(async (subdomain: string, slug: string): Promise<PublicResolvedContent | null> => {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(subdomain)}/content/${encodeURIComponent(slug)}`,
    {
      next: {
        revalidate: 86400,
        tags: [`subdomain-${subdomain}`, `post-${slug}`, `page-${slug}`, "posts-list"],
      },
    }
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
});

const loadRedirect = cache(async (subdomain: string, path: string): Promise<{ target_url: string; type: string } | null> => {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(subdomain)}/redirect?path=${encodeURIComponent(path)}`,
    {
      next: {
        revalidate: 86400,
        tags: [`subdomain-${subdomain}`, "redirects"],
      },
    }
  );
  if (!res.ok) return null;
  return res.json();
});

const loadPages = cache(async (subdomain: string): Promise<UserPage[]> => {
  const res = await fetch(`${API_URL}/${encodeURIComponent(subdomain)}/pages`, {
    next: {
      revalidate: 86400,
      tags: [`subdomain-${subdomain}`, "pages-list", "posts-list"],
    },
  });
  if (!res.ok) return [];
  return res.json();
});

const loadCategories = cache(async (subdomain: string): Promise<Category[]> => {
  const res = await fetch(`${API_URL}/${encodeURIComponent(subdomain)}/categories`, {
    next: {
      revalidate: 86400,
      tags: [`subdomain-${subdomain}`, "categories-list", "posts-list"],
    },
  });
  if (!res.ok) return [];
  return res.json();
});

const loadCategoryBlogs = cache(async (subdomain: string, slug: string): Promise<PublicCategoryBlogsResponse | null> => {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(subdomain)}/category/${encodeURIComponent(slug)}`,
    {
      next: {
        revalidate: 86400,
        tags: [`subdomain-${subdomain}`, `category-${slug}`, "posts-list"],
      },
    }
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
});

const loadAuthorBlogs = cache(async (subdomain: string, slug: string): Promise<PublicAuthorDetail | null> => {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(subdomain)}/author/${encodeURIComponent(slug)}`,
    {
      next: {
        revalidate: 86400,
        tags: [`subdomain-${subdomain}`, `author-${slug}`, "posts-list"],
      },
    }
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json();
});

const loadAllCategories = cache(async (subdomain: string): Promise<Category[]> => {
  const res = await fetch(
    `${API_URL}/${encodeURIComponent(subdomain)}/categories?all=true`,
    {
      next: {
        revalidate: 86400,
        tags: [`subdomain-${subdomain}`, "categories-list"],
      },
    }
  );
  if (!res.ok) return [];
  return res.json();
});

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain, slug: rawSegments = [] } = await params;
  const host = decodeURIComponent(domain);
  const runtimeHosts = buildRuntimeHostsFromEnv();
  if (isInternalHost(host, runtimeHosts)) return {};

  const domainInfo = await resolveDomainInfo(host);
  if (!domainInfo) return {};
  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") return {};
  const subdomain = domainInfo.subdomain;

  const { segments, basePath } = resolveRoutingSegments(rawSegments, domainInfo.custom_subpath);

  const canonical = `https://${host}${basePath}${segments.length > 0 ? `/${segments.join("/")}` : ""}`;
  const alternatesWithFeeds = (site?: PublicSite | null) => {
    const types: Record<string, string> = {};
    if (site?.rss_enabled) {
      types["application/rss+xml"] = `https://${host}${basePath}/rss.xml`;
    }
    if (site?.atom_enabled) {
      types["application/atom+xml"] = `https://${host}${basePath}/atom.xml`;
    }
    return Object.keys(types).length > 0 ? { canonical, types } : { canonical };
  };

  if (segments[0] === "category" && segments[1]) {
    const [site, data] = await Promise.all([loadSite(subdomain), loadCategoryBlogs(subdomain, segments[1])]);
    if (!site || !data) return { title: "Not found", icons: faviconIcons(site) };
    const categoryName = data.category.name || segments[1];
    const title = data.category.meta_title?.trim() || `${categoryName} — ${site.name}`;
    const description = data.category.meta_description?.trim() || `Browse all ${categoryName} posts by ${site.name}.`;
    const siteName = resolveSiteName(site);
    const ogImage =
      (data.blogs[0] ? resolveBlogOgImage(data.blogs[0]) : "") ||
      resolveSiteOgImage(site);
    const categoryCanonical = withTrailingSlash(canonical, site.seo_trailing_slash_listings === true);
    return {
      title,
      description,
      robots: resolveNoindex(site.seo_noindex_categories === true || isSiteIndexingOff(site)),
      alternates: { ...alternatesWithFeeds(site), canonical: categoryCanonical },
      icons: faviconIcons(site),
      verification: resolveGoogleVerification(site),
      openGraph: {
        title,
        description,
        url: categoryCanonical,
        type: "website",
        siteName,
        locale: site.og_locale || undefined,
        images: ogImage ? [{ url: ogImage, alt: `${categoryName} cover image`, width: 1200, height: 630 }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImage ? [{ url: ogImage, alt: `${categoryName} cover image` }] : undefined,
      },
    };
  }

  if (segments[0] === "author" && segments[1]) {
    const [site, data] = await Promise.all([loadSite(subdomain), loadAuthorBlogs(subdomain, segments[1])]);
    if (!site || !data) return { title: "Not found", icons: faviconIcons(site) };
    const author = data.author;
    const siteName = resolveSiteName(site);
    const title = author.meta_title?.trim() || `${author.name} — Author at ${siteName}`;
    const description = author.meta_description?.trim() || author.bio || `Read articles and essays by ${author.name}.`;
    const ogImage = author.profile_image_url
      ? transformImageUrl(assetUrl(author.profile_image_url), { width: 1200, height: 630, fit: "cover" })
      : resolveSiteOgImage(site);
    const authorCanonical = withTrailingSlash(canonical, site.seo_trailing_slash_listings === true);
    return {
      title,
      description,
      robots: resolveNoindex(author.noindex === true || site.seo_noindex_authors === true || isSiteIndexingOff(site)),
      alternates: { ...alternatesWithFeeds(site), canonical: authorCanonical },
      icons: faviconIcons(site),
      verification: resolveGoogleVerification(site),
      openGraph: {
        title,
        description,
        url: authorCanonical,
        type: "profile",
        siteName,
        locale: site.og_locale || undefined,
        images: ogImage ? [{ url: ogImage, alt: `${author.name} avatar`, width: 1200, height: 630 }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImage ? [{ url: ogImage, alt: `${author.name} avatar` }] : undefined,
      },
    };
  }

  if (segments[0] === "categories") {
    const site = await loadSite(subdomain);
    if (!site) return { title: "Not found" };
    const siteName = resolveSiteName(site);
    const title = `Categories — ${siteName}`;
    const description = `Explore all topics and categories on ${siteName}.`;
    const ogImage = resolveSiteOgImage(site);
    const hubCanonical = withTrailingSlash(canonical, site.seo_trailing_slash_listings === true);
    return {
      title,
      description,
      robots: resolveNoindex(site.seo_noindex_categories === true || isSiteIndexingOff(site)),
      alternates: { ...alternatesWithFeeds(site), canonical: hubCanonical },
      icons: faviconIcons(site),
      verification: resolveGoogleVerification(site),
      openGraph: {
        title,
        description,
        url: hubCanonical,
        type: "website",
        siteName,
        locale: site.og_locale || undefined,
        images: ogImage ? [{ url: ogImage, alt: `${siteName} cover image`, width: 1200, height: 630 }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImage ? [{ url: ogImage, alt: `${siteName} cover image` }] : undefined,
      },
    };
  }

  // Direct single segment: check blog post or custom page
  if (segments.length === 1 && !["category", "author", "categories"].includes(segments[0])) {
    const slug = segments[0];
    const [content, site] = await Promise.all([
      loadContent(subdomain, slug),
      loadSite(subdomain),
    ]);

    if (!content) return { title: "Not found", icons: faviconIcons(site) };

    if (content.type === "blog" && content.blog) {
      const blog = content.blog;
      const title = blog.meta_title || blog.title;
      const description = blog.meta_description || blog.excerpt || excerptFromHtml(blog.content) || undefined;
      const siteName = resolveSiteName(site);
      const postCanonical = blog.canonical_url || canonical;
      const ogImage = blog.og_image_url
        ? transformImageUrl(assetUrl(blog.og_image_url), { width: 1200, height: 630, fit: "cover" })
        : resolveBlogOgImage(blog);
      return {
        title,
        description,
        robots: resolveNoindex(blog.noindex === true || isSiteIndexingOff(site)),
        alternates: alternatesWithFeeds(site),
        icons: faviconIcons(site),
        verification: resolveGoogleVerification(site),
        openGraph: {
          title,
          description,
          url: postCanonical,
          type: "article",
          siteName,
          locale: site?.og_locale || undefined,
          images: ogImage ? [{ url: ogImage, alt: `${title} cover image`, width: 1200, height: 630 }] : undefined,
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: ogImage ? [{ url: ogImage, alt: `${title} cover image` }] : undefined,
        },
      };
    }

    if (content.type === "page" && content.page) {
      const page = content.page;
      const title = page.meta_title || page.title;
      const description = resolvePageDescription(page);
      const siteName = resolveSiteName(site);
      const pageCanonical = page.canonical_url || canonical;
      const ogImage = page.og_image_url
        ? transformImageUrl(assetUrl(page.og_image_url), { width: 1200, height: 630, fit: "cover" })
        : page.featured_image_url
          ? transformImageUrl(assetUrl(page.featured_image_url), { width: 1200, height: 630, fit: "cover" })
          : resolveSiteOgImage(site);
      return {
        title,
        description,
        robots: resolveNoindex(page.noindex === true || site?.seo_noindex_pages === true || isSiteIndexingOff(site)),
        alternates: alternatesWithFeeds(site),
        icons: faviconIcons(site),
        verification: resolveGoogleVerification(site),
        openGraph: {
          title,
          description,
          url: pageCanonical,
          type: "website",
          siteName,
          locale: site?.og_locale || undefined,
          images: ogImage ? [{ url: ogImage, alt: `${title} cover image`, width: 1200, height: 630 }] : undefined,
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: ogImage ? [{ url: ogImage, alt: `${title} cover image` }] : undefined,
        },
      };
    }

    return { title: "Not found", icons: faviconIcons(site) };
  }

  // Profile / Homepage
  const site = await loadSite(subdomain);
  if (!site) return { title: "Not found" };
  const title = site.meta_title || `${site.name} — Articurls`;
  const description = site.meta_description || undefined;
  const siteName = resolveSiteName(site);
  const ogImage = resolveSiteOgImage(site);
  const homeCanonical = withTrailingSlash(canonical, site.seo_trailing_slash_listings === true);
  return {
    title,
    description,
    robots: resolveNoindex(isSiteIndexingOff(site)),
    alternates: { ...alternatesWithFeeds(site), canonical: homeCanonical },
    icons: faviconIcons(site),
    verification: resolveGoogleVerification(site),
    openGraph: {
      title,
      description,
      url: homeCanonical,
      type: "website",
      siteName,
      locale: site.og_locale || undefined,
      images: ogImage ? [{ url: ogImage, alt: `${siteName} cover image`, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [{ url: ogImage, alt: `${siteName} cover image` }] : undefined,
    },
  };
}

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
  other: {
    preconnect: ["https://images.articurls.com"],
    "dns-prefetch": "https://images.articurls.com",
  },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SitePublicationPage({ params }: Props) {
  const { domain, slug: rawSegments = [] } = await params;
  const host = decodeURIComponent(domain);
  const runtimeHosts = buildRuntimeHostsFromEnv();

  if (isInternalHost(host, runtimeHosts)) notFound();

  const domainInfo = await resolveDomainInfo(host);
  
  if (!domainInfo) {
    notFound();
  }

  if (domainInfo.domain_status === "expired") {
    const pathname = rawSegments.length === 0 ? "" : `/${rawSegments.join("/")}`;
    const ugcHost = new URL(UGC_ORIGIN).hostname;
    const redirectUrl = `https://${encodeURIComponent(domainInfo.subdomain)}.${ugcHost}${pathname}`;
    permanentRedirect(redirectUrl);
  }

  if (domainInfo.domain_status === "pending") {
    const pathname = rawSegments.length === 0 ? "" : `/${rawSegments.join("/")}`;
    const ugcHost = new URL(UGC_ORIGIN).hostname;
    redirect(`https://${encodeURIComponent(domainInfo.subdomain)}.${ugcHost}${pathname}`);
  }

  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") {
    notFound();
  }

  const subdomain = domainInfo.subdomain;
  const { segments, basePath } = resolveRoutingSegments(rawSegments, domainInfo.custom_subpath);

  const pathname = `${basePath}${segments.length === 0 ? "" : `/${segments.join("/")}`}`;
  const siteOrigin = `https://${host}${basePath}`;

  if (domainInfo.redirect_to) {
    permanentRedirect(`${domainInfo.redirect_to}${pathname}`);
  }

  // ── Site-level redirects (checked before content resolution) ────────────
  const lookupPath = segments.length === 0 ? "/" : `/${segments.join("/")}`;
  const pathRedirect = await loadRedirect(subdomain, lookupPath);
  if (pathRedirect) {
    const target = pathRedirect.target_url;
    const dest = target.startsWith("/")
      ? `${siteOrigin}${target === "/" ? "" : target}`
      : target;
    if (pathRedirect.type === "temporary") {
      redirect(dest);
    }
    permanentRedirect(dest);
  }

// ── Blog post or Custom page: /[slug] ────────────────────────────────────
  if (segments.length === 1 && !["category", "author", "categories"].includes(segments[0])) {
    const slug = segments[0];
    const [content, site, pages, categories, allBlogs] = await Promise.all([
      loadContent(subdomain, slug),
      loadSite(subdomain),
      loadPages(subdomain),
      loadCategories(subdomain),
      loadBlogs(subdomain),
    ]);

    if (!site || !content) notFound();

    const themeId = site.template_id;
    const shared = { site, pages, categories, subdomain, host, basePath };

    // Render Blog post if found
    if (content.type === "blog" && content.blog) {
      const PostLayout = getLayout(themeId, "post");
      return (
        <ThemeStyleWrapper site={site}>
          <PostLayout {...shared} blog={content.blog} allBlogs={allBlogs} />
        </ThemeStyleWrapper>
      );
    }

    // Render Custom page if found
    if (content.type === "page" && content.page) {
      const PageLayout = getLayout(themeId, "page");
      return (
        <ThemeStyleWrapper site={site}>
          <PageLayout {...shared} page={content.page} />
        </ThemeStyleWrapper>
      );
    }

    notFound();
  }

  // ── Category page: /category/[slug] ───────────────────────────────────────
  if (segments[0] === "category") {
    if (!segments[1]) notFound();
    const categorySlug = segments[1];
    const [site, pages, categories, data] = await Promise.all([
      loadSite(subdomain),
      loadPages(subdomain),
      loadCategories(subdomain),
      loadCategoryBlogs(subdomain, categorySlug),
    ]);

    if (!site || !data) notFound();

    const CategoryLayout = getLayout(site.template_id, "category");
    return (
      <ThemeStyleWrapper site={site}>
        <CategoryLayout
          site={site}
          pages={pages}
          categories={categories}
          category={data.category}
          blogs={data.blogs}
          subdomain={subdomain}
          host={host}
          basePath={basePath}
        />
      </ThemeStyleWrapper>
    );
  }

  // ── Author page: /author/[slug] ───────────────────────────────────────────
  if (segments[0] === "author") {
    if (!segments[1]) notFound();
    const authorSlug = segments[1];
    const [site, pages, categories, data] = await Promise.all([
      loadSite(subdomain),
      loadPages(subdomain),
      loadCategories(subdomain),
      loadAuthorBlogs(subdomain, authorSlug),
    ]);

    if (!site || !data) notFound();

    const AuthorLayout = getLayout(site.template_id, "author");
    return (
      <ThemeStyleWrapper site={site}>
        <AuthorLayout
          site={site}
          pages={pages}
          categories={categories}
          author={data.author}
          blogs={data.blogs}
          subdomain={subdomain}
          host={host}
          basePath={basePath}
        />
      </ThemeStyleWrapper>
    );
  }

  // ── Categories Hub page: /categories ──────────────────────────────────────
  if (segments[0] === "categories") {
    const [site, pages, allCategories] = await Promise.all([
      loadSite(subdomain),
      loadPages(subdomain),
      loadAllCategories(subdomain),
    ]);

    if (!site) notFound();

    const CategoriesHubLayout = getLayout(site.template_id, "categoriesHub");
    return (
      <ThemeStyleWrapper site={site}>
        <CategoriesHubLayout
          site={site}
          pages={pages}
          categories={allCategories}
          subdomain={subdomain}
          host={host}
          basePath={basePath}
        />
      </ThemeStyleWrapper>
    );
  }

  // ── Publication homepage: / ───────────────────────────────────────────────
  const [site, blogs, pages, categories] = await Promise.all([
    loadSite(subdomain),
    loadBlogs(subdomain),
    loadPages(subdomain),
    loadCategories(subdomain),
  ]);

  if (!site) notFound();

  const HomeLayout = getLayout(site.template_id, "home");
  return (
    <ThemeStyleWrapper site={site}>
      <HomeLayout
        site={site}
        blogs={blogs}
        pages={pages}
        categories={categories}
        subdomain={subdomain}
        host={host}
        basePath={basePath}
      />
    </ThemeStyleWrapper>
  );
}
