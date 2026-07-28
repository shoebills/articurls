export type BlogStatus = "draft" | "published" | "archived" | "scheduled";
export type PageStatus = "draft" | "published" | "archived";

export interface BlogMediaOut {
  media_id: number;
  url: string;
  sort_order: number;
}

export interface BlogListItem {
  blog_id: number;
  title: string;
  content: string;
  slug: string;
  meta_title: string | null;
  meta_description: string | null;
  featured_image_url: string | null;
  notify_subscribers: boolean;
  status: BlogStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: number;
  media: BlogMediaOut[];
  excerpt?: string | null;
  category_ids?: number[];
}

export type BlogDetail = Omit<BlogListItem, "excerpt">;

export interface PublicBlog {
  blog_id: number;
  title: string;
  content: string;
  slug: string;
  meta_title: string | null;
  meta_description: string | null;
  featured_image_url: string | null;
  published_at: string | null;
  updated_at: string;
  user_id: number;
  media: BlogMediaOut[];
  /** Present on list endpoint (`/user/blogs`) */
  excerpt?: string | null;
  /** Optional aggregate from list endpoint when available. */
  category_ids?: number[];
}

export type NavBlogNameSize = "small" | "medium" | "large";
export type ContentWidth = "narrow" | "wide";
export type ListImagePosition = "above_title" | "next_to_title";

export interface PublicUser {
  name: string;
  user_name: string;
  meta_title: string;
  meta_description: string;
  bio: string | null;
  contact_email: string | null;
  instagram_link: string | null;
  x_link: string | null;
  pinterest_link: string | null;
  facebook_link: string | null;
  linkedin_link: string | null;
  github_link: string | null;
  youtube_link: string | null;
  website_link: string | null;
  profile_image_url: string | null;
  navbar_enabled: boolean;
  nav_blog_name: string | null;
  nav_blog_name_size?: NavBlogNameSize;
  nav_menu_enabled: boolean;
  show_about_section: boolean;
  site_footer_enabled: boolean;
  favicon_url?: string | null;
  featured_blogs_enabled: boolean;
  featured_blog_ids: number[];
  content_width?: ContentWidth;
  list_image_position?: ListImagePosition;
  show_preview_in_lists?: boolean;
  about_title?: string | null;
  subscriber_collection_enabled: boolean;
  custom_domain?: string | null;
  domain_status?: DomainStatus | null;
  rss_enabled?: boolean;
  /** Umami website UUID for first-party analytics (Step 6 tracker). */
  umami_website_id?: string | null;
}

export interface UserSettings {
  user_id: number;
  name: string;
  user_name: string;
  email: string;
  google_id?: string | null;
  meta_title: string | null;
  meta_description: string | null;
  bio: string | null;
  contact_email: string | null;
  instagram_link: string | null;
  x_link: string | null;
  pinterest_link: string | null;
  facebook_link: string | null;
  linkedin_link: string | null;
  github_link: string | null;
  youtube_link: string | null;
  website_link: string | null;
  profile_image_url: string | null;
  navbar_enabled: boolean;
  nav_blog_name: string | null;
  nav_blog_name_size?: NavBlogNameSize;
  nav_menu_enabled: boolean;
  show_about_section: boolean;
  site_footer_enabled: boolean;
  last_username_change_at: string | null;
  is_admin?: boolean;
  favicon_url?: string | null;
  featured_blogs_enabled: boolean;
  featured_blog_ids: number[];
  content_width?: ContentWidth;
  list_image_position?: ListImagePosition;
  show_preview_in_lists?: boolean;
  about_title?: string | null;
  subscriber_collection_enabled: boolean;
  custom_domain?: string | null;
  domain_status?: DomainStatus | null;
  rss_enabled: boolean;
}

export interface StorageUsage {
  used_bytes: number;
  limit_bytes: number | null;
  is_unlimited: boolean;
}

export interface AdminUserListItem {
  user_id: number;
  name: string;
  user_name: string;
  email: string;
  created_at: string | null;
  plan: "inactive" | "pro";
}

