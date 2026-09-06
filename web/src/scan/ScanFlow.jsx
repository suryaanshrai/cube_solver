/**
 * The scan screen.
 *
 * Six faces, in a fixed order, with the cube rolled between each. Three things do the
 * work here and all three are about not wasting the user's attempt:
 *
 *   • The centre is checked live. If the wrong face is presented the screen says so by
 *     name — "expected green, seeing red" — instead of capturing something unusable.
 *   • Capture waits for the reading to stop moving rather than for a timer, so it fires
 *     the instant the user holds still.
 *   • Low light and an empty reticle are named as themselves, because "couldn't read
 *     the cube" leaves someone with nothing to change.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { SCAN_SEQUENCE, FACE_COLOUR } from "../cube/facelets.js";
import { coarseColour } from "./classify.js";
import {
  MIN_LUMINANCE,
  MIN_SPREAD,
  createStabilityTracker,
  sampleFace,
} from "./sampler.js";
import { useCamera } from "./useCamera.js";
import { useReticleSize } from "./useReticleSize.js";
import { OrientationGhost } from "./OrientationGhost.jsx";
import { Button } from "../ui/Hud.jsx";

const HOLD_MS = 620; // how long a settled reading must persist before it commits

/** What the reticle should be saying right now, and whether capture may proceed. */
function assess(reading, expectedColour) {
  if (!reading) return { tone: "wait", text: "Starting the camera…", ready: false };
  if (reading.luminance < MIN_LUMINANCE) {
    return { tone: "warn", text: "Too dark to read colours — find more light", ready: false };
  }
  if (reading.spread < MIN_SPREAD) {
    return { tone: "wait", text: "Fill the square with the cube face", ready: false };
  }

  const centre = coarseColour(reading.samples[4]);
  if (!centre) {
    return { tone: "wait", text: "Centre the face in the square", ready: false };
  }
  if (centre !== expectedColour) {
    return {
      tone: "warn",
      text: `Expected ${expectedColour} · seeing ${centre}`,
      ready: false,
    };
  }
  if (!reading.stable) {
    return { tone: "wait", text: "Hold still…", ready: false };
  }
  return { tone: "ready", text: "Centre locked", ready: true };
}

export function ScanFlow({ onComplete, onManual, onCancel }) {
  const { videoRef, status, message, mirrored, start, live } = useCamera();
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const trackerRef = useRef(createStabilityTracker());
  const capturedRef = useRef({});
  const holdSince = useRef(null);

  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState({ tone: "wait", text: "Starting the camera…", ready: false });
  const [hold, setHold] = useState(0);
  const [flash, setFlash] = useState(false);

  const current = SCAN_SEQUENCE[step];
  const expected = current?.facing;
  const reticleSize = useReticleSize(videoRef, stageRef);

  const commit = useCallback(
    (samples) => {
      capturedRef.current[SCAN_SEQUENCE[step].face] = samples;
      trackerRef.current.reset();
      holdSince.current = null;
      setHold(0);
      setFlash(true);
      setTimeout(() => setFlash(false), 260);

      if (step + 1 >= SCAN_SEQUENCE.length) {
        onComplete({ ...capturedRef.current });
      } else {
        setStep((s) => s + 1);
      }
    },
    [step, onComplete],
  );

  /* The read loop. One sample per animation frame, which is cheap: nine 11×11 patches. */
  useEffect(() => {
    if (!live) return undefined;

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const frame = sampleFace(video, canvas, { mirrored });
      if (!frame) return;

      const { stable } = trackerRef.current.push(frame.samples);
      const verdict = assess({ ...frame, stable }, expected);
      setFeedback(verdict);

      if (!verdict.ready) {
        holdSince.current = null;
        setHold(0);
        return;
      }

      if (holdSince.current == null) holdSince.current = performance.now();
      const elapsed = performance.now() - holdSince.current;
      setHold(Math.min(1, elapsed / HOLD_MS));
      if (elapsed >= HOLD_MS) commit(frame.samples);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live, mirrored, expected, commit, videoRef]);

  useEffect(() => {
    trackerRef.current.reset();
    holdSince.current = null;
    setHold(0);
    setFeedback({ tone: "wait", text: "Line up the next face…", ready: false });
  }, [step]);

  /* Space captures manually, for anyone the automatic path doesn't suit. */
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== " " || !live) return;
      event.preventDefault();
      const frame = sampleFace(videoRef.current, canvasRef.current, { mirrored });
      if (frame) commit(frame.samples);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live, mirrored, commit, videoRef]);

  const blocked = status === "denied" || status === "unavailable";

  return (
    <section className={`scan ${live ? "scan--live" : ""}`} aria-label="Scan your cube">
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

          <OrientationGhost facing={current.facing} up={current.up} />

          <div className="scan__coach-copy">
            <h2 className="h2">{current.hint}</h2>
            {current.roll && <p className="body scan__roll">{current.roll}</p>}
          </div>

          <p className={`scan__verdict scan__verdict--${feedback.tone}`} role="status" aria-live="polite">
            {feedback.text}
          </p>

          <p className="chrome scan__hint">
            Hold steady and it captures itself · Space captures now
          </p>

          <div className="scan__coach-actions">
            <Button onClick={onCancel}>Start over</Button>
            <Button onClick={onManual}>Enter by hand</Button>
          </div>
        </aside>
      )}
    </section>
  );
}
