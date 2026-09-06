/**
 * Review and correction — and, for anyone without a camera, the whole input method.
 *
 * No classifier is good enough to trust blind on 54 readings, so this step is mandatory
 * rather than optional. It is one component doing two jobs: the same grid that lets you
 * fix a misread sticker is the grid you fill in by hand, which is why the manual path
 * isn't a second-class fallback.
 *
 * The layout is an unfolded net, not six separate squares, because the net is how the
 * faces actually relate — you can see at a glance that a corner's three stickers make a
 * corner the cube has.
 */

import { useMemo, useState } from "react";
import { FACES, FACE_COLOUR, splitFacelets, assembleFacelets } from "../cube/facelets.js";
import { validateCube } from "../cube/validate.js";
import { UNCERTAIN_MARGIN } from "./classify.js";
import { Button } from "../ui/Hud.jsx";

/* Where each face sits in the unfolded net — column and row of a 4×3 grid. */
const NET_POSITION = { U: [1, 0], L: [0, 1], F: [1, 1], R: [2, 1], B: [3, 1], D: [1, 2] };

function Sticker({ face, index, selected, uncertain, brush, onPaint }) {
  return (
    <button
      type="button"
      className={`sticker ${selected ? "is-selected" : ""} ${uncertain ? "is-uncertain" : ""}`}
      style={{ "--sticker": `var(--cube-${face})` }}
      onClick={onPaint}
      aria-label={`Facelet ${index + 1}, currently ${FACE_COLOUR[face]}${
        uncertain ? ", read with low confidence" : ""
      }. Activate to set it to ${FACE_COLOUR[brush]}.`}
    />
  );
}

export function ReviewNet({
  facelets,
  confidence = [],
  onChange,
  onSolve,
  onRescan,
  busy = false,
  serverError = null,
}) {
  const [selected, setSelected] = useState(null);
  const [brush, setBrush] = useState("U");
  const byFace = useMemo(() => splitFacelets(facelets), [facelets]);

  const counts = useMemo(
    () => Object.fromEntries(FACES.map((f) => [f, [...facelets].filter((c) => c === f).length])),
    [facelets],
  );

  const verdict = useMemo(() => validateCube(facelets), [facelets]);
  const flagged = useMemo(
    () => new Set(verdict.badStickers ?? []),
    [verdict],
  );

  const setCell = (index, colourFace) => {
    if (facelets[index] === colourFace) return;
    const cells = [...facelets];
    cells[index] = colourFace;
    onChange(cells.join(""));
  };

  /** Clicking a sticker paints it with the armed colour and leaves it selected. */
  const paintCell = (index) => {
    setSelected(index);
    setCell(index, brush);
  };

  /** Picking a colour arms it, and recolours the selected sticker if there is one. */
  const pickBrush = (colourFace) => {
    setBrush(colourFace);
    if (selected != null) setCell(selected, colourFace);
  };

  const uncertain = (index) =>
    flagged.has(index) || (confidence[index] !== undefined && confidence[index] < UNCERTAIN_MARGIN);

  const uncertainCount = useMemo(
    () => Array.from({ length: 54 }, (_, i) => i).filter(uncertain).length,
    [confidence, flagged],
  );

  return (
    <section className="review" aria-label="Check the scan">
      <header className="review__head">
        <p className="chrome">[ Step 02 — Check ]</p>
        <h2 className="h2">Does this match your cube?</h2>
        <p className="lead">
          {uncertainCount > 0
            ? `${uncertainCount} sticker${uncertainCount === 1 ? " was" : "s were"} read with low confidence and ${uncertainCount === 1 ? "is" : "are"} outlined below. Select any sticker, then pick its colour.`
            : "Every sticker was read cleanly. Select any one to change it before solving."}
        </p>
      </header>

      <div className="review__body">
        <div className="net" role="group" aria-label="Cube net">
          {FACES.map((face) => {
            const [col, row] = NET_POSITION[face];
            return (
              <div
                key={face}
                className="net__face"
                style={{ gridColumn: col + 1, gridRow: row + 1 }}
              >
                <span className="chrome net__label">{FACE_COLOUR[face]}</span>
                <div className="net__grid">
                  {byFace[face].map((letter, cell) => {
                    const index = FACES.indexOf(face) * 9 + cell;
                    return cell === 4 ? (
                      <span
                        key={index}
                        className="sticker sticker--centre"
                        style={{ "--sticker": `var(--cube-${letter})` }}
                        aria-label={`${FACE_COLOUR[letter]} centre, fixed`}
                      />
                    ) : (
                      <Sticker
                        key={index}
                        face={letter}
                        index={index}
                        selected={selected === index}
                        uncertain={uncertain(index)}
                        brush={brush}
                        onPaint={() => paintCell(index)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <aside className="review__panel">
          <div className="palette" role="group" aria-label="Sticker colours">
            <p className="chrome">Colour</p>
            <div className="palette__row">
              {FACES.map((face) => (
                <button
                  key={face}
                  type="button"
                  className={`palette__swatch ${brush === face ? "is-armed" : ""}`}
                  style={{ "--sticker": `var(--cube-${face})` }}
                  onClick={() => pickBrush(face)}
                  aria-pressed={brush === face}
                  aria-label={FACE_COLOUR[face]}
                  title={FACE_COLOUR[face]}
                />
              ))}
            </div>
            <p className="chrome palette__hint">
              {FACE_COLOUR[brush]} armed · click a sticker to set it
            </p>
          </div>

          <div className="tally">
            <p className="chrome">Count</p>
            <ul className="tally__list">
              {FACES.map((face) => (
                <li key={face} className={counts[face] === 9 ? "" : "is-off"}>
                  <span
                    className="tally__chip"
                    style={{ "--sticker": `var(--cube-${face})` }}
                    aria-hidden="true"
                  />
                  <span className="chrome">{FACE_COLOUR[face]}</span>
                  <span className="num">{counts[face]} / 9</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="review__verdict" role="status" aria-live="polite">
            {serverError ? (
              <p className="notice notice--warn">{serverError}</p>
            ) : verdict.ok ? (
              <p className="notice notice--ok">This is a cube that can exist. Ready to solve.</p>
            ) : (
              <p className="notice notice--warn">{verdict.error}</p>
            )}
          </div>

          <div className="review__actions">
            <Button variant="accent" onClick={onSolve} disabled={!verdict.ok || busy}>
              {busy ? "Solving…" : "Solve this cube"}
            </Button>
            <Button onClick={onRescan}>Scan again</Button>
          </div>
        </aside>
      </div>
    </section>
  );
}

/** A solved cube, for the manual path to start from. */
export const blankFromSolved = () =>
  assembleFacelets(Object.fromEntries(FACES.map((f) => [f, Array(9).fill(f)])));
