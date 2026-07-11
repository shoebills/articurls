import { ArrowDown, ArrowRight, LayoutDashboard } from "lucide-react";

const SCATTERED = [
  { label: "WordPress", x: "left-0 top-0", rotate: "-rotate-3" },
  { label: "Ghost", x: "right-2 top-1", rotate: "rotate-2" },
  { label: "Notion", x: "left-10 top-16", rotate: "rotate-1" },
  { label: "Plugins", x: "right-0 top-20", rotate: "-rotate-2" },
  { label: "Hosting", x: "left-2 top-32", rotate: "rotate-3" },
  { label: "SSL", x: "right-10 top-32", rotate: "-rotate-1" },
  { label: "Newsletter", x: "left-16 top-48", rotate: "rotate-2" },
  { label: "Analytics", x: "right-4 top-52", rotate: "-rotate-3" },
  { label: "DNS", x: "left-4 top-64", rotate: "rotate-1" },
] as const;

const CALM = ["One dashboard", "One editor", "One domain", "One analytics", "One workflow"] as const;

export function ProblemSection() {
  return (
    <section className="px-[max(1rem,env(safe-area-inset-left))] pt-24 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">The real problem</p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
            You don&apos;t want another tool.
            <br />
            <span className="text-muted-foreground">You want less work.</span>
          </h2>
        </div>

        <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
          <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-muted/30 p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,oklch(0.55_0.2_25/0.05),transparent_75%)]" />
            <p className="relative text-sm font-medium text-muted-foreground">Today</p>
            <p className="relative mt-1 text-lg font-semibold tracking-tight">Nine things to stitch together</p>

            <div className="relative mt-6 h-[19rem] w-full">
              {SCATTERED.map((tool) => (
                <span
                  key={tool.label}
                  className={`absolute ${tool.x} ${tool.rotate} inline-flex items-center rounded-lg border border-border/70 bg-background px-3 py-1.5 text-sm font-medium text-foreground/70 shadow-sm`}
                >
                  {tool.label}
                </span>
              ))}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-muted/30 to-transparent" />
            </div>
          </div>

          <div className="flex items-center justify-center py-2 lg:px-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card text-primary shadow-sm">
              <ArrowDown className="h-5 w-5 lg:hidden" />
              <ArrowRight className="hidden h-5 w-5 lg:block" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-card p-6 shadow-[0_28px_90px_-46px_rgba(124,58,237,0.5)] sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_10%,oklch(0.55_0.2_293/0.08),transparent_72%)]" />
            <p className="relative inline-flex items-center gap-2 text-sm font-medium text-primary">
              <LayoutDashboard className="h-4 w-4" /> With Articurls
            </p>
            <p className="relative mt-1 text-lg font-semibold tracking-tight">One calm place</p>

            <ul className="relative mt-6 flex h-[19rem] flex-col justify-center gap-3">
              {CALM.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-base font-medium"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
