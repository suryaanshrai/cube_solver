/**
 * The lighting rig.
 *
 * Lighting is what separates a render that looks premium from one that looks like a
 * WebGL tutorial — far more than the geometry does. This is a three-point setup with the
 * rim light behind the subject (the one most often missing), over a `RoomEnvironment`
 * image-based light generated locally, so nothing is fetched from a CDN at runtime.
 *
 * The key sits upper-left, matching the CSS light source used across the rest of the
 * site: every shadow on this site falls lower-right.
 */

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { ACESFilmicToneMapping, PMREMGenerator, SRGBColorSpace } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { readTokens } from "./tokens.js";

export function StudioEnvironment({ intensity = 0.6 }) {
  const { scene, gl } = useThree();

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const target = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;

    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.02;
    gl.outputColorSpace = SRGBColorSpace;

    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
    };
  }, [scene, gl, intensity]);

  return null;
}

export function StudioLights({ shadows = true }) {
  // Warm key, cool fill, bright rim. The rim is what separates the cube from the ground.
  const light = useMemo(
    () => readTokens(["--light-key", "--light-fill", "--light-rim", "--light-under"]),
    [],
  );

  return (
    <>
      <ambientLight intensity={0.32} />
      {/* Key — upper-left, matching the CSS light source, so every shadow on the site
          falls the same way. */}
      <directionalLight
        position={[-5, 7, 5]}
        intensity={3.1}
        color={light["--light-key"]}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0008}
      >
        <orthographicCamera attach="shadow-camera" args={[-8, 8, 8, -8, 0.1, 32]} />
      </directionalLight>
      {/* Fill — opposite and dim, so the shadow side is readable but still a shadow. */}
      <directionalLight position={[6, -1, 4]} intensity={0.7} color={light["--light-fill"]} />
      {/* Rim — behind the subject. The bright edge separating object from ground is the
          highest-impact light in the rig and the one most often missing. */}
      <directionalLight position={[1.5, 3, -7]} intensity={3.4} color={light["--light-rim"]} />
      {/* A second rim from below-behind picks out the lower silhouette against the
          near-black ground, which is otherwise where the object dissolves. */}
      <directionalLight position={[-2, -4, -5]} intensity={1.1} color={light["--light-under"]} />
    </>
  );
}

/**
 * Capability probe. Advanced shading on a low-end phone thermally throttles within a
 * minute; a fast, well-typeset page reads as far more premium than a stuttering one.
 * Detects capability rather than sniffing the user agent.
 */
export function useRenderTier() {
  return useMemo(() => {
    if (typeof window === "undefined") return "full";
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const cores = navigator.hardwareConcurrency ?? 4;
    const memory = navigator.deviceMemory ?? 4;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    if (reduced) return "still";
    if (cores <= 4 || memory <= 2) return "lite";
    if (coarse && window.devicePixelRatio > 2.5) return "lite";
    return "full";
  }, []);
}
