import { API_URL } from "./env";
import type {
  BlogDetail,
  BlogListItem,
  BlogMediaOut,
  DesignSettings,
  MonetizationSettings,
  SeoSettings,
  PublicBlog,
  PublicBlogAds,
  UserPage,
  PublicUser,
  SubscribersAnalytics,
  SubscriptionOut,
  TokenResponse,
  TransactionOut,
  UserSettings,
  ViewsAnalytics,
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const j = await res.json();
    if (typeof j?.detail === "string") return j.detail;
    if (Array.isArray(j?.detail)) return j.detail.map((d: { msg?: string }) => d.msg).join(", ");
    return res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers: h, ...rest } = init;
  const headers = new Headers(h);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const url = path.startsWith("http") ? path : `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { ...rest, headers });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function login(email: string, password: string): Promise<{ access_token: string; token_type: string }> {
  const body = new URLSearchParams();
  body.set("username", email.trim());
  body.set("password", password);
  return apiFetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return apiFetch("/request-password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, new_password: string): Promise<{ message: string }> {
  return apiFetch("/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password }),
  });
}

export async function resendVerificationEmail(
  email: string,
  plan_choice: "free" | "pro" = "free"
): Promise<{ message: string }> {
  return apiFetch("/resend-verification-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, plan_choice }),
  });
}

export async function signup(data: {
  name: string;
  user_name: string;
  email: string;
  password: string;
  plan_choice: "free" | "pro";
}): Promise<{ message: string }> {
  return apiFetch("/user/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function verifyEmail(token: string, plan_choice: string): Promise<TokenResponse> {
  const q = new URLSearchParams({ token, plan_choice });
  return apiFetch(`/user/verify-new-user?${q.toString()}`);
}

export async function getMe(token: string): Promise<UserSettings> {
  return apiFetch("/user/me", { token });
}

export async function patchMe(
  token: string,
  body: Partial<
    Pick<
      UserSettings,
      | "name"
      | "user_name"
      | "email"
      | "seo_title"
      | "seo_description"
      | "bio"
      | "link"
      | "contact_email"
      | "instagram_link"
      | "x_link"
      | "pinterest_link"
      | "facebook_link"
      | "linkedin_link"
      | "github_link"
      | "youtube_link"
      | "profile_image_url"
    >
  >
): Promise<UserSettings> {
  return apiFetch("/user/me", {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function patchProMe(
  token: string,
  body: {
    verification_tick?: boolean;
    navbar_enabled?: boolean;
    nav_blog_name?: string | null;
    nav_menu_enabled?: boolean;
  }
): Promise<UserSettings> {
  return apiFetch("/user/pro/me", {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getDesignSettings(token: string): Promise<DesignSettings> {
  return apiFetch("/user/design", { token });
}

export async function getSeoSettings(token: string): Promise<SeoSettings> {
  return apiFetch("/user/seo", { token });
}

export async function patchSeoSettings(
  token: string,
  body: Partial<SeoSettings>
): Promise<SeoSettings> {
  return apiFetch("/user/seo", {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getMonetizationSettings(token: string): Promise<MonetizationSettings> {
  return apiFetch("/user/monetization", { token });
}

export async function patchMonetizationSettings(
  token: string,
  body: Partial<MonetizationSettings>
): Promise<MonetizationSettings> {
  return apiFetch("/user/monetization", {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function patchDesignSettings(token: string, body: DesignSettings): Promise<DesignSettings> {
  return apiFetch("/user/design", {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function listPages(token: string): Promise<UserPage[]> {
  return apiFetch("/pages/", { token });
}

export async function createPage(token: string, body: { title: string; content: string }): Promise<UserPage> {
  return apiFetch("/pages/", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deletePage(token: string, pageId: number): Promise<void> {
  await apiFetch(`/pages/${pageId}`, { method: "DELETE", token });
}

export async function updatePage(
  token: string,
  pageId: number,
  body: { title?: string; content?: string }
): Promise<UserPage> {
  return apiFetch(`/pages/id/${pageId}`, {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateMenuPages(token: string, ordered_page_ids: number[]): Promise<UserPage[]> {
  return apiFetch("/pages/menu", {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ordered_page_ids }),
  });
}

export async function getPublicPages(userName: string): Promise<UserPage[]> {
  return apiFetch(`/${encodeURIComponent(userName)}/pages`);
}

export async function getPublicPage(userName: string, slug: string): Promise<UserPage> {
  return apiFetch(`/${encodeURIComponent(userName)}/page/${encodeURIComponent(slug)}`);
}

export async function uploadProfileImage(token: string, file: File): Promise<{ profile_image_url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch("/user/me/profile-image", { method: "POST", token, body: fd });
}

export async function listBlogs(token: string): Promise<BlogListItem[]> {
  return apiFetch("/blog/", { token });
}

export async function getBlog(token: string, id: number): Promise<BlogDetail> {
  return apiFetch(`/blog/${id}`, { token });
}

export async function createBlog(
  token: string,
  body: {
    title: string;
    content: string;
    slug?: string;
    seo_title?: string;
    seo_description?: string;
    notify_subscribers?: boolean;
  }
): Promise<BlogDetail> {
  return apiFetch("/blog/", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateBlog(
  token: string,
  id: number,
  body: {
    title?: string;
    content?: string;
    slug?: string;
    seo_title?: string | null;
    seo_description?: string | null;
    notify_subscribers?: boolean;
    ads_enabled?: boolean;
  }
): Promise<BlogDetail> {
  return apiFetch(`/blog/${id}`, {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateAdsBlogSelection(token: string, blog_ids: number[]): Promise<BlogListItem[]> {
  return apiFetch("/blog/ads/selection", {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blog_ids }),
  });
}

export async function deleteBlog(token: string, id: number): Promise<void> {
  await apiFetch(`/blog/${id}`, { method: "DELETE", token });
}

export async function publishBlog(token: string, id: number): Promise<BlogDetail> {
  return apiFetch(`/blog/${id}/publish`, { method: "POST", token });
}

export async function archiveBlog(token: string, id: number): Promise<BlogDetail> {
  return apiFetch(`/blog/${id}/archive`, { method: "POST", token });
}

export async function scheduleBlog(token: string, id: number, scheduled_at: string): Promise<BlogDetail> {
  return apiFetch(`/blog/${id}/schedule`, {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scheduled_at }),
  });
}

export async function unscheduleBlog(token: string, id: number): Promise<void> {
  await apiFetch(`/blog/${id}/unschedule`, { method: "POST", token });
}

export async function uploadBlogMedia(
  token: string,
  blogId: number,
  file: File
): Promise<BlogMediaOut> {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch(`/blog/${blogId}/media`, { method: "POST", token, body: fd });
}

export async function deleteBlogMedia(token: string, blogId: number, mediaId: number): Promise<void> {
  await apiFetch(`/blog/${blogId}/media/${mediaId}`, { method: "DELETE", token });
}

export async function getPublicUser(userName: string): Promise<PublicUser> {
  return apiFetch(`/${encodeURIComponent(userName)}`);
}

export async function getPublicBlogs(userName: string): Promise<PublicBlog[]> {
  return apiFetch(`/${encodeURIComponent(userName)}/blogs`);
}

export async function getPublicBlog(userName: string, slug: string): Promise<PublicBlog> {
  return apiFetch(`/${encodeURIComponent(userName)}/blog/${encodeURIComponent(slug)}`);
}

export async function getPublicBlogAds(userName: string, slug: string): Promise<PublicBlogAds> {
  return apiFetch(`/${encodeURIComponent(userName)}/blog/${encodeURIComponent(slug)}/ads`);
}

/** Public: request email subscription to a writer’s posts (confirmation email is sent when applicable). */
export async function publicSubscribe(userName: string, email: string): Promise<{ message: string }> {
  return apiFetch(`/subscribe/${encodeURIComponent(userName)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function viewsAnalytics(token: string, period?: string): Promise<ViewsAnalytics> {
  const q = period ? `?period=${encodeURIComponent(period)}` : "";
  return apiFetch(`/analytics/views${q}`, { token });
}

export async function subscribersAnalytics(token: string, period?: string): Promise<SubscribersAnalytics> {
  const q = period ? `?period=${encodeURIComponent(period)}` : "";
  return apiFetch(`/analytics/subscribers${q}`, { token });
}

export async function exportSubscribersCsv(token: string): Promise<Blob> {
  const res = await fetch(`${API_URL}/analytics/export-to-csv`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.blob();
}

export async function getSubscription(token: string): Promise<SubscriptionOut | null> {
  try {
    return await apiFetch<SubscriptionOut>("/billing/subscription", { token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function createCheckout(token: string): Promise<{ checkout_url: string }> {
  return apiFetch("/billing/checkout", { method: "POST", token });
}

export async function getTransactions(token: string): Promise<TransactionOut[]> {
  return apiFetch("/billing/transactions", { token });
}

export function isProSubscription(sub: SubscriptionOut | null): boolean {
  if (!sub) return false;
  if (sub.plan_type !== "pro") return false;
  if (!["active", "past_due"].includes(sub.status)) return false;
  if (!sub.current_period_end) return false;
  return new Date(sub.current_period_end) >= new Date();
}
