export default function AudienceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto max-w-[1100px] space-y-6">
        {children}
      </div>
    </>
  );
}
