/**
 * Faces, colours, and the language used to talk about them.
 *
 * Kociemba works in face letters (URFDLB); a person holding a cube works in colours.
 * The mapping is fixed by the standard Western colour scheme and by the orientation
 * the scan flow asks for — yellow up, red front — which is the same assumption the
 * previous version of this app made and the reason its facelet strings were valid.
 */

export const FACES = ["U", "R", "F", "D", "L", "B"];

export const FACE_COLOUR = {
  U: "yellow",
  R: "green",
  F: "red",
  D: "white",
  L: "blue",
  B: "orange",
};

/** Inverse of the above — used when reading a scanned centre back into a face. */
export const COLOUR_FACE = Object.fromEntries(
  Object.entries(FACE_COLOUR).map(([face, colour]) => [colour, face]),
);

/** Where each face sits relative to the viewer in the standard hold. */
export const FACE_POSITION = {
  U: "top",
  R: "right",
  F: "front",
  D: "bottom",
  L: "left",
  B: "back",
};

export const faceColourName = (face) => FACE_COLOUR[face];

/**
 * The scan order, and how to hold the cube for each step.
 *
 * This sequence is carried over verbatim from the previous version, where it was
 * known to produce facelet strings Kociemba accepts. `roll` describes the movement
 * from the *previous* step, which is what the on-screen ghost cube animates.
 */
export const SCAN_SEQUENCE = [
  {
    face: "U",
    facing: "yellow",
    up: "orange",
    roll: null,
    hint: "Yellow centre towards the camera, orange centre at the top.",
  },
  {
    face: "R",
    facing: "green",
    up: "yellow",
    roll: "Tip the cube forward so the yellow face points up, then turn to face green.",
    hint: "Green centre towards the camera, yellow centre at the top.",
  },
  {
    face: "F",
    facing: "red",
    up: "yellow",
    roll: "Rotate the whole cube left, keeping yellow on top.",
    hint: "Red centre towards the camera, yellow centre at the top.",
  },
  {
    face: "D",
    facing: "white",
    up: "red",
    roll: "Tip the cube backwards so the white face points at you and red sits on top.",
    hint: "White centre towards the camera, red centre at the top.",
  },
  {
    face: "L",
    facing: "blue",
    up: "yellow",
    roll: "Tip the cube forward again to bring yellow up, then turn to face blue.",
    hint: "Blue centre towards the camera, yellow centre at the top.",
  },
  {
    face: "B",
    facing: "orange",
    up: "yellow",
    roll: "Rotate the whole cube left once more, keeping yellow on top.",
    hint: "Orange centre towards the camera, yellow centre at the top.",
  },
];

/** Build the 54-character string from per-face arrays of nine face letters. */
export function assembleFacelets(byFace) {
  return FACES.map((face) => {
    const cells = byFace[face];
    if (!cells || cells.length !== 9) {
      throw new Error(`Face ${face} has ${cells ? cells.length : 0} stickers, needs 9.`);
    }
    return cells.join("");
  }).join("");
}

/** Split a facelet string back into per-face arrays. */
export function splitFacelets(facelets) {
  return Object.fromEntries(
    FACES.map((face, i) => [face, facelets.slice(i * 9, i * 9 + 9).split("")]),
  );
}
