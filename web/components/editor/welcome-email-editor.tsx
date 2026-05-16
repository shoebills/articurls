"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const BUTTON_STYLE =
  "display:inline-block;padding:14px 28px;background:#111111;color:#ffffff;text-decoration:none;font-size:14px;border-radius:4px;";

const DEFAULT_BUTTON_LABEL = "Button";
const DEFAULT_BUTTON_HREF = "https://";

type EmailButtonAttrs = {
  label: string;
  href: string;
};

const EmailButton = Node.create({
  name: "emailButton",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      label: { default: DEFAULT_BUTTON_LABEL },
      href: { default: DEFAULT_BUTTON_HREF },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'a[data-email-button="true"]',
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          const anchor = element as HTMLAnchorElement;
          return {
            label: (anchor.textContent || "").trim() || DEFAULT_BUTTON_LABEL,
            href: anchor.getAttribute("href") || DEFAULT_BUTTON_HREF,
          };
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const label = HTMLAttributes.label || DEFAULT_BUTTON_LABEL;
    const href = HTMLAttributes.href || DEFAULT_BUTTON_HREF;
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
        (attrs?: Partial<EmailButtonAttrs>) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              label: attrs?.label?.trim() || DEFAULT_BUTTON_LABEL,
              href: attrs?.href?.trim() || DEFAULT_BUTTON_HREF,
            },
          }),
      updateEmailButton:
        (attrs: EmailButtonAttrs) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, {
            label: attrs.label.trim() || DEFAULT_BUTTON_LABEL,
            href: attrs.href.trim() || DEFAULT_BUTTON_HREF,
          }),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    emailButton: {
      insertEmailButton: (attrs?: Partial<EmailButtonAttrs>) => ReturnType;
      updateEmailButton: (attrs: EmailButtonAttrs) => ReturnType;
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
  const [buttonDialogOpen, setButtonDialogOpen] = useState(false);
  const [buttonDialogMode, setButtonDialogMode] = useState<"insert" | "edit">("insert");
  const [buttonLabel, setButtonLabel] = useState(DEFAULT_BUTTON_LABEL);
  const [buttonHref, setButtonHref] = useState(DEFAULT_BUTTON_HREF);
  const openButtonDialogRef = useRef<(mode: "insert" | "edit", attrs?: EmailButtonAttrs) => void>(() => {});

  const openButtonDialog = useCallback((mode: "insert" | "edit", attrs?: EmailButtonAttrs) => {
    setButtonDialogMode(mode);
    setButtonLabel(attrs?.label?.trim() || DEFAULT_BUTTON_LABEL);
    setButtonHref(attrs?.href?.trim() || DEFAULT_BUTTON_HREF);
    setButtonDialogOpen(true);
  }, []);

  useEffect(() => {
    openButtonDialogRef.current = openButtonDialog;
  }, [openButtonDialog]);

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
      handleClick: (view, pos) => {
        const node = view.state.doc.nodeAt(pos);
        if (node?.type.name === "emailButton") {
          const tr = view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos));
          view.dispatch(tr);
          openButtonDialogRef.current("edit", {
            label: String(node.attrs.label || DEFAULT_BUTTON_LABEL),
            href: String(node.attrs.href || DEFAULT_BUTTON_HREF),
          });
          return true;
        }
        return false;
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

  const confirmButtonDialog = useCallback(() => {
    if (!editor) return;
    const attrs: EmailButtonAttrs = {
      label: buttonLabel.trim() || DEFAULT_BUTTON_LABEL,
      href: buttonHref.trim() || DEFAULT_BUTTON_HREF,
    };
    if (buttonDialogMode === "insert") {
      editor.chain().focus().insertEmailButton(attrs).run();
    } else {
      editor.chain().focus().updateEmailButton(attrs).run();
    }
    setButtonDialogOpen(false);
  }, [editor, buttonDialogMode, buttonLabel, buttonHref]);

  if (!editor) {
    return <div className="min-h-[240px] animate-pulse rounded-lg border border-dashed border-border bg-muted/30" />;
  }

  return (
    <>
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
            onClick={() => openButtonDialog("insert")}
          >
            <MousePointerClick className="h-4 w-4" />
            Button
          </Button>
        </div>
        <div className="p-4 sm:p-6">
          <div className="mx-auto max-w-[600px] rounded-lg border border-[#e5e5e5] bg-white p-6 sm:p-8">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <Dialog open={buttonDialogOpen} onOpenChange={setButtonDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{buttonDialogMode === "insert" ? "Insert button" : "Edit button"}</DialogTitle>
            <DialogDescription>Set the label and link for your email button.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="email-button-label">Button text</Label>
              <Input
                id="email-button-label"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                placeholder={DEFAULT_BUTTON_LABEL}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-button-href">Link URL</Label>
              <Input
                id="email-button-href"
                type="url"
                value={buttonHref}
                onChange={(e) => setButtonHref(e.target.value)}
                placeholder="https://"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setButtonDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmButtonDialog}>
              {buttonDialogMode === "insert" ? "Insert" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
