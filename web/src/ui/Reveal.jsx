/**
 * The site's single entrance gesture: an upward unmask paired with a translate.
 *
 * A bare opacity fade is the default reveal everywhere and reads as nothing happening,
 * so it never appears alone.
 *
 * Two failure modes are designed out rather than hoped away, because both leave text
 * permanently invisible and neither is obvious in testing:
 *
 *   • No JavaScript. The hidden start state lives behind a `.js` class set at boot, so
 *     the page without scripts is the finished page, not a blank one.
 *   • A dead IntersectionObserver. Some headless and embedded browsers never tick one.
 *     A rect check runs alongside it and reveals anything that has scrolled into view,
 *     so the observer is an optimisation rather than a dependency.
 */

import { useEffect, useRef, useState } from "react";

const POLL_MS = 320;

export function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...props }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    let observer = null;
    let poll = 0;
    let done = false;

    const show = () => {
      if (done) return;
      done = true;
      observer?.disconnect();
      clearInterval(poll);
      setShown(true);
    };

    const inView = () => {
      const rect = node.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    };

    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) show();
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
      );
      observer.observe(node);
    }

    if (inView()) show();
    if (!done) poll = setInterval(() => inView() && show(), POLL_MS);

    return () => {
      observer?.disconnect();
      clearInterval(poll);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? "is-in" : ""} ${className}`.trim()}
      style={{ "--reveal-delay": `${delay}ms` }}
      {...props}
    >
      {children}
    </Tag>
  );
}
