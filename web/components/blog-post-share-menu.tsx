"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, Share2 } from "lucide-react";
import { SiWhatsapp, SiX } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PromptDialog } from "@/components/prompt-dialog";

export function BlogPostShareMenu({ url, title }: { url: string; title: string }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(title || "Read this post");
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("wheel", close, { passive: true });
    window.addEventListener("touchmove", close, { passive: true });
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("wheel", close);
      window.removeEventListener("touchmove", close);
    };
  }, [open]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      setShareUrl(url);
      setDialogOpen(true);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) triggerRef.current?.blur();
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Share post"
            onPointerDown={(e) => {
              if (e.pointerType === "touch") e.preventDefault();
            }}
            onClick={() => setOpen((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen((prev) => !prev);
              }
            }}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 bg-white">
          <DropdownMenuItem onClick={copyLink}>
            <Link2 className="h-4 w-4" /> Copy link
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`} target="_blank" rel="noopener noreferrer">
              <SiX className="h-4 w-4" /> Share on X
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`} target="_blank" rel="noopener noreferrer">
              <SiWhatsapp className="h-4 w-4" /> Share on WhatsApp
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PromptDialog open={dialogOpen} onOpenChange={setDialogOpen} title="Share link" description="Copy the link below to share this post." value={shareUrl} />
    </>
  );
}
