import Link from "next/link";
import {
  ChevronRight,
  Code2,
  Globe,
  PanelBottom,
  PanelTop,
  Search,
  SlidersHorizontal,
  BookOpen,
  Sparkles,
  Mail,
  type LucideIcon,
} from "lucide-react";

interface SettingCardItem {
  id: string;
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

interface SettingsSection {
  title: string;
  description: string;
  items: SettingCardItem[];
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: "Website",
    description: "Manage your site's core configuration and presentation.",
    items: [
      {
        id: "general",
        href: "/dashboard/settings/general",
        title: "General",
        description: "Site identity, hero section, language and feeds.",
        icon: SlidersHorizontal,
      },
      {
        id: "content",
        href: "/dashboard/settings/content",
        title: "Content",
        description: "Reading width, feed layout, pagination and table of contents.",
        icon: BookOpen,
      },
      {
        id: "nav",
        href: "/dashboard/settings/navigation",
        title: "Navigation",
        description: "Brand name, header style, logo image and navigation links.",
        icon: PanelTop,
      },
      {
        id: "footer",
        href: "/dashboard/settings/footer",
        title: "Footer",
        description: "Multi-column link groups, description and copyright.",
        icon: PanelBottom,
      },
      {
        id: "domains",
        href: "/dashboard/settings/domains",
        title: "Domains",
        description: "Subdomain, custom domains and subfolder publishing.",
        icon: Globe,
      },
    ],
  },
  {
    title: "Audience & Growth",
    description: "Promotions, subscriber collection, and search visibility.",
    items: [
      {
        id: "newsletter",
        href: "/dashboard/settings/newsletter",
        title: "Newsletter",
        description: "Subscription copy, placement and external webhook sync.",
        icon: Mail,
      },
      {
        id: "cta",
        href: "/dashboard/settings/cta",
        title: "Call to Action",
        description: "Standalone promotional banner for posts and pages.",
        icon: Sparkles,
      },
      {
        id: "seo",
        href: "/dashboard/settings/seo",
        title: "SEO",
        description: "Search engine indexing, metadata and social previews.",
        icon: Search,
      },
    ],
  },
  {
    title: "Advanced",
    description: "Manage technical configuration and custom code.",
    items: [
      {
        id: "code",
        href: "/dashboard/settings/code",
        title: "Code Injection",
        description: "Add custom head/body scripts and CSS to your site.",
        icon: Code2,
      },
    ],
  },
];

function SettingsCard({ item }: { item: SettingCardItem }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="group flex w-full items-center gap-4 rounded-xl border border-border/80 bg-background p-4 text-left shadow-xs transition-[border-color,box-shadow] duration-200 ease-out hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:p-5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted/40 text-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-sm font-medium">{item.title}</span>
        <span className="block text-sm leading-relaxed text-muted-foreground">{item.description}</span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </Link>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
      </div>

      <div className="space-y-8 sm:space-y-10">
        {SETTINGS_SECTIONS.map((section) => (
          <section key={section.title} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold tracking-tight sm:text-lg">{section.title}</h2>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </div>
            <div aria-hidden="true" className="h-px bg-border/70" />
            <div className="space-y-3 max-w-3xl">
              {section.items.map((item) => (
                <SettingsCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
