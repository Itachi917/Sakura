'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Play,
  Calendar,
  Award,
  BookOpen,
  Users,
  ExternalLink,
  Plus,
  Loader2,
  Trash2,
  Eye,
  Settings,
  Sparkles,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import type { GameSession, ActivityType } from '@/types/database'

import { generateNumericPin } from '@/lib/gameHelpers'

interface AdminDashboardProps {
  locale?: string
}

const ACTIVITIES: { id: ActivityType; name: string; name_ar: string; emoji: string }[] = [
  { id: 'whos_that_character', name: "Who's That Character?", name_ar: 'من هذه الشخصية؟', emoji: '🎭' },
  { id: 'spacetoon_nostalgia', name: 'Spacetoon Nostalgia', name_ar: 'نوستالجيا سبيستون', emoji: '📺' },
  { id: 'anime_expert_exam', name: 'Anime Expert Exam', name_ar: 'اختبار خبير الأنمي', emoji: '📚' },
  { id: 'sakura_feud', name: 'Sakura Feud', name_ar: 'فيود ساكورا', emoji: '⚔️' },
  { id: 'draw_it_guess_it', name: 'Draw It, Guess It', name_ar: 'ارسم واخمّن', emoji: '🎨' },
]

export default function AdminDashboard({ locale = 'en' }: AdminDashboardProps) {
  const router = useRouter()
  const supabase = createClient()
  const isRtl = locale === 'ar'

  const [sessions, setSessions] = useState<GameSession[]>([])
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>('whos_that_character')
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load existing sessions
  useEffect(() => {
    async function loadSessions() {
      try {
        const { data } = await supabase
          .from('game_sessions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)

        if (data) setSessions(data)
      } catch (err) {
        console.error('Error fetching admin sessions:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSessions()
  }, [])

  // Create & Launch Session
  const handleLaunchSession = async () => {
    setIsCreatingSession(true)
    sound.playClick()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const pin = generateNumericPin()
      const dummyAdminId = '00000000-0000-0000-0000-000000000000'

      const { data: newSess, error } = await supabase
        .from('game_sessions')
        .insert({
          activity_type: selectedActivity,
          room_pin: pin,
          status: 'lobby',
          host_id: user?.id || dummyAdminId,
          settings: { question_index: 0 },
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error || !newSess) throw error

      sound.playCorrect()
      setSessions(prev => [newSess, ...prev])
      router.push(`/host/session/${newSess.id}`)
    } catch (err) {
      console.error('Error launching session:', err)
      alert(isRtl ? 'حدث خطأ أثناء إنشاء الجلسة.' : 'Failed to launch session.')
    } finally {
      setIsCreatingSession(false)
    }
  }

  // Delete session
  const handleDeleteSession = async (sessId: string) => {
    if (!confirm(isRtl ? 'هل أنت متأكد من حذف هذه الجلسة؟' : 'Delete this session?')) return
    sound.playClick()
    await supabase.from('game_sessions').delete().eq('id', sessId)
    setSessions(prev => prev.filter(s => s.id !== sessId))
  }

  return (
    <div className="w-full space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-8 rounded-3xl bg-gradient-to-r from-[#1c0c26] via-[#2a133d] to-[#1c0c26] border-2 border-pink-500/20 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold mb-2">
            <Sparkles size={14} />
            <span>{isRtl ? 'لوحة تحكم المنظمين' : 'Sakura Club Admin Hub'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            {isRtl ? 'إدارة الفعاليات والألعاب التفاعلية 🌸' : 'Event & Activity Management 🌸'}
          </h1>
          <p className="text-xs sm:text-sm text-pink-200/70 mt-1">
            {isRtl
              ? 'أطلق جلسات الألعاب الحية بضغطة زر، وتحكم بها من شاشة المنظم واعرضها على البروجكتر.'
              : 'Launch live sessions with 1 click, control them from host room, and stream to projector.'}
          </p>
        </div>
      </div>

      {/* QUICK LIVE SESSION LAUNCHER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-black/40 border-2 border-pink-400/30 backdrop-blur-xl shadow-2xl">
        <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
          <Play size={20} className="text-pink-400" />
          <span>{isRtl ? 'إطلاق جلسة لعب حية جديدة' : 'Launch New Live Session'}</span>
        </h2>

        {/* Activity Picker Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {ACTIVITIES.map(act => (
            <button
              key={act.id}
              onClick={() => {
                setSelectedActivity(act.id)
                sound.playClick()
              }}
              className={`p-4 rounded-2xl border-2 text-start transition-all flex flex-col justify-between h-32 ${
                selectedActivity === act.id
                  ? 'bg-pink-600/30 border-pink-400 text-white shadow-xl shadow-pink-500/20 scale-[1.02]'
                  : 'bg-white/5 border-white/5 text-pink-200/70 hover:border-pink-500/20'
              }`}
            >
              <span className="text-3xl">{act.emoji}</span>
              <div>
                <span className="font-extrabold text-sm block text-white">
                  {isRtl ? act.name_ar : act.name}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Launch Button */}
        <button
          onClick={handleLaunchSession}
          disabled={isCreatingSession}
          className="w-full sm:w-auto py-3.5 px-8 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:via-rose-400 text-white font-extrabold text-base shadow-xl shadow-pink-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          {isCreatingSession ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>{isRtl ? 'جارٍ إنشاء الغرفة...' : 'Creating Room...'}</span>
            </>
          ) : (
            <>
              <Play size={18} />
              <span>{isRtl ? 'إنشاء رمز الغرفة والدخول للتحكم 🚀' : 'Generate Room PIN & Enter Host Room 🚀'}</span>
            </>
          )}
        </button>
      </div>

      {/* QUICK LINKS SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/events"
          className="p-5 rounded-2xl bg-black/40 border border-pink-500/15 hover:border-pink-400/40 transition-all flex items-center gap-3 text-pink-200"
        >
          <Calendar size={24} className="text-pink-400" />
          <div>
            <div className="font-bold text-white text-sm">{isRtl ? 'جدول الفعاليات' : 'Events Calendar'}</div>
            <div className="text-xs text-pink-200/60">{isRtl ? 'معاينة صفحة الفعاليات' : 'View physical events'}</div>
          </div>
        </Link>

        <Link
          href="/passport"
          className="p-5 rounded-2xl bg-black/40 border border-pink-500/15 hover:border-pink-400/40 transition-all flex items-center gap-3 text-pink-200"
        >
          <Award size={24} className="text-pink-400" />
          <div>
            <div className="font-bold text-white text-sm">{isRtl ? 'جواز السفر والأختام' : 'Passport & Stamps'}</div>
            <div className="text-xs text-pink-200/60">{isRtl ? 'معاينة الجواز الرقمي' : 'Inspect stamp catalog'}</div>
          </div>
        </Link>

        <Link
          href="/join"
          className="p-5 rounded-2xl bg-black/40 border border-pink-500/15 hover:border-pink-400/40 transition-all flex items-center gap-3 text-pink-200"
        >
          <Users size={24} className="text-pink-400" />
          <div>
            <div className="font-bold text-white text-sm">{isRtl ? 'صفحة دخول اللاعبين' : 'Join Game Portal'}</div>
            <div className="text-xs text-pink-200/60">{isRtl ? 'رابط المشاركة المباشر' : 'Mobile join screen'}</div>
          </div>
        </Link>
      </div>

      {/* RECENT SESSIONS TABLE */}
      <div className="p-6 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
          <span>{isRtl ? 'الجلسات الحالية والسابقة' : 'Active & Recent Game Sessions'}</span>
          <span className="text-xs text-pink-300 font-mono">{sessions.length} sessions</span>
        </h2>

        {sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-pink-500/15 text-pink-300/70 uppercase">
                  <th className="py-2.5 px-3 text-start">PIN</th>
                  <th className="py-2.5 px-3 text-start">{isRtl ? 'النشاط' : 'Activity'}</th>
                  <th className="py-2.5 px-3 text-start">{isRtl ? 'الحالة' : 'Status'}</th>
                  <th className="py-2.5 px-3 text-end">{isRtl ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {sessions.map(sess => (
                  <tr key={sess.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-mono font-black text-pink-300 text-base">
                      {sess.room_pin}
                    </td>
                    <td className="py-3 px-3 capitalize">
                      {sess.activity_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold text-xs uppercase border border-pink-500/30">
                        {sess.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-end">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/host/session/${sess.id}`}
                          className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs"
                        >
                          {isRtl ? 'غرفة المنظم' : 'Host Room'}
                        </Link>
                        <a
                          href={`/projector/${sess.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-300"
                          title="Open Projector"
                        >
                          <Eye size={16} />
                        </a>
                        <button
                          onClick={() => handleDeleteSession(sess.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20"
                          title="Delete Session"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-pink-200/50 text-xs">
            {isRtl ? 'لا توجد جلسات سابقة. اختر نشاطاً أعلاه لإنشاء أول جلسة!' : 'No sessions launched yet. Pick an activity above to launch!'}
          </div>
        )}
      </div>
    </div>
  )
}
