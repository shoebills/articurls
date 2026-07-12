import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { isReservedUsername } from "@/lib/reserved-usernames";
import { loadPublicUser } from "@/lib/public-user";
import { UmamiTracker } from "@/components/umami-tracker";
import { MARKETING_ORIGIN } from "@/lib/env";

const MARKETING_HOST = new URL(MARKETING_ORIGIN).hostname;

type Props = {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
};

export default async function UsernamePublicLayout({ children, params }: Props) {
  const { username } = await params;

  if (isReservedUsername(username)) {
    return children;
  }

  const host = (await headers()).get("host")?.split(":")[0];
  if (host === MARKETING_HOST) {
    notFound();
  }

  const user = await loadPublicUser(username);
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
