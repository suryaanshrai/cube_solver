/**
 * The landing page.
 *
 * Six chapters, each holding at most three text objects, all of them starting at one of
 * three fixed x-positions. The cube behind them is the only thing that moves on its own
 * account; every other element enters once and then stays still.
 *
 * The copy names specific, checkable things — the count of arrangements, God's number,
 * what the previous version of this app actually did wrong — because a concrete detail
 * is more persuasive than a category claim and more interesting to typeset.
 */

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { CubeAnchor } from "../landing/CubeAnchor.jsx";
import { useRenderTier } from "../three/Studio.jsx";
import { Reveal } from "../ui/Reveal.jsx";
import { Eyebrow } from "../ui/Hud.jsx";
import { navigate } from "../router.jsx";

const CHAPTERS = [
  {
    id: "hero",
    eyebrow: null,
    ruler: "at-a",
  },
  {
    id: "problem",
    index: null,
    ruler: "at-b",
    heading: "Fifty-four squares, by hand.",
    body: "That is what the last version of this site asked for, and what almost every other solver still asks for. Click through six grids, mistype one, and get back a red error and no idea which square was wrong. Then it hands you R U′ F2 and a diagram of arrows to decode while holding the cube in the air.",
  },
  {
    id: "scan",
    index: 1,
    label: "Scan",
    ruler: "at-a",
    heading: "Show it six faces.",
    body: "The centre sticker never moves, so the app already knows which face it should be looking at — and tells you when you are holding the wrong one, by name. It reads the other eight against that centre rather than against fixed thresholds, which is why it survives a warm kitchen bulb on one face and a window on the next.",
  },
  {
    id: "reconstruct",
    index: 2,
    label: "Reconstruct",
    ruler: "at-b",
    heading: "Your cube, not a cube.",
    body: "The 54 readings become a model you can turn over in your hands on screen. Anything read with low confidence is outlined, so a single misread sticker costs you one tap rather than the whole scan — and an arrangement no real cube can reach is caught here, in a sentence, before anything is sent anywhere.",
  },
  {
    id: "solve",
    index: 3,
    label: "Solve",
    ruler: "at-a",
    heading: "Watch the turn happen.",
    body: "Each step rotates the layer on your own cube and names the face by the colour you are looking at. The camera comes around for the faces you cannot see. Arrow keys move you through it, because by then your hands are full.",
  },
];

function useChapter(count) {
  const [chapter, setChapter] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    const nodes = refs.current.filter(Boolean);
    if (!nodes.length || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setChapter(Number(visible.target.dataset.chapter));
      },
      { threshold: [0.2, 0.5, 0.8], rootMargin: "-20% 0px -20% 0px" },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [count]);

  return [chapter, refs];
}

export function Landing() {
  const tier = useRenderTier();
  const [chapter, refs] = useChapter(CHAPTERS.length + 1);

  // Smooth scroll is most of what makes a page feel built rather than assembled. It is
  // also the first thing to drop when the user has asked for less motion.
  useEffect(() => {
    if (tier === "still" || typeof window === "undefined") return undefined;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let raf = 0;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [tier]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {tier !== "still" && <CubeAnchor chapter={chapter} tier={tier} />}

      <header className="nav">
        <a className="nav__mark" href="/" onClick={navigate}>
          <span className="nav__glyph" aria-hidden="true" />
          <span className="chrome">Cube Solver</span>
        </a>
        <a className="nav__cta chrome" href="/solve" onClick={navigate}>
          Start solving
        </a>
      </header>

      <main id="main" className="landing grain">
        {/* ── 01 · hero ─────────────────────────────────────────────────── */}
        <section
          className="chapter chapter--hero"
          data-chapter="0"
          ref={(node) => {
            refs.current[0] = node;
          }}
        >
          <div className="at-a chapter__copy">
            <Reveal as="p" className="chrome" delay={80}>
              [ Kociemba two-phase · read by camera ]
            </Reveal>
            <Reveal as="h1" className="display" delay={160}>
              About twenty <em>moves</em>.
            </Reveal>
            <Reveal as="p" className="lead" delay={280}>
              A 3×3 has 43,252,003,274,489,856,000 arrangements, and not one of them sits
              more than twenty turns from solved. Show yours to the camera and follow the
              route on a model of your own cube.
            </Reveal>
            <Reveal className="hero__actions" delay={380}>
              <a className="cta" href="/solve" onClick={navigate}>
                <span>Scan a cube</span>
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </a>
              <span className="chrome hero__note">Camera stays on your device</span>
            </Reveal>
          </div>
          <div className="hero__scroll chrome" aria-hidden="true">
            Scroll
          </div>
        </section>

        {/* ── 02–05 · the chapters ──────────────────────────────────────── */}
        {CHAPTERS.slice(1).map((c, i) => (
          <section
            key={c.id}
            className={`chapter chapter--${c.id}`}
            data-chapter={i + 1}
            ref={(node) => {
              refs.current[i + 1] = node;
            }}
          >
            <div className={`${c.ruler} chapter__copy`}>
              {c.label && (
                <Reveal>
                  <Eyebrow index={c.index}>{c.label}</Eyebrow>
                </Reveal>
              )}
              <Reveal as="h2" className="h1" delay={90}>
                {c.heading}
              </Reveal>
              <Reveal as="p" className="body" delay={180}>
                {c.body}
              </Reveal>
            </div>
          </section>
        ))}

        {/* ── 06 · close ────────────────────────────────────────────────── */}
        <section
          className="chapter chapter--close"
          data-chapter="5"
          ref={(node) => {
            refs.current[5] = node;
          }}
        >
          <div className="at-a chapter__copy chapter__copy--centred">
            <Reveal as="h2" className="display">
              Get it back.
            </Reveal>
            <Reveal delay={140}>
              <a className="cta cta--large" href="/solve" onClick={navigate}>
                <span>Scan a cube</span>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </a>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="foot">
        <p className="chrome">Read in the browser · solved with Kociemba’s two-phase algorithm</p>
        <p className="chrome">
          Built by{" "}
          <a href="https://github.com/suryaanshrai/cube_solver" target="_blank" rel="noreferrer">
            Suryaansh Rai
          </a>
        </p>
      </footer>
    </>
  );
}
