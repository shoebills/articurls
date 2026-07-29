import { useState, useMemo } from "react";
import type { DesignSettings, BlogListItem } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
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

export function BodySettings({
  design,
  blogs,
  bio,
  busy,
  onDesignChange,
  saveDesign,
  onBioChange,
  saveBioSocials,
}: {
  design: DesignSettings;
  blogs: BlogListItem[];
  bio: string;
  busy: boolean;
  onDesignChange: (next: DesignSettings) => void;
  saveDesign: (next: DesignSettings) => Promise<void>;
  onBioChange: (value: string) => void;
  saveBioSocials: (linksOverride?: Record<string, string>) => Promise<void>;
}) {
  const [blogToAdd, setBlogToAdd] = useState("");

  const availableBlogs = useMemo(
    () => blogs.filter((b) => !design.featured_blog_ids.includes(b.blog_id)),
    [blogs, design.featured_blog_ids],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  function handleFeaturedDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = design.featured_blog_ids.indexOf(active.id as number);
    const newIndex = design.featured_blog_ids.indexOf(over.id as number);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(design.featured_blog_ids, oldIndex, newIndex);
    saveDesign({ ...design, featured_blog_ids: newOrder });
  }

  function handleRemoveFeatured(id: number) {
    saveDesign({
      ...design,
      featured_blog_ids: design.featured_blog_ids.filter((x) => x !== id),
    });
  }

  function handleAddFeatured() {
    const id = Number(blogToAdd);
    if (!Number.isFinite(id)) return;
    const next = [...design.featured_blog_ids, id];
    saveDesign({ ...design, featured_blog_ids: next });
    setBlogToAdd("");
  }

  return (
    <>
      {/* About */}
      <div>
        <p className="text-base font-semibold tracking-tight">About</p>
        <div className="mt-4 space-y-5">
          <SettingRow
            label="Enable about section"
            description="Shows title and bio at the top of the blog list."
            checked={design.show_about_section}
            onCheckedChange={(v) => {
              const next = { ...design, show_about_section: v };
              onDesignChange(next);
              void saveDesign(next);
            }}
          />

          {design.show_about_section ? (
            <>
              <div className="space-y-3">
                <Label htmlFor="about-title">Title</Label>
                <Input
                  id="about-title"
                  className="mt-2"
                  value={design.about_title || ""}
                  onChange={(e) => onDesignChange({ ...design, about_title: e.target.value.slice(0, 40) || null })}
                  onBlur={() => saveDesign({ ...design, about_title: (design.about_title || "").trim() || null })}
                  maxLength={40}
                  placeholder="Hey! I'm John Doe"
                />
                <p className="text-xs text-muted-foreground">{(design.about_title || "").length}/40 characters</p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  className="mt-2 min-h-[120px]"
                  value={bio}
                  onChange={(e) => onBioChange(e.target.value)}
                  onBlur={() => saveBioSocials()}
                  maxLength={1400}
                  placeholder="Tell more about yourself..."
                />
                <p className="text-xs text-muted-foreground">{bio.trim() ? bio.trim().split(/\s+/).length : 0}/50 words</p>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="border-t border-border/60" />

      {/* Content Layout */}
      <div>
        <p className="text-base font-semibold tracking-tight">Content Layout</p>
        <div className="mt-4 space-y-5">
          <div>
            <div className="space-y-1">
              <p className="font-medium">Content width</p>
              <p className="text-sm text-muted-foreground">Controls the overall width of your blog pages on desktop.</p>
            </div>
            <div className="mt-2 max-w-xs">
              <Select
                value={design.content_width}
                onValueChange={(v) => saveDesign({ ...design, content_width: v as "narrow" | "wide" })}
                disabled={busy}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="narrow">Narrow</SelectItem>
                  <SelectItem value="wide">Wide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <SettingRow
            label="Show preview images"
            description="Show featured or first image as a preview on the blog homepage and category pages."
            checked={design.show_preview_in_lists}
            onCheckedChange={(v) => {
              const next = { ...design, show_preview_in_lists: v };
              onDesignChange(next);
              void saveDesign(next);
            }}
          />

          <div>
            <div className={`space-y-1 ${!design.show_preview_in_lists ? "opacity-50" : ""}`}>
              <p className="font-medium">List image position</p>
              <p className="text-sm text-muted-foreground">Choose where cover images appear on your blog homepage and category pages.</p>
            </div>
            <div className="mt-2 max-w-xs">
              <Select
                value={design.list_image_position}
                onValueChange={(v) => saveDesign({ ...design, list_image_position: v as "above_title" | "next_to_title" })}
                disabled={busy || !design.show_preview_in_lists}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above_title">Above title</SelectItem>
                  <SelectItem value="next_to_title">Next to title</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/60" />

      {/* Featured Posts */}
      <div>
        <p className="text-base font-semibold tracking-tight">Featured Posts</p>
        <div className="mt-4 space-y-5">
          <SettingRow
            label="Enable featured blogs"
            description="Show a featured section at the top of the blog list."
            checked={design.featured_blogs_enabled}
            onCheckedChange={(v) => {
              const next = { ...design, featured_blogs_enabled: v };
              onDesignChange(next);
              void saveDesign(next);
            }}
          />

          {design.featured_blogs_enabled ? (
            <>
              <p className="font-medium">Featured Posts ({design.featured_blog_ids.length}/12)</p>

              {design.featured_blog_ids.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleFeaturedDragEnd}
                >
                  <SortableContext
                    items={design.featured_blog_ids}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-2">
                      {design.featured_blog_ids.map((id) => {
                        const b = blogs.find((x) => x.blog_id === id);
                        return (
                          <li key={id}>
                            <SortableItem
                              id={id}
                              name={b?.title || "Unknown blog"}
                              disabled={busy}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                disabled={busy}
                                onClick={() => handleRemoveFeatured(id)}
                                aria-label={`Remove ${b?.title || "post"} from featured`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </SortableItem>
                          </li>
                        );
                      })}
                    </ul>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="flex min-h-[72px] flex-col items-center justify-center rounded-lg border border-dashed px-6 py-4 text-center">
                  <p className="text-sm font-medium text-muted-foreground">No featured posts yet.</p>
                </div>
              )}

              {design.featured_blog_ids.length < 12 ? (
                <AddItemSelect
                  placeholder="Add post to featured"
                  items={availableBlogs.map((b) => ({
                    value: String(b.blog_id),
                    label: b.title,
                  }))}
                  selectedValue={blogToAdd}
                  onValueChange={setBlogToAdd}
                  onAdd={handleAddFeatured}
                  addLabel="Add post"
                  disabled={busy}
                  emptyStateText="No published posts yet."
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-2">Maximum 12 posts allowed.</p>
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
