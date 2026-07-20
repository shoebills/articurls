function Line({ width }: { width: string }) {
  return <div className={`h-2.5 rounded bg-muted-foreground/15 ${width}`} />;
}

function ImagePlaceholder({ className = "" }: { className?: string }) {
  return (
    <div className={`aspect-[3/2] rounded-lg border border-dashed border-border/70 bg-muted/30 ${className}`}>
      <div className="flex h-full items-center justify-center">
        <svg
          className="h-5 w-5 text-muted-foreground/30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        </svg>
      </div>
    </div>
  );
}

function MiniHeader() {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
      <div className="h-5 w-5 rounded-full bg-primary/10" />
      <div className="h-2.5 w-16 rounded bg-muted-foreground/20" />
    </div>
  );
}

function WideCardGridWithAbout() {
  return (
    <div className="flex flex-col divide-y divide-border/60">
      <MiniHeader />
      <div className="space-y-4 px-4 py-4">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-8 w-8 rounded-full bg-muted-foreground/15" />
          <Line width="w-20" />
          <div className="mx-auto flex max-w-[200px] flex-col gap-1">
            <Line width="w-full" />
            <Line width="w-3/4" />
          </div>
        </div>
      </div>
      <div className="space-y-4 px-4 py-4">
        <div className="space-y-2">
          <ImagePlaceholder />
          <Line width="w-3/4" />
          <Line width="w-full" />
          <Line width="w-2/3" />
        </div>
        <div className="space-y-2">
          <ImagePlaceholder />
          <Line width="w-2/3" />
          <Line width="w-full" />
          <Line width="w-1/2" />
        </div>
      </div>
    </div>
  );
}

function WideCardGridNoAbout() {
  return (
    <div className="flex flex-col divide-y divide-border/60">
      <MiniHeader />
      <div className="space-y-4 px-4 py-4">
        <div className="space-y-2">
          <ImagePlaceholder />
          <Line width="w-3/4" />
          <Line width="w-full" />
          <Line width="w-2/3" />
        </div>
        <div className="space-y-2">
          <ImagePlaceholder />
          <Line width="w-2/3" />
          <Line width="w-full" />
          <Line width="w-1/2" />
        </div>
      </div>
    </div>
  );
}

function WideSideImage() {
  return (
    <div className="flex flex-col divide-y divide-border/60">
      <MiniHeader />
      <div className="space-y-5 px-4 py-4">
        <div className="flex gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Line width="w-3/4" />
            <Line width="w-full" />
            <Line width="w-2/3" />
          </div>
          <div className="w-16 shrink-0 sm:w-20">
            <ImagePlaceholder />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Line width="w-2/3" />
            <Line width="w-full" />
            <Line width="w-1/2" />
          </div>
          <div className="w-16 shrink-0 sm:w-20">
            <ImagePlaceholder />
          </div>
        </div>
      </div>
    </div>
  );
}

function NarrowCentered() {
  return (
    <div className="flex flex-col divide-y divide-border/60">
      <MiniHeader />
      <div className="space-y-4 px-6 py-4">
        <div className="space-y-2">
          <ImagePlaceholder />
          <div className="space-y-1.5">
            <Line width="w-3/4" />
            <Line width="w-full" />
            <Line width="w-2/3" />
          </div>
        </div>
        <div className="space-y-2">
          <ImagePlaceholder />
          <div className="space-y-1.5">
            <Line width="w-2/3" />
            <Line width="w-full" />
            <Line width="w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TextOnly() {
  return (
    <div className="flex flex-col divide-y divide-border/60">
      <MiniHeader />
      <div className="space-y-4 px-4 py-4">
        <div className="space-y-2">
          <Line width="w-3/4" />
          <Line width="w-full" />
          <Line width="w-2/3" />
        </div>
        <div className="space-y-2">
          <Line width="w-2/3" />
          <Line width="w-full" />
          <Line width="w-1/2" />
        </div>
        <div className="space-y-2">
          <Line width="w-4/5" />
          <Line width="w-full" />
        </div>
      </div>
    </div>
  );
}

const LAYOUTS = [
  { component: WideCardGridWithAbout, label: "Wide · Card grid · About section" },
  { component: WideCardGridNoAbout, label: "Wide · Card grid · No about section" },
  { component: WideSideImage, label: "Wide · Side image" },
  { component: NarrowCentered, label: "Narrow · Centered" },
  { component: TextOnly, label: "Text-only" },
] as const;

export function StyleItYourWay() {
  return (
    <section className="px-[max(1rem,env(safe-area-inset-left))] pt-24 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">CUSTOMIZE</p>
          <h2 className="mt-5 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
            Style it your way
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Choose the appearance the way you want.
          </p>
        </div>

        <div className="mx-auto mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {LAYOUTS.map(({ component: Preview, label }) => (
            <div key={label} className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                <Preview />
              </div>
              <p className="px-1 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
