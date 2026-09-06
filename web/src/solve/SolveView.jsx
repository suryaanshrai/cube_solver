/**
 * The solve screen — a 3D model of the user's own cube, one turn at a time.
 *
 * The old version of this app handed over cube notation and a diagram of arrows. That
 * assumed the reader already spoke notation, which is exactly the assumption someone
 * looking for a solver has disproved. Here the notation is still shown, because it is
 * the compact form and worth learning, but the sentence under it names the face by the
 * colour they are looking at and the arrow on the model shows the direction.
 */

import { useCallback, useMemo, useState } from "react";
import { CubeStage } from "../three/CubeStage.jsx";
import { CubeModel } from "../three/CubeModel.jsx";
import { TurnArrow } from "../three/TurnArrow.jsx";
import { describeMove, quarterTurns } from "../cube/moves.js";
import { FACE_COLOUR, FACE_POSITION, faceColourName } from "../cube/facelets.js";
import { usePlayer } from "./usePlayer.js";
import { useKeybindings, SHORTCUTS } from "./useKeybindings.js";
import { Button, StepButton } from "../ui/Hud.jsx";

function MoveRail({ moves, index, onPick }) {
  return (
    <ol className="rail" aria-label="Solution moves">
      {moves.map((move, i) => (
        <li key={`${move}-${i}`}>
          <button
            type="button"
            className={`rail__token ${i === index ? "is-active" : ""} ${i < index ? "is-done" : ""}`}
            onClick={() => onPick(i)}
            aria-current={i === index ? "step" : undefined}
            aria-label={`Move ${i + 1}: ${move}`}
          >
            {move}
          </button>
        </li>
      ))}
    </ol>
  );
}

function Shortcuts({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="shortcuts" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="shortcuts__panel">
        <p className="chrome">[ Keyboard ]</p>
        <dl className="shortcuts__list">
          {SHORTCUTS.map((s) => (
            <div key={s.label}>
              <dt>
                {s.keys.map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </dt>
              <dd>{s.label}</dd>
            </div>
          ))}
        </dl>
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

export function SolveView({ facelets, moves, onBack, onRestart }) {
  const player = usePlayer({ facelets, moves });
  const [autoOrient, setAutoOrient] = useState(true);
  const [help, setHelp] = useState(false);

  const { index, total, turn, displayState, activeMove, upcomingMove, atStart, atEnd } = player;

  // The face the camera should be showing: the one turning now, else the one turning next.
  const focusFace = (activeMove ?? upcomingMove)?.[0] ?? null;

  const handlers = useMemo(
    () => ({
      next: player.next,
      previous: player.previous,
      first: () => player.setIndex(0),
      last: () => player.setIndex(total),
      replay: player.replay,
      playPause: () => player.setPlaying((p) => !p),
      toggleOrient: () => setAutoOrient((v) => !v),
      back: () => (help ? setHelp(false) : onBack()),
      help: () => setHelp((v) => !v),
    }),
    [player, total, onBack, help],
  );

  useKeybindings(handlers, { enabled: true });

  const instruction = atEnd
    ? "Solved. That is the whole cube."
    : describeMove(upcomingMove, faceColourName);

  const turnNoun = upcomingMove
    ? quarterTurns(upcomingMove) === 2
      ? "half turn"
      : "quarter turn"
    : null;

  const onPick = useCallback((i) => player.setIndex(i), [player]);

  return (
    <section className="solve" aria-label="Follow the solution">
      <div className="solve__stage">
        <CubeStage focusFace={focusFace} autoOrient={autoOrient} className="solve__canvas">
          <CubeModel facelets={displayState} turn={turn} />
          {turn && <TurnArrow move={turn.move} />}
        </CubeStage>

        <div className="solve__corner solve__corner--tl chrome" aria-hidden="true">
          [ Step 03 — Solve ]
        </div>
        <div className="solve__corner solve__corner--tr chrome" aria-hidden="true">
          <span className="num">{String(index).padStart(2, "0")}</span>
          <span> / </span>
          <span className="num">{String(total).padStart(2, "0")}</span>
        </div>
        <div className="solve__corner solve__corner--bl chrome" aria-hidden="true">
          {autoOrient ? "Camera follows the turn" : "Camera locked"} · Drag to look around
        </div>
      </div>

      <div className="solve__panel">
        <div className="solve__instruction">
          {!atEnd && (
            <p className="chrome">
              Move <span className="num">{index + 1}</span> of{" "}
              <span className="num">{total}</span> · {turnNoun}
            </p>
          )}
          <h2 className="solve__notation">
            {atEnd ? "Done" : upcomingMove}
            {!atEnd && (
              <span
                className="solve__face-chip"
                style={{ "--sticker": `var(--cube-${upcomingMove[0]})` }}
                aria-hidden="true"
              />
            )}
          </h2>
          <p className="solve__says" role="status" aria-live="polite">
            {instruction}
          </p>
          {!atEnd && (
            <p className="chrome solve__orient">
              That is the {FACE_COLOUR[upcomingMove[0]]} face — the {FACE_POSITION[upcomingMove[0]]} of
              the cube while red faces you and yellow is on top.
            </p>
          )}
        </div>

        <div className="solve__controls">
          <StepButton
            direction="prev"
            onClick={player.previous}
            disabled={atStart}
            label="Previous move"
          />
          <div className="solve__counter">
            <span className="num solve__counter-now">{String(index).padStart(2, "0")}</span>
            <span className="chrome"> / {String(total).padStart(2, "0")}</span>
          </div>
          <StepButton
            direction="next"
            onClick={player.next}
            disabled={atEnd}
            label="Next move"
          />
        </div>

        <MoveRail moves={moves} index={index} onPick={onPick} />

        <div className="solve__meta">
          <Button onClick={() => player.setPlaying((p) => !p)} disabled={atEnd}>
            {player.playing ? "Pause" : "Play all"}
          </Button>
          <Button onClick={player.replay} disabled={atStart}>
            Replay turn
          </Button>
          <Button onClick={() => setAutoOrient((v) => !v)}>
            {autoOrient ? "Lock camera" : "Follow turns"}
          </Button>
          <Button onClick={() => setHelp(true)}>Keys</Button>
          <Button onClick={onRestart}>New cube</Button>
        </div>

        <p className="chrome solve__keyhint">
          <kbd>→</kbd> next · <kbd>←</kbd> back · <kbd>R</kbd> replay · <kbd>?</kbd> all keys
        </p>
      </div>

      <Shortcuts open={help} onClose={() => setHelp(false)} />
    </section>
  );
}
