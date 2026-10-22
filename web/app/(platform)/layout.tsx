import { GoogleAnalytics } from "@/components/google-analytics";

export default function PlatformLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <GoogleAnalytics />
      {children}
    </>
  );
}
