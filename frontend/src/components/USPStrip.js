/**
 * USPStrip — static trust-signal row shown below the hero.
 *
 * Fully backend-driven: items come from /api/usp, admin controls them
 * from the "USP Strip" tab in the dashboard.
 *
 * Responsive layout:
 *   Mobile  (<640px):   horizontal scroll (snap), 2 items visible at a time
 *   Tablet  (640–1024): 2-col grid if 2 items, 4-col grid if 4 items
 *   Desktop (>=1024):   evenly-spaced flex row, wraps gracefully
 *
 * Renders nothing when there are no active items — graceful "empty" state,
 * no "No USPs configured" placeholder leaks to end users.
 */
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API } from "@/App";

export default function USPStrip() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API}/usp`)
      .then((res) => {
        if (!cancelled) {
          setItems(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => {
        // Silent — this strip is purely decorative; backend blip shouldn't
        // crash the homepage.
        if (!cancelled) setItems([]);
      })
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || items.length === 0) return null;

  return (
    <section
      className="w-full bg-background-paper border-y border-border/40 py-4 md:py-5"
      aria-label="Why shop with Paridhaan Creations"
      data-testid="usp-strip"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile: horizontal scroll with snap */}
        <div
          className="flex md:hidden gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
          role="list"
        >
          {items.map((item) => (
            <USPTile key={item.usp_id} item={item} variant="mobile" />
          ))}
        </div>

        {/* Tablet & Desktop: evenly spaced grid */}
        <div
          className={`hidden md:grid gap-4 lg:gap-6 ${
            items.length === 2
              ? "grid-cols-2"
              : items.length === 3
              ? "grid-cols-3"
              : items.length === 4
              ? "grid-cols-4"
              : "grid-cols-3 lg:grid-cols-6"
          }`}
          role="list"
        >
          {items.map((item) => (
            <USPTile key={item.usp_id} item={item} variant="desktop" />
          ))}
        </div>
      </div>
    </section>
  );
}

function USPTile({ item, variant }) {
  const mobile = variant === "mobile";
  return (
    <div
      role="listitem"
      className={`flex items-center gap-3 ${
        mobile ? "min-w-[240px] snap-start flex-shrink-0 py-1" : "justify-center md:justify-start"
      }`}
    >
      <span
        aria-hidden="true"
        className="text-2xl md:text-3xl flex-shrink-0"
      >
        {item.icon || "✨"}
      </span>
      <span
        className={`font-medium leading-tight ${
          mobile ? "text-sm" : "text-xs md:text-sm lg:text-base"
        } text-foreground/80`}
      >
        {item.text}
      </span>
    </div>
  );
}
