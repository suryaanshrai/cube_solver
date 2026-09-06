/**
 * Camera access, and the honest handling of every way it can fail.
 *
 * There is no camera on plenty of desktops, permission gets denied, another tab holds
 * the device, and `getUserMedia` simply does not exist outside a secure context. Each of
 * those needs its own sentence and its own way forward, because "camera error" tells a
 * user nothing and strands them.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const REASONS = {
  NotAllowedError: {
    status: "denied",
    message:
      "Camera access was blocked. You can allow it from the icon in your browser's address bar, or enter the cube by hand.",
  },
  NotFoundError: {
    status: "unavailable",
    message: "No camera was found on this device. You can enter the cube by hand instead.",
  },
  NotReadableError: {
    status: "unavailable",
    message:
      "The camera is already in use by another app or tab. Close it and try again, or enter the cube by hand.",
  },
  OverconstrainedError: {
    status: "unavailable",
    message: "This camera can't provide a usable video size. You can enter the cube by hand.",
  },
  insecure: {
    status: "unavailable",
    message:
      "Cameras only work over a secure connection. Open this page over HTTPS, or enter the cube by hand.",
  },
};

const GENERIC = {
  status: "unavailable",
  message: "The camera couldn't be started. You can enter the cube by hand instead.",
};

export function useCamera({ auto = false } = {}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | requesting | live | denied | unavailable
  const [message, setMessage] = useState(null);
  const [mirrored, setMirrored] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      const reason = window.isSecureContext === false ? REASONS.insecure : GENERIC;
      setStatus(reason.status);
      setMessage(reason.message);
      return false;
    }

    setStatus("requesting");
    setMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      // Front cameras are previewed mirrored; the sampler needs to know to undo it.
      const facing = stream.getVideoTracks()[0]?.getSettings?.().facingMode;
      setMirrored(facing !== "environment");

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute("playsinline", "");
        video.muted = true;
        await video.play().catch(() => {});
      }
      setStatus("live");
      return true;
    } catch (error) {
      const reason = REASONS[error?.name] ?? GENERIC;
      setStatus(reason.status);
      setMessage(reason.message);
      return false;
    }
  }, []);

  useEffect(() => {
    if (auto) start();
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [auto, start]);

  return { videoRef, status, message, mirrored, start, stop, live: status === "live" };
}
