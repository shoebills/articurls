"use client";

import { useState } from "react";
import { publicSubscribe, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatingErrorToast } from "@/components/floating-error-toast";

type Props = {
  userName: string;
  authorName?: string;
  /** Full-width card (e.g. blog post). Default. */
  mode?: "card" | "dialog";
  className?: string;
  triggerClassName?: string;
};

export function SubscribeToAuthor({
  userName,
  authorName,
  mode = "card",
  className,
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function resetForm() {
    setEmail("");
    setStatus("idle");
    setMessage(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const res = await publicSubscribe(userName, email.trim());
      setStatus("success");
      setMessage(res.message);
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  const description =
    authorName != null && authorName !== ""
      ? `Get an email when ${authorName} publishes a new post.`
      : "Get an email when new posts are published.";

  const formBody = (
    <>
      {status === "success" && message ? (
        <p className="mt-1 text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor={`subscribe-email-${userName}`} className="sr-only">
              Email address
            </Label>
            <Input
              id={`subscribe-email-${userName}`}
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={status === "loading"}
            />
          </div>
          <Button
            type="submit"
            disabled={status === "loading"}
            className="h-11 min-h-11 w-full touch-manipulation sm:h-9 sm:min-h-9 sm:w-auto sm:min-w-[7.5rem] sm:shrink-0"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Subscribing…
              </>
            ) : (
              "Subscribe"
            )}
          </Button>
        </form>
      )}
    </>
  );

  const errorToast =
    status === "error" && message ? (
      <FloatingErrorToast
        message={message}
        onDismiss={() => {
          setStatus("idle");
          setMessage(null);
        }}
      />
    ) : null;

  if (mode === "dialog") {
    return (
      <>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="default"
              size="sm"
              className={cn(
                "h-11 min-h-11 w-full touch-manipulation sm:h-9 sm:min-h-9 sm:w-auto sm:shrink-0",
                triggerClassName,
              )}
            >
              Subscribe
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Email updates</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            {formBody}
          </DialogContent>
        </Dialog>
        {errorToast}
      </>
    );
  }

  return (
    <>
      <div
        className={
          className ?? "rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5"
        }
      >
        <p className="text-sm font-medium text-foreground">Email updates</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {formBody}
      </div>
      {errorToast}
    </>
  );
}
