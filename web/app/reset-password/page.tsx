import { ResetPasswordForm } from "./reset-password-form";

type SearchParams = {
  token?: string | string[];
};

type ResetPasswordPageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const rawToken = params?.token;
  const token = Array.isArray(rawToken) ? rawToken[0] ?? "" : rawToken ?? "";

  return <ResetPasswordForm token={token.trim()} />;
}
