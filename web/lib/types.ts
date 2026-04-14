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
  seo_title: string | null;
  seo_description: string | null;
  notify_subscribers: boolean;
  status: BlogStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: number;
  media: BlogMediaOut[];
  view_count: number;
  excerpt?: string | null;
}

export interface BlogDetail extends Omit<BlogListItem, "view_count" | "excerpt"> {}

export interface PublicBlog {
  blog_id: number;
  title: string;
  content: string;
  slug: string;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  updated_at: string;
  user_id: number;
  media: BlogMediaOut[];
  /** Present on list endpoint (`/user/blogs`) */
  excerpt?: string | null;
}

export interface PublicUser {
  name: string;
  user_name: string;
  seo_title: string;
  seo_description: string;
  bio: string | null;
  link: string | null;
  contact_email: string | null;
  instagram_link: string | null;
  x_link: string | null;
  pinterest_link: string | null;
  facebook_link: string | null;
  linkedin_link: string | null;
  github_link: string | null;
  profile_image_url: string | null;
  verification_tick: boolean;
}

export interface UserSettings {
  user_id: number;
  name: string;
  user_name: string;
  email: string;
  seo_title: string | null;
  seo_description: string | null;
  bio: string | null;
  link: string | null;
  contact_email: string | null;
  instagram_link: string | null;
  x_link: string | null;
  pinterest_link: string | null;
  facebook_link: string | null;
  linkedin_link: string | null;
  github_link: string | null;
  profile_image_url: string | null;
  custom_domain: string | null;
  is_domain_verified: boolean;
  verification_tick: boolean;
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
