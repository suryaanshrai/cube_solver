/**
 * The alignment coach.
 *
 * Telling somebody "green centre towards you, yellow on top" works, but only after
 * they've parsed it. Showing them a cube already in that position, and animating the
 * roll that gets there from where they were last, means they can copy it with their
 * hands without reading anything.
 *
 * The orientation is derived, not authored: given the face that must point at the camera
 * and the face that must point up, there is exactly one rotation that satisfies both.
 */

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Matrix4, Quaternion, Vector3 } from "three";
import { FACE_NORMAL } from "../cube/geometry.js";
import { COLOUR_FACE } from "../cube/facelets.js";
import { SOLVED } from "../cube/moves.js";
import { CubeModel } from "../three/CubeModel.jsx";
import { StudioEnvironment, StudioLights } from "../three/Studio.jsx";

/**
 * The rotation that brings `facing` to the viewer and `up` to the top.
 *
 * Rows of the matrix are (up × facing, up, facing): applying it sends the facing normal
 * to +Z and the up normal to +Y, which is precisely the hold being asked for.
 */
export function orientationFor(facingFace, upFace) {
  const facing = new Vector3(...FACE_NORMAL[facingFace]);
  const up = new Vector3(...FACE_NORMAL[upFace]);
  const right = new Vector3().crossVectors(up, facing);

  const m = new Matrix4().set(
    right.x, right.y, right.z, 0,
    up.x, up.y, up.z, 0,
    facing.x, facing.y, facing.z, 0,
    0, 0, 0, 1,
  );
  return new Quaternion().setFromRotationMatrix(m);
}

function HeldCube({ quaternion }) {
  const group = useRef();

  // Slerping to the new hold rather than cutting to it *is* the instruction: the user
  // copies the roll with their hands instead of parsing the sentence underneath.
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.quaternion.slerp(quaternion, 1 - Math.pow(0.00002, delta));
  });

  return (
    <group ref={group} scale={0.58}>
      <CubeModel facelets={SOLVED} focusTurningLayer={false} />
    </group>
  );
}

/**
 * A small solved cube held in the position the current scan step is asking for.
 * Presentational only — `aria-hidden`, with the instruction text carrying the meaning.
 */
export function OrientationGhost({ facing, up, size = 132 }) {
  const facingFace = COLOUR_FACE[facing] ?? facing;
  const upFace = COLOUR_FACE[up] ?? up;
  const quaternion = useMemo(() => orientationFor(facingFace, upFace), [facingFace, upFace]);

  return (
    <div className="ghost" style={{ width: size, height: size }} aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 7.4], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
      >
        <StudioEnvironment intensity={0.6} />
        <StudioLights shadows={false} />
        <HeldCube quaternion={quaternion} />
      </Canvas>
    </div>
  );
}
