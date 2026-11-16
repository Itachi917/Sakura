import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

// In-memory mutex map to serialize concurrent player submissions per session
const sessionLocks = new Map<string, Promise<unknown>>()

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { sessionId, participantId, phase, content, nickname } = body

    if (!sessionId || !participantId) {
      return NextResponse.json({ error: 'Missing sessionId or participantId' }, { status: 400 })
    }

    const supabase = createClient()
    const prevLock = sessionLocks.get(sessionId) || Promise.resolve()

    const currentLock = prevLock
      .catch(() => {})
      .then(async () => {
        // Fetch freshest session settings
        const { data: sess, error: fetchErr } = await supabase
          .from('game_sessions')
          .select('settings')
          .eq('id', sessionId)
          .single()

        if (fetchErr || !sess) {
          throw new Error('Game session not found in database')
        }

        const settings = (sess.settings as Record<string, unknown>) || {}
        const currentPhase = (settings.phone_phase as string) || 'prompt'

        // Guard against late submission for an already-completed phase
        if (phase && phase !== currentPhase && currentPhase !== 'album') {
          return settings
        }

        const currentSubmissions = { ...((settings.submissions as Record<string, unknown>) || {}) }

        currentSubmissions[participantId] = {
          phase: currentPhase,
          content: typeof content === 'string' ? content : '',
          nickname: nickname || 'Player',
          submittedAt: Date.now(),
        }

        const updatedSettings = {
          ...settings,
          submissions: currentSubmissions,
        }

        const { error: updateErr } = await supabase
          .from('game_sessions')
          .update({
            settings: updatedSettings as any,
          })
          .eq('id', sessionId)

        if (updateErr) throw updateErr

        // Award score to participant for active turn submission
        const pointsForPhase = currentPhase === 'drawing' ? 100 : 50
        try {
          const { data: pRec } = await supabase
            .from('session_participants')
            .select('score')
            .eq('id', participantId)
            .single()
          if (pRec) {
            await supabase
              .from('session_participants')
              .update({ score: (pRec.score || 0) + pointsForPhase })
              .eq('id', participantId)
          }
        } catch (scoreErr) {
          console.warn('Score increment error in gartic submit:', scoreErr)
        }

        return updatedSettings
      })

    sessionLocks.set(sessionId, currentLock)
    const result = (await currentLock) as Record<string, unknown>

    return NextResponse.json({
      success: true,
      submissionsCount: Object.keys((result?.submissions as Record<string, unknown>) || {}).length,
    })
  } catch (err: unknown) {
    console.error('Error in /api/game/gartic-phone/submit:', err)
    return NextResponse.json({ error: (err as Error).message || 'Server error' }, { status: 500 })
  }
}

