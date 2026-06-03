"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
// CodeBlock comes from StarterKit (no syntax highlighting needed)
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Redo2,
  ScanText,
  Underline as UnderlineIcon,
  Undo2,
  X,
  Video,
  ChevronDown,
  MoreHorizontal,
  Strikethrough,
  Type,
  Quote,
  WrapText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ApiError,
  deleteBlogMediaByUrl,
  deletePageMediaByUrl,
  uploadBlogMedia,
  uploadPageMedia,
} from "@/lib/api";
import { assetUrl } from "@/lib/env";
import { cn } from "@/lib/utils";
import { transformImageUrl, generateSrcSet, generateSizes } from "@/lib/image-transform";

// Toolbar action types (minimal-tiptap pattern)
type ToolbarAction = {
  value: string;
  label: string;
  icon: React.ReactNode;
  action: (editor: Editor) => void;
  isActive: (editor: Editor) => boolean;
  canExecute: (editor: Editor) => boolean;
};

function ToolbarButton({
  editor,
  action,
  variant = "ghost",
}: {
  editor: Editor;
  action: ToolbarAction;
  variant?: "ghost" | "secondary";
}) {
  const active = action.isActive(editor);
  const disabled = !action.canExecute(editor);
  return (
    <Button
      type="button"
      variant={active ? "secondary" : variant}
      size="icon"
      onClick={() => action.action(editor)}
      disabled={disabled}
      title={action.label}
    >
      {action.icon}
    </Button>
  );
}

