import { headers } from "next/headers";
import { resolveTenantHostFromHeaders } from "@/lib/request-host";
import { resolveDomainForSeo } from "@/lib/seo-domain";
import { loadPublicSite } from "@/lib/public-site";
import { UmamiTracker } from "@/components/umami-tracker";

type Props = {
  children: React.ReactNode;
};

export default async function SiteLayout({ children }: Props) {
  const host = resolveTenantHostFromHeaders(await headers());
  const domainInfo = await resolveDomainForSeo(host);

  if (!domainInfo) {
    return children;
  }

  if (domainInfo.domain_status !== "active" && domainInfo.domain_status !== "grace") {
    return children;
  }

  const site = await loadPublicSite(domainInfo.subdomain);
  if (!site) {
    return children;
  }

  return (
    <>
      <UmamiTracker site={site} />
      {children}
    </>
  );
}