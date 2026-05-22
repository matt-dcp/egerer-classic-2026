import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  calculateCourseHandicap,
  formatHandicap,
  getStrokesForHole,
  calculateNetScore,
  formatVsPar,
  getScoreColor,
  getHoleScoreColor,
} from './scoring'

// These tests PIN CURRENT BEHAVIOR. Anything tagged `// BUG:` documents a
// finding from docs/qa-audit.md and is updated in Phase 2 when fixed.

describe('calculateCourseHandicap', () => {
  it('rounds the input and ignores slope (handicaps used as-is)', () => {
    expect(calculateCourseHandicap(11)).toBe(11)
    expect(calculateCourseHandicap(11.4, 136)).toBe(11)
    expect(calculateCourseHandicap(11.5, 113)).toBe(12)
    expect(calculateCourseHandicap(21, 132)).toBe(21)
  })
  it('property: equals Math.round regardless of slope', () => {
    fc.assert(fc.property(fc.double({ min: -5, max: 40, noNaN: true }), fc.integer({ min: 55, max: 155 }), (h, slope) => {
      expect(calculateCourseHandicap(h, slope)).toBe(Math.round(h))
    }))
  })
})

describe('formatHandicap', () => {
  it('shows a single number when individual === team', () => {
    expect(formatHandicap({ handicap_index: 11, team_handicap: 11 })).toBe('11')
    expect(formatHandicap({ handicap_index: 0, team_handicap: 0 })).toBe('0')
  })
  it('shows "individual/team" when they differ', () => {
    expect(formatHandicap({ handicap_index: 18, team_handicap: 21 })).toBe('18/21')
  })
})

describe('getStrokesForHole', () => {
  it('gives no strokes at scratch or plus handicap', () => {
    for (let si = 1; si <= 18; si++) expect(getStrokesForHole(0, si)).toBe(0)
    expect(getStrokesForHole(-3, 1)).toBe(0) // plus handicap: no strokes added (current behavior)
  })

  it('handicap <= 18: one stroke on the hardest N holes only', () => {
    expect(getStrokesForHole(6, 6)).toBe(1)
    expect(getStrokesForHole(6, 7)).toBe(0)
    expect(getStrokesForHole(18, 18)).toBe(1)
    expect(getStrokesForHole(1, 1)).toBe(1)
    expect(getStrokesForHole(1, 2)).toBe(0)
  })

  it('handicap > 18: one stroke everywhere, a second on the (hcp-18) hardest holes', () => {
    // hcp 21 -> +1 everywhere, +1 more on SI 1,2,3
    expect(getStrokesForHole(21, 1)).toBe(2)
    expect(getStrokesForHole(21, 3)).toBe(2)
    expect(getStrokesForHole(21, 4)).toBe(1)
    expect(getStrokesForHole(21, 18)).toBe(1)
  })

  it('property: total strokes dealt across SI 1..18 equals the handicap (0..36)', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 36 }), (hcp) => {
      let total = 0
      for (let si = 1; si <= 18; si++) total += getStrokesForHole(hcp, si)
      expect(total).toBe(hcp)
    }))
  })

  it('property: a lower stroke index never receives fewer strokes than a higher one', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 36 }), (hcp) => {
      for (let si = 1; si < 18; si++) {
        expect(getStrokesForHole(hcp, si)).toBeGreaterThanOrEqual(getStrokesForHole(hcp, si + 1))
      }
    }))
  })
})

describe('calculateNetScore', () => {
  it('is gross minus strokes received on the hole', () => {
    expect(calculateNetScore(5, 6, 6)).toBe(4) // gets a stroke
    expect(calculateNetScore(5, 6, 7)).toBe(5) // no stroke
    expect(calculateNetScore(7, 21, 1)).toBe(5) // two strokes
  })
  it('property: net = gross - getStrokesForHole', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 15 }), fc.integer({ min: 0, max: 36 }), fc.integer({ min: 1, max: 18 }),
      (gross, hcp, si) => {
        expect(calculateNetScore(gross, hcp, si)).toBe(gross - getStrokesForHole(hcp, si))
      },
    ))
  })
})

describe('formatVsPar', () => {
  it('formats relative to par', () => {
    expect(formatVsPar(0)).toBe('E')
    expect(formatVsPar(3)).toBe('+3')
    expect(formatVsPar(-2)).toBe('-2')
  })
  it('property: sign and magnitude preserved', () => {
    fc.assert(fc.property(fc.integer({ min: -30, max: 30 }), (n) => {
      const s = formatVsPar(n)
      if (n === 0) expect(s).toBe('E')
      else if (n > 0) expect(s).toBe(`+${n}`)
      else expect(s).toBe(`${n}`)
    }))
  })
})

describe('getScoreColor', () => {
  it('maps under/over/at par to themed classes', () => {
    expect(getScoreColor(-1)).toBe('text-birdie')
    expect(getScoreColor(1)).toBe('text-bogey')
    expect(getScoreColor(0)).toBe('text-par')
  })
})

describe('getHoleScoreColor', () => {
  it('null gross is gray', () => {
    expect(getHoleScoreColor(null, 4)).toBe('text-gray-400')
  })
  it('eagle/birdie/par/bogey/double tiers', () => {
    expect(getHoleScoreColor(2, 4)).toBe('text-eagle')   // -2
    expect(getHoleScoreColor(3, 4)).toBe('text-birdie')  // -1
    expect(getHoleScoreColor(4, 4)).toBe('text-par')     // E
    expect(getHoleScoreColor(5, 4)).toBe('text-bogey')   // +1
    expect(getHoleScoreColor(6, 4)).toBe('text-red-700') // +2 (double or worse)
    expect(getHoleScoreColor(1, 3)).toBe('text-eagle')   // ace on a par 3 (-2)
  })
})
