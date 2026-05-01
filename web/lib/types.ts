export type BlogStatus = "draft" | "published" | "archived" | "scheduled";

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
  ads_enabled: boolean;
  status: BlogStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: number;
  media: BlogMediaOut[];
  view_count: number;
  excerpt?: string | null;
  category_ids?: number[];
}

export type BlogDetail = Omit<BlogListItem, "view_count" | "excerpt">;

export interface PublicBlog {
  blog_id: number;
  title: string;
  content: string;
  slug: string;
  meta_title: string | null;
  meta_description: string | null;
  featured_image_url: string | null;
  ads_enabled: boolean;
  published_at: string | null;
  updated_at: string;
  user_id: number;
  media: BlogMediaOut[];
  /** Present on list endpoint (`/user/blogs`) */
  excerpt?: string | null;
  /** Optional aggregate from list endpoint when available. */
  view_count?: number;
  category_ids?: number[];
}

export interface PublicUser {
  name: string;
  user_name: string;
  meta_title: string;
  meta_description: string;
  bio: string | null;
  link: string | null;
  contact_email: string | null;
  instagram_link: string | null;
  x_link: string | null;
  pinterest_link: string | null;
  facebook_link: string | null;
  linkedin_link: string | null;
  github_link: string | null;
  youtube_link: string | null;
  profile_image_url: string | null;
  verification_tick: boolean;
  navbar_enabled: boolean;
  nav_blog_name: string | null;
  nav_menu_enabled: boolean;
  footer_enabled: boolean;
  site_footer_enabled: boolean;
  use_default_preview_image: boolean;
  /** False for active Pro — hide "Made with Articurls" on public pages. */
  show_articurls_watermark?: boolean;
  featured_blogs_enabled: boolean;
  featured_blog_ids: number[];
}

export interface UserSettings {
  user_id: number;
  name: string;
  user_name: string;
  email: string;
  meta_title: string | null;
  meta_description: string | null;
  bio: string | null;
  link: string | null;
  contact_email: string | null;
  instagram_link: string | null;
  x_link: string | null;
  pinterest_link: string | null;
  facebook_link: string | null;
  linkedin_link: string | null;
  github_link: string | null;
  youtube_link: string | null;
  profile_image_url: string | null;
  verification_tick: boolean;
  navbar_enabled: boolean;
  nav_blog_name: string | null;
  nav_menu_enabled: boolean;
  footer_enabled: boolean;
  site_footer_enabled: boolean;
  use_default_preview_image: boolean;
  username_change_count: number;
  is_admin?: boolean;
  featured_blogs_enabled: boolean;
  featured_blog_ids: number[];
}

export interface UsernameChangeRequestOut {
  request_id: number;
  user_id: number;
  desired_username: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  reviewed_by_user_id: number | null;
  created_at: string | null;
}

export interface AdminUserListItem {
  user_id: number;
  name: string;
  user_name: string;
  email: string;
  created_at: string | null;
  plan: "free" | "pro";
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

export interface AdminUsernameRequestListItem extends UsernameChangeRequestOut {
  user_name: string;
  email: string;
}

export interface UserPage {
  page_id: number;
  user_id: number;
  title: string;
  slug: string;
  content: string;
  show_in_menu: boolean;
  menu_order: number | null;
  show_in_footer: boolean;
  footer_order: number | null;
}

export interface DesignSettings {
  navbar_enabled: boolean;
  nav_blog_name: string | null;
  nav_menu_enabled: boolean;
  footer_enabled: boolean;
  site_footer_enabled: boolean;
  featured_blogs_enabled: boolean;
  featured_blog_ids: number[];
}

export interface MonetizationSettings {
  ads_enabled: boolean;
  ad_code: string | null;
  ad_frequency: number;
}

export interface MetaSettings {
  meta_title: string | null;
  meta_description: string | null;
}

export interface PublicBlogAds {
  enabled: boolean;
  ad_code: string | null;
  ad_frequency: number;
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
  next?: string;
  message?: string;
}

export interface ViewsAnalytics {
  period: string;
  total_posts: number;
  total_views: number;
  unique_visitors: number;
}

export interface SubscribersAnalytics {
  period: string;
  current_subscribers: number;
  subscribed: number;
  unsubscribed: number;
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
  purpose: "ownership" | "ssl" | "routing";
}

export interface CustomDomain {
  hostname: string | null;
  domain_status: DomainStatus;
  verified_at: string | null;
  grace_started_at: string | null;
  grace_expires_at: string | null;
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
}
