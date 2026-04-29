import { API_URL } from "./env";
import type {
  BlogDetail,
  BlogListItem,
  BlogMediaOut,
  Category,
  DesignSettings,
  MonetizationSettings,
  MetaSettings,
  PublicBlog,
  PublicBlogAds,
  PublicCategoryBlogsResponse,
  UserPage,
  PublicUser,
  SubscribersAnalytics,
  SubscriptionOut,
  AdminUserListItem,
  AdminPaymentListItem,
  AdminUsernameRequestListItem,
  TokenResponse,
  TransactionOut,
  UserSettings,
  UsernameChangeRequestOut,
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

let refreshPromise: Promise<string> | null = null;

export async function refreshAccessToken(): Promise<string> {
  const res = await fetch(`${API_URL}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  const data = await res.json() as TokenResponse;
  if (typeof window !== "undefined") {
    localStorage.setItem("articurls_token", data.access_token);
  }
  return data.access_token;
}

const apiCache = new Map<string, { data: unknown; timestamp: number }>();

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null; disableCache?: boolean } = {},
  isRetry = false
): Promise<T> {
  let { token, disableCache, headers: h, ...rest } = init;
  
  const method = rest.method || "GET";
  const cacheKey = `${method}:${path}:${token || ""}`;

  if (!disableCache && method === "GET" && typeof window !== "undefined") {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.data as T;
    }
  }

  if (method !== "GET" && typeof window !== "undefined") {
    apiCache.clear();
  }
  
  if (isRetry && typeof window !== "undefined") {
      token = localStorage.getItem("articurls_token") || token;
  }

  const headers = new Headers(h);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const url = path.startsWith("http") ? path : `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  
  const fetchOptions: RequestInit = { ...rest, headers, credentials: "include" };
  const res = await fetch(url, fetchOptions);
  
  if (res.status === 401 && !isRetry && !path.includes("/refresh") && !path.includes("/login") && !path.includes("/logout")) {
      try {
          if (!refreshPromise) {
              refreshPromise = refreshAccessToken().finally(() => {
                  refreshPromise = null;
              });
          }
          const newToken = await refreshPromise;
          return apiFetch<T>(path, { ...init, token: newToken }, true);
      } catch (err) {
          throw new ApiError(await parseError(res), res.status);
      }
  }
  
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  const text = await res.text();
  if (!text) return undefined as T;
  const parsed = JSON.parse(text) as T;
  
  if (!disableCache && method === "GET" && typeof window !== "undefined") {
    apiCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
  }
  return parsed;
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

export async function apiLogout(): Promise<void> {
  try {
    await apiFetch("/logout", { method: "POST" });
  } catch {
    // Ignore errors on logout
  }
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

export async function checkUsernameAvailability(
  token: string,
  user_name: string
): Promise<{ available: boolean; normalized: string; reason: string | null }> {
  const q = new URLSearchParams({ user_name });
  return apiFetch(`/user/username-availability?${q.toString()}`, { token });
}

export async function createUsernameChangeRequest(
  token: string,
  body: { desired_username: string; reason?: string }
): Promise<UsernameChangeRequestOut> {
  return apiFetch("/user/username-change-requests", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function listMyUsernameChangeRequests(token: string): Promise<UsernameChangeRequestOut[]> {
  return apiFetch("/user/username-change-requests", { token });
}

export async function patchMe(
  token: string,
  body: Partial<
    Pick<
      UserSettings,
      | "name"
      | "user_name"
      | "email"
      | "meta_title"
      | "meta_description"
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
      | "use_default_preview_image"
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

export async function getMetaSettings(token: string): Promise<MetaSettings> {
  return apiFetch("/user/meta", { token });
}

export async function patchMetaSettings(
  token: string,
  body: Partial<MetaSettings>
): Promise<MetaSettings> {
  return apiFetch("/user/meta", {
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

export async function updateFooterPages(token: string, ordered_page_ids: number[]): Promise<UserPage[]> {
  return apiFetch("/pages/footer", {
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

export async function uploadPageMedia(token: string, file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch("/pages/media", { method: "POST", token, body: fd });
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
    meta_title?: string;
    meta_description?: string;
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
    meta_title?: string | null;
    meta_description?: string | null;
    featured_image_url?: string | null;
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

export async function deleteBlogMediaByUrl(token: string, blogId: number, url: string): Promise<void> {
  const q = new URLSearchParams({ url });
  await apiFetch(`/blog/${blogId}/media?${q.toString()}`, { method: "DELETE", token });
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

// ── Categories ────────────────────────────────────────────────────────

export async function listCategories(token: string): Promise<Category[]> {
  return apiFetch("/categories/", { token });
}

export async function createCategory(token: string, body: { name: string }): Promise<Category> {
  return apiFetch("/categories/", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateCategory(token: string, id: number, body: { name: string }): Promise<Category> {
  return apiFetch(`/categories/${id}`, {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteCategory(token: string, id: number): Promise<void> {
  await apiFetch(`/categories/${id}`, { method: "DELETE", token });
}

export async function getCategoryBlogs(token: string, id: number): Promise<BlogListItem[]> {
  return apiFetch(`/categories/${id}/blogs`, { token });
}

export async function assignBlogCategories(token: string, blogId: number, category_ids: number[]): Promise<BlogDetail> {
  return apiFetch(`/blog/${blogId}/categories`, {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category_ids }),
  });
}

export async function updateMenuCategories(token: string, ordered_category_ids: number[]): Promise<Category[]> {
  return apiFetch("/categories/menu", {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ordered_category_ids }),
  });
}

export async function getPublicCategories(userName: string): Promise<Category[]> {
  return apiFetch(`/${encodeURIComponent(userName)}/categories`);
}

export async function getPublicCategoryBlogs(userName: string, slug: string): Promise<PublicCategoryBlogsResponse> {
  return apiFetch(`/${encodeURIComponent(userName)}/category/${encodeURIComponent(slug)}`);
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

export async function adminListUsers(
  token: string,
  params: { q?: string; plan?: "all" | "free" | "pro"; sort?: "latest" | "oldest"; limit?: number; offset?: number } = {}
): Promise<AdminUserListItem[]> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.plan) query.set("plan", params.plan);
  if (params.sort) query.set("sort", params.sort);
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  if (typeof params.offset === "number") query.set("offset", String(params.offset));
  return apiFetch(`/admin/users?${query.toString()}`, { token });
}

export async function adminListUsernameChangeRequests(
  token: string,
  params: {
    status?: "pending" | "approved" | "rejected";
    q?: string;
    sort?: "latest" | "oldest";
    limit?: number;
    offset?: number;
  } = {}
): Promise<AdminUsernameRequestListItem[]> {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.q) query.set("q", params.q);
  if (params.sort) query.set("sort", params.sort);
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  if (typeof params.offset === "number") query.set("offset", String(params.offset));
  return apiFetch(`/admin/username-change-requests?${query.toString()}`, { token });
}

export async function adminReviewUsernameChangeRequest(
  token: string,
  requestId: number,
  body: { status: "approved" | "rejected"; admin_note?: string }
): Promise<UsernameChangeRequestOut> {
  return apiFetch(`/admin/username-change-requests/${requestId}`, {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function adminListPayments(
  token: string,
  params: { q?: string; sort?: "latest" | "oldest"; limit?: number; offset?: number } = {}
): Promise<AdminPaymentListItem[]> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.sort) query.set("sort", params.sort);
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  if (typeof params.offset === "number") query.set("offset", String(params.offset));
  return apiFetch(`/admin/payments?${query.toString()}`, { token });
}
