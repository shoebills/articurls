import { isReservedUsername } from "@/lib/reserved-usernames";
import { loadPublicUser } from "@/lib/public-user";
import { UmamiTracker } from "@/components/umami-tracker";

type Props = {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
};

export default async function UsernamePublicLayout({ children, params }: Props) {
  const { username } = await params;

  if (isReservedUsername(username)) {
    return children;
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
