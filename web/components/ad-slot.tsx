"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SlotType = "rectangle" | "horizontal" | "vertical";

type AdSlotProps = {
  adCode: string;
  slotType: SlotType;
  slotId: string;
};

export function AdSlot({ adCode, slotType, slotId }: AdSlotProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState<number>(0);

  const sizeBounds = useMemo(() => {
    if (slotType === "horizontal") return { min: 90, max: 160 };
    if (slotType === "vertical") return { min: 250, max: 620 };
    return { min: 250, max: 360 };
  }, [slotType]);
  const { min, max } = sizeBounds;

  useEffect(() => {
    setCollapsed(false);
    setMeasuredHeight(0);
  }, [adCode, min, slotType]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.innerHTML = "";
    const template = document.createElement("template");
    template.innerHTML = adCode;

    // Recreate script nodes so ad network scripts execute.
    const fragment = document.createDocumentFragment();
    Array.from(template.content.childNodes).forEach((node) => {
      if (node.nodeName.toLowerCase() === "script") {
        const script = document.createElement("script");
        const src = (node as HTMLScriptElement).src;
        if (src) script.src = src;
        const type = (node as HTMLScriptElement).type;
        if (type) script.type = type;
        if ((node as HTMLScriptElement).async) script.async = true;
        script.text = (node as HTMLScriptElement).text || "";
        fragment.appendChild(script);
      } else {
        fragment.appendChild(node.cloneNode(true));
      }
    });
    host.appendChild(fragment);

    const measure = () => {
      const h = host.scrollHeight || 0;
      setMeasuredHeight(h);
      setCollapsed(h <= 12);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    const t1 = window.setTimeout(measure, 300);
    const t2 = window.setTimeout(measure, 1200);
    const t3 = window.setTimeout(measure, 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      ro.disconnect();
      host.innerHTML = "";
    };
  }, [adCode, slotId]);

  const heightStyle = useMemo(() => {
    const clamped = Math.max(min, Math.min(max, measuredHeight || min));
    return `${clamped}px`;
  }, [max, measuredHeight, min]);

  useEffect(() => {
    if (measuredHeight <= 12) {
      const timer = setTimeout(() => setCollapsed(true), 8000);
      return () => clearTimeout(timer);
    }
    return;
  }, [measuredHeight]);

  if (collapsed) return null;

  return (
    <div className="my-8 w-full">
      <div
        data-ad-slot-id={slotId}
        ref={hostRef}
        style={{ minHeight: `${min}px`, height: heightStyle }}
        className="w-full overflow-hidden rounded-md border border-border/50 bg-transparent"
      />
    </div>
  );
}
