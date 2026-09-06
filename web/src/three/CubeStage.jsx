/**
 * The canvas the cube lives in, and the camera behaviour around it.
 *
 * Half the moves in a solution are on faces you cannot see from a fixed three-quarter
 * view. Rather than asking the user to orbit manually mid-solve, the camera eases
 * around so the turning face is always facing them — and stops doing so the moment
 * they take hold of it themselves, until the next move.
 */

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Vector3 } from "three";
import { FACE_NORMAL } from "../cube/geometry.js";
import { StudioEnvironment, StudioLights } from "./Studio.jsx";

// Far enough back that the cube reads as an object in a room rather than a texture
// filling the frame: at fov 34 this puts it at roughly 60% of the viewport height.
const HOME = new Vector3(3.4, 3.1, 5.4).setLength(11.4);
const DISTANCE = HOME.length();

/** Where to put the camera so `face` is comfortably in view. */
export function viewpointFor(face) {
  if (!face) return HOME.clone();
  const normal = new Vector3(...FACE_NORMAL[face]);
  // Lean two thirds of the way toward looking straight at the face, keeping enough of
  // the neighbouring faces visible that the cube still reads as a cube.
  const target = HOME.clone().normalize().lerp(normal, 0.62);
  if (target.lengthSq() < 1e-4) target.copy(normal);
  return target.normalize().multiplyScalar(DISTANCE);
}

function CameraDirector({ face, enabled, controlsRef }) {
  const { camera } = useThree();
  const target = useRef(HOME.clone());
  const held = useRef(false);

  useEffect(() => {
    target.current = viewpointFor(enabled ? face : null);
  }, [face, enabled]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return undefined;
    const grab = () => {
      held.current = true;
    };
    const release = () => {
      held.current = false;
    };
    controls.addEventListener("start", grab);
    controls.addEventListener("end", release);
    return () => {
      controls.removeEventListener("start", grab);
      controls.removeEventListener("end", release);
    };
  }, [controlsRef]);

  useFrame((_, delta) => {
    if (!enabled || held.current) return;
    // Lerping toward the target rather than assigning gives the camera inertia, which
    // is most of what makes moving 3D feel expensive rather than snappy.
    const k = 1 - Math.pow(0.0025, delta);
    camera.position.lerp(target.current, k);
    camera.lookAt(0, 0, 0);
    controlsRef.current?.update();
  });

  return null;
}

export function CubeStage({
  children,
  focusFace = null,
  autoOrient = true,
  interactive = true,
  shadows = true,
  dpr = [1, 2],
  className,
  ...rest
}) {
  const controlsRef = useRef();
  const initial = useMemo(() => HOME.toArray(), []);

  return (
    <Canvas
      className={className}
      dpr={dpr}
      shadows={shadows}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: initial, fov: 34, near: 0.1, far: 60 }}
      {...rest}
    >
      <Suspense fallback={null}>
        <StudioEnvironment />
        <StudioLights shadows={shadows} />
        {children}
        {shadows && (
          <ContactShadows
            position={[0, -2.1, 0]}
            opacity={0.55}
            scale={12}
            blur={2.6}
            far={5}
            resolution={512}
          />
        )}
        {interactive && (
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={false}
            rotateSpeed={0.6}
            minPolarAngle={0.35}
            maxPolarAngle={Math.PI - 0.35}
            makeDefault
          />
        )}
        <CameraDirector face={focusFace} enabled={autoOrient} controlsRef={controlsRef} />
      </Suspense>
    </Canvas>
  );
}
