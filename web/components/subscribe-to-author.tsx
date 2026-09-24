"use client";

import { type ReactNode, useState } from "react";
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
  subdomain: string;
  authorName?: string;
  headline?: string | null;
  text?: string | null;
  disclaimer?: string | null;
  buttonText?: string | null;
  buttonVariant?: string;
  /** Full-width card (e.g. blog post). Default. */
  mode?: "card" | "dialog";
  className?: string;
  triggerClassName?: string;
  /** Custom content inside the dialog trigger button. Defaults to "Subscribe". */
  triggerChildren?: ReactNode;
};

export function SubscribeToAuthor({
  subdomain,
  authorName,
  headline,
  text,
  disclaimer,
  buttonText,
  buttonVariant = "solid",
  mode = "card",
  className,
  triggerClassName,
  triggerChildren,
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
      const res = await publicSubscribe(subdomain, email.trim());
      setStatus("success");
      setMessage(res.message);
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  const displayHeadline = headline || "Email updates";
  const displayDescription =
    text ||
    (authorName != null && authorName !== ""
      ? `Subscribe to receive updates from ${authorName}.`
      : "Subscribe to receive updates.");
  const submitButtonLabel = buttonText || "Subscribe";

  const formBody = (
    <>
      {status === "success" && message ? (
        <p className="mt-4 text-base text-muted-foreground text-center" role="status">
          {message}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end max-w-md mx-auto">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor={`subscribe-email-${subdomain}`} className="sr-only">
              Email address
            </Label>
            <Input
              id={`subscribe-email-${subdomain}`}
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={status === "loading"}
              data-button-radius="true"
            />
          </div>
          <Button
            type="submit"
            disabled={status === "loading"}
            data-button-variant={buttonVariant}
            data-button-radius="true"
            className="h-10 min-h-10 w-full touch-manipulation sm:h-10 sm:min-h-10 sm:w-auto sm:min-w-[7.5rem] sm:shrink-0"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Subscribing…
              </>
            ) : (
              submitButtonLabel
            )}
          </Button>
        </form>
      )}
      {disclaimer ? (
        <p className="mt-4 text-sm text-muted-foreground text-center">{disclaimer}</p>
      ) : null}
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
                "h-10 min-h-10 w-full touch-manipulation sm:h-9 sm:min-h-9 sm:w-auto sm:shrink-0",
                triggerClassName,
              )}
            >
              {triggerChildren ?? submitButtonLabel}
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-2.5rem)] max-w-sm sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>{displayHeadline}</DialogTitle>
              <DialogDescription>{displayDescription}</DialogDescription>
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
      <div className={className ?? "py-12 space-y-4 text-center"}>
        <p className="text-2xl font-bold tracking-tight text-foreground text-center">{displayHeadline}</p>
        <p className="text-lg text-muted-foreground text-center max-w-xl mx-auto leading-relaxed">{displayDescription}</p>
        {formBody}
      </div>
      {errorToast}
    </>
  );
}
