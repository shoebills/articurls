import { resolveDomainForSeo } from "@/lib/seo-domain";
import { loadPublicSite } from "@/lib/public-site";
import { UmamiTracker } from "@/components/umami-tracker";

type Props = {
  children: React.ReactNode;
  params: Promise<{ domain: string }>;
};

export default async function SiteLayout({ children, params }: Props) {
  const { domain } = await params;
  const host = decodeURIComponent(domain);
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
