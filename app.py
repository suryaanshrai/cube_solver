"""Cube Solver — HTTP API.

The front end (``web/``) owns scanning, validation and the 3D player. This module does
one thing: turn a 54-character facelet string into a list of moves, using Kociemba's
two-phase algorithm.

Facelet strings use the canonical URFDLB ordering that ``kociemba`` expects — nine
characters per face, row-major, in the order Up, Right, Front, Down, Left, Back. The
front end resolves the fixed colour scheme (yellow=U, green=R, red=F, white=D, blue=L,
orange=B) before it gets here, so this layer never deals in colours.
"""

from __future__ import annotations

import os
import re
from collections import Counter

import kociemba
from flask import Flask, jsonify, request, send_from_directory

FACES = "URFDLB"
SOLVED = "".join(face * 9 for face in FACES)
FACELET_RE = re.compile(rf"^[{FACES}]{{54}}$")

DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web", "dist")

app = Flask(__name__, static_folder=None)


class FaceletError(ValueError):
    """A facelet string that cannot describe a real cube."""


def validate_facelets(facelets: str) -> str:
    """Return the normalised facelet string, or raise :class:`FaceletError`.

    Catches the cheap, nameable failures so the user gets a sentence rather than a
    stack trace. Deeper impossibilities (bad permutation parity, a flipped edge) are
    left to ``kociemba`` itself, which detects them precisely.
    """
    if not isinstance(facelets, str):
        raise FaceletError("Expected a facelet string.")

    normalised = facelets.strip().upper()

    if len(normalised) != 54:
        raise FaceletError(
            f"A cube has 54 stickers; this string has {len(normalised)}."
        )

    if not FACELET_RE.match(normalised):
        bad = sorted({c for c in normalised if c not in FACES})
        raise FaceletError(
            "Facelets may only use the letters U, R, F, D, L and B. "
            f"Found: {', '.join(bad)}."
        )

    counts = Counter(normalised)
    wrong = {face: counts[face] for face in FACES if counts[face] != 9}
    if wrong:
        detail = ", ".join(f"{face}: {n}" for face, n in sorted(wrong.items()))
        raise FaceletError(
            f"Every face needs exactly 9 stickers. Counted {detail}."
        )

    for index, face in enumerate(FACES):
        centre = normalised[index * 9 + 4]
        if centre != face:
            raise FaceletError(
                f"The {face} face has a {centre} centre. Centres never move, so each "
                "face must be named by its own centre."
            )

    return normalised


@app.post("/api/solve")
def solve():
    payload = request.get_json(silent=True) or {}

    try:
        facelets = validate_facelets(payload.get("facelets", ""))
    except FaceletError as exc:
        return jsonify(error=str(exc), kind="invalid_input"), 400

    if facelets == SOLVED:
        return jsonify(facelets=facelets, moves=[], count=0, solved=True)

    try:
        solution = kociemba.solve(facelets)
    except Exception as exc:  # kociemba raises bare ValueError with terse text
        return (
            jsonify(
                error=(
                    "That sticker arrangement can't exist on a real cube. Check the "
                    "review grid for a sticker in the wrong place."
                ),
                detail=str(exc),
                kind="unsolvable",
            ),
            422,
        )

    moves = solution.split()
    return jsonify(facelets=facelets, moves=moves, count=len(moves), solved=False)


@app.get("/api/health")
def health():
    return jsonify(status="ok", solver="kociemba")


@app.get("/", defaults={"path": ""})
@app.get("/<path:path>")
def spa(path: str):
    """Serve the built front end, falling back to index.html for client-side routes."""
    if not os.path.isdir(DIST_DIR):
        return (
            jsonify(
                error="Front end not built.",
                hint="Run `npm install && npm run build` in web/, or `npm run dev` for development.",
            ),
            503,
        )

    candidate = os.path.join(DIST_DIR, path)
    if path and os.path.isfile(candidate):
        return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, "index.html")


if __name__ == "__main__":
    app.run(debug=True, port=5000)
