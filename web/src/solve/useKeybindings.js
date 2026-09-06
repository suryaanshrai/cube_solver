/**
 * Keyboard control for the solve screen.
 *
 * Someone following a solution has a cube in both hands. Reaching for a mouse to
 * advance one move is the wrong ergonomic, so every action has a key and the arrow
 * keys do the obvious thing.
 *
 * Bindings are ignored while a text field has focus, and `event.preventDefault` is only
 * called for keys that are actually handled, so browser shortcuts survive.
 */

import { useEffect } from "react";

export const SHORTCUTS = [
  { keys: ["→", "Space"], label: "Next move" },
  { keys: ["←"], label: "Previous move" },
  { keys: ["↑"], label: "Jump to first move" },
  { keys: ["↓"], label: "Jump to last move" },
  { keys: ["R"], label: "Replay this turn" },
  { keys: ["P"], label: "Play / pause" },
  { keys: ["O"], label: "Lock or release the camera" },
  { keys: ["Esc"], label: "Back to the review grid" },
  { keys: ["?"], label: "This list" },
];

const isTyping = (target) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export function useKeybindings(handlers, { enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (event) => {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;

      const action = {
        ArrowRight: handlers.next,
        " ": handlers.next,
        Spacebar: handlers.next,
        ArrowLeft: handlers.previous,
        ArrowUp: handlers.first,
        ArrowDown: handlers.last,
        r: handlers.replay,
        R: handlers.replay,
        p: handlers.playPause,
        P: handlers.playPause,
        o: handlers.toggleOrient,
        O: handlers.toggleOrient,
        Escape: handlers.back,
        "?": handlers.help,
      }[event.key];

      if (!action) return;
      event.preventDefault();
      action();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers, enabled]);
}
