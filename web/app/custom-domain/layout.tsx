import { headers } from "next/headers";
import { resolveTenantHostFromHeaders } from "@/lib/request-host";
import { resolveDomainForSeo } from "@/lib/seo-domain";
import { loadPublicUser } from "@/lib/public-user";
import { UmamiTracker } from "@/components/umami-tracker";
import { BlogThemeToggle } from "@/components/blog-theme-toggle";

const FOUCE_SCRIPT = `(function(){try{if(localStorage.getItem('blog-theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();`;

type Props = {
  children: React.ReactNode;
};

export default async function CustomDomainLayout({ children }: Props) {
  const host = resolveTenantHostFromHeaders(await headers());
  const domainInfo = await resolveDomainForSeo(host);

  if (!domainInfo) {
    return children;
  }

  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") {
    return children;
  }

  const user = await loadPublicUser(domainInfo.username);
  if (!user) {
    return children;
  }

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: FOUCE_SCRIPT }} />
      <UmamiTracker user={user} />
      {children}
      <BlogThemeToggle />
    </>
  );
}
