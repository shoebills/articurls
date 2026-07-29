import type { DesignSettings, NavBlogNameSize } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SettingRow } from "./setting-row";

const blogNameSizeOptions: NavBlogNameSize[] = ["small", "medium", "large"];

export function HeaderSettings({
  design,
  busy,
  onDesignChange,
  saveDesign,
}: {
  design: DesignSettings;
  busy: boolean;
  onDesignChange: (next: DesignSettings) => void;
  saveDesign: (next: DesignSettings) => Promise<void>;
}) {
  return (
    <>
      <SettingRow
        label="Enable header"
        description="If disabled, public view shows only blogs."
        checked={design.navbar_enabled}
        onCheckedChange={(v) => {
          const next = { ...design, navbar_enabled: v };
          onDesignChange(next);
          void saveDesign(next);
        }}
      />

      {design.navbar_enabled ? (
        <>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="blogName">Blog name</Label>
              <Input
                id="blogName"
                className="mt-2"
                value={design.nav_blog_name || ""}
                onChange={(e) => onDesignChange({ ...design, nav_blog_name: e.target.value })}
                onBlur={() =>
                  saveDesign({
                    ...design,
                    nav_blog_name: (design.nav_blog_name || "").trim() || null,
                  })
                }
                placeholder="My Blog"
                disabled={busy}
              />
            </div>
            <div className="shrink-0 space-y-2 sm:min-w-[220px]">
              <Label id="blog-name-size-label">
                Header font size
              </Label>
              <div
                role="group"
                aria-labelledby="blog-name-size-label"
                className="mt-2 flex rounded-lg border border-border bg-muted/20 p-0.5"
              >
                {blogNameSizeOptions.map((size) => (
                  <Button
                    key={size}
                    type="button"
                    variant={design.nav_blog_name_size === size ? "default" : "ghost"}
                    size="sm"
                    className="h-10 flex-1 rounded-md px-2 text-xs capitalize sm:text-sm"
                    disabled={busy}
                    onClick={() => {
                      if (design.nav_blog_name_size === size) return;
                      saveDesign({ ...design, nav_blog_name_size: size });
                    }}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-border/60" />
          <SettingRow
            label="Show category menu"
            description="Show categories in the header."
            checked={design.nav_menu_enabled}
            onCheckedChange={(v) => {
              const next = { ...design, nav_menu_enabled: v };
              onDesignChange(next);
              void saveDesign(next);
            }}
          />
        </>
      ) : null}
    </>
  );
}
