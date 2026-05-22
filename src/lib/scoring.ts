/**
 * Core scoring logic for individual net stroke play.
 */

/**
 * Returns a player's course handicap. In this tournament, handicaps are entered
 * as final course handicaps (the strokes a player receives) and used as-is —
 * no slope conversion. The slope arg is retained only for call-site compatibility.
 */
export function calculateCourseHandicap(courseHandicap: number, _slope?: number): number {
  return Math.round(courseHandicap)
}

/** Display a player's handicap — "18/21" (individual/team) when they differ, else the single number. */
export function formatHandicap(p: { handicap_index: number; team_handicap: number }): string {
  return p.team_handicap !== p.handicap_index
    ? `${p.handicap_index}/${p.team_handicap}`
    : `${p.handicap_index}`
}

/** Get the number of handicap strokes a player receives on a specific hole */
export function getStrokesForHole(courseHandicap: number, holeStrokeIndex: number): number {
  if (courseHandicap <= 0) return 0
  if (courseHandicap <= 18) {
    return holeStrokeIndex <= courseHandicap ? 1 : 0
  }
  // More than 18 strokes: everyone gets 1, extras go to hardest holes
  const extraStrokes = courseHandicap - 18
  return 1 + (holeStrokeIndex <= extraStrokes ? 1 : 0)
}

/** Calculate net score for a single hole */
export function calculateNetScore(
  grossScore: number,
  courseHandicap: number,
  holeStrokeIndex: number,
): number {
  return grossScore - getStrokesForHole(courseHandicap, holeStrokeIndex)
}

/** Format a score relative to par for display (e.g., -3, E, +5) */
export function formatVsPar(netVsPar: number): string {
  if (netVsPar === 0) return 'E'
  if (netVsPar > 0) return `+${netVsPar}`
  return `${netVsPar}`
}

/** Get the CSS color class for a score relative to par */
export function getScoreColor(vsPar: number): string {
  if (vsPar < 0) return 'text-birdie'
  if (vsPar > 0) return 'text-bogey'
  return 'text-par'
}

/** Get color for a single hole score relative to par */
export function getHoleScoreColor(gross: number | null, par: number): string {
  if (gross === null) return 'text-gray-400'
  const diff = gross - par
  if (diff <= -2) return 'text-eagle'
  if (diff === -1) return 'text-birdie'
  if (diff === 0) return 'text-par'
  if (diff === 1) return 'text-bogey'
  return 'text-red-700' // double bogey+
}