function ToolbarSection({
  editor,
  actions,
  mainActionCount = 2,
  dropdownIcon,
  dropdownTooltip,
}: {
  editor: Editor;
  actions: ToolbarAction[];
  mainActionCount?: number;
  dropdownIcon?: React.ReactNode;
  dropdownTooltip?: string;
}) {
  const { main, dropdown } = useMemo(() => {
    return {
      main: actions.slice(0, mainActionCount),
      dropdown: actions.slice(mainActionCount),
    };
  }, [actions, mainActionCount]);

  const isDropdownActive = dropdown.some((a) => a.isActive(editor));

  return (
    <>
      {main.map((action) => (
        <ToolbarButton key={action.value} editor={editor} action={action} />
      ))}
      {dropdown.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant={isDropdownActive ? "secondary" : "ghost"}
              size="icon"
              title={dropdownTooltip || "More options"}
            >
              {dropdownIcon || <MoreHorizontal className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
            {dropdown.map((action) => (
              <DropdownMenuItem
                key={action.value}
                onClick={() => action.action(editor)}
                disabled={!action.canExecute(editor)}
                className={cn(
                  "flex items-center gap-2",
                  action.isActive(editor) && "bg-accent"
                )}
              >
                {action.icon}
                <span>{action.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}

function extractImageSrcsFromHtml(html: string): Set<string> {
  const urls = new Set<string>();
  const re = /<img[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null = re.exec(html);
  while (match) {
    const src = (match[1] || "").trim();
    if (src) urls.add(src);
    match = re.exec(html);
  }
  return urls;
}

type BlogEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  blogId: number | null;
  pageId?: number | null;
  token: string | null;
  className?: string;
};

export function BlogEditor({
  content,
  onChange,
  placeholder = "Tell your story…",
  blogId,
  pageId = null,
  token,
  className,
}: BlogEditorProps) {
  const [selectionTick, setSelectionTick] = useState(0);
  const prevImageSrcsRef = useRef<Set<string>>(extractImageSrcsFromHtml(content || ""));
  const deletingSrcsRef = useRef<Set<string>>(new Set());
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({
        inline: false,
        HTMLAttributes: {
          loading: "lazy",
          decoding: "async",
        },
      }).extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            srcset: { default: null },
            sizes: { default: null },
            loading: { default: "lazy" },
            decoding: { default: "async" },
          };
        },
      }),
      Youtube.configure({ width: 640, height: 360, nocookie: true }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "prose-blog max-w-none focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const nextHtml = ed.getHTML();
      onChange(nextHtml);

      if ((blogId || pageId) && token) {
        const nextSet = extractImageSrcsFromHtml(nextHtml);
        const removed: string[] = [];
        prevImageSrcsRef.current.forEach((src) => {
          if (!nextSet.has(src) && !deletingSrcsRef.current.has(src)) {
            removed.push(src);
          }
        });
        prevImageSrcsRef.current = nextSet;

        if (removed.length > 0) {
          removed.forEach((src) => deletingSrcsRef.current.add(src));
          void Promise.all(
            removed.map(async (src) => {
              try {
                if (blogId) {
                  await deleteBlogMediaByUrl(token, blogId, src);
                } else if (pageId) {
                  await deletePageMediaByUrl(token, pageId, src);
                }
              } catch {
                // Best effort only; editor UX should not fail on cleanup issues.
              } finally {
                deletingSrcsRef.current.delete(src);
              }
            })
          );
        }
      } else {
        prevImageSrcsRef.current = extractImageSrcsFromHtml(nextHtml);
      }
    },
    onSelectionUpdate: () => {
      // Force a lightweight re-render so toolbar disabled states reflect node selection changes.
      setSelectionTick((v) => v + 1);
    },
    immediatelyRender: false,
  });

  const isImageSelected =
    !!editor &&
    ((editor.state.selection as { node?: { type?: { name?: string } } }).node?.type?.name === "image" ||
      editor.isActive("image"));

  // Track if editor is focused to prevent overwriting during active editing
  const isEditorFocusedRef = useRef(false);

  useEffect(() => {
    if (!editor) return;

    // Track focus state to prevent content overwrites during typing
    const handleFocus = () => {
      isEditorFocusedRef.current = true;
    };
    const handleBlur = () => {
      isEditorFocusedRef.current = false;
    };

    editor.on("focus", handleFocus);
    editor.on("blur", handleBlur);

    return () => {
      editor.off("focus", handleFocus);
      editor.off("blur", handleBlur);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    prevImageSrcsRef.current = extractImageSrcsFromHtml(content || "");
    
    // Only update editor content if:
    // 1. Content is different from current editor state, AND
    // 2. Editor is not currently focused (user is not actively typing)
    // This prevents autosave from overwriting content during active editing
    if (content !== current && !isEditorFocusedRef.current) {
      editor.commands.setContent(content || "<p></p>", { emitUpdate: false });
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(async () => {
    if (!editor || !token) {
      window.alert("Please log in to upload images.");
      return;
    }
    if (!blogId && !pageId) {
      window.alert("Save first to upload images.");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const media = blogId
          ? await uploadBlogMedia(token, blogId, file)
          : await uploadPageMedia(token, pageId!, file);
        const alt = window.prompt("Alt text (recommended for accessibility)", "") ?? "";
        const originalUrl = assetUrl(media.url);

        // Transform URL to use Cloudflare Image Transformations
        // This converts the URL to: images.articurls.com/cdn-cgi/image/format=auto,width=600/...
        const imageUrl = transformImageUrl(originalUrl, { width: 600 });

        // Load original image to get natural dimensions (prevents CLS)
        const img = new window.Image();
        img.src = originalUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        // Generate srcset for responsive loading
        const srcset = generateSrcSet(originalUrl);
        const sizes = generateSizes();

        editor.chain().focus().setImage({
          src: imageUrl,
          alt: alt.trim(),
          width: img.naturalWidth,
          height: img.naturalHeight,
          srcset,
          sizes,
          loading: "lazy",
          decoding: "async",
        } as any).run();
      } catch (e) {
        const detail = e instanceof ApiError ? e.message : "Image upload failed.";
        window.alert(detail);
      }
    };
    input.click();
  }, [blogId, pageId, editor, token]);

  const editSelectedImageAlt = useCallback(() => {
    if (!editor || !isImageSelected) return;
    const attrs = editor.getAttributes("image");
    const nextAlt = window.prompt("Image alt text", attrs.alt || "");
    if (nextAlt === null) return;
    editor.chain().focus().updateAttributes("image", { alt: nextAlt.trim() }).run();
  }, [editor, isImageSelected]);

  const addYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("YouTube URL");
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url });
  }, [editor]);

  const removeSelectedImage = useCallback(async () => {
    if (!editor || !isImageSelected) return;
    const attrs = editor.getAttributes("image");
    const src = typeof attrs?.src === "string" ? attrs.src : "";
    if ((blogId || pageId) && token && src) {
      try {
        if (blogId) {
          await deleteBlogMediaByUrl(token, blogId, src);
        } else if (pageId) {
          await deletePageMediaByUrl(token, pageId, src);
        }
      } catch {
        // Keep UX smooth; content removal should still work even if media cleanup fails.
      }
    }
    editor.chain().focus().deleteSelection().run();
  }, [editor, isImageSelected, blogId, pageId, token]);

  if (!editor) {
    return <div className="min-h-[320px] animate-pulse rounded-md border border-dashed border-border bg-muted/30" />;
  }

  // Toolbar action definitions (minimal-tiptap pattern)
  const historyActions: ToolbarAction[] = [
    {
      value: "undo",
      label: "Undo",
      icon: <Undo2 className="h-4 w-4" />,
      action: (e) => e.chain().focus().undo().run(),
      isActive: () => false,
      canExecute: (e) => e.can().chain().focus().undo().run(),
    },
    {
      value: "redo",
      label: "Redo",
      icon: <Redo2 className="h-4 w-4" />,
      action: (e) => e.chain().focus().redo().run(),
      isActive: () => false,
      canExecute: (e) => e.can().chain().focus().redo().run(),
    },
  ];

  const headingActions: ToolbarAction[] = [
    {
      value: "heading1",
      label: "Heading 1",
      icon: <Heading1 className="h-4 w-4" />,
      action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: (e) => e.isActive("heading", { level: 1 }),
      canExecute: (e) => e.can().chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      value: "heading2",
      label: "Heading 2",
      icon: <Heading2 className="h-4 w-4" />,
      action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: (e) => e.isActive("heading", { level: 2 }),
      canExecute: (e) => e.can().chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      value: "heading3",
      label: "Heading 3",
      icon: <Heading3 className="h-4 w-4" />,
      action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: (e) => e.isActive("heading", { level: 3 }),
      canExecute: (e) => e.can().chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      value: "paragraph",
      label: "Paragraph",
      icon: <Type className="h-4 w-4" />,
      action: (e) => e.chain().focus().setParagraph().run(),
      isActive: (e) => e.isActive("paragraph"),
      canExecute: (e) => e.can().chain().focus().setParagraph().run(),
    },
  ];

  const formatActions: ToolbarAction[] = [
    {
      value: "bold",
      label: "Bold",
      icon: <Bold className="h-4 w-4" />,
      action: (e) => e.chain().focus().toggleBold().run(),
      isActive: (e) => e.isActive("bold"),
      canExecute: (e) => e.can().chain().focus().toggleBold().run() && !e.isActive("codeBlock"),
    },
    {
      value: "italic",
      label: "Italic",
      icon: <Italic className="h-4 w-4" />,
      action: (e) => e.chain().focus().toggleItalic().run(),
      isActive: (e) => e.isActive("italic"),
      canExecute: (e) => e.can().chain().focus().toggleItalic().run() && !e.isActive("codeBlock"),
    },
    {
      value: "underline",
      label: "Underline",
      icon: <UnderlineIcon className="h-4 w-4" />,
      action: (e) => e.chain().focus().toggleUnderline().run(),
      isActive: (e) => e.isActive("underline"),
      canExecute: (e) => e.can().chain().focus().toggleUnderline().run() && !e.isActive("codeBlock"),
    },
    {
      value: "strikethrough",
      label: "Strikethrough",
      icon: <Strikethrough className="h-4 w-4" />,
      action: (e) => e.chain().focus().toggleStrike().run(),
      isActive: (e) => e.isActive("strike"),
      canExecute: (e) => e.can().chain().focus().toggleStrike().run() && !e.isActive("codeBlock"),
    },
    {
      value: "code",
      label: "Inline Code",
      icon: <Code className="h-4 w-4" />,
      action: (e) => e.chain().focus().toggleCode().run(),
      isActive: (e) => e.isActive("code"),
      canExecute: (e) => e.can().chain().focus().toggleCode().run() && !e.isActive("codeBlock"),
    },
    {
      value: "highlight",
      label: "Highlight",
      icon: <Highlighter className="h-4 w-4" />,
      action: (e) => e.chain().focus().toggleHighlight().run(),
      isActive: (e) => e.isActive("highlight"),
      canExecute: (e) => e.can().chain().focus().toggleHighlight().run() && !e.isActive("codeBlock"),
    },
  ];

  const listActions: ToolbarAction[] = [
    {
      value: "bulletList",
      label: "Bullet List",
      icon: <List className="h-4 w-4" />,
      action: (e) => e.chain().focus().toggleBulletList().run(),
      isActive: (e) => e.isActive("bulletList"),
      canExecute: (e) => e.can().chain().focus().toggleBulletList().run(),
    },
    {
      value: "orderedList",
      label: "Ordered List",
      icon: <ListOrdered className="h-4 w-4" />,
      action: (e) => e.chain().focus().toggleOrderedList().run(),
      isActive: (e) => e.isActive("orderedList"),
      canExecute: (e) => e.can().chain().focus().toggleOrderedList().run(),
    },
    {
      value: "blockquote",
      label: "Quote",
      icon: <Quote className="h-4 w-4" />,
      action: (e) => e.chain().focus().toggleBlockquote().run(),
      isActive: (e) => e.isActive("blockquote"),
      canExecute: (e) => e.can().chain().focus().toggleBlockquote().run(),
    },
    {
      value: "codeBlock",
      label: "Code Block",
      icon: <Code className="h-4 w-4" />,
      action: (e) => e.chain().focus().toggleCodeBlock().run(),
      isActive: (e) => e.isActive("codeBlock"),
      canExecute: (e) => e.can().chain().focus().toggleCodeBlock().run(),
    },
    {
      value: "horizontalRule",
      label: "Divider",
      icon: <Minus className="h-4 w-4" />,
      action: (e) => e.chain().focus().setHorizontalRule().run(),
      isActive: () => false,
      canExecute: (e) => e.can().chain().focus().setHorizontalRule().run(),
    },
  ];

  const insertActions: ToolbarAction[] = [
    {
      value: "link",
      label: "Link",
      icon: <Link2 className="h-4 w-4" />,
      action: setLink,
      isActive: (e) => e.isActive("link"),
      canExecute: () => true,
    },
    {
      value: "image",
      label: "Image",
      icon: <ImageIcon className="h-4 w-4" />,
      action: addImage,
      isActive: () => false,
      canExecute: () => !!token && !!(blogId || pageId),
    },
    {
      value: "youtube",
      label: "YouTube",
      icon: <Video className="h-4 w-4" />,
      action: addYoutube,
      isActive: () => false,
      canExecute: () => true,
    },
  ];

  return (
    <div className={cn("tiptap-editor rounded-lg border border-input bg-background", className)}>
      <span className="hidden" aria-hidden>
        {selectionTick}
      </span>
      <div className="flex h-12 shrink-0 items-center gap-px overflow-x-auto border-b border-border p-2 [scrollbar-width:thin]">
        {/* History */}
        <ToolbarSection editor={editor} actions={historyActions} mainActionCount={2} />
        <Separator orientation="vertical" className="mx-2 h-6" />

        {/* Formatting: Bold/Italic main, rest in dropdown */}
        <ToolbarSection
          editor={editor}
          actions={formatActions}
          mainActionCount={3}
          dropdownIcon={<MoreHorizontal className="h-4 w-4" />}
          dropdownTooltip="More formatting"
        />
        <Separator orientation="vertical" className="mx-2 h-6" />

        {/* Headings in dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant={editor.isActive("heading") ? "secondary" : "ghost"}
              size="icon"
              title="Headings"
            >
              {editor.isActive("heading", { level: 1 }) ? (
                <Heading1 className="h-4 w-4" />
              ) : editor.isActive("heading", { level: 2 }) ? (
                <Heading2 className="h-4 w-4" />
              ) : editor.isActive("heading", { level: 3 }) ? (
                <Heading3 className="h-4 w-4" />
              ) : (
                <Type className="h-4 w-4" />
              )}
              <ChevronDown className="ml-0.5 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
            {headingActions.map((action) => (
              <DropdownMenuItem
                key={action.value}
                onClick={() => action.action(editor)}
                disabled={!action.canExecute(editor)}
                className={cn(
                  "flex items-center gap-2",
                  action.isActive(editor) && "bg-accent"
                )}
              >
                {action.icon}
                <span>{action.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Separator orientation="vertical" className="mx-2 h-6" />

        {/* Lists & Blocks */}
        <ToolbarSection
          editor={editor}
          actions={listActions}
          mainActionCount={2}
          dropdownIcon={<WrapText className="h-4 w-4" />}
          dropdownTooltip="More blocks"
        />
        <Separator orientation="vertical" className="mx-2 h-6" />

        {/* Insert */}
        <ToolbarSection
          editor={editor}
          actions={insertActions}
          mainActionCount={2}
          dropdownIcon={<MoreHorizontal className="h-4 w-4" />}
          dropdownTooltip="Insert"
        />

      </div>
      <div className="p-3 sm:p-4 md:p-6">
        <EditorContent editor={editor} />
        {editor && (
          <BubbleMenu
            editor={editor}
            shouldShow={({ editor: ed }) =>
              ed.isActive("image") && ed.isEditable
            }
            options={{ placement: "top" }}
          >
            <div className="flex items-center gap-1 rounded-md border bg-popover p-1 shadow-md">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs"
                onClick={editSelectedImageAlt}
              >
                <ScanText className="h-3.5 w-3.5" />
                Alt text
              </Button>
              <Separator orientation="vertical" className="h-5" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs text-destructive hover:text-destructive"
                onClick={removeSelectedImage}
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          </BubbleMenu>
        )}
      </div>
    </div>
  );
}
