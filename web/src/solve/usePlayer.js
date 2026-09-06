/**
 * Step-through state for a solution.
 *
 * `index` is how many moves have been applied, so it runs 0…moves.length and the state
 * on screen is always `states[index]`. During a turn the previous state stays on screen
 * while the layer group rotates; the index and the string change together at the end.
 * That is what keeps the model and the counter from ever disagreeing.
 *
 * Input is never dropped. Pressing next while a turn is still rotating lands that turn
 * immediately and starts the next one, rather than ignoring the press — someone stepping
 * quickly through twenty moves would otherwise lose most of them and have no idea why.
 * The authoritative index therefore lives in a ref, because a press can arrive before
 * React has committed the previous one.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { statesAlong, invertMove } from "../cube/moves.js";

const EASE = (t) => 1 - Math.pow(1 - t, 3); // close cousin of the site's entrance curve

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function usePlayer({ facelets, moves, duration = 460 }) {
  const states = useMemo(() => statesAlong(facelets, moves), [facelets, moves]);

  const [index, setIndexState] = useState(0);
  const [turn, setTurn] = useState(null); // { move, progress } — the in-flight rotation
  const [playing, setPlaying] = useState(false);

  const indexRef = useRef(0);
  const frame = useRef(0);
  const pending = useRef(null); // { nextIndex } while a turn is rotating

  const commit = useCallback((value) => {
    indexRef.current = value;
    setIndexState(value);
  }, []);

  /** Land any in-flight turn right now. Safe to call when nothing is animating. */
  const settle = useCallback(() => {
    if (!pending.current) return;
    cancelAnimationFrame(frame.current);
    const { nextIndex } = pending.current;
    pending.current = null;
    setTurn(null);
    commit(nextIndex);
  }, [commit]);

  const reset = useCallback(() => {
    cancelAnimationFrame(frame.current);
    pending.current = null;
    setTurn(null);
  }, []);

  useEffect(() => reset, [reset]);

  useEffect(() => {
    reset();
    commit(0);
    setPlaying(false);
  }, [facelets, moves, reset, commit]);

  /**
   * Animate one layer rotation, then commit the new index.
   * `move` is what the viewer sees turn; `nextIndex` is where the counter lands.
   */
  const animate = useCallback(
    (move, nextIndex) => {
      if (prefersReducedMotion() || duration <= 1) {
        commit(nextIndex);
        return;
      }

      pending.current = { nextIndex };
      const start = performance.now();

      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        if (t < 1) {
          setTurn({ move, progress: EASE(t) });
          frame.current = requestAnimationFrame(step);
        } else {
          pending.current = null;
          setTurn(null);
          commit(nextIndex);
        }
      };

      setTurn({ move, progress: 0 });
      frame.current = requestAnimationFrame(step);
    },
    [duration, commit],
  );

  const next = useCallback(() => {
    settle();
    const at = indexRef.current;
    if (at >= moves.length) return false;
    animate(moves[at], at + 1);
    return true;
  }, [animate, moves, settle]);

  const previous = useCallback(() => {
    settle();
    const at = indexRef.current;
    if (at <= 0) return false;
    // Showing the state we are in and rotating it backwards lands on the earlier state.
    animate(invertMove(moves[at - 1]), at - 1);
    return true;
  }, [animate, moves, settle]);

  const replay = useCallback(() => {
    settle();
    const at = indexRef.current;
    if (at <= 0) return false;
    // Step back with no animation, then play the same move forward again.
    commit(at - 1);
    requestAnimationFrame(() => animate(moves[at - 1], at));
    return true;
  }, [animate, commit, moves, settle]);

  const goTo = useCallback(
    (target) => {
      reset();
      setPlaying(false);
      commit(Math.max(0, Math.min(moves.length, target)));
    },
    [reset, commit, moves.length],
  );

  // Autoplay walks forward one move at a time with a beat in between.
  useEffect(() => {
    if (!playing) return undefined;
    if (index >= moves.length) {
      setPlaying(false);
      return undefined;
    }
    let live = true;
    const timer = setTimeout(() => {
      if (live) next();
    }, duration * 1.35);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [playing, index, moves.length, next, duration]);

  return {
    index,
    setIndex: goTo,
    turn,
    playing,
    setPlaying,
    /** The state currently on screen — during a turn, still the pre-turn state. */
    displayState: states[index],
    states,
    total: moves.length,
    /** The move being demonstrated right now, if any. */
    activeMove: turn?.move ?? null,
    /** The move the "next" button will play. */
    upcomingMove: index < moves.length ? moves[index] : null,
    atStart: index === 0,
    atEnd: index >= moves.length,
    next,
    previous,
    replay,
  };
}
