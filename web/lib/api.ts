import { API_URL } from "./env";
import type {
  Author,
  PublicAuthorDetail,
  SiteSummary,
  CodeInjectionSettings,
  AccountUsage,
  BlogDetail,
  BlogListItem,
  BlogMediaOut,
  Category,
  CustomDomain,
  DesignSettings,
  DomainAddResponse,
  DomainVerifyResponse,
  SeoSettings,
  PublicBlog,
  PublicBlogSearchResult,
  PublicCategoryBlogsResponse,
  UserPage,
  PublicUser,
  SubscribersAnalytics,
  SubscriberListResponse,
  SubscriptionOut,
  StorageUsage,
  AdminUserListItem,
  AdminPaymentListItem,
  TokenResponse,
  TransactionOut,
  UmamiMetricsRow,
  UmamiTimeseriesItem,
  UmamiOverviewResponse,
  UmamiTimeseriesResponse,
  UmamiPagesResponse,
  UmamiSourcesResponse,
  UmamiGeoResponse,
  UmamiTechResponse,
  UmamiRealtimeResponse,
  UserSettings,
  SubfolderSettings,
  SubfolderSnippets,
} from "./types";

export type {
  UmamiMetricsRow,
  UmamiTimeseriesItem,
  UmamiOverviewResponse,
  UmamiTimeseriesResponse,
  UmamiPagesResponse,
  UmamiSourcesResponse,
  UmamiGeoResponse,
  UmamiTechResponse,
  UmamiRealtimeResponse,
};

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

const API_CACHE_TTL_MS = 60_000;

const apiCache = new Map<string, { data: unknown; timestamp: number }>();

export function clearApiCache(): void {
  apiCache.clear();
}

function getSiteIdForCache(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("articurls_site_id") || "";
}

export function apiCacheHas(path: string, token?: string | null): boolean {
  if (typeof window === "undefined") return false;
  const key = `GET:${path}:${token || ""}:${getSiteIdForCache()}`;
  const cached = apiCache.get(key);
  return !!(cached && Date.now() - cached.timestamp < API_CACHE_TTL_MS);
}

