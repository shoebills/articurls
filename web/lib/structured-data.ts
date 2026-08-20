import type { PublicBlog, PublicUser, UserPage, Category, Author, PublicAuthorSummary } from "@/lib/types";
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
  publisher?: Person;
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
  publisher?: Person;
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

export type StructuredData = BlogPosting | ProfilePage | WebSite | CollectionPage | WebPage | BreadcrumbList;

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

export function generatePersonSchema(user: PublicUser, profileUrl: string): Person {
  const socialLinks: string[] = [];
  
  if (user.x_link) socialLinks.push(user.x_link);
  if (user.linkedin_link) socialLinks.push(user.linkedin_link);
  if (user.github_link) socialLinks.push(user.github_link);
  if (user.instagram_link) socialLinks.push(user.instagram_link);
  if (user.pinterest_link) socialLinks.push(user.pinterest_link);
  if (user.facebook_link) socialLinks.push(user.facebook_link);
  if (user.youtube_link) socialLinks.push(user.youtube_link);
  if (user.website_link) socialLinks.push(user.website_link);
  
  return {
    "@type": "Person",
    "@id": profileUrl,
    name: user.name,
    url: profileUrl,
    sameAs: socialLinks.length > 0 ? socialLinks : undefined,
    image: user.profile_image_url ? (getImageObject(user.profile_image_url, 200, 200) || undefined) : undefined,
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
  user: PublicUser,
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
      name: user.nav_blog_name || "My Blog",
    },
    breadcrumb: generateBreadcrumbList([
      { name: user.nav_blog_name || "Home", url: siteUrl },
      { name: author.name, url: canonicalUrl },
    ]),
  };
}

export function generateWebSiteSchema(user: PublicUser, siteUrl: string): WebSite {
  const siteName = (user.nav_blog_name || "").trim() || "My Blog";
  const description = user.meta_description || user.bio || undefined;
  
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    description,
    url: siteUrl,
    author: generatePersonSchema(user, siteUrl),
    publisher: generatePersonSchema(user, siteUrl),
  };
}

export function generateBlogPostingSchema(
  blog: PublicBlog,
  author: PublicUser,
  canonicalUrl: string
): BlogPosting {
  const title = blog.meta_title || blog.title;
  const description = blog.meta_description || undefined;
  const siteUrl = canonicalUrl.split('/blog/')[0];
  const authorPerson = blog.author
    ? generateAuthorPersonSchema(blog.author, `${siteUrl}/author/${encodeURIComponent(blog.author.slug)}`)
    : generatePersonSchema(author, siteUrl);
  const publisherPerson = generatePersonSchema(author, siteUrl);
  
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
      name: author.nav_blog_name || "My Blog",
    },
    publisher: publisherPerson,
    breadcrumb: generateBreadcrumbList([
      { name: author.nav_blog_name || "Home", url: siteUrl },
      { name: title, url: canonicalUrl },
    ]),
  };
}

export function generateCollectionPageSchema(
  category: Pick<Category, 'category_id' | 'name' | 'slug'> & Partial<Category>,
  author: PublicUser,
  canonicalUrl: string
): CollectionPage {
  const authorPerson = generatePersonSchema(author, `${canonicalUrl.split('/category/')[0]}`);
  const siteUrl = canonicalUrl.split('/category/')[0];
  
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} - ${author.name}`,
    description: author.bio || undefined,
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
  author: PublicUser,
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
