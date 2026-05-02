"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
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
} from "lucide-react";
import { ApiError, deleteBlogMediaByUrl, uploadBlogMedia, uploadPageMedia } from "@/lib/api";
import { assetUrl } from "@/lib/env";
import { cn } from "@/lib/utils";

const lowlight = createLowlight(common);

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
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
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

      if (blogId && token) {
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
                await deleteBlogMediaByUrl(token, blogId, src);
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

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    prevImageSrcsRef.current = extractImageSrcsFromHtml(content || "");
    if (content !== current) {
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
        const media = blogId ? await uploadBlogMedia(token, blogId, file) : await uploadPageMedia(token, file);
        const alt = window.prompt("Alt text (recommended for accessibility)", "") ?? "";
        editor.chain().focus().setImage({ src: assetUrl(media.url), alt: alt.trim() }).run();
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
    if (blogId && token && src) {
      try {
        await deleteBlogMediaByUrl(token, blogId, src);
      } catch {
        // Keep UX smooth; content removal should still work even if media cleanup fails.
      }
    }
    editor.chain().focus().deleteSelection().run();
  }, [editor, isImageSelected, blogId, token]);

  if (!editor) {
    return <div className="min-h-[320px] animate-pulse rounded-md border border-dashed border-border bg-muted/30" />;
  }

  return (
    <div className={cn("tiptap-editor rounded-lg border border-input bg-background", className)}>
      <span className="hidden" aria-hidden>
        {selectionTick}
      </span>
      <div className="-mx-px flex flex-nowrap items-center gap-0.5 overflow-x-auto overscroll-x-contain border-b border-border p-2 [scrollbar-width:thin] sm:flex-wrap">
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button
          type="button"
          variant={editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button
          type="button"
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("underline") ? "secondary" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("highlight") ? "secondary" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={setLink}>
          <Link2 className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button
          type="button"
          variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("codeBlock") ? "secondary" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button type="button" variant="ghost" size="icon" onClick={addImage} title="Image">
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={isImageSelected ? "secondary" : "ghost"}
          size="icon"
          onClick={editSelectedImageAlt}
          title="Edit image alt text"
          disabled={!isImageSelected}
        >
          <ScanText className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={isImageSelected ? "secondary" : "ghost"}
          size="icon"
          onClick={removeSelectedImage}
          title="Remove selected image"
          disabled={!isImageSelected}
        >
          <X className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={addYoutube} title="YouTube">
          <Video className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-3 sm:p-4 md:p-6">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
