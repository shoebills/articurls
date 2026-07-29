import { useState, useMemo } from "react";
import type { DesignSettings, UserPage } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { SettingRow } from "./setting-row";
import { SortableItem } from "./sortable-item";
import { AddItemSelect } from "./add-item-select";
import { SOCIAL_OPTIONS, type SocialPlatform } from "./constants";

export function FooterSettings({
  design,
  pages,
  footerSelection,
  socialLinks,
  enabledSocials,
  busy,
  onDesignChange,
  saveDesign,
  saveFooter,
  saveBioSocials,
  onSocialLinksChange,
  onEnabledSocialsChange,
}: {
  design: DesignSettings;
  pages: UserPage[];
  footerSelection: number[];
  socialLinks: Record<SocialPlatform, string>;
  enabledSocials: SocialPlatform[];
  busy: boolean;
  onDesignChange: (next: DesignSettings) => void;
  saveDesign: (next: DesignSettings) => Promise<void>;
  saveFooter: (next: number[]) => Promise<void>;
  saveBioSocials: (linksOverride?: Record<string, string>) => Promise<void>;
  onSocialLinksChange: (links: Record<SocialPlatform, string>) => void;
  onEnabledSocialsChange: (socials: SocialPlatform[]) => void;
}) {
  const [footerPageToAdd, setFooterPageToAdd] = useState("");
  const [addingSocial, setAddingSocial] = useState(false);
  const [socialToAdd, setSocialToAdd] = useState<SocialPlatform | "">("");

  const pagesById = useMemo(() => new Map(pages.map((p) => [p.page_id, p])), [pages]);

  const footerAvailable = useMemo(
    () => pages.filter((p) => p.status === "published" && !footerSelection.includes(p.page_id)),
    [pages, footerSelection],
  );

  const selectedFooterPages = useMemo(
    () => footerSelection.map((id) => pagesById.get(id)).filter((p): p is UserPage => Boolean(p)),
    [footerSelection, pagesById],
  );

  const hiddenSocialOptions = SOCIAL_OPTIONS.filter((s) => !enabledSocials.includes(s.key));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  function handleFooterDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = footerSelection.indexOf(active.id as number);
    const newIndex = footerSelection.indexOf(over.id as number);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(footerSelection, oldIndex, newIndex);
    saveFooter(newOrder);
  }

  function handleRemoveFooterPage(id: number) {
    saveFooter(footerSelection.filter((x) => x !== id));
  }

  function handleAddFooterPage() {
    const id = Number(footerPageToAdd);
    if (!Number.isFinite(id)) return;
    const next = [...footerSelection, id];
    saveFooter(next);
    const nextAvailable = footerAvailable.find((p) => p.page_id !== id);
    setFooterPageToAdd(nextAvailable ? String(nextAvailable.page_id) : "");
  }

  function handleAddSocial() {
    if (!socialToAdd) return;
    onEnabledSocialsChange(
      enabledSocials.includes(socialToAdd) ? enabledSocials : [...enabledSocials, socialToAdd],
    );
    setAddingSocial(false);
    setSocialToAdd("");
  }

  function handleRemoveSocial(platformKey: SocialPlatform) {
    const nextLinks = { ...socialLinks, [platformKey]: "" };
    onSocialLinksChange(nextLinks);
    onEnabledSocialsChange(enabledSocials.filter((k) => k !== platformKey));
    saveBioSocials(nextLinks);
  }

  return (
    <>
      <SettingRow
        label="Enable footer"
        description="Shows pages and social links in the footer."
        checked={design.site_footer_enabled}
        onCheckedChange={(v) => {
          const next = { ...design, site_footer_enabled: v };
          onDesignChange(next);
          void saveDesign(next);
        }}
      />

      {design.site_footer_enabled ? (
        <>
          <div className="space-y-5">
            <p className="font-medium">Footer Pages</p>

            {selectedFooterPages.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleFooterDragEnd}
              >
                <SortableContext
                  items={footerSelection}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-2">
                    {footerSelection.map((id) => (
                      <li key={id}>
                        <SortableItem
                          id={id}
                          name={pagesById.get(id)?.title || "Untitled"}
                          disabled={busy}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            disabled={busy}
                            onClick={() => handleRemoveFooterPage(id)}
                            aria-label={`Remove ${pagesById.get(id)?.title || "page"} from footer`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </SortableItem>
                      </li>
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="flex min-h-[72px] flex-col items-center justify-center rounded-lg border border-dashed px-6 py-4 text-center">
                <p className="text-sm font-medium text-muted-foreground">No pages in footer yet.</p>
              </div>
            )}

            <AddItemSelect
              placeholder="Add page to footer"
              items={footerAvailable.map((p) => ({
                value: String(p.page_id),
                label: p.title,
              }))}
              selectedValue={footerPageToAdd}
              onValueChange={setFooterPageToAdd}
              onAdd={handleAddFooterPage}
              addLabel="Add page"
              disabled={busy}
              emptyStateText="No published pages yet."
            />
          </div>

          <div className="border-t border-border/60 pt-7">
            <p className="font-medium mb-4">Social links</p>

            {enabledSocials.length > 0 ? (
              <div className="space-y-5">
                {enabledSocials.map((platformKey) => {
                  const option = SOCIAL_OPTIONS.find((s) => s.key === platformKey);
                  if (!option) return null;
                  return (
                    <div key={platformKey} className="flex items-center gap-2.5 text-sm">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground">
                        {option.icon}
                      </div>
                      <Input
                        type={platformKey === "contact_email" ? "email" : "url"}
                        value={socialLinks[platformKey]}
                        className="h-9 min-w-0"
                        onChange={(e) =>
                          onSocialLinksChange({ ...socialLinks, [platformKey]: e.target.value })
                        }
                        onBlur={() => saveBioSocials()}
                        placeholder={option.placeholder}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveSocial(platformKey)}
                        aria-label={`Remove ${option.label}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[72px] flex-col items-center justify-center rounded-lg border border-dashed px-6 py-4 text-center">
                <p className="text-sm font-medium text-muted-foreground">No social links added yet.</p>
              </div>
            )}

            {hiddenSocialOptions.length > 0 ? (
              addingSocial ? (
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center mt-4">
                  <Select value={socialToAdd} onValueChange={(v) => setSocialToAdd(v as SocialPlatform)}>
                    <SelectTrigger className="sm:flex-1">
                      <SelectValue placeholder="Select social platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {hiddenSocialOptions.map((option) => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="default" onClick={handleAddSocial} disabled={!socialToAdd}>
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAddingSocial(false);
                        setSocialToAdd("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="mt-4 h-10 w-10"
                  onClick={() => {
                    setAddingSocial(true);
                    setSocialToAdd(hiddenSocialOptions[0]?.key || "");
                  }}
                  aria-label="Add social platform"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
}
