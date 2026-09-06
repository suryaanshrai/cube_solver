/**
 * The one call this front end makes.
 *
 * The solve itself stays on the server because Kociemba's two-phase implementation there
 * is the proven path and it is not the slow part of this experience. Everything else —
 * reading the cube, checking it, drawing it, animating it — happens here.
 */

export async function solveCube(facelets, { signal } = {}) {
  let response;
  try {
    response = await fetch("/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facelets }),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Couldn't reach the solver. Check your connection and try again.");
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? "The solver rejected this cube.");
  }
  return body;
}
