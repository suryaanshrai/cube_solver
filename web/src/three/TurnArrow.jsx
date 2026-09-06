/**
 * The direction indicator.
 *
 * A move name tells you which layer; it does not tell you which way, and "clockwise"
 * is ambiguous the moment the face is pointing away from you. This draws the rotation
 * as an arc with a head on the turning face, seen from outside, so the direction is
 * read rather than decoded.
 *
 * It sits just proud of the face and does not rotate with the layer — it describes the
 * motion, it isn't part of it.
 */

import { useMemo } from "react";
import { DoubleSide, Euler, Quaternion, Vector3 } from "three";
import { FACE_NORMAL } from "../cube/geometry.js";
import { readToken } from "./tokens.js";
import { quarterTurns } from "../cube/moves.js";

const UP = new Vector3(0, 0, 1);
const ARC_RADIUS = 1.15;
const SWEEP = Math.PI * 1.15;

export function TurnArrow({ move, opacity = 1 }) {
  // The direction arrow is one of the three places the accent is allowed to appear.
  const colour = useMemo(() => readToken("--accent"), []);
  const face = move?.[0];
  const turns = move ? quarterTurns(move) : 0;

  const { quaternion, headPosition, headRotation, arcRotation } = useMemo(() => {
    if (!face) return {};
    const normal = new Vector3(...FACE_NORMAL[face]);

    // Lay the arc in the plane of the face, facing outward.
    const q = new Quaternion().setFromUnitVectors(UP, normal);

    // A half turn reads as two quarter turns in the same direction, so it takes the
    // clockwise arrow; the label carries the "180°, either direction" nuance.
    const clockwise = turns >= 0;
    const endAngle = clockwise ? -SWEEP / 2 : SWEEP / 2;

    return {
      quaternion: q,
      // The torus arc spans [0, SWEEP]; centring it on the face is the same either
      // way round. Only the head's position and heading encode the direction.
      arcRotation: new Euler(0, 0, -SWEEP / 2),
      headPosition: [Math.cos(endAngle) * ARC_RADIUS, Math.sin(endAngle) * ARC_RADIUS, 0],
      headRotation: new Euler(0, 0, endAngle + (clockwise ? Math.PI : 0)),
    };
  }, [face, turns]);

  if (!face) return null;

  return (
    <group quaternion={quaternion} position={FACE_NORMAL[face].map((n) => n * 1.62)}>
      <mesh rotation={arcRotation}>
        <torusGeometry args={[ARC_RADIUS, 0.055, 12, 64, SWEEP]} />
        <meshBasicMaterial
          color={colour}
          transparent
          opacity={opacity * 0.92}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh position={headPosition} rotation={headRotation}>
        <coneGeometry args={[0.16, 0.34, 20]} />
        <meshBasicMaterial color={colour} transparent opacity={opacity} toneMapped={false} />
      </mesh>
    </group>
  );
}
