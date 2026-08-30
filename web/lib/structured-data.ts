import type { PublicBlog, PublicSite, UserPage, Category, Author, PublicAuthorSummary } from "@/lib/types";
import { assetUrl } from "@/lib/env";
import { transformImageUrl } from "@/lib/image-transform";

export interface ImageObject {
  "@type": "ImageObject";
  url: string;
  width?: number;
  height?: number;
}

export interface Person {
  "@type": "Person";
  "@id"?: string;
  name: string;
  url: string;
  sameAs?: string[];
  image?: ImageObject;
  jobTitle?: string;
}

export interface Organization {
  "@context": "https://schema.org";
  "@type": "Organization";
  "@id"?: string;
  name: string;
  url: string;
  logo?: ImageObject;
  sameAs?: string[];
}

export interface FaqPage {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  url?: string;
  mainEntity: {
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }[];
}

export interface BlogPosting {
  "@context": "https://schema.org";
  "@type": "BlogPosting";
  "@id"?: string;
  headline: string;
  description?: string;
  datePublished?: string;
  dateModified?: string;
  author: Person | Person[];
  image?: ImageObject | ImageObject[];
  url: string;
  isPartOf?: {
    "@type": "Blog";
    "@id": string;
    name: string;
  };
  publisher?: Organization;
  breadcrumb?: BreadcrumbList;
}

export interface ProfilePage {
  "@context": "https://schema.org";
  "@type": "ProfilePage";
  mainEntity: Person;
  isPartOf?: {
    "@type": "WebSite";
    "@id": string;
    name: string;
  };
  breadcrumb?: BreadcrumbList;
}

export interface WebSite {
  "@context": "https://schema.org";
  "@type": "WebSite";
  name: string;
  description?: string;
  url: string;
  author?: Person;
  publisher?: Organization;
}

export interface CollectionPage {
  "@context": "https://schema.org";
  "@type": "CollectionPage";
  name: string;
  description?: string;
  url: string;
  author: Person;
  isPartOf: {
    "@type": "WebSite";
    "@id": string;
    name: string;
  };
  breadcrumb?: BreadcrumbList;
}

export interface WebPage {
  "@context": "https://schema.org";
  "@type": "WebPage";
  name: string;
  description?: string;
  url: string;
  author?: Person;
  isPartOf?: {
    "@type": "WebSite";
    "@id": string;
    name: string;
  };
  dateModified?: string;
  breadcrumb?: BreadcrumbList;
}

export interface BreadcrumbList {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: {
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }[];
  numberOfItems: number;
}

export type StructuredData = BlogPosting | ProfilePage | WebSite | CollectionPage | WebPage | BreadcrumbList | FaqPage | Organization;

export function getImageObject(url: string | null, width?: number, height?: number): ImageObject | null {
  if (!url) return null;
  
  const optimizedUrl = width ? transformImageUrl(assetUrl(url), { width }) : assetUrl(url);
  
  return {
    "@type": "ImageObject",
    url: optimizedUrl,
    width,
    height,
  };
}

export function generatePersonSchema(site: PublicSite, profileUrl: string): Person {
  return {
    "@type": "Person",
    "@id": profileUrl,
    name: site.name,
    url: profileUrl,
    jobTitle: "Blogger",
  };
}

export function generateAuthorPersonSchema(author: Author | PublicAuthorSummary, profileUrl: string): Person {
  const socialLinks: string[] = [];
  if (author.x_link) socialLinks.push(author.x_link);
  if (author.linkedin_link) socialLinks.push(author.linkedin_link);
  if (author.github_link) socialLinks.push(author.github_link);
  if (author.instagram_link) socialLinks.push(author.instagram_link);
  if (author.pinterest_link) socialLinks.push(author.pinterest_link);
  if (author.facebook_link) socialLinks.push(author.facebook_link);
  if (author.youtube_link) socialLinks.push(author.youtube_link);
  if (author.website_link) socialLinks.push(author.website_link);
  
  return {
    "@type": "Person",
    "@id": profileUrl,
    name: author.name,
    url: profileUrl,
    sameAs: socialLinks.length > 0 ? socialLinks : undefined,
    image: author.profile_image_url ? (getImageObject(author.profile_image_url, 200, 200) || undefined) : undefined,
    jobTitle: "Author",
  };
}

export function generateAuthorProfileSchema(
  author: Author,
  site: PublicSite,
  canonicalUrl: string,
  siteUrl: string
): ProfilePage {
  const authorPerson = generateAuthorPersonSchema(author, canonicalUrl);
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: authorPerson,
    isPartOf: {
      "@type": "WebSite",
      "@id": siteUrl,
      name: site.nav_blog_name || "My Blog",
    },
    breadcrumb: generateBreadcrumbList([
      { name: site.nav_blog_name || "Home", url: siteUrl },
      { name: author.name, url: canonicalUrl },
    ]),
  };
}

