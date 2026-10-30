// ============================================================
// SAKURA FUZZY MATCHING & LEVENSHTEIN DISTANCE UTILITIES
// Handles Arabic and English character normalization and closeness detection.
// ============================================================

export function normalizeText(text: string): string {
  if (!text) return ''
  return text
    .trim()
    .toLowerCase()
    // Arabic character normalizations
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove Arabic tashkeel / harakat
    .replace(/[ـ]/g, '') // remove tatweel / kashida
    .replace(/^(ال)/, '') // remove leading "al-" if attached in Arabic
    // Clean symbols and extra spaces
    .replace(/[^a-z0-9\u0600-\u06FF]/gi, '')
}

export function levenshteinDistance(s1: string, s2: string): number {
  const a = s1
  const b = s2
  const m = a.length
  const n = b.length

  if (m === 0) return n
  if (n === 0) return m

  const d: number[][] = []
  for (let i = 0; i <= m; i++) d[i] = [i]
  for (let j = 0; j <= n; j++) d[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(
        d[i - 1][j] + 1,       // deletion
        d[i][j - 1] + 1,       // insertion
        d[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return d[m][n]
}

export interface CheckGuessResult {
  isCorrect: boolean
  isClose: boolean
  editDistance?: number
  matchedAnswer?: string
  feedback: string
  feedback_ar: string
}

export function evaluateZoomGuess(
  userGuess: string,
  canonicalAnswer: string,
  canonicalAnswerAr: string,
  aliases: string[] = []
): CheckGuessResult {
  const normGuess = normalizeText(userGuess)

  if (!normGuess) {
    return {
      isCorrect: false,
      isClose: false,
      feedback: 'Please enter a guess.',
      feedback_ar: 'الرجاء كتابة إجابة.',
    }
  }

  const allTargets = [
    canonicalAnswer,
    canonicalAnswerAr,
    ...aliases,
  ].filter(Boolean)

  let closestDistance = Infinity
  let closestTarget = ''

  for (const target of allTargets) {
    const normTarget = normalizeText(target)
    if (!normTarget) continue

    // Exact match
    if (normGuess === normTarget) {
      return {
        isCorrect: true,
        isClose: false,
        matchedAnswer: target,
        feedback: 'Correct answer! Fantastic job!',
        feedback_ar: 'إجابة صحيحة وممتازة! أحسنت!',
      }
    }

    // Check distance
    const dist = levenshteinDistance(normGuess, normTarget)
    if (dist < closestDistance) {
      closestDistance = dist
      closestTarget = target
    }

    // Check if one contains the other (e.g. "luffy" in "monkey d luffy" or "غوكو" in "سون غوكو")
    if (
      (normTarget.includes(normGuess) && normGuess.length >= 3) ||
      (normGuess.includes(normTarget) && normTarget.length >= 3)
    ) {
      // Very high closeness or partial match
      return {
        isCorrect: false,
        isClose: true,
        editDistance: 1,
        matchedAnswer: target,
        feedback: "Very close! You're almost there!",
        feedback_ar: 'قريب جداً جداً! قاربت على الإجابة الصحيحة!',
      }
    }
  }

  // 1-letter difference (or 2-letter difference for long words >= 6 chars)
  const normClosest = normalizeText(closestTarget)
  const isClose =
    closestDistance === 1 ||
    (normClosest.length >= 6 && closestDistance <= 2)

  if (isClose) {
    return {
      isCorrect: false,
      isClose: true,
      editDistance: closestDistance,
      matchedAnswer: closestTarget,
      feedback: "Very close! You are only 1 letter away — check spelling!",
      feedback_ar: 'قريب جداً! فرق حرف واحد فقط — راجع الإملاء وسارع!',
    }
  }

  return {
    isCorrect: false,
    isClose: false,
    editDistance: closestDistance,
    feedback: 'Not quite, keep trying!',
    feedback_ar: 'إجابة غير صحيحة، حاول مجدداً!',
  }
}