export interface AdminPaymentListItem {
  transaction_id: number;
  user_id: number;
  user_name: string;
  email: string;
  amount: number;
  currency: string;
  status: string;
  dodo_payment_id: string | null;
  created_at: string | null;
}

export interface UserPage {
  page_id: number;
  user_id: number;
  title: string;
  slug: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  status: PageStatus;
  published_at: string | null;
  show_in_footer: boolean;
  footer_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface DesignSettings {
  navbar_enabled: boolean;
  nav_blog_name: string | null;
  nav_blog_name_size: NavBlogNameSize;
  nav_menu_enabled: boolean;
  show_about_section: boolean;
  site_footer_enabled: boolean;
  featured_blogs_enabled: boolean;
  featured_blog_ids: number[];
  content_width: ContentWidth;
  list_image_position: ListImagePosition;
  show_preview_in_lists: boolean;
  about_title?: string | null;
}

export interface SeoSettings {
  meta_title: string | null;
  meta_description: string | null;
  rss_enabled: boolean;
}



export interface SubscriptionOut {
  subscription_id: number;
  plan_type: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string | null;
}

export interface TransactionOut {
  transaction_id: number;
  amount: number;
  currency: string;
  status: string;
  created_at: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  message?: string;
}

export interface SubscribersAnalyticsSeriesPoint {
  timestamp: string;
  subscribed: number;
  unsubscribed: number;
}

export interface SubscribersAnalytics {
  period: string;
  current_subscribers: number;
  subscribed: number;
  unsubscribed: number;
  series: SubscribersAnalyticsSeriesPoint[];
}

export interface Category {
  category_id: number;
  user_id: number;
  name: string;
  slug: string;
  blog_count: number;
  show_in_menu: boolean;
  menu_order: number | null;
  created_at: string;
}

export interface PublicCategoryBlogsResponse {
  category: { category_id: number; name: string; slug: string };
  blogs: PublicBlog[];
}

export type DomainStatus = "none" | "pending" | "active" | "grace" | "expired";

export interface DNSRecord {
  type: "TXT" | "CNAME";
  name: string;
  value: string;
  purpose: "ownership" | "ssl" | "routing" | "vercel";
  verified: boolean;
}

export interface CustomDomain {
  hostname: string | null;
  domain_status: DomainStatus;
  verified_at: string | null;
  grace_started_at: string | null;
  grace_expires_at: string | null;
  dns_instructions?: DNSRecord[] | null;
}

export interface DomainAddResponse {
  hostname: string;
  domain_status: DomainStatus;
  dns_instructions: DNSRecord[];
}

export interface DomainVerifyResponse {
  verification_status: "verified" | "pending" | "already_verified";
  domain_status: DomainStatus;
  dns_instructions: DNSRecord[] | null;
  message?: string | null;
}

export interface UmamiMetricsRow {
  x: string;
  y: number;
  status?: "live" | "archived" | "deleted";
}

export interface UmamiOverview {
  pageviews: number;
  visitors: number;
  visits?: number;
  bounce_rate?: number;
  avg_visit_time?: number;
}

export interface UmamiOverviewResponse {
  period: string;
  overview: UmamiOverview;
  change?: Record<string, number>;
}

export interface UmamiTimeseriesItem {
  x: string;
  t?: string;
  y: number;
}

export interface UmamiTimeseriesResponse {
  period: string;
  unit: string;
  pageviews: UmamiTimeseriesItem[];
  visitors: UmamiTimeseriesItem[];
}

export interface UmamiPagesResponse {
  period: string;
  rows: UmamiMetricsRow[];
}

export interface UmamiSourcesResponse {
  period: string;
  referrers: UmamiMetricsRow[];
}

export interface UmamiGeoResponse {
  period: string;
  countries: UmamiMetricsRow[];
}

export interface UmamiTechResponse {
  period: string;
  browsers: UmamiMetricsRow[];
  os: UmamiMetricsRow[];
  devices: UmamiMetricsRow[];
}

export interface UmamiRealtimeResponse {
  active_visitors: number;
  urls: Record<string, number>;
  countries: Record<string, number>;
  referrers: Record<string, number>;
  events: Array<Record<string, unknown>>;
}
