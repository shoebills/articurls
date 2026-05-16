"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";

/** Do not treat CTA anchors as inline link marks — they are emailButton blocks. */
const WelcomeEmailLink = Link.extend({
  parseHTML() {
    return [
      {
        tag: 'a[href]:not([data-email-button])',
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          const el = element as HTMLAnchorElement;
          if (el.getAttribute("data-email-button") === "true") return false;
          const href = el.getAttribute("href");
          return href ? { href } : false;
        },
      },
    ];
  },
});
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

/** 25% smaller than original 14px × 28px — applied in editor and exported HTML */
const BUTTON_PADDING = "10.5px 21px";
const BUTTON_STYLE = `display:inline-block;padding:${BUTTON_PADDING};background:#111111;color:#ffffff;text-decoration:none;font-size:14px;border-radius:4px;line-height:1.2;`;

const DEFAULT_BUTTON_LABEL = "Button";
const DEFAULT_BUTTON_HREF = "https://";

type EmailButtonAttrs = {
  label: string;
  href: string;
};

type EmailButtonStorage = {
  onEdit: ((pos: number) => void) | null;
};

function readButtonAttrsFromAnchor(anchor: HTMLAnchorElement): EmailButtonAttrs {
  return {
    label: (anchor.textContent || "").trim() || DEFAULT_BUTTON_LABEL,
    href: anchor.getAttribute("href") || DEFAULT_BUTTON_HREF,
  };
}

