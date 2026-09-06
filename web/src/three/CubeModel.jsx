/**
 * The cube itself — the one signature element on this site.
 *
 * Turns are animated without ever reparenting a mesh. Cubies always render at their home
 * grid positions and take their sticker colours from a facelet string, so a turn is:
 * hold the pre-move string, rotate a group containing that layer's nine cubies, then swap
 * in the post-move string and reset the group to zero. Reparenting is the usual approach
 * and the usual source of drift; this way the render is a pure function of a 54-character
 * string plus one angle.
 *
 * Geometry and materials are shared across meshes (seven colours, two states) so the
 * scene stays at a handful of GPU state changes despite the mesh count.
 */

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { Color, MeshPhysicalMaterial } from "three";
import { CUBIES, FACE_NORMAL } from "../cube/geometry.js";
import { readTokens } from "./tokens.js";
import { FACES } from "../cube/facelets.js";
import { quarterTurns } from "../cube/moves.js";

const CUBIE_SIZE = 0.94;
const GAP = 1.0;

function useMaterials() {
  return useMemo(() => {
    // Read from tokens.css so the 3D colours and the DOM swatches cannot diverge.
    const colours = readTokens([
      ...FACES.map((f) => `--cube-${f}`),
      "--plastic",
      "--plastic-dim",
    ]);
    const sticker = {};
    const dimmed = {};

    for (const face of FACES) {
      const base = new Color(colours[`--cube-${face}`]).convertSRGBToLinear();
      sticker[face] = new MeshPhysicalMaterial({
        color: base,
        roughness: 0.34,
        metalness: 0,
        clearcoat: 0.65,
        clearcoatRoughness: 0.22,
        envMapIntensity: 0.65,
      });
      dimmed[face] = new MeshPhysicalMaterial({
        color: base.clone().multiplyScalar(0.3),
        roughness: 0.6,
        metalness: 0,
        clearcoat: 0.2,
        envMapIntensity: 0.35,
      });
    }

    const body = new MeshPhysicalMaterial({
      color: new Color(colours["--plastic"]).convertSRGBToLinear(),
      roughness: 0.72,
      metalness: 0.05,
      clearcoat: 0.3,
      envMapIntensity: 0.6,
    });
    const bodyDimmed = new MeshPhysicalMaterial({
      color: new Color(colours["--plastic-dim"]).convertSRGBToLinear(),
      roughness: 0.85,
      metalness: 0,
      envMapIntensity: 0.25,
    });

    return { sticker, dimmed, body, bodyDimmed };
  }, []);
}

/* The sticker has to be smaller than the flat part of the cubie face. At 0.94 with a
   0.07 fillet the flat region is 0.80 across, so a 0.72 sticker sits comfortably inside
   it — at 0.80 the corners overhang the curve and read as detached bars edge-on. */
const FILLET = 0.07;
const STICKER = 0.72;
const STICKER_DEPTH = 0.03;

function Sticker({ normal, material }) {
  // Flush with the shell rather than proud of it: a protruding sticker shows its side
  // walls at grazing angles, which is the artifact this geometry is chosen to avoid.
  const offset = CUBIE_SIZE / 2 - STICKER_DEPTH / 2 + 0.004;
  const position = normal.map((n) => n * offset);
  const rotation = normal[0] !== 0 ? [0, Math.PI / 2, 0] : normal[1] !== 0 ? [Math.PI / 2, 0, 0] : [0, 0, 0];

  return (
    <RoundedBox
      args={[STICKER, STICKER, STICKER_DEPTH]}
      radius={0.012}
      smoothness={2}
      position={position}
      rotation={rotation}
      material={material}
      castShadow
    />
  );
}

function Cubie({ cubie, facelets, materials, dim }) {
  return (
    <group position={cubie.position.map((p) => p * GAP)}>
      <RoundedBox
        args={[CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE]}
        radius={FILLET}
        smoothness={3}
        material={dim ? materials.bodyDimmed : materials.body}
        castShadow
        receiveShadow
      />
      {cubie.stickers.map((s) => (
        <Sticker
          key={s.index}
          normal={s.normal}
          material={(dim ? materials.dimmed : materials.sticker)[facelets[s.index]] ?? materials.body}
        />
      ))}
    </group>
  );
}

/**
 * @param {string} facelets           state to draw
 * @param {?{move: string, progress: number}} turn  in-flight turn, progress 0→1
 * @param {boolean} focusTurningLayer dim everything that isn't moving
 */
export function CubeModel({ facelets, turn = null, focusTurningLayer = true, ...props }) {
  const materials = useMaterials();
  const layerRef = useRef();

  const face = turn?.move?.[0] ?? null;
  const normal = face ? FACE_NORMAL[face] : null;

  const { turning, still } = useMemo(() => {
    if (!normal) return { turning: [], still: CUBIES };
    const inLayer = (c) =>
      c.position[0] * normal[0] + c.position[1] * normal[1] + c.position[2] * normal[2] === 1;
    return {
      turning: CUBIES.filter(inLayer),
      still: CUBIES.filter((c) => !inLayer(c)),
    };
  }, [normal]);

  // A clockwise turn seen from outside is a negative rotation about the outward normal —
  // the same convention the permutation tables in geometry.js are generated with.
  useLayoutEffect(() => {
    const group = layerRef.current;
    if (!group) return;
    if (!turn || !normal) {
      group.rotation.set(0, 0, 0);
      return;
    }
    const angle = -quarterTurns(turn.move) * (Math.PI / 2) * turn.progress;
    group.rotation.set(normal[0] * angle, normal[1] * angle, normal[2] * angle);
  }, [turn, normal]);

  const dimStill = focusTurningLayer && Boolean(turn);

  return (
    <group {...props}>
      <group ref={layerRef}>
        {turning.map((c) => (
          <Cubie key={c.id} cubie={c} facelets={facelets} materials={materials} dim={false} />
        ))}
      </group>
      {still.map((c) => (
        <Cubie key={c.id} cubie={c} facelets={facelets} materials={materials} dim={dimStill} />
      ))}
    </group>
  );
}

/** Idle presentation spin — used on the landing page only, never during a solve. */
export function Drift({ children, speed = 0.16, enabled = true }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (enabled && ref.current) ref.current.rotation.y += delta * speed;
  });
  return <group ref={ref}>{children}</group>;
}
