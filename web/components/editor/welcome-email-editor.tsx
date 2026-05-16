"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  MousePointerClick,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MERGE_TAGS } from "@/lib/welcome-email-content";

const BUTTON_STYLE =
  "display:inline-block;padding:14px 28px;background:#111111;color:#ffffff;text-decoration:none;font-size:14px;border-radius:4px;";

const EmailButton = Node.create({
  name: "emailButton",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      label: { default: "Visit the blog" },
      href: { default: "{{ blog_url }}" },
    };
  },
  parseHTML() {
    return [{ tag: 'a[data-email-button="true"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const label = HTMLAttributes.label || "Visit the blog";
    const href = HTMLAttributes.href || "{{ blog_url }}";
    return [
      "p",
      { "data-email-button-wrap": "true", style: "margin:0;padding-bottom:35px;" },
      [
        "a",
        mergeAttributes({
          "data-email-button": "true",
          href,
          style: BUTTON_STYLE,
        }),
        label,
      ],
    ];
  },
  addCommands() {
    return {
      insertEmailButton:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { label: "Visit the blog", href: "{{ blog_url }}" },
          }),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    emailButton: {
      insertEmailButton: () => ReturnType;
    };
  }
}

type WelcomeEmailEditorProps = {
  content: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  className?: string;
};

export function WelcomeEmailEditor({ content, onChange, disabled, className }: WelcomeEmailEditorProps) {
  const [selectionTick, setSelectionTick] = useState(0);
  const isFocusedRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: "Write your welcome message…" }),
      EmailButton,
    ],
    content,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "prose-email max-w-none focus:outline-none min-h-[200px]",
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
    onSelectionUpdate: () => setSelectionTick((v) => v + 1),
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    const onFocus = () => {
      isFocusedRef.current = true;
    };
    const onBlur = () => {
      isFocusedRef.current = false;
    };
    editor.on("focus", onFocus);
    editor.on("blur", onBlur);
    return () => {
      editor.off("focus", onFocus);
      editor.off("blur", onBlur);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current && !isFocusedRef.current) {
      editor.commands.setContent(content || "<p></p>", { emitUpdate: false });
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

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

  const insertMergeTag = useCallback(
    (tag: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(tag).run();
    },
    [editor]
  );

  if (!editor) {
    return <div className="min-h-[240px] animate-pulse rounded-lg border border-dashed border-border bg-muted/30" />;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-input bg-[#f4f4f4] shadow-sm",
        disabled && "pointer-events-none opacity-60",
        className
      )}
    >
      <span className="hidden" aria-hidden>
        {selectionTick}
      </span>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-background p-2">
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
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
        <Button type="button" variant="ghost" size="icon" onClick={setLink}>
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
          size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2"
          onClick={() => editor.chain().focus().insertEmailButton().run()}
        >
          <MousePointerClick className="h-4 w-4" />
          Button
        </Button>
        {MERGE_TAGS.map((tag) => (
          <Button
            key={tag.value}
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => insertMergeTag(tag.value)}
          >
            {tag.label}
          </Button>
        ))}
      </div>
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-[600px] rounded-lg border border-[#e5e5e5] bg-white p-6 sm:p-8">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
