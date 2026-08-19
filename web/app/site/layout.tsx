import { headers } from "next/headers";
import { resolveTenantHostFromHeaders } from "@/lib/request-host";
import { resolveDomainForSeo } from "@/lib/seo-domain";
import { loadPublicUser } from "@/lib/public-user";
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

  const user = await loadPublicUser(domainInfo.username);
  if (!user) {
    return children;
  }

  return (
    <>
      <UmamiTracker user={user} />
      {children}
    </>
  );
}
