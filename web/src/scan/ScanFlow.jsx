/**
 * The scan screen.
 *
 * Six faces, in a fixed order, with the cube rolled between each. Four things do the work
 * here and all four are about not wasting the user's attempt:
 *
 *   • Nothing is captured until the reticle is looking at something cube-shaped. Colour
 *     alone cannot tell a cube from a wall or a white t-shirt; the dark plastic between
 *     the stickers can. See `detect.js`.
 *   • The centre is checked live against centres already banked in this scan. If the
 *     wrong face is presented the screen says so by name — and it can tell orange from
 *     red under a warm bulb, which fixed hue bands cannot.
 *   • Capture waits for the reading to stop moving rather than for a timer, so it fires
 *     the instant the user holds still.
 *   • Every face is then shown back as the nine colours that were actually read, and has
 *     to be accepted. A misread face costs one tap here instead of six faces of work.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SCAN_SEQUENCE, FACES, FACE_COLOUR } from "../cube/facelets.js";
import { detectFace, pairWarning, seedFrom } from "./detect.js";
import { createStabilityTracker, sampleFace } from "./sampler.js";
import { useCamera } from "./useCamera.js";
import { useReticleSize } from "./useReticleSize.js";
import { OrientationGhost } from "./OrientationGhost.jsx";
import { Button } from "../ui/Hud.jsx";

const HOLD_MS = 620; // how long a settled reading must persist before it commits

/** Colour name back to the face letter, so a reading can borrow the --cube-* tokens. */
const COLOUR_FACE = Object.fromEntries(FACES.map((face) => [FACE_COLOUR[face], face]));

const WAITING = { ok: false, tone: "wait", text: "Starting the camera…", score: 0 };

/**
 * `resume` is set when this is a restart rather than a first visit. Starting over
 * remounts the whole component — which is what makes the reset total — so without it the
 * user would be sent back to the permission gate for a camera they have already allowed.
 */
