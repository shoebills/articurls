import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type DashboardBreadcrumbItem = {
  label: string;
  href?: string;
};

export function DashboardBreadcrumb({ trail }: { trail: DashboardBreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-sm">
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "font-medium text-foreground" : "font-medium text-muted-foreground"}
                >
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground/60" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SettingsBreadcrumb({ current }: { current: string }) {
  return (
    <DashboardBreadcrumb
      trail={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Settings", href: "/dashboard/settings" },
        { label: current },
      ]}
    />
  );
}
