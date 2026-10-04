import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SettingsBreadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-sm">
        <li>
          <Link
            href="/dashboard"
            className="font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
        </li>
        <li aria-hidden="true" className="flex">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        </li>
        <li>
          <Link
            href="/dashboard/settings"
            className="font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Settings
          </Link>
        </li>
        <li aria-hidden="true" className="flex">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        </li>
        <li aria-current="page" className="font-medium text-foreground">
          {current}
        </li>
      </ol>
    </nav>
  );
}
