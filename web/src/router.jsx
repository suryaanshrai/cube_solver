/**
 * Two routes. A router library would be more code than this and no clearer.
 *
 * Flask serves index.html for any unmatched path, so a deep link to /solve works on a
 * cold load as well as through a client-side navigation.
 */

import { useEffect, useState } from "react";

export function usePath() {
  const [path, setPath] = useState(() =>
    typeof window === "undefined" ? "/" : window.location.pathname,
  );

  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener("popstate", sync);
    window.addEventListener("cubesolver:navigate", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("cubesolver:navigate", sync);
    };
  }, []);

  return path;
}

/** Drop-in onClick for internal links; modified clicks fall through to the browser. */
export function navigate(event) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }
  const href = event.currentTarget.getAttribute("href");
  if (!href || !href.startsWith("/")) return;

  event.preventDefault();
  window.history.pushState({}, "", href);
  window.dispatchEvent(new Event("cubesolver:navigate"));
  window.scrollTo(0, 0);
}
