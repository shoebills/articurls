export default function AudienceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto max-w-[1100px] space-y-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Audience</h1>

        {children}
      </div>
    </>
  );
}
