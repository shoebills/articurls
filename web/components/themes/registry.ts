import type { ComponentType } from "react";
import type {
  PublicBlog,
  PublicSite,
  UserPage,
  Category,
  PublicCategoryBlogsResponse,
  PublicAuthorDetail,
} from "@/lib/types";
import { standardTheme } from "@/components/themes/standard";

// ── Layout prop contracts ─────────────────────────────────────────────────────
// Dispatcher (app/site/[domain]/[[...slug]]/page.tsx) resolves the tenant,
// loads data, and passes it here as props. Themes compose shared primitives
// from @/components/public/. Layouts must prefer Server Components (SEO);
// props must stay serializable.

export interface HomeLayoutProps {
  site: PublicSite;
  blogs: PublicBlog[];
  pages: UserPage[];
  categories: Category[];
  subdomain: string;
  host: string;
  basePath: string;
}

export interface PostLayoutProps {
  site: PublicSite;
  blog: PublicBlog;
  pages: UserPage[];
  categories: Category[];
  allBlogs: PublicBlog[];
  subdomain: string;
  host: string;
  basePath: string;
}

export interface PageLayoutProps {
  site: PublicSite;
  page: UserPage;
  pages: UserPage[];
  categories: Category[];
  subdomain: string;
  host: string;
  basePath: string;
}

export interface CategoryLayoutProps {
  site: PublicSite;
  pages: UserPage[];
  categories: Category[];
  category: PublicCategoryBlogsResponse["category"];
  blogs: PublicBlog[];
  subdomain: string;
  host: string;
  basePath: string;
}

export interface AuthorLayoutProps {
  site: PublicSite;
  pages: UserPage[];
  categories: Category[];
  author: PublicAuthorDetail["author"];
  blogs: PublicBlog[];
  subdomain: string;
  host: string;
  basePath: string;
}

export interface CategoriesHubLayoutProps {
  site: PublicSite;
  pages: UserPage[];
  categories: Category[];
  subdomain: string;
  host: string;
  basePath: string;
}

export interface ThemeLayouts {
  home?: ComponentType<HomeLayoutProps>;
  post?: ComponentType<PostLayoutProps>;
  page?: ComponentType<PageLayoutProps>;
  category?: ComponentType<CategoryLayoutProps>;
  author?: ComponentType<AuthorLayoutProps>;
  categoriesHub?: ComponentType<CategoriesHubLayoutProps>;
}

export interface ThemeDefinition {
  id: string;
  label: string;
  layouts: ThemeLayouts;
}

export const THEMES: Record<string, ThemeDefinition> = {
  standard: standardTheme,
};

export function getTheme(id?: string | null): ThemeDefinition {
  return THEMES[id || "standard"] ?? THEMES.standard;
}

/** Resolve a layout with per-route fallback to the Standard theme. */
export function getLayout<K extends keyof ThemeLayouts>(
  id: string | null | undefined,
  key: K
): NonNullable<ThemeLayouts[K]> {
  const theme = getTheme(id);
  return (theme.layouts[key] ?? standardTheme.layouts[key]) as NonNullable<ThemeLayouts[K]>;
}