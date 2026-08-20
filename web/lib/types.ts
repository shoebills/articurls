export type BlogStatus = "draft" | "published" | "archived" | "scheduled";
export type PageStatus = "draft" | "published" | "archived";

export interface BlogMediaOut {
  media_id: number;
  url: string;
  sort_order: number;
}

export interface Author {
  author_id: number;
  site_id?: number;
  name: string;
  slug: string;
  bio?: string | null;
  contact_email?: string | null;
  profile_image_url?: string | null;
  instagram_link?: string | null;
  x_link?: string | null;
  pinterest_link?: string | null;
  facebook_link?: string | null;
  linkedin_link?: string | null;
  github_link?: string | null;
  youtube_link?: string | null;
  website_link?: string | null;
  blog_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PublicAuthorSummary {
  author_id: number;
  name: string;
  slug: string;
  bio?: string | null;
  contact_email?: string | null;
  profile_image_url?: string | null;
  instagram_link?: string | null;
  x_link?: string | null;
  pinterest_link?: string | null;
  facebook_link?: string | null;
  linkedin_link?: string | null;
  github_link?: string | null;
  youtube_link?: string | null;
  website_link?: string | null;
}

export interface PublicAuthorDetail {
  author: Author;
  blogs: PublicBlog[];
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
  user_id?: number;
  site_id?: number;
  author_id?: number | null;
  author?: PublicAuthorSummary | null;
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
  user_id?: number;
  site_id?: number;
  author_id?: number | null;
  author?: PublicAuthorSummary | null;
  media: BlogMediaOut[];
  /** Present on list endpoint (`/user/blogs`) */
  excerpt?: string | null;
  /** Optional aggregate from list endpoint when available. */
  category_ids?: number[];
}

export interface PublicBlogSearchResult {
  blog_id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
}

export type NavBlogNameSize = "small" | "medium" | "large";
export type ContentWidth = "narrow" | "wide";
export type ListImagePosition = "above_title" | "next_to_title";

export type NavItemType = "custom" | "page" | "category";

export interface NavItem {
  id: string;
  label: string;
  url: string;
  type: NavItemType;
  is_cta?: boolean;
  open_in_new_tab?: boolean;
}

export type FooterLinkType = "custom" | "page" | "category" | "system";

export interface FooterLink {
  id: string;
  label: string;
  url: string;
  type: FooterLinkType;
  open_in_new_tab?: boolean;
}

export interface FooterColumn {
  id: string;
  title: string;
  links: FooterLink[];
}

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
  og_image_url?: string | null;
  template_id?: string;
  site_mode?: string;
  color_theme?: string;
  custom_color?: string | null;
  font_family?: string;
  button_style?: string;
  navbar_alignment?: string;
  navbar_style?: string;
  navbar_enabled: boolean;
  nav_blog_name: string | null;
  nav_blog_name_size?: NavBlogNameSize;
  nav_menu_enabled: boolean;
  nav_items?: NavItem[] | null;
  show_about_section: boolean;
  site_footer_enabled: boolean;
  footer_columns?: FooterColumn[] | null;
  footer_copyright?: string | null;
  footer_socials_enabled?: boolean;
  footer_newsletter_enabled?: boolean;
  footer_system_links_enabled?: boolean;
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
  custom_head_code?: string | null;
  custom_body_code?: string | null;
  custom_css?: string | null;
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
  template_id: string;
  site_mode: string;
  color_theme: string;
  custom_color: string | null;
  font_family: string;
  button_style: string;
  navbar_alignment: string;
  navbar_style: string;
  navbar_enabled: boolean;
  nav_blog_name: string | null;
  nav_blog_name_size?: NavBlogNameSize;
  nav_menu_enabled: boolean;
  nav_items?: NavItem[] | null;
  show_about_section: boolean;
  site_footer_enabled: boolean;
  footer_columns?: FooterColumn[] | null;
  footer_copyright?: string | null;
  footer_socials_enabled?: boolean;
  footer_newsletter_enabled?: boolean;
  footer_system_links_enabled?: boolean;
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
  custom_head_code?: string | null;
  custom_body_code?: string | null;
  custom_css?: string | null;
}

export interface SiteSummary {
  site_id: number;
  subdomain: string;
  custom_domain?: string | null;
  custom_subpath?: string | null;
  domain_status: DomainStatus;
  nav_blog_name?: string | null;
  template_id: string;
  created_at?: string | null;
  post_count: number;
  subscriber_count: number;
}

export interface CodeInjectionSettings {
  custom_head_code?: string | null;
  custom_body_code?: string | null;
  custom_css?: string | null;
}

export interface SiteUsageItem {
  site_id: number;
  subdomain: string;
  nav_blog_name?: string | null;
  pageviews: number;
}

export interface AccountUsage {
  total_pageviews: number;
  tier_limit: number;
  plan_type: string;
  tier_price_usd: number;
  usage_percentage: number;
  sites: SiteUsageItem[];
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
  template_id: string;
  site_mode: string;
  color_theme: string;
  custom_color: string | null;
  font_family: string;
  button_style: string;
  navbar_alignment: string;
  navbar_style: string;
  
  navbar_enabled: boolean;
  nav_blog_name: string | null;
  nav_blog_name_size: NavBlogNameSize;
  nav_menu_enabled: boolean;
  nav_items?: NavItem[] | null;
  show_about_section: boolean;
  site_footer_enabled: boolean;
  footer_columns?: FooterColumn[] | null;
  footer_copyright?: string | null;
  footer_socials_enabled?: boolean;
  footer_newsletter_enabled?: boolean;
  footer_system_links_enabled?: boolean;
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
  og_image_url: string | null;
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

export interface RecentSubscriber {
  email: string;
  subscribed_at: string;
  is_confirmed: boolean;
  unsubscribed_at: string | null;
}

export interface SubscriberListResponse {
  items: RecentSubscriber[];
  total: number;
  page: number;
  total_pages: number;
}

export interface Category {
  category_id: number;
  user_id?: number;
  site_id?: number;
  name: string;
  slug: string;
  description?: string | null;
  blog_count: number;
  show_in_menu: boolean;
  menu_order: number | null;
  created_at: string;
}

export interface PublicCategoryBlogsResponse {
  category: { category_id: number; name: string; slug: string; description?: string | null };
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

export interface SubfolderSettings {
  custom_domain: string | null;
  custom_subpath: string | null;
  cf_connected: boolean;
  is_active: boolean;
}

export interface SubfolderSnippets {
  cloudflare_worker: string;
  nextjs: string;
  nginx: string;
  caddy: string;
}

export interface DomainLookupResponse {
  username: string;
  domain_status: string;
  redirect_to: string | null;
  custom_subpath?: string | null;
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
