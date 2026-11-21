/**
 * ExitIntentPopup — shows a backend-driven banner when the user is about
 * to leave the page.
 *
 * Content: any banner with placement="exit_popup" and status="active".
 * Admin creates/edits it via the normal Banners → Create flow by choosing
 * the "Exit-Intent Popup" placement.
 *
 * Triggers:
 *   Desktop: `mouseleave` on document with `clientY <= 5` (mouse moving
 *            up toward the browser chrome / tab close)
 *   Mobile:  `visibilitychange` when tab goes hidden — the popup won't
 *            display in time to stop a close, but will show on their
 *            NEXT visit (within the same session) so they see the offer.
 *            In practice that's the same effect: catch the user before
 *            losing them entirely.
 *
 * De-dupe:
 *   Once per browser session via sessionStorage. The key includes the
 *   banner_id so a newly-swapped banner shows again.
 *
 * Renders nothing until a trigger fires, and nothing if there's no
 * active exit-popup banner — graceful absence.
 */
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { API } from "@/App";

const SESSION_KEY_PREFIX = "exit_popup_shown__";
// How long the user must stay on page before we start listening — avoid
// firing on bounce/accidental mouseover during page load.
const ACTIVATION_DELAY_MS = 5000;

export default function ExitIntentPopup() {
  const [banner, setBanner] = useState(null);
  const [visible, setVisible] = useState(false);
  const activatedRef = useRef(false);
  const navigate = useNavigate();

  // Load the current active exit-popup banner (if any).
  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API}/banners?placement=exit_popup&status=active`)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        if (list.length > 0) setBanner(list[0]);
      })
      .catch(() => {
        /* silent — this is a non-critical enhancement */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!banner) return;

    const seenKey = `${SESSION_KEY_PREFIX}${banner.banner_id}`;
    if (sessionStorage.getItem(seenKey)) return;

    const activationTimer = setTimeout(() => {
      activatedRef.current = true;
    }, ACTIVATION_DELAY_MS);

    const show = () => {
      if (!activatedRef.current) return;
      if (sessionStorage.getItem(seenKey)) return;
      setVisible(true);
      sessionStorage.setItem(seenKey, "1");
      // Track impression (best-effort)
      axios
        .post(`${API}/banners/${banner.banner_id}/impression`)
        .catch(() => {});
    };

    const onMouseLeave = (e) => {
      // Trigger only when cursor exits via the TOP of the viewport (likely
      // heading for browser chrome / tab-close). Ignore sideways/bottom
      // exits — those often mean "going to bookmarks" or "scrolling".
      if (e.clientY <= 5) show();
    };

    const onVisibility = () => {
      // Mobile best-effort — fires when tab goes hidden. Showing the popup
      // "late" is still fine: it'll be visible when they come back.
      if (document.visibilityState === "hidden") show();
    };

    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(activationTimer);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [banner]);

  if (!visible || !banner) return null;

  const handleClick = () => {
    axios.post(`${API}/banners/${banner.banner_id}/click`).catch(() => {});
    const link = banner.link;
    if (link) {
      if (typeof link === "string" && link.startsWith("http")) {
        window.open(link, "_blank", "noopener,noreferrer");
      } else {
        navigate(link);
      }
    }
    setVisible(false);
  };

  const imageUrl =
    banner.image_url || banner.image_desktop || banner.image || null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={banner.title || "Special offer"}
      data-testid="exit-popup-overlay"
      onClick={() => setVisible(false)}
    >
      <div
        className="relative w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setVisible(false)}
          className="absolute top-2 right-2 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
          aria-label="Close"
          data-testid="exit-popup-close"
        >
          <X className="w-5 h-5" />
        </button>

        {imageUrl ? (
          <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
            <img
              src={imageUrl}
              alt={banner.title || ""}
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}

        <div className="p-5 md:p-6 text-center space-y-3">
          {banner.subtitle && (
            <p className="text-xs md:text-sm uppercase tracking-wider text-primary font-medium">
              {banner.subtitle}
            </p>
          )}
          {banner.title && (
            <h3 className="text-xl md:text-2xl font-bold text-foreground">
              {banner.title}
            </h3>
          )}
          {banner.description && (
            <p className="text-sm md:text-base text-foreground/70 leading-relaxed">
              {banner.description}
            </p>
          )}
          {banner.button_text && (
            <button
              onClick={handleClick}
              className="mt-2 w-full md:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
              data-testid="exit-popup-cta"
            >
              {banner.button_text}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
