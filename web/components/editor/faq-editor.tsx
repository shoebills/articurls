"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export interface FaqEditorProps {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
  disabled?: boolean;
}

export function FaqEditor({ items, onChange, disabled }: FaqEditorProps) {
  const [open, setOpen] = useState(items.length > 0);

  const addItem = () => {
    onChange([...items, { question: "", answer: "" }]);
    setOpen(true);
  };

  const updateItem = (index: number, field: "question" | "answer", val: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: val };
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <Card className="rounded-xl border border-border/70 bg-card shadow-2xs">
      <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between gap-4 cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              Frequently Asked Questions (FAQ)
              {items.length > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {items.length}
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Add Q&A pairs rendered below your post and automatically formatted as FAQPage JSON-LD schema.
            </CardDescription>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 shrink-0 text-muted-foreground"
          aria-label={open ? "Collapse FAQs" : "Expand FAQs"}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CardHeader>

      {open && (
        <CardContent className="p-4 sm:p-5 pt-0 space-y-4 border-t border-border/40">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 p-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">No FAQs added yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Provide quick answers for your readers and boost search rich snippets.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5 text-xs"
                onClick={addItem}
                disabled={disabled}
              >
                <Plus className="h-3.5 w-3.5" />
                Add FAQ
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border/70 bg-muted/15 p-3.5 sm:p-4 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Question {index + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => moveItem(index, index - 1)}
                        disabled={disabled || index === 0}
                        title="Move up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => moveItem(index, index + 1)}
                        disabled={disabled || index === items.length - 1}
                        title="Move down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => removeItem(index)}
                        disabled={disabled}
                        title="Delete question"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`faq-q-${index}`} className="text-xs font-medium">
                      Question
                    </Label>
                    <Input
                      id={`faq-q-${index}`}
                      value={item.question}
                      onChange={(e) => updateItem(index, "question", e.target.value)}
                      placeholder="e.g. What is the return policy?"
                      disabled={disabled}
                      className="bg-background text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`faq-a-${index}`} className="text-xs font-medium">
                      Answer
                    </Label>
                    <Textarea
                      id={`faq-a-${index}`}
                      value={item.answer}
                      onChange={(e) => updateItem(index, "answer", e.target.value)}
                      placeholder="Provide a clear, detailed answer..."
                      disabled={disabled}
                      rows={2}
                      className="bg-background text-sm resize-y"
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs font-semibold"
                onClick={addItem}
                disabled={disabled}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Another Question
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
