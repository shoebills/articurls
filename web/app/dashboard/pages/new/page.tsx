"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, createPage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { UserPage } from "@/lib/types";
import { FloatingErrorToast } from "@/components/floating-error-toast";

let newPageDraftPromise: Promise<UserPage> | null = null;

function ensureNewPageDraft(token: string) {
  if (!newPageDraftPromise) {
    newPageDraftPromise = createPage(token, {
      title: "",
      content: "<p></p>",
    }).finally(() => {
      newPageDraftPromise = null;
    });
  }
  return newPageDraftPromise;
}

export default function NewPageRoute() {
  const { token, loading } = useAuth();
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const page = await ensureNewPageDraft(token);
        if (!cancelled) router.replace(`/dashboard/pages/${page.page_id}/edit`);
      } catch (e) {
        if (!cancelled) setErr(e instanceof ApiError ? e.message : "Could not create draft page");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, token, router]);

  if (err) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">New page</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          We could not create a page draft. Go back to Pages and try again.
        </p>
        <FloatingErrorToast message={err} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <p className="text-muted-foreground">Opening editor…</p>
    </div>
  );
}
