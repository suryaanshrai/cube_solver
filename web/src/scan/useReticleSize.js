/**
 * Keep the drawn reticle and the sampled region the same square.
 *
 * The sampler reads 62% of the video's short side. The video is displayed with
 * `object-fit: cover`, so what the user sees is scaled and cropped by the browser — and
 * a reticle sized independently in CSS will drift away from the region actually being
 * read. The user would then frame the cube inside a box that is not the box being
 * sampled, and the readings would quietly include the background.
 *
 * So the on-screen size is derived from the same numbers: the cover scale factor times
 * the same 62%.
 */

import { useCallback, useEffect, useState } from "react";

export function useReticleSize(videoRef, stageRef, fraction = 0.62) {
  const [size, setSize] = useState(0);

  const measure = useCallback(() => {
    const video = videoRef.current;
    const stage = stageRef.current;
    if (!video || !stage || !video.videoWidth) return;

    const { width, height } = stage.getBoundingClientRect();
    // `object-fit: cover` scales until both axes are covered — the larger ratio wins.
    const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
    const shortSide = Math.min(video.videoWidth, video.videoHeight) * scale;
    setSize(Math.round(shortSide * fraction));
  }, [videoRef, stageRef, fraction]);

  useEffect(() => {
    measure();
    const video = videoRef.current;
    const stage = stageRef.current;

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (stage) observer?.observe(stage);
    video?.addEventListener("loadedmetadata", measure);
    video?.addEventListener("resize", measure);
    window.addEventListener("resize", measure);

    return () => {
      observer?.disconnect();
      video?.removeEventListener("loadedmetadata", measure);
      video?.removeEventListener("resize", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure, videoRef, stageRef]);

  return size;
}