export function getCachedApiData<T>(path: string, token?: string | null): T | null {
  if (typeof window === "undefined") return null;
  const key = `GET:${path}:${token || ""}:${getSiteIdForCache()}`;
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < API_CACHE_TTL_MS) {
    return cached.data as T;
  }
  return null;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null; disableCache?: boolean } = {},
  isRetry = false
): Promise<T> {
  const { token, disableCache, headers: h, ...rest } = init;
  let effectiveToken = token;
  
  const method = rest.method || "GET";
  const siteId = getSiteIdForCache();
  const cacheKey = `${method}:${path}:${effectiveToken || ""}:${siteId}`;

  if (!disableCache && method === "GET" && typeof window !== "undefined") {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < API_CACHE_TTL_MS) {
      return cached.data as T;
    }
  }

  if (method !== "GET" && typeof window !== "undefined") {
    apiCache.clear();
  }
  
  if (isRetry && typeof window !== "undefined") {
    effectiveToken = localStorage.getItem("articurls_token") || effectiveToken;
  }

  const headers = new Headers(h);
  if (effectiveToken) headers.set("Authorization", `Bearer ${effectiveToken}`);
  
  if (typeof window !== "undefined") {
    const activeSiteId = localStorage.getItem("articurls_site_id");
    if (activeSiteId && !headers.has("X-Site-ID")) {
      headers.set("X-Site-ID", activeSiteId);
    }
  }

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
          throw err;
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
  email: string
): Promise<{ message: string }> {
  return apiFetch("/resend-verification-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function signup(data: {
  name: string;
  user_name: string;
  email: string;
  password: string;
}): Promise<{ message: string }> {
  return apiFetch("/user/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function exchangeOAuthCode(code: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/google/exchange-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
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

export async function completeGoogleSignup(data: {
  session_id: string;
  user_name: string;
  password: string;
  name: string;
}): Promise<{ access_token: string; token_type: string }> {
  return apiFetch("/auth/google/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function verifyEmail(token: string): Promise<TokenResponse> {
  const q = new URLSearchParams({ token });
  return apiFetch(`/user/verify-new-user?${q.toString()}`);
}

export async function getMe(token: string): Promise<UserSettings> {
  return apiFetch("/user/me", { token });
}

export async function getStorageUsage(token: string): Promise<StorageUsage> {
  return apiFetch("/user/storage", { token });
}

export async function checkUsernameAvailability(
  token: string,
  user_name: string
): Promise<{ available: boolean; normalized: string; reason: string | null }> {
  const q = new URLSearchParams({ user_name });
  return apiFetch(`/user/username-availability?${q.toString()}`, { token });
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
    navbar_enabled?: boolean;
    nav_blog_name?: string | null;
    nav_menu_enabled?: boolean;
    subscriber_collection_enabled?: boolean;
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

export async function submitSupportMessage(
  token: string,
  body: { category: string; subject: string; message: string }
): Promise<{ ok: boolean }> {
  return apiFetch("/support/contact", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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

export async function getPage(token: string, pageId: string): Promise<UserPage> {
  return apiFetch(`/pages/${pageId}`, { token });
}

export async function createPage(
  token: string,
  body: { title: string; content: string; slug?: string }
): Promise<UserPage> {
  return apiFetch("/pages/", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deletePage(token: string, pageId: string): Promise<void> {
  await apiFetch(`/pages/${pageId}`, { method: "DELETE", token });
}

export async function updatePage(
  token: string,
  pageId: string,
  body: { title?: string; content?: string; slug?: string; meta_title?: string | null; meta_description?: string | null; show_in_footer?: boolean }
): Promise<UserPage> {
  return apiFetch(`/pages/id/${pageId}`, {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function publishPage(token: string, pageId: string): Promise<UserPage> {
  return apiFetch(`/pages/${pageId}/publish`, { method: "POST", token });
}

export async function archivePage(token: string, pageId: string): Promise<UserPage> {
  return apiFetch(`/pages/${pageId}/archive`, { method: "POST", token });
}

export async function updateFooterPages(token: string, ordered_page_ids: string[]): Promise<UserPage[]> {
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

export async function uploadFavicon(token: string, file: File): Promise<{ favicon_url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch("/user/me/favicon", { method: "POST", token, body: fd });
}

export async function deleteFavicon(token: string): Promise<{ favicon_url: null }> {
  return apiFetch("/user/me/favicon", { method: "DELETE", token });
}

export async function uploadOgImage(token: string, file: File): Promise<{ og_image_url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch("/user/seo/og-image", { method: "POST", token, body: fd });
}

export async function deleteOgImage(token: string): Promise<{ og_image_url: null }> {
  return apiFetch("/user/seo/og-image", { method: "DELETE", token });
}

export async function uploadPageMedia(
  token: string,
  pageId: string,
  file: File
): Promise<BlogMediaOut> {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch(`/pages/${pageId}/media`, { method: "POST", token, body: fd });
}

export async function deletePageMediaByUrl(token: string, pageId: string, url: string): Promise<void> {
  const q = new URLSearchParams({ url });
  await apiFetch(`/pages/${pageId}/media?${q.toString()}`, { method: "DELETE", token });
}

export async function listBlogs(token: string): Promise<BlogListItem[]> {
  return apiFetch("/blog/", { token });
}

export async function getBlog(token: string, id: string): Promise<BlogDetail> {
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
  id: string,
  body: {
    title?: string;
    content?: string;
    slug?: string;
    author_id?: string | null;
    meta_title?: string | null;
    meta_description?: string | null;
    featured_image_url?: string | null;
    notify_subscribers?: boolean;
  }
): Promise<BlogDetail> {
  return apiFetch(`/blog/${id}`, {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteBlog(token: string, id: string): Promise<void> {
  await apiFetch(`/blog/${id}`, { method: "DELETE", token });
}

export async function publishBlog(token: string, id: string): Promise<BlogDetail> {
  return apiFetch(`/blog/${id}/publish`, { method: "POST", token });
}

export async function archiveBlog(token: string, id: string): Promise<BlogDetail> {
  return apiFetch(`/blog/${id}/archive`, { method: "POST", token });
}

export async function scheduleBlog(token: string, id: string, scheduled_at: string): Promise<BlogDetail> {
  return apiFetch(`/blog/${id}/schedule`, {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scheduled_at }),
  });
}

export async function unscheduleBlog(token: string, id: string): Promise<void> {
  await apiFetch(`/blog/${id}/unschedule`, { method: "POST", token });
}

export async function uploadBlogMedia(
  token: string,
  blogId: string,
  file: File
): Promise<BlogMediaOut> {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch(`/blog/${blogId}/media`, { method: "POST", token, body: fd });
}

export async function deleteBlogMedia(token: string, blogId: string, mediaId: string): Promise<void> {
  await apiFetch(`/blog/${blogId}/media/${mediaId}`, { method: "DELETE", token });
}

export async function deleteBlogMediaByUrl(token: string, blogId: string, url: string): Promise<void> {
  const q = new URLSearchParams({ url });
  await apiFetch(`/blog/${blogId}/media?${q.toString()}`, { method: "DELETE", token });
}

export async function getPublicUser(userName: string): Promise<PublicUser> {
  return apiFetch(`/${encodeURIComponent(userName)}`);
}

export async function searchPublicBlogs(userName: string, query: string, offset = 0): Promise<PublicBlogSearchResult[]> {
  return apiFetch(
    `/${encodeURIComponent(userName)}/blogs/search?q=${encodeURIComponent(query)}&limit=5&offset=${offset}`
  );
}

export async function getPublicBlogs(userName: string): Promise<PublicBlog[]> {
  return apiFetch(`/${encodeURIComponent(userName)}/blogs`);
}

export async function getPublicBlog(userName: string, slug: string): Promise<PublicBlog> {
  return apiFetch(`/${encodeURIComponent(userName)}/blog/${encodeURIComponent(slug)}`);
}

/** Public: request email subscription to a writer’s posts (confirmation email is sent when applicable). */
export async function publicSubscribe(userName: string, email: string): Promise<{ message: string }> {
  return apiFetch(`/subscribe/${encodeURIComponent(userName)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

/** Public: confirm a subscription via the token from the confirmation email. */
export async function confirmSubscription(token: string): Promise<{ message: string }> {
  return apiFetch(`/confirm-subscription?token=${encodeURIComponent(token)}`);
}

/** Public: unsubscribe via token from email link. */
export async function unsubscribeViaEmail(token: string): Promise<{ message: string }> {
  return apiFetch(`/unsubscribe?token=${encodeURIComponent(token)}`);
}

// ── Categories ────────────────────────────────────────────────────────

export async function listCategories(token: string): Promise<Category[]> {
  return apiFetch("/categories/", { token });
}

export async function createCategory(token: string, body: { name: string; description?: string }): Promise<Category> {
  return apiFetch("/categories/", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateCategory(token: string, id: string, body: { name?: string; description?: string }): Promise<Category> {
  return apiFetch(`/categories/${id}`, {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteCategory(token: string, id: string): Promise<void> {
  await apiFetch(`/categories/${id}`, { method: "DELETE", token });
}

export async function assignBlogCategories(token: string, blogId: string, category_ids: string[]): Promise<BlogDetail> {
  return apiFetch(`/blog/${blogId}/categories`, {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category_ids }),
  });
}

export async function updateMenuCategories(token: string, ordered_category_ids: string[]): Promise<Category[]> {
  return apiFetch("/categories/menu", {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ordered_category_ids }),
  });
}

export async function getPublicCategories(userName: string, all = false): Promise<Category[]> {
  const q = all ? "?all=true" : "";
  return apiFetch(`/${encodeURIComponent(userName)}/categories${q}`);
}

export async function getPublicCategoryBlogs(userName: string, slug: string): Promise<PublicCategoryBlogsResponse> {
  return apiFetch(`/${encodeURIComponent(userName)}/category/${encodeURIComponent(slug)}`);
}

// ── Authors ───────────────────────────────────────────────────────────

export async function listAuthors(token: string): Promise<Author[]> {
  return apiFetch("/authors/", { token });
}

export async function getAuthor(token: string, id: string): Promise<Author> {
  return apiFetch(`/authors/${id}`, { token });
}

export async function createAuthor(
  token: string,
  body: Partial<Author> & { name: string }
): Promise<Author> {
  return apiFetch("/authors/", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateAuthor(
  token: string,
  id: string,
  body: Partial<Author>
): Promise<Author> {
  return apiFetch(`/authors/${id}`, {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteAuthor(token: string, id: string): Promise<void> {
  await apiFetch(`/authors/${id}`, { method: "DELETE", token });
}

export async function uploadAuthorAvatar(
  token: string,
  id: string,
  file: File
): Promise<{ profile_image_url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<{ profile_image_url: string }>(`/_upload/authors/${id}/avatar`, {
    method: "POST",
    token,
    body: formData,
  }).catch(() => {
    // Direct endpoint fallback
    return apiFetch<{ profile_image_url: string }>(`/authors/${id}/avatar`, {
      method: "POST",
      token,
      body: formData,
    });
  });
}

export async function getPublicAuthors(userName: string): Promise<Author[]> {
  return apiFetch(`/${encodeURIComponent(userName)}/authors`);
}

export async function getPublicAuthorBlogs(userName: string, slug: string): Promise<PublicAuthorDetail> {
  return apiFetch(`/${encodeURIComponent(userName)}/author/${encodeURIComponent(slug)}`);
}

// ── Sites ─────────────────────────────────────────────────────────────

export async function listSites(token: string): Promise<SiteSummary[]> {
  return apiFetch("/sites/", { token });
}

export async function createSite(
  token: string,
  body: { subdomain: string; nav_blog_name?: string }
): Promise<SiteSummary> {
  return apiFetch("/sites/", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getSite(token: string, siteId: string): Promise<SiteSummary> {
  return apiFetch(`/sites/${siteId}`, { token });
}

export async function deleteSite(token: string, siteId: string): Promise<void> {
  await apiFetch(`/sites/${siteId}`, { method: "DELETE", token });
}

export async function getCodeInjection(token: string): Promise<CodeInjectionSettings> {
  return apiFetch("/sites/code-injection", { token });
}

export async function updateCodeInjection(
  token: string,
  body: CodeInjectionSettings
): Promise<CodeInjectionSettings> {
  return apiFetch("/sites/code-injection", {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getAccountUsage(token: string): Promise<AccountUsage> {
  return apiFetch("/billing/usage", { token });
}

export async function listSubscribers(token: string, page = 1, limit = 10): Promise<SubscriberListResponse> {
  return apiFetch(`/list?page=${page}&limit=${limit}`, { token });
}

export async function subscribersAnalytics(token: string, period?: string): Promise<SubscribersAnalytics> {
  const q = period ? `?period=${encodeURIComponent(period)}` : "";
  return apiFetch(`/analytics/subscribers${q}`, { token });
}

export async function exportSubscribersCsv(token: string): Promise<Blob> {
  const siteId = typeof window !== "undefined" ? localStorage.getItem("articurls_site_id") : null;
  const res = await fetch(`${API_URL}/analytics/export-to-csv`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(siteId ? { "X-Site-ID": siteId } : {}),
    },
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

export async function createCheckout(
  token: string,
  plan: "monthly" | "lifetime" = "monthly"
): Promise<{ checkout_url: string }> {
  return apiFetch("/billing/checkout", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
}

export async function getTransactions(token: string): Promise<TransactionOut[]> {
  return apiFetch("/billing/transactions", { token });
}

export async function getCustomerPortalLink(token: string): Promise<{ url: string }> {
  return apiFetch("/billing/customer-portal", { token });
}

export function isProSubscription(sub: SubscriptionOut | null): boolean {
  if (!sub) return false;
  if (sub.plan_type === "lifetime" && ["active", "past_due"].includes(sub.status)) return true;
  if (sub.plan_type === "trial") {
    return sub.status === "active" && !!sub.current_period_end && new Date(sub.current_period_end) >= new Date();
  }
  if (sub.plan_type !== "pro") return false;
  if (!["active", "past_due", "cancelled"].includes(sub.status)) return false;
  if (!sub.current_period_end) return false;
  return new Date(sub.current_period_end) >= new Date();
}

export async function adminListUsers(
  token: string,
  params: { q?: string; plan?: "all" | "inactive" | "pro"; sort?: "latest" | "oldest"; limit?: number; offset?: number } = {}
): Promise<AdminUserListItem[]> {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.plan) query.set("plan", params.plan);
  if (params.sort) query.set("sort", params.sort);
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  if (typeof params.offset === "number") query.set("offset", String(params.offset));
  return apiFetch(`/admin/users?${query.toString()}`, { token });
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


// ── Custom Domain API ────────────────────────────────────────────────────────

export async function addCustomDomain(token: string, hostname: string): Promise<DomainAddResponse> {
  return apiFetch("/settings/domain", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostname }),
  });
}

export async function getCustomDomain(token: string): Promise<CustomDomain | null> {
  try {
    const data = await apiFetch<CustomDomain & { custom_domain?: string | null }>("/settings/domain", {
      token,
      disableCache: true,
    });
    return {
      ...data,
      hostname: data.hostname ?? data.custom_domain ?? null,
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function verifyCustomDomain(token: string): Promise<DomainVerifyResponse> {
  return apiFetch("/settings/domain/verify", {
    method: "POST",
    token,
  });
}

export async function deleteCustomDomain(token: string): Promise<{ message: string }> {
  return apiFetch("/settings/domain", {
    method: "DELETE",
    token,
  });
}

export type AnalyticsPeriod = "24h" | "7d" | "this_month" | "last_month" | "this_year" | "1y" | "all";

export async function getUmamiOverview(
  token: string,
  period: AnalyticsPeriod = "7d",
): Promise<UmamiOverviewResponse> {
  const q = new URLSearchParams({ period });
  return apiFetch(`/analytics/umami/overview?${q.toString()}`, { token });
}

export async function getUmamiTimeseries(
  token: string,
  period: AnalyticsPeriod = "7d",
): Promise<UmamiTimeseriesResponse> {
  const q = new URLSearchParams({ period });
  return apiFetch(`/analytics/umami/timeseries?${q.toString()}`, { token });
}

export async function getUmamiPages(
  token: string,
  period: AnalyticsPeriod = "7d",
  limit = 50,
): Promise<UmamiPagesResponse> {
  const q = new URLSearchParams({ period, limit: String(limit) });
  return apiFetch(`/analytics/umami/pages?${q.toString()}`, { token });
}

export async function getUmamiSources(
  token: string,
  period: AnalyticsPeriod = "7d",
  limit = 20,
): Promise<UmamiSourcesResponse> {
  const q = new URLSearchParams({ period, limit: String(limit) });
  return apiFetch(`/analytics/umami/sources?${q.toString()}`, { token });
}

export async function getUmamiGeo(
  token: string,
  period: AnalyticsPeriod = "7d",
  limit = 20,
): Promise<UmamiGeoResponse> {
  const q = new URLSearchParams({ period, limit: String(limit) });
  return apiFetch(`/analytics/umami/geo?${q.toString()}`, { token });
}

export async function getUmamiTech(
  token: string,
  period: AnalyticsPeriod = "7d",
  limit = 20,
): Promise<UmamiTechResponse> {
  const q = new URLSearchParams({ period, limit: String(limit) });
  return apiFetch(`/analytics/umami/tech?${q.toString()}`, { token });
}

export async function getUmamiRealtime(
  token: string,
): Promise<UmamiRealtimeResponse> {
  return apiFetch("/analytics/umami/realtime", { token });
}

// ── Subfolder / Cloudflare API ───────────────────────────────────────────────

export async function getSubfolderSettings(token: string): Promise<SubfolderSettings> {
  return apiFetch("/settings/subfolder", { token, disableCache: true });
}

export async function updateSubfolderSettings(
  token: string,
  body: { custom_domain: string; custom_subpath: string }
): Promise<SubfolderSettings> {
  return apiFetch("/settings/subfolder", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deployCloudflareSubfolder(
  token: string,
  body: { cf_token: string; custom_domain: string; custom_subpath: string }
): Promise<SubfolderSettings> {
  return apiFetch("/settings/subfolder/deploy", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteSubfolderSettings(token: string): Promise<{ message: string }> {
  return apiFetch("/settings/subfolder", { method: "DELETE", token });
}

export async function disconnectCloudflare(token: string): Promise<{ message: string }> {
  return apiFetch("/settings/subfolder/cloudflare", { method: "DELETE", token });
}

export async function getSubfolderSnippets(token: string): Promise<SubfolderSnippets> {
  return apiFetch("/settings/subfolder/snippets", { token, disableCache: true });
}
