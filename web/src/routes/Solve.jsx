/**
 * The instrument: scan → check → solve, as one focused full-screen tool.
 *
 * Kept deliberately separate from the landing page. A live camera feed and a 3D stepper
 * inside a scrolling narrative fight each other for scroll position and focus; each of
 * these two pages does one job.
 */

import { useCallback, useState } from "react";
import { ScanFlow } from "../scan/ScanFlow.jsx";
import { ReviewNet, blankFromSolved } from "../scan/ReviewNet.jsx";
import { classifyCube } from "../scan/classify.js";
import { SolveView } from "../solve/SolveView.jsx";
import { solveCube } from "../api.js";
import { Button } from "../ui/Hud.jsx";
import { navigate } from "../router.jsx";

/** `?cube=<54 chars>` opens straight into the review grid with that state loaded. */
function faceletsFromUrl() {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("cube");
  if (!raw) return null;
  const cleaned = raw.trim().toUpperCase();
  return /^[URFDLB]{54}$/.test(cleaned) ? cleaned : null;
}

export function Solve() {
  const initial = faceletsFromUrl();
  const [stage, setStage] = useState(initial ? "review" : "scan");
  const [facelets, setFacelets] = useState(initial);
  const [confidence, setConfidence] = useState([]);
  const [moves, setMoves] = useState([]);
  const [error, setError] = useState(null);

  const onScanned = useCallback((samplesByFace) => {
    try {
      const result = classifyCube(samplesByFace);
      setFacelets(result.facelets);
      setConfidence(result.confidence);
      setError(null);
      setStage("review");
    } catch (e) {
      setError(e.message);
      setStage("scan");
    }
  }, []);

  const onManual = useCallback(() => {
    setFacelets(blankFromSolved());
    setConfidence([]);
    setError(null);
    setStage("review");
  }, []);

  const restart = useCallback(() => {
    setFacelets(null);
    setConfidence([]);
    setMoves([]);
    setError(null);
    setStage("scan");
  }, []);

  const solve = useCallback(async () => {
    setStage("solving");
    setError(null);
    try {
      const result = await solveCube(facelets);
      if (result.solved) {
        setError("This cube is already solved. Nothing to do.");
        setStage("review");
        return;
      }
      setMoves(result.moves);
      setStage("solved");
    } catch (e) {
      setError(e.message);
      setStage("review");
    }
  }, [facelets]);

  return (
    <main className="tool grain" id="main">
      <header className="tool__bar">
        <a className="tool__home" href="/" onClick={navigate}>
          <span className="tool__mark" aria-hidden="true" />
          <span className="chrome">Cube Solver</span>
        </a>
        <p className="chrome tool__steps" aria-hidden="true">
          <span className={stage === "scan" ? "is-now" : ""}>Scan</span>
          <span className="tool__sep">—</span>
          <span className={stage === "review" || stage === "solving" ? "is-now" : ""}>Check</span>
          <span className="tool__sep">—</span>
          <span className={stage === "solved" ? "is-now" : ""}>Solve</span>
        </p>
      </header>

      {stage === "scan" && (
        <ScanFlow onComplete={onScanned} onManual={onManual} onCancel={restart} />
      )}

      {(stage === "review" || stage === "solving") && facelets && (
        <ReviewNet
          facelets={facelets}
          confidence={confidence}
          onChange={(next) => {
            setFacelets(next);
            setError(null);
          }}
          onSolve={solve}
          onRescan={restart}
          busy={stage === "solving"}
          serverError={error}
        />
      )}

      {stage === "solved" && (
        <SolveView facelets={facelets} moves={moves} onBack={() => setStage("review")} onRestart={restart} />
      )}

      {stage === "scan" && error && (
        <div className="tool__error">
          <p className="notice notice--warn">{error}</p>
          <Button onClick={onManual}>Enter the cube by hand</Button>
        </div>
      )}
    </main>
  );
}
