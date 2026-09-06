/**
 * The one signature element on the landing page.
 *
 * A single fixed canvas sits behind the whole document and persists across every
 * chapter. The chapters change this object's *state* — they never introduce a second
 * impressive thing, which is the usual way a page slides from art-directed into demo
 * reel. Everything else on the page is type on the ground.
 *
 * Pointer events are off by default: a full-viewport canvas silently swallowing clicks
 * on links is a maddening bug, so the hero re-enables them for itself and nothing else.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { Euler, Quaternion, Vector3 } from "three";
import { CubeModel } from "../three/CubeModel.jsx";
import { StudioEnvironment, StudioLights, useRenderTier } from "../three/Studio.jsx";
import { applySequence, SOLVED } from "../cube/moves.js";

/** A short, legible sequence — recognisable turns rather than a blur of motion. */
const DEMO = ["R", "U", "R'", "U'", "F'", "U", "F", "D2", "L", "B'"];
const SCRAMBLED = applySequence(SOLVED, DEMO.map((m) => (m.endsWith("'") ? m.slice(0, -1) : m.endsWith("2") ? m : `${m}'`)).reverse());

/** Per-chapter pose. Position is in world units; the camera never moves. */
const POSE = {
  hero: { rotation: [-0.4, 0.62, 0.14], scale: 0.46, offset: [1.45, 0.08, 0] },
  aside: { rotation: [-0.5, 1.4, 0.2], scale: 0.34, offset: [-1.5, -0.25, -0.6] },
  facing: { rotation: [0, 0, 0], scale: 0.44, offset: [1.5, 0, 0] },
  turned: { rotation: [-0.46, -0.7, 0.1], scale: 0.45, offset: [1.5, -0.05, 0] },
  close: { rotation: [-0.34, 0.5, 0], scale: 0.38, offset: [1.35, 0.15, -0.4] },
};

export const CHAPTER_POSE = ["hero", "aside", "facing", "turned", "turned", "close"];

function useDemoTurns(active) {
  const [state, setState] = useState({ facelets: SCRAMBLED, turn: null, step: 0 });
  const raf = useRef(0);

  useEffect(() => {
    if (!active) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;

    let step = 0;
    let facelets = SCRAMBLED;
    let phase = "pause";
    let started = performance.now();

    const tick = (now) => {
      raf.current = requestAnimationFrame(tick);
      const elapsed = now - started;

      if (phase === "pause") {
        if (elapsed < 520) return;
        phase = "turn";
        started = now;
        return;
      }

      const t = Math.min(1, elapsed / 520);
      const move = DEMO[step % DEMO.length];
      setState({ facelets, turn: { move, progress: 1 - (1 - t) ** 3 }, step });

      if (t >= 1) {
        facelets = applySequence(facelets, [move]);
        step += 1;
        if (step >= DEMO.length) {
          facelets = SCRAMBLED;
          step = 0;
        }
        setState({ facelets, turn: null, step });
        phase = "pause";
        started = now;
      }
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [active]);

  return active ? state : { facelets: SCRAMBLED, turn: null, step: 0 };
}

export function CubeAnchor({ chapter = 0, tier }) {
  const pointer = useRef({ x: 0, y: 0 });
  const pose = CHAPTER_POSE[Math.min(chapter, CHAPTER_POSE.length - 1)];
  const solving = chapter >= 3 && chapter <= 4;
  const demo = useDemoTurns(solving && tier === "full");

  useEffect(() => {
    if (tier === "still") return undefined;
    const onMove = (event) => {
      pointer.current = {
        x: (event.clientX / window.innerWidth - 0.5) * 2,
        y: (event.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [tier]);

  return (
    <div className="anchor" aria-hidden="true">
      <Canvas
        dpr={tier === "full" ? [1, 2] : [1, 1.5]}
        shadows={tier === "full"}
        gl={{ antialias: tier === "full", alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [3.4, 3.1, 5.4], fov: 34 }}
        frameloop={tier === "still" ? "demand" : "always"}
      >
        <StudioEnvironment />
        <StudioLights shadows={tier === "full"} />
        <RigWithCube
          pose={pose}
          pointer={pointer}
          spin={chapter === 0 || chapter === 1}
          facelets={solving ? demo.facelets : SCRAMBLED}
          turn={solving ? demo.turn : null}
        />
        {tier === "full" && (
          <ContactShadows
            position={[0, -1.35, 0]}
            opacity={0.42}
            scale={7}
            blur={2.8}
            far={3}
            resolution={512}
          />
        )}
      </Canvas>
    </div>
  );
}

/** The rig and the cube have to share one group, so they are composed here. */
function RigWithCube({ pose, pointer, spin, facelets, turn }) {
  const group = useRef();
  const target = useMemo(() => new Quaternion(), []);
  const position = useMemo(() => new Vector3(), []);
  const drift = useRef(0);
  const { size } = useThree();

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    if (spin) drift.current += delta * 0.16;

    const [rx, ry, rz] = POSE[pose].rotation;
    target.setFromEuler(
      new Euler(rx + pointer.current.y * 0.2, ry + drift.current + pointer.current.x * 0.32, rz),
    );

    const k = 1 - Math.pow(0.0035, delta);
    node.quaternion.slerp(target, k);

    // Two-column composition only exists where there are two columns. Below that the
    // cube takes the top of the frame and the type takes the bottom.
    const wide = size.width >= 900;
    const [ox, oy, oz] = POSE[pose].offset;
    position.set(wide ? ox : 0, wide ? oy : 0.1, oz);
    node.position.lerp(position, k);

    const scale = POSE[pose].scale * (wide ? 1 : 0.92);
    node.scale.setScalar(node.scale.x + (scale - node.scale.x) * k);
  });

  return (
    <group ref={group}>
      <CubeModel facelets={facelets} turn={turn} focusTurningLayer={false} />
    </group>
  );
}