function createEmailButtonExtension() {
  return Node.create<unknown, EmailButtonStorage>({
    name: "emailButton",
    group: "block",
    atom: true,
    selectable: true,

    addStorage() {
      return { onEdit: null };
    },

    addAttributes() {
      return {
        label: {
          default: DEFAULT_BUTTON_LABEL,
          parseHTML: (element) => {
            if (typeof element === "string") return DEFAULT_BUTTON_LABEL;
            const anchor = element as HTMLElement;
            if (anchor.tagName === "A") {
              return (anchor.textContent || "").trim() || DEFAULT_BUTTON_LABEL;
            }
            const inner = anchor.querySelector('a[data-email-button="true"]');
            return (inner?.textContent || "").trim() || DEFAULT_BUTTON_LABEL;
          },
        },
        href: {
          default: DEFAULT_BUTTON_HREF,
          parseHTML: (element) => {
            if (typeof element === "string") return DEFAULT_BUTTON_HREF;
            const el = element as HTMLElement;
            const anchor = el.tagName === "A" ? el : el.querySelector('a[data-email-button="true"]');
            return anchor?.getAttribute("href") || DEFAULT_BUTTON_HREF;
          },
          renderHTML: (attributes) => {
            if (!attributes.href) return {};
            return { href: attributes.href };
          },
        },
      };
    },

    parseHTML() {
      return [
        {
          tag: 'p[data-email-button-wrap]',
          priority: 1000,
          getAttrs: (element) => {
            if (typeof element === "string") return false;
            const el = element as HTMLElement;
            const anchor = el.querySelector('a[data-email-button="true"]');
            if (!anchor) return false;
            return readButtonAttrsFromAnchor(anchor as HTMLAnchorElement);
          },
        },
        {
          tag: 'a[data-email-button="true"]',
          priority: 1000,
          getAttrs: (element) => {
            if (typeof element === "string") return false;
            return readButtonAttrsFromAnchor(element as HTMLAnchorElement);
          },
        },
        {
          tag: "p",
          priority: 999,
          getAttrs: (element) => {
            if (typeof element === "string") return false;
            const el = element as HTMLElement;
            const anchor = el.querySelector(':scope > a[data-email-button="true"]');
            if (!anchor) return false;
            const childElements = Array.from(el.children);
            if (childElements.length !== 1 || childElements[0] !== anchor) return false;
            return readButtonAttrsFromAnchor(anchor as HTMLAnchorElement);
          },
        },
      ];
    },

    addKeyboardShortcuts() {
      return {
        Backspace: ({ editor }) => {
          const { state } = editor;
          const { selection } = state;

          if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
            return editor.commands.deleteSelection();
          }

          if (!selection.empty) return false;

          const { $from } = selection;
          if ($from.parent.type.name !== "paragraph" || $from.parent.content.size !== 0 || $from.parentOffset !== 0) {
            return false;
          }

          const depth = $from.depth;
          const blockIndex = $from.index(depth - 1);
          if (blockIndex === 0) return false;

          const container = $from.node(depth - 1);
          if (container.child(blockIndex - 1).type.name !== this.name) return false;

          return editor
            .chain()
            .focus()
            .deleteRange({ from: $from.before(depth), to: $from.after(depth) })
            .run();
        },
        Delete: ({ editor }) => {
          const { state } = editor;
          const { selection } = state;

          if (selection instanceof NodeSelection && selection.node.type.name === this.name) {
            return editor.commands.deleteSelection();
          }

          if (!selection.empty) return false;

          const { $from } = selection;
          const depth = $from.depth;
          const blockIndex = $from.index(depth - 1);
          const container = $from.node(depth - 1);

          if ($from.parentOffset !== $from.parent.content.size || blockIndex >= container.childCount - 1) {
            return false;
          }

          const nodeAfter = container.child(blockIndex + 1);
          if (nodeAfter.type.name !== this.name) return false;

          const pos = $from.after(depth);
          return editor.chain().focus().deleteRange({ from: pos, to: pos + nodeAfter.nodeSize }).run();
        },
      };
    },

    renderHTML({ HTMLAttributes }) {
      const label = HTMLAttributes.label || DEFAULT_BUTTON_LABEL;
      const href = HTMLAttributes.href || DEFAULT_BUTTON_HREF;
      return [
        "p",
        { "data-email-button-wrap": "true", style: "margin:0 0 1rem;" },
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

    addNodeView() {
      return ({ node, getPos, editor }) => {
        const wrap = document.createElement("p");
        wrap.dataset.emailButtonWrap = "true";
        wrap.style.margin = "0 0 1rem";

        const anchor = document.createElement("a");
        anchor.dataset.emailButton = "true";
        anchor.style.cssText = BUTTON_STYLE;
        anchor.href = String(node.attrs.href || DEFAULT_BUTTON_HREF);
        anchor.textContent = String(node.attrs.label || DEFAULT_BUTTON_LABEL);

        const openEdit = (event: Event) => {
          event.preventDefault();
          event.stopPropagation();
          const pos = getPos();
          if (typeof pos !== "number") return;
          const currentNode = editor.state.doc.nodeAt(pos);
          if (!currentNode || currentNode.type.name !== "emailButton") return;
          editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)));
          editor.storage.emailButton?.onEdit?.(pos);
        };

        anchor.addEventListener("mousedown", (event) => event.preventDefault());
        anchor.addEventListener("click", openEdit);

        wrap.appendChild(anchor);

        return {
          dom: wrap,
          update: (updatedNode) => {
            if (updatedNode.type.name !== "emailButton") return false;
            anchor.href = String(updatedNode.attrs.href || DEFAULT_BUTTON_HREF);
            anchor.textContent = String(updatedNode.attrs.label || DEFAULT_BUTTON_LABEL);
            return true;
          },
          ignoreMutation: () => true,
        };
      };
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
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    emailButton: {
      insertEmailButton: (attrs?: Partial<EmailButtonAttrs>) => ReturnType;
      updateEmailButton: (attrs: EmailButtonAttrs) => ReturnType;
    };
  }

  interface Storage {
    emailButton: EmailButtonStorage;
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
  const [buttonEditPos, setButtonEditPos] = useState<number | null>(null);
  const [buttonLabel, setButtonLabel] = useState(DEFAULT_BUTTON_LABEL);
  const [buttonHref, setButtonHref] = useState(DEFAULT_BUTTON_HREF);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("https://");
  const [linkIsActive, setLinkIsActive] = useState(false);

  const emailButtonExtension = useMemo(() => createEmailButtonExtension(), []);

  const openButtonDialog = useCallback((mode: "insert" | "edit", attrs?: EmailButtonAttrs, pos?: number) => {
    setButtonDialogMode(mode);
    setButtonEditPos(mode === "edit" ? (pos ?? null) : null);
    setButtonLabel(attrs?.label?.trim() || DEFAULT_BUTTON_LABEL);
    setButtonHref(attrs?.href?.trim() || DEFAULT_BUTTON_HREF);
    setButtonDialogOpen(true);
  }, []);

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
      WelcomeEmailLink.configure({ openOnClick: false, autolink: true }),
      emailButtonExtension,
      Placeholder.configure({ placeholder: "Write your welcome message…" }),
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
    editor.storage.emailButton.onEdit = (pos) => {
      const node = editor.state.doc.nodeAt(pos);
      if (!node || node.type.name !== "emailButton") return;
      openButtonDialog("edit", {
        label: String(node.attrs.label || DEFAULT_BUTTON_LABEL),
        href: String(node.attrs.href || DEFAULT_BUTTON_HREF),
      }, pos);
    };
  }, [editor, openButtonDialog]);

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

  const openLinkDialog = useCallback(() => {
    if (!editor) return;
    const active = editor.isActive("link");
    setLinkIsActive(active);
    setLinkHref(active ? String(editor.getAttributes("link").href || "") : "https://");
    setLinkDialogOpen(true);
  }, [editor]);

  const confirmLinkDialog = useCallback(() => {
    if (!editor) return;
    const url = linkHref.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    setLinkDialogOpen(false);
  }, [editor, linkHref]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkDialogOpen(false);
  }, [editor]);

  const confirmButtonDialog = useCallback(() => {
    if (!editor) return;
    const attrs: EmailButtonAttrs = {
      label: buttonLabel.trim() || DEFAULT_BUTTON_LABEL,
      href: buttonHref.trim() || DEFAULT_BUTTON_HREF,
    };
    if (buttonDialogMode === "insert") {
      editor.chain().focus().insertEmailButton(attrs).run();
    } else if (buttonEditPos !== null) {
      editor.chain().focus().setNodeSelection(buttonEditPos).updateEmailButton(attrs).run();
    } else {
      editor.chain().focus().updateEmailButton(attrs).run();
    }
    setButtonDialogOpen(false);
    setButtonEditPos(null);
  }, [editor, buttonDialogMode, buttonLabel, buttonHref, buttonEditPos]);

  const removeEmailButton = useCallback(() => {
    if (!editor) return;
    if (buttonEditPos !== null) {
      editor.chain().focus().setNodeSelection(buttonEditPos).deleteSelection().run();
    } else if (editor.isActive("emailButton")) {
      editor.chain().focus().deleteSelection().run();
    }
    setButtonDialogOpen(false);
    setButtonEditPos(null);
  }, [editor, buttonEditPos]);

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
        <div className="-mx-px flex flex-nowrap items-center gap-0.5 overflow-x-auto overscroll-x-contain border-b border-border bg-background p-2 [scrollbar-width:thin] sm:flex-wrap">
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
          <Button
            type="button"
            variant={editor.isActive("link") ? "secondary" : "ghost"}
            size="icon"
            onClick={openLinkDialog}
            title={editor.isActive("link") ? "Edit or remove link" : "Add link"}
          >
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
        <div className="p-0 sm:p-6">
          <div className="w-full bg-white p-4 sm:mx-auto sm:max-w-[600px] sm:rounded-lg sm:border sm:border-[#e5e5e5] sm:p-8">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{linkIsActive ? "Edit link" : "Add link"}</DialogTitle>
            <DialogDescription>
              {linkIsActive
                ? "Update the URL or remove the link from the selected text."
                : "Enter a URL for the selected text."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="email-inline-link">URL</Label>
            <Input
              id="email-inline-link"
              type="url"
              value={linkHref}
              onChange={(e) => setLinkHref(e.target.value)}
              placeholder="https://"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmLinkDialog();
                }
              }}
            />
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {linkIsActive ? (
              <Button type="button" variant="destructive" onClick={removeLink} className="sm:mr-auto">
                Remove link
              </Button>
            ) : (
              <span className="hidden sm:block sm:mr-auto" />
            )}
            <div className="flex w-full gap-2 sm:w-auto">
              <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button type="button" onClick={confirmLinkDialog} className="flex-1 sm:flex-none">
                {linkIsActive ? "Save" : "Add link"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {buttonDialogMode === "edit" ? (
              <Button type="button" variant="destructive" onClick={removeEmailButton} className="sm:mr-auto">
                Remove button
              </Button>
            ) : (
              <span className="hidden sm:block sm:mr-auto" />
            )}
            <div className="flex w-full gap-2 sm:w-auto">
              <Button type="button" variant="outline" onClick={() => setButtonDialogOpen(false)} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button type="button" onClick={confirmButtonDialog} className="flex-1 sm:flex-none">
                {buttonDialogMode === "insert" ? "Insert" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
