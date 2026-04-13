import { useEffect, useRef } from "react";

interface Props {
  onVisible: () => void;
  /** Pre-fetch margin — fires this many px before the sentinel is in view. */
  rootMargin?: string;
}

/**
 * Invisible 1px element that calls `onVisible` when it scrolls into view
 * via IntersectionObserver. Place at the end of an infinite list.
 *
 * Fires at most once per entry into the viewport — the sentinel must
 * leave and re-enter before it fires again, which prevents cascading
 * loads when new results don't push the sentinel far enough out of view.
 */
export function InfiniteScrollSentinel({
  onVisible,
  rootMargin = "600px",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const cbRef = useRef(onVisible);
  cbRef.current = onVisible;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let armed = true;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && armed) {
            armed = false;
            cbRef.current();
          } else if (!entry.isIntersecting) {
            // Re-arm once the sentinel scrolls out of view.
            armed = true;
          }
        }
      },
      { rootMargin },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [rootMargin]);

  return <div ref={ref} style={{ height: 1, width: "100%" }} />;
}
