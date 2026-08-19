"""Template for Cloudflare reverse-proxy worker script for subfolder routing."""

WORKER_SCRIPT_TEMPLATE = """export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const subpath = "{{CUSTOM_SUBPATH}}";
    const backendOrigin = "{{BACKEND_ORIGIN}}";

    // Strip trailing slash on subpath for exact match checks
    const normalizedSubpath = subpath.replace(/\\/+$/, "");
    const isSubpathMatch = url.pathname === normalizedSubpath || 
                          url.pathname.startsWith(normalizedSubpath + "/") ||
                          url.pathname === normalizedSubpath + "?";

    if (isSubpathMatch) {
      const proxyUrl = new URL(url.pathname + url.search, backendOrigin);
      const newHeaders = new Headers(request.headers);
      newHeaders.set("x-original-host", url.hostname);
      newHeaders.set("x-articurls-basepath", normalizedSubpath);

      return fetch(proxyUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: request.body,
        redirect: "manual"
      });
    }

    return fetch(request);
  }
};
"""

def generate_worker_script(subdomain: str, ugc_domain: str, custom_subpath: str) -> str:
    backend_origin = f"https://{subdomain}.{ugc_domain}"
    normalized_subpath = "/" + custom_subpath.strip().strip("/")
    return WORKER_SCRIPT_TEMPLATE.replace("{{CUSTOM_SUBPATH}}", normalized_subpath).replace("{{BACKEND_ORIGIN}}", backend_origin)
