"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBlog, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { BlogDetail } from "@/lib/types";

let newDraftPromise: Promise<BlogDetail> | null = null;

function ensureNewDraft(token: string) {
  if (!newDraftPromise) {
    newDraftPromise = createBlog(token, {
      title: "",
      content: "<p></p>",
      notify_subscribers: false,
    }).finally(() => {
      newDraftPromise = null;
    });
  }
  return newDraftPromise;
}

export default function NewPostPage() {
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
        const blog = await ensureNewDraft(token);
        if (!cancelled) {
          router.replace(`/dashboard/posts/${blog.blog_id}/edit`);
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof ApiError ? e.message : "Could not create draft");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, token, router]);

  if (err) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-bold">New post</h1>
        <p className="mt-4 text-sm text-destructive">{err}</p>
        <p className="mt-2 text-sm text-muted-foreground">Go back to the dashboard and try again.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <p className="text-muted-foreground">Opening editor…</p>
    </div>
  );
}
