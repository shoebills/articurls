"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FaqEditorProps {
  initialItems: FaqItem[];
  onPersist: (items: FaqItem[]) => Promise<void>;
  disabled?: boolean;
}

interface WorkingFaqItem {
  id: string;
  question: string;
  answer: string;
  savedQuestion: string;
  savedAnswer: string;
  isSavedInDb: boolean;
}

export function FaqEditor({ initialItems, onPersist, disabled }: FaqEditorProps) {
  // Seed local working items from initialItems once on mount
  const [items, setItems] = useState<WorkingFaqItem[]>(() =>
    (initialItems || []).map((item, idx) => ({
      id: `saved-${idx}-${Date.now()}`,
      question: item.question || "",
      answer: item.answer || "",
      savedQuestion: item.question || "",
      savedAnswer: item.answer || "",
      isSavedInDb: true,
    }))
  );

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addQaPair = () => {
    const newId = `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newItem: WorkingFaqItem = {
      id: newId,
      question: "",
      answer: "",
      savedQuestion: "",
      savedAnswer: "",
      isSavedInDb: false,
    };
    setItems((prev) => [...prev, newItem]);
    // Newly created block opens by default
    setOpenIds((prev) => new Set(prev).add(newId));
  };

  const updateField = (id: string, field: "question" | "answer", val: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const deleteItem = async (id: string) => {
    const target = items.find((it) => it.id === id);
    const remaining = items.filter((it) => it.id !== id);
    setItems(remaining);
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    // If it was already saved in DB, persist deletion immediately
    if (target?.isSavedInDb) {
      const payload: FaqItem[] = remaining
        .filter((it) => it.isSavedInDb)
        .map((it) => ({ question: it.savedQuestion, answer: it.savedAnswer }));
      try {
        await onPersist(payload);
      } catch {
        // Handled by parent toast/error
      }
    }
  };

  const saveItem = async (id: string) => {
    const target = items.find((it) => it.id === id);
    if (!target) return;

    setSavingId(id);
    try {
      // Build the persisted list:
      // All items in their current sequence order, using current working text for this item,
      // and last-saved text for any other items
      const nextItems = items.map((it) => {
        if (it.id === id) {
          return {
            ...it,
            savedQuestion: it.question,
            savedAnswer: it.answer,
            isSavedInDb: true,
          };
        }
        return it;
      });

      // Send to backend only items that are saved in DB
      const payload: FaqItem[] = nextItems
        .filter((it) => it.isSavedInDb)
        .map((it) => ({
          question: it.savedQuestion,
          answer: it.savedAnswer,
        }));

      await onPersist(payload);
      setItems(nextItems);
      setSavedSuccessId(id);
      setTimeout(() => setSavedSuccessId(null), 2000);
    } catch {
      // Handled by parent toast/error
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">FAQs</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add frequently asked questions below your post/page.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-lg hover:bg-muted"
          onClick={addQaPair}
          disabled={disabled}
          title="Add Question"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* QA Blocks */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-6 text-center">
          <p className="text-xs text-muted-foreground">
            No FAQs added yet. Click the + button above to add a question.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const isOpen = openIds.has(item.id);
            const isSaving = savingId === item.id;
            const isSavedSuccess = savedSuccessId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border/70 bg-card transition-all shadow-2xs"
              >
                {/* Block Header */}
                <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 select-none">
                  {/* Question X title */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.id)}
                    className="flex-1 text-left font-semibold text-sm sm:text-base text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                  >
                    Question {index + 1}
                    {item.question && (
                      <span className="font-normal text-muted-foreground ml-2 text-xs truncate hidden sm:inline">
                        — {item.question}
                      </span>
                    )}
                  </button>

                  {/* Right side: Up/Down sequence arrows + Expand/Collapse toggle */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={() => moveItem(index, "up")}
                      disabled={disabled || index === 0}
                      title="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={() => moveItem(index, "down")}
                      disabled={disabled || index === items.length - 1}
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground ml-1"
                      onClick={() => toggleExpand(item.id)}
                      title={isOpen ? "Collapse" : "Expand"}
                    >
                      <div className="relative h-4 w-4">
                        <ChevronDown
                          className={cn(
                            "absolute inset-0 h-4 w-4 transition-all duration-200",
                            isOpen ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"
                          )}
                        />
                        <X
                          className={cn(
                            "absolute inset-0 h-4 w-4 transition-all duration-200",
                            isOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"
                          )}
                        />
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Block Body (Expandable) */}
                {isOpen && (
                  <div className="p-3.5 sm:p-4 pt-0 space-y-3.5 border-t border-border/40 mt-1 pt-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor={`faq-question-${item.id}`} className="text-xs font-medium">
                        Question
                      </Label>
                      <Input
                        id={`faq-question-${item.id}`}
                        value={item.question}
                        onChange={(e) => updateField(item.id, "question", e.target.value)}
                        placeholder="e.g. How does billing work?"
                        disabled={disabled || isSaving}
                        className="bg-background text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`faq-answer-${item.id}`} className="text-xs font-medium">
                        Answer
                      </Label>
                      <Textarea
                        id={`faq-answer-${item.id}`}
                        value={item.answer}
                        onChange={(e) => updateField(item.id, "answer", e.target.value)}
                        placeholder="Provide the answer..."
                        disabled={disabled || isSaving}
                        rows={3}
                        className="bg-background text-sm resize-y"
                      />
                    </div>

                    {/* Footer Actions: Delete (left) and Save (right) */}
                    <div className="flex items-center justify-between pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => deleteItem(item.id)}
                        disabled={disabled || isSaving}
                        className="text-destructive hover:bg-destructive/10 text-xs gap-1.5 h-8"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => saveItem(item.id)}
                        disabled={disabled || isSaving || (!item.question.trim() && !item.answer.trim())}
                        className="text-xs min-w-[70px] h-8"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Saving...
                          </>
                        ) : isSavedSuccess ? (
                          "Saved!"
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