export function ScanFlow({ onComplete, onManual, onCancel, resume = false }) {
  const { videoRef, status, message, start, live } = useCamera({ auto: resume });
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const trackerRef = useRef(createStabilityTracker());
  const holdSince = useRef(null);
  const flashTimer = useRef(0);

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState("aim"); // "aim" while hunting, "confirm" once frozen
  const [captures, setCaptures] = useState(() => SCAN_SEQUENCE.map(() => null));
  const [feedback, setFeedback] = useState(WAITING);
  const [hold, setHold] = useState(0);
  const [flash, setFlash] = useState(false);

  const current = SCAN_SEQUENCE[step];
  const expected = current?.facing;
  const reticleSize = useReticleSize(videoRef, stageRef);

  /* Centres confirmed on earlier faces are ground truth for this cube in this room, and
     are what later faces are judged against. Only faces *before* this one count, so
     going back and retaking a face drops its seed with it. */
  const seeds = useMemo(() => seedFrom(captures.slice(0, step)), [captures, step]);

  const pending = captures[step];
  const aiming = phase === "aim";

  const capture = useCallback(
    (frame, colours) => {
      trackerRef.current.reset();
      holdSince.current = null;
      setHold(0);
      setFlash(true);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(false), 260);

      setCaptures((prev) => {
        const next = [...prev];
        next[step] = {
          face: SCAN_SEQUENCE[step].face,
          colour: SCAN_SEQUENCE[step].facing,
          samples: frame.samples,
          colours: colours.map((c) => c.name),
        };
        return next;
      });
      setPhase("confirm");
    },
    [step],
  );

  /* The read loop. One sample per animation frame, which is cheap: the reticle is pulled
     once at a small working size and the arithmetic happens on that one buffer. */
  useEffect(() => {
    if (!live || !aiming) return undefined;

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const frame = sampleFace(video, canvas);
      if (!frame) return;

      const { stable } = trackerRef.current.push(frame.samples);
      const verdict = detectFace(frame, { expected, seeds, stable });
      setFeedback(verdict);

      if (!verdict.ok) {
        holdSince.current = null;
        setHold(0);
        return;
      }

      if (holdSince.current == null) holdSince.current = performance.now();
      const elapsed = performance.now() - holdSince.current;
      setHold(Math.min(1, elapsed / HOLD_MS));
      if (elapsed >= HOLD_MS) capture(frame, verdict.colours);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live, aiming, expected, seeds, capture, videoRef]);

  /* Freezing the preview is what makes the confirm screen honest: the nine swatches
     belong to the frame still on screen, not to whatever the camera has moved on to. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !live) return;
    if (aiming) video.play().catch(() => {});
    else video.pause();
  }, [aiming, live, videoRef]);

  useEffect(() => {
    trackerRef.current.reset();
    holdSince.current = null;
    setHold(0);
    if (phase === "aim") setFeedback({ ...WAITING, text: "Line up the next face…" });
  }, [step, phase]);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const accept = useCallback(() => {
    if (!pending) return;
    if (step + 1 >= SCAN_SEQUENCE.length) {
      const byFace = {};
      for (const capture_ of captures) {
        if (capture_) byFace[capture_.face] = capture_.samples;
      }
      onComplete(byFace);
      return;
    }
    setStep((s) => s + 1);
    setPhase("aim");
  }, [pending, step, captures, onComplete]);

  const retake = useCallback(() => {
    setCaptures((prev) => {
      const next = [...prev];
      next[step] = null;
      return next;
    });
    setPhase("aim");
  }, [step]);

  const back = useCallback(() => {
    if (step === 0) return;
    setCaptures((prev) => {
      const next = [...prev];
      next[step] = null;
      next[step - 1] = null;
      return next;
    });
    setStep((s) => s - 1);
    setPhase("aim");
  }, [step]);

  /* Space captures without waiting out the hold — but through the same gate, never
     around it. A keystroke that skipped the checks was how unusable frames got in. */
  useEffect(() => {
    const onKey = (event) => {
      if (!live) return;
      if (phase === "confirm") {
        if (event.key === "Enter") {
          event.preventDefault();
          accept();
        } else if (event.key === "Escape") {
          event.preventDefault();
          retake();
        }
        return;
      }
      if (event.key === " " && feedback.ok) {
        event.preventDefault();
        const frame = sampleFace(videoRef.current, canvasRef.current);
        if (!frame) return;
        const verdict = detectFace(frame, { expected, seeds, stable: true });
        if (verdict.ok) capture(frame, verdict.colours);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live, phase, feedback.ok, expected, seeds, capture, accept, retake, videoRef]);

  const captureNow = () => {
    const frame = sampleFace(videoRef.current, canvasRef.current);
    if (!frame) return;
    const verdict = detectFace(frame, { expected, seeds, stable: true });
    if (verdict.ok) capture(frame, verdict.colours);
  };

  const blocked = status === "denied" || status === "unavailable";
  const last = step + 1 >= SCAN_SEQUENCE.length;
  const warning = last && pending ? pairWarning(seedFrom(captures)) : null;

  return (
    <section
      className={`scan ${live ? "scan--live" : ""} ${aiming ? "" : "scan--frozen"}`}
      aria-label="Scan your cube"
    >
      <div className="scan__stage" ref={stageRef}>
        <video ref={videoRef} className="scan__video" playsInline muted aria-hidden="true" />
        <canvas ref={canvasRef} className="sr-only" aria-hidden="true" />

        {live && (
          <div
            className={`reticle reticle--${feedback.tone} ${flash ? "is-captured" : ""}`}
            style={reticleSize ? { width: reticleSize, height: reticleSize } : undefined}
          >
            <div className="reticle__grid" aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className="reticle__cell" />
              ))}
            </div>
            <span className="reticle__tick reticle__tick--tl" />
            <span className="reticle__tick reticle__tick--tr" />
            <span className="reticle__tick reticle__tick--bl" />
            <span className="reticle__tick reticle__tick--br" />
            <svg className="reticle__ring" viewBox="0 0 100 100" aria-hidden="true">
              {/* Perimeter of the 100×100 box is exactly 400 units; the dash walks it as
                  the reading holds steady, so capture is watched rather than sprung. */}
              <rect
                className="reticle__ring-fill"
                x="0"
                y="0"
                width="100"
                height="100"
                style={{ strokeDashoffset: 400 - 400 * hold }}
              />
            </svg>
          </div>
        )}

        {!live && !blocked && (
          <div className="scan__gate">
            <p className="chrome">[ Step 01 — Permission ]</p>
            <h2 className="h1">Point your camera at the cube.</h2>
            <p className="lead">
              Six faces, in the order shown. Nothing is uploaded — the frames are read in
              your browser and thrown away. Only the 54 colours are sent, and only when
              you say so.
            </p>
            <div className="scan__gate-actions">
              <Button variant="accent" onClick={start} disabled={status === "requesting"}>
                {status === "requesting" ? "Waiting for permission…" : "Enable camera"}
              </Button>
              <Button onClick={onManual}>Enter it by hand instead</Button>
            </div>
          </div>
        )}

        {blocked && (
          <div className="scan__gate">
            <p className="chrome chrome--warn">[ Camera unavailable ]</p>
            <h2 className="h2">{message}</h2>
            <div className="scan__gate-actions">
              <Button variant="accent" onClick={onManual}>
                Enter the cube by hand
              </Button>
              <Button onClick={start}>Try the camera again</Button>
            </div>
          </div>
        )}
      </div>

      {live && current && (
        <aside className="scan__coach">
          <header className="scan__coach-head">
            <p className="chrome">
              [ Face {String(step + 1).padStart(2, "0")} / 06 — {FACE_COLOUR[current.face]} ]
            </p>
          </header>

          {aiming ? (
            <>
              <OrientationGhost facing={current.facing} up={current.up} />

              <div className="scan__coach-copy">
                <h2 className="h2">{current.hint}</h2>
                {current.roll && <p className="body scan__roll">{current.roll}</p>}
              </div>

              <p
                className={`scan__verdict scan__verdict--${feedback.tone}`}
                role="status"
                aria-live="polite"
              >
                {feedback.text}
              </p>

              <div className="scan__coach-actions">
                <Button variant="accent" onClick={captureNow} disabled={!feedback.ok}>
                  Capture now
                </Button>
                <Button onClick={back} disabled={step === 0}>
                  Back
                </Button>
              </div>

              <div className="scan__coach-actions scan__coach-actions--quiet">
                <Button onClick={onCancel}>Start over</Button>
                <Button onClick={onManual}>Enter by hand</Button>
              </div>

              <p className="chrome scan__hint">
                Hold steady and it captures itself
              </p>
            </>
          ) : (
            <>
              <div className="scan__read" aria-hidden="true">
                {(pending?.colours ?? []).map((name, i) => (
                  <span
                    key={i}
                    className={`sticker ${i === 4 ? "sticker--centre" : ""}`}
                    style={{ "--sticker": `var(--cube-${COLOUR_FACE[name] ?? "D"})` }}
                  />
                ))}
              </div>

              <div className="scan__coach-copy">
                <h2 className="h2">Did it read this face right?</h2>
                <p className="body" role="status" aria-live="polite">
                  Nine colours, as the camera read them. If any square is the wrong
                  colour, retake it — a wrong face here is a wrong solve later.
                </p>
                {warning && <p className="notice notice--warn">{warning}</p>}
              </div>

              <div className="scan__coach-actions">
                <Button variant="accent" onClick={accept}>
                  {last ? "Looks right — finish" : "Looks right — next face"}
                </Button>
                <Button onClick={retake}>Retake</Button>
              </div>

              <div className="scan__coach-actions scan__coach-actions--quiet">
                <Button onClick={back} disabled={step === 0}>
                  Back a face
                </Button>
                <Button onClick={onCancel}>Start over</Button>
              </div>

              <p className="chrome scan__hint">Enter accepts · Esc retakes</p>
            </>
          )}
        </aside>
      )}
    </section>
  );
}