export function generateOrganizationSchema(
  name: string,
  url: string,
  logoUrl?: string | null
): Organization {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": url,
    name,
    url,
    logo: getImageObject(logoUrl ?? null) || undefined,
  };
}

export function generateFaqPageSchema(
  faqs: readonly { question: string; answer: string }[],
  url: string
): FaqPage {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function generateWebSiteSchema(site: PublicSite, siteUrl: string): WebSite {
  const siteName = (site.nav_blog_name || "").trim() || "My Blog";
  const description = site.meta_description || undefined;
  
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    description,
    url: siteUrl,
    author: generatePersonSchema(site, siteUrl),
    publisher: generateOrganizationSchema(siteName, siteUrl, site.favicon_url),
  };
}

export function generateBlogPostingSchema(
  blog: PublicBlog,
  author: PublicSite,
  canonicalUrl: string
): BlogPosting {
  const title = blog.meta_title || blog.title;
  const description = blog.meta_description || undefined;
  const siteUrl = canonicalUrl.split('/blog/')[0];
  const authorPerson = blog.author
    ? generateAuthorPersonSchema(blog.author, `${siteUrl}/author/${encodeURIComponent(blog.author.slug)}`)
    : generatePersonSchema(author, siteUrl);
  const siteName = author.nav_blog_name || "My Blog";
  
  // Generate multiple image sizes for better SEO
  const images: ImageObject[] = [];
  if (blog.featured_image_url) {
    const baseImage = blog.featured_image_url;
    images.push(
      getImageObject(baseImage, 1200, 675)!, // 16:9
      getImageObject(baseImage, 800, 600)!,  // 4:3
      getImageObject(baseImage, 600, 600)!,   // 1:1
    );
  }
  
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${canonicalUrl}#BlogPosting`,
    headline: title,
    description,
    datePublished: blog.published_at || undefined,
    dateModified: blog.updated_at,
    author: authorPerson,
    image: images.length > 0 ? images : undefined,
    url: canonicalUrl,
    isPartOf: {
      "@type": "Blog",
      "@id": siteUrl,
      name: siteName,
    },
    publisher: generateOrganizationSchema(siteName, siteUrl, author.favicon_url),
    breadcrumb: generateBreadcrumbList([
      { name: author.nav_blog_name || "Home", url: siteUrl },
      { name: title, url: canonicalUrl },
    ]),
  };
}

export function generateCollectionPageSchema(
  category: Pick<Category, 'category_id' | 'name' | 'slug'> & Partial<Category>,
  author: PublicSite,
  canonicalUrl: string
): CollectionPage {
  const authorPerson = generatePersonSchema(author, `${canonicalUrl.split('/category/')[0]}`);
  const siteUrl = canonicalUrl.split('/category/')[0];
  
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} - ${author.name}`,
    description: undefined,
    url: canonicalUrl,
    author: authorPerson,
    isPartOf: {
      "@type": "WebSite",
      "@id": siteUrl,
      name: author.nav_blog_name || "My Blog",
    },
    breadcrumb: generateBreadcrumbList([
      { name: author.nav_blog_name || "Home", url: siteUrl },
      { name: category.name, url: canonicalUrl },
    ]),
  };
}

export function generateWebPageSchema(
  page: UserPage,
  author: PublicSite,
  canonicalUrl: string
): WebPage {
  const authorPerson = generatePersonSchema(author, `${canonicalUrl.split('/page/')[0]}`);
  const siteUrl = canonicalUrl.split('/page/')[0];
  
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title || "Untitled Page",
    description: page.meta_description || undefined,
    url: canonicalUrl,
    author: authorPerson,
    isPartOf: {
      "@type": "WebSite",
      "@id": siteUrl,
      name: author.nav_blog_name || "My Blog",
    },
    dateModified: page.updated_at || undefined,
    breadcrumb: generateBreadcrumbList([
      { name: author.nav_blog_name || "Home", url: canonicalUrl.split('/page')[0] },
      { name: page.title || "Untitled Page", url: canonicalUrl },
    ]),
  };
}

export function generateBreadcrumbList(items: { name: string; url: string }[]): BreadcrumbList {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
    numberOfItems: items.length,
  };
}

export function generateSubscriptionConfirmationSchema(currentUrl: string): WebPage {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Subscription Confirmed",
    description: "Email subscription confirmation page",
    url: currentUrl,
  };
}
