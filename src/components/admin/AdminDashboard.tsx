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
  Plus,
  Loader2,
  Trash2,
  Eye,
  Settings,
  Sparkles,
  Edit2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Send,
  RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { sound } from '@/lib/sound'
import type {
  GameSession,
  ActivityType,
  Event as ClubEvent,
  PassportStamp,
  Profile,
  Quiz,
  QuizQuestion,
} from '@/types/database'
import { generateNumericPin } from '@/lib/gameHelpers'
import {
  ZOOM_GUESS_QUESTIONS,
  type ZoomGuessQuestionData,
} from '@/lib/gameData'

interface AdminDashboardProps {
  locale?: string
}

const ACTIVITIES: { id: ActivityType; name: string; name_ar: string; emoji: string }[] = [
  { id: 'whos_that_character', name: "Who's That Character?", name_ar: 'من هذه الشخصية؟', emoji: '🎭' },
  { id: 'zoom_guess', name: 'Zoom & Guess', name_ar: 'خمن بالزووم (عدسة ساكورا)', emoji: '🔍' },
  { id: 'spacetoon_nostalgia', name: 'Spacetoon Nostalgia', name_ar: 'نوستالجيا سبيستون', emoji: '📺' },
  { id: 'anime_expert_exam', name: 'Anime Expert Exam', name_ar: 'اختبار خبير الأنمي', emoji: '📚' },
  { id: 'sakura_feud', name: 'Sakura Feud', name_ar: 'فيود ساكورا', emoji: '⚔️' },
  { id: 'draw_it_guess_it', name: 'Draw It, Guess It', name_ar: 'ارسم واخمّن', emoji: '🎨' },
]

const RARITIES = [
  { id: 'common', label: 'Common', label_ar: 'شائع', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
  { id: 'uncommon', label: 'Uncommon', label_ar: 'غير شائع', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'rare', label: 'Rare', label_ar: 'نادر', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'legendary', label: 'Legendary', label_ar: 'أسطوري', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
]

export default function AdminDashboard({ locale = 'en' }: AdminDashboardProps) {
  const router = useRouter()
  const supabase = createClient()
  const isRtl = locale === 'ar'

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'sessions' | 'events' | 'stamps' | 'quizzes' | 'zoom_guess'>('sessions')

  // Global Admin State
  const [loading, setLoading] = useState(true)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 1. Live Games State
  const [sessions, setSessions] = useState<GameSession[]>([])
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>('whos_that_character')
  const [isCreatingSession, setIsCreatingSession] = useState(false)

  // 2. Events State
  const [events, setEvents] = useState<ClubEvent[]>([])
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [eventForm, setEventForm] = useState({
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    venue: '',
    check_in_code: '',
    check_in_open: true,
    starts_at: '',
    banner_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop',
    status: 'published' as ClubEvent['status'],
  })

  // 3. Badges & Stamps State
  const [stamps, setStamps] = useState<PassportStamp[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [showStampModal, setShowStampModal] = useState(false)
  const [stampForm, setStampForm] = useState({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    icon_url: '🌸',
    rarity: 'common' as PassportStamp['rarity'],
    unlock_type: 'manual' as PassportStamp['unlock_type'],
  })
  // Award Stamp Tool
  const [awardUserId, setAwardUserId] = useState('')
  const [awardStampId, setAwardStampId] = useState('')
  const [awardReason, setAwardReason] = useState('')
  const [isAwarding, setIsAwarding] = useState(false)

  // 4. Quizzes & Questions State
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [quizForm, setQuizForm] = useState({
    title: '',
    title_ar: '',
    activity_type: 'whos_that_character' as ActivityType,
    difficulty: 'medium',
  })
  const [showQuestionModal, setShowQuestionModal] = useState(false)
  const [selectedQuizIdForQuestion, setSelectedQuizIdForQuestion] = useState<string>('')
  const [questionForm, setQuestionForm] = useState({
    question_text_ar: '',
    question_text: '',
    optA_ar: '',
    optA_en: '',
    optB_ar: '',
    optB_en: '',
    optC_ar: '',
    optC_en: '',
    optD_ar: '',
    optD_en: '',
    correctIndex: 0,
    points: 1000,
    time_limit_seconds: 20,
    explanation_ar: '',
  })

  // 5. Zoom & Guess Questions State
  const [zoomQuestions, setZoomQuestions] = useState<ZoomGuessQuestionData[]>(ZOOM_GUESS_QUESTIONS)
  const [showZoomModal, setShowZoomModal] = useState(false)
  const [editingZoomId, setEditingZoomId] = useState<string | null>(null)
  const [zoomForm, setZoomForm] = useState({
    image_url: '',
    character_name: '',
    character_name_ar: '',
    aliases: '',
    anime_origin: '',
    anime_origin_ar: '',
    hint: '',
    hint_ar: '',
    focus_point: '50% 30%',
    total_time_seconds: 40,
    base_points: 1000,
  })

  // Helper feedback timer
  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type })
    setTimeout(() => setFeedbackMsg(null), 4500)
  }

  // Initial Load of All Tables
  const loadAllData = async () => {
    setLoading(true)
    try {
      const [
        { data: sessData },
        { data: eventData },
        { data: stampData },
        { data: profData },
        { data: quizData },
      ] = await Promise.all([
        supabase.from('game_sessions').select('*').order('created_at', { ascending: false }).limit(15),
        supabase.from('events').select('*').order('created_at', { ascending: false }),
        supabase.from('passport_stamps').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('nickname'),
        supabase.from('quizzes').select('*').order('created_at', { ascending: false }),
      ])

      if (sessData) setSessions(sessData)
      if (eventData) setEvents(eventData)
      if (stampData) setStamps(stampData)
      if (profData) setProfiles(profData)
      if (quizData) setQuizzes(quizData)
    } catch (err) {
      console.error('Error fetching admin data:', err)
      showFeedback(isRtl ? 'تعذر جلب بعض البيانات من الخادم' : 'Failed to fetch some admin data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // ============================================================
  // 1. SESSION MANAGEMENT
  // ============================================================
  const handleLaunchSession = async () => {
    setIsCreatingSession(true)
    sound.playClick()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const pin = generateNumericPin()
      const dummyAdminId = '00000000-0000-0000-0000-000000000000'

      const settingsPayload: Record<string, unknown> = { question_index: 0 }
      if (selectedActivity === 'zoom_guess') {
        settingsPayload.game_mode = 'zoom_guess'
      }

      let { data: newSess, error } = await supabase
        .from('game_sessions')
        .insert({
          activity_type: selectedActivity,
          room_pin: pin,
          status: 'lobby',
          host_id: user?.id || dummyAdminId,
          settings: settingsPayload as unknown as import('@/types/database').Json,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      // If enum not yet migrated in Supabase, fallback cleanly
      if (error && selectedActivity === 'zoom_guess') {
        const fallbackRes = await supabase
          .from('game_sessions')
          .insert({
            activity_type: 'whos_that_character',
            room_pin: pin,
            status: 'lobby',
            host_id: user?.id || dummyAdminId,
            settings: { question_index: 0, game_mode: 'zoom_guess' } as unknown as import('@/types/database').Json,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()
        newSess = fallbackRes.data
        error = fallbackRes.error
      }

      if (error || !newSess) throw error

      sound.playCorrect()
      setSessions(prev => [newSess, ...prev])
      showFeedback(isRtl ? `تم إنشاء الجلسة برمز PIN: ${newSess.room_pin}` : `Session launched with PIN: ${newSess.room_pin}`)
      router.push(`/host/session/${newSess.id}`)
    } catch (err) {
      console.error('Error launching session:', err)
      showFeedback(isRtl ? 'حدث خطأ أثناء إنشاء الجلسة.' : 'Failed to launch session.', 'error')
    } finally {
      setIsCreatingSession(false)
    }
  }

  const handleDeleteSession = async (sessId: string) => {
    if (!confirm(isRtl ? 'هل أنت متأكد من حذف هذه الجلسة؟' : 'Delete this session?')) return
    sound.playClick()
    await supabase.from('game_sessions').delete().eq('id', sessId)
    setSessions(prev => prev.filter(s => s.id !== sessId))
    showFeedback(isRtl ? 'تم حذف الجلسة بنجاح' : 'Session deleted')
  }

  // ============================================================
  // 2. EVENTS MANAGEMENT
  // ============================================================
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    sound.playClick()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const dummyAdminId = '00000000-0000-0000-0000-000000000000'

      const updateData = {
        title: eventForm.title.trim() || 'Sakura Anime Gathering',
        title_ar: eventForm.title_ar.trim() || 'تجمع نادي ساكورا للأنمي',
        description: eventForm.description,
        description_ar: eventForm.description_ar,
        venue: eventForm.venue.trim() || 'Main Campus Hall',
        check_in_code: eventForm.check_in_code.trim().toUpperCase() || 'SAKURA26',
        check_in_open: eventForm.check_in_open,
        starts_at: eventForm.starts_at ? new Date(eventForm.starts_at).toISOString() : new Date().toISOString(),
        banner_url: eventForm.banner_url,
        status: eventForm.status,
      }

      if (editingEventId) {
        const { error } = await supabase.from('events').update(updateData).eq('id', editingEventId)
        if (error) throw error
        showFeedback(isRtl ? 'تم تحديث الفعالية بنجاح 🌸' : 'Event updated successfully 🌸')
      } else {
        const { error } = await supabase.from('events').insert({
          ...updateData,
          created_by: user?.id || dummyAdminId,
        })
        if (error) throw error
        showFeedback(isRtl ? 'تمت إضافة الفعالية الجديدة بنجاح 🌸' : 'New event created successfully 🌸')
      }

      setShowEventModal(false)
      setEditingEventId(null)
      loadAllData()
    } catch (err: unknown) {
      console.error('Error saving event:', err)
      showFeedback(isRtl ? 'فشل حفظ الفعالية' : 'Failed to save event', 'error')
    }
  }

  const handleToggleEventCheckIn = async (eventId: string, currentVal: boolean) => {
    sound.playClick()
    const nextVal = !currentVal
    await supabase.from('events').update({ check_in_open: nextVal }).eq('id', eventId)
    setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, check_in_open: nextVal } : ev))
    showFeedback(
      nextVal
        ? (isRtl ? 'تم فتح تسجيل الحضور للفعالية ✅' : 'Event check-in opened ✅')
        : (isRtl ? 'تم إغلاق تسجيل الحضور 🔒' : 'Event check-in closed 🔒')
    )
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm(isRtl ? 'حذف هذه الفعالية نهائياً؟' : 'Delete this event permanently?')) return
    sound.playClick()
    await supabase.from('events').delete().eq('id', eventId)
    setEvents(prev => prev.filter(ev => ev.id !== eventId))
    showFeedback(isRtl ? 'تم حذف الفعالية' : 'Event deleted')
  }

  // ============================================================
  // 3. BADGES & STAMPS MANAGEMENT
  // ============================================================
  const handleSaveStamp = async (e: React.FormEvent) => {
    e.preventDefault()
    sound.playClick()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const dummyAdminId = '00000000-0000-0000-0000-000000000000'

      const payload = {
        name: stampForm.name.trim() || 'Sakura Stamp',
        name_ar: stampForm.name_ar.trim() || 'ختم ساكورا',
        description: stampForm.description,
        description_ar: stampForm.description_ar,
        icon_url: stampForm.icon_url.trim() || '🌸',
        rarity: stampForm.rarity,
        unlock_type: stampForm.unlock_type,
        is_active: true,
        created_by: user?.id || dummyAdminId,
      }

      const { error } = await supabase.from('passport_stamps').insert(payload)
      if (error) throw error

      showFeedback(isRtl ? 'تمت إضافة الختم / الشارة بنجاح 🎖️' : 'Stamp badge created 🎖️')
      setShowStampModal(false)
      loadAllData()
    } catch (err) {
      console.error('Error saving stamp:', err)
      showFeedback(isRtl ? 'فشل إنشاء الختم' : 'Failed to create stamp', 'error')
    }
  }

  const handleDeleteStamp = async (stampId: string) => {
    if (!confirm(isRtl ? 'حذف هذا الختم من كتالوج الجواز؟' : 'Delete this stamp from catalog?')) return
    sound.playClick()
    await supabase.from('passport_stamps').delete().eq('id', stampId)
    setStamps(prev => prev.filter(s => s.id !== stampId))
    showFeedback(isRtl ? 'تم حذف الختم' : 'Stamp removed')
  }

  const handleAwardStamp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!awardUserId || !awardStampId) {
      showFeedback(isRtl ? 'يرجى اختيار العضو والختم' : 'Please select both participant and stamp', 'error')
      return
    }

    setIsAwarding(true)
    sound.playClick()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const dummyAdminId = '00000000-0000-0000-0000-000000000000'

      const { error } = await supabase.from('participant_stamps').insert({
        participant_id: awardUserId,
        stamp_id: awardStampId,
        awarded_by: user?.id || dummyAdminId,
        award_reason: awardReason.trim() || 'Manually awarded by Sakura Club Admin',
        awarded_at: new Date().toISOString(),
      })

      if (error) {
        if (error.code === '23505') {
          showFeedback(isRtl ? 'هذا العضو يمتلك هذا الختم بالفعل في جوازه!' : 'This participant already holds this stamp!', 'error')
          return
        }
        throw error
      }

      sound.playFanfare()
      showFeedback(isRtl ? 'تم منح الختم بنجاح إلى جواز العضو! 🎖️✨' : 'Stamp awarded to participant passport! 🎖️✨')
      setAwardReason('')
    } catch (err) {
      console.error('Error awarding stamp:', err)
      showFeedback(isRtl ? 'فشل منح الختم' : 'Failed to award stamp', 'error')
    } finally {
      setIsAwarding(false)
    }
  }

  // ============================================================
  // 4. QUIZZES & QUESTIONS MANAGEMENT
  // ============================================================
  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault()
    sound.playClick()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const dummyAdminId = '00000000-0000-0000-0000-000000000000'

      const { error } = await supabase.from('quizzes').insert({
        title: quizForm.title.trim() || 'Sakura Quiz Challenge',
        title_ar: quizForm.title_ar.trim() || 'تحدي كويز ساكورا',
        activity_type: quizForm.activity_type,
        difficulty: (quizForm.difficulty as 'easy' | 'medium' | 'hard' | 'mixed') || 'medium',
        status: 'published',
        created_by: user?.id || dummyAdminId,
      })

      if (error) throw error

      showFeedback(isRtl ? 'تم إنشاء حزمة الأسئلة بنجاح! 📚' : 'Quiz created! 📚')
      setShowQuizModal(false)
      loadAllData()
    } catch (err) {
      console.error('Error saving quiz:', err)
      showFeedback(isRtl ? 'فشل إنشاء الكويز' : 'Failed to create quiz', 'error')
    }
  }

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedQuizIdForQuestion) {
      showFeedback(isRtl ? 'يرجى اختيار الكويز أولاً' : 'Select a quiz first', 'error')
      return
    }

    sound.playClick()

    try {
      // 1. Insert question
      const { data: newQ, error: qErr } = await supabase
        .from('quiz_questions')
        .insert({
          quiz_id: selectedQuizIdForQuestion,
          question_text_ar: questionForm.question_text_ar.trim() || 'سؤال ساكورا التفاعلي',
          question_text: questionForm.question_text.trim() || 'Sakura Trivia Question',
          base_points: Number(questionForm.points) || 1000,
          time_limit_seconds: Number(questionForm.time_limit_seconds) || 20,
          explanation_ar: questionForm.explanation_ar.trim(),
        })
        .select()
        .single()

      if (qErr || !newQ) throw qErr

      // 2. Insert 4 Answers
      const answersData = [
        { text_ar: questionForm.optA_ar, text: questionForm.optA_en || questionForm.optA_ar, is_correct: questionForm.correctIndex === 0 },
        { text_ar: questionForm.optB_ar, text: questionForm.optB_en || questionForm.optB_ar, is_correct: questionForm.correctIndex === 1 },
        { text_ar: questionForm.optC_ar, text: questionForm.optC_en || questionForm.optC_ar, is_correct: questionForm.correctIndex === 2 },
        { text_ar: questionForm.optD_ar, text: questionForm.optD_en || questionForm.optD_ar, is_correct: questionForm.correctIndex === 3 },
      ].map((opt, idx) => ({
        question_id: newQ.id,
        answer_text_ar: opt.text_ar || `خيار ${idx + 1}`,
        answer_text: opt.text || `Option ${idx + 1}`,
        is_correct: opt.is_correct,
        sort_order: idx,
      }))

      await supabase.from('quiz_answers').insert(answersData)

      sound.playCorrect()
      showFeedback(isRtl ? 'تمت إضافة السؤال بنجاح مع الخيارات بالعربية! 🌸' : 'Question added with Arabic choices! 🌸')
      setShowQuestionModal(false)
      setQuestionForm({
        question_text_ar: '',
        question_text: '',
        optA_ar: '',
        optA_en: '',
        optB_ar: '',
        optB_en: '',
        optC_ar: '',
        optC_en: '',
        optD_ar: '',
        optD_en: '',
        correctIndex: 0,
        points: 1000,
        time_limit_seconds: 20,
        explanation_ar: '',
      })
    } catch (err) {
      console.error('Error adding question:', err)
      showFeedback(isRtl ? 'فشل إضافة السؤال' : 'Failed to add question', 'error')
    }
  }

  return (
    <div className="w-full space-y-8 animate-fade-in font-sans">
      {/* Toast Notification Alert */}
      {feedbackMsg && (
        <div
          className={`fixed top-20 right-4 sm:right-8 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-xl animate-slide-up ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
              : 'bg-rose-950/90 border-rose-400 text-rose-200'
          }`}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          <span className="font-bold text-sm">{feedbackMsg.text}</span>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#1c0c26] via-[#2a133d] to-[#1c0c26] border-2 border-pink-500/20 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold mb-2">
            <ShieldCheck size={16} />
            <span>{isRtl ? 'لوحة تحكم إدارة ساكورا الشاملة' : 'Sakura Club Master Admin Hub'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white">
            {isRtl ? 'إدارة الفعاليات والألعاب والأختام 🌸' : 'Club Games, Badges & Events Hub 🌸'}
          </h1>
          <p className="text-xs sm:text-sm text-pink-200/70 mt-1">
            {isRtl
              ? 'تحكّم كامل في جدول الفعاليات، أختام الجوازات ومنحها للأعضاء، وإطلاق الألعاب وتعديل الأسئلة.'
              : 'Complete control over campus events, passport badges, member awarding, live games and quiz banks.'}
          </p>
        </div>

        <button
          onClick={loadAllData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 text-xs font-bold border border-pink-500/20 transition-all shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{isRtl ? 'تحديث البيانات' : 'Sync Tables'}</span>
        </button>
      </div>

      {/* TABS NAVIGATION BAR (Mobile Scrollable) */}
      <div className="flex items-center gap-2 border-b border-pink-500/20 pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'sessions', label: isRtl ? '🎮 الألعاب الحية' : '🎮 Live Games', count: sessions.length },
          { id: 'zoom_guess', label: isRtl ? '🔍 خمن بالزووم' : '🔍 Zoom & Guess Questions', count: zoomQuestions.length },
          { id: 'events', label: isRtl ? '📅 إدارة الفعاليات' : '📅 Campus Events', count: events.length },
          { id: 'stamps', label: isRtl ? '🎖️ الشارات والأختام' : '🎖️ Badges & Stamps', count: stamps.length },
          { id: 'quizzes', label: isRtl ? '📚 بنك الأسئلة والكويز' : '📚 Quizzes & Questions', count: quizzes.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as typeof activeTab)
              sound.playClick()
            }}
            className={`px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-500/30'
                : 'text-pink-200/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-2 py-0.5 rounded-full bg-black/30 text-xs font-mono">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: LIVE GAME SESSIONS */}
      {/* ============================================================ */}
      {activeTab === 'sessions' && (
        <div className="space-y-6 animate-fade-in">
          {/* Activity Launcher */}
          <div className="p-6 sm:p-8 rounded-3xl bg-black/40 border-2 border-pink-400/30 backdrop-blur-xl shadow-2xl">
            <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
              <Play size={20} className="text-pink-400" />
              <span>{isRtl ? 'إطلاق جلسة لعب حية جديدة' : 'Launch New Live Session'}</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {ACTIVITIES.map(act => (
                <button
                  key={act.id}
                  onClick={() => {
                    setSelectedActivity(act.id)
                    sound.playClick()
                  }}
                  className={`p-4 rounded-2xl border-2 text-start transition-all flex flex-col justify-between h-28 sm:h-32 ${
                    selectedActivity === act.id
                      ? 'bg-pink-600/30 border-pink-400 text-white shadow-xl shadow-pink-500/20 scale-[1.02]'
                      : 'bg-white/5 border-white/5 text-pink-200/70 hover:border-pink-500/20'
                  }`}
                >
                  <span className="text-3xl">{act.emoji}</span>
                  <div>
                    <span className="font-extrabold text-xs sm:text-sm block text-white">
                      {isRtl ? act.name_ar : act.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleLaunchSession}
              disabled={isCreatingSession}
              className="w-full sm:w-auto py-3.5 px-8 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 text-white font-extrabold text-base shadow-xl shadow-pink-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
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

          {/* Sessions List */}
          <div className="p-6 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>{isRtl ? 'الجلسات الحالية والسابقة' : 'Active & Recent Game Sessions'}</span>
              <span className="text-xs text-pink-300 font-mono">{sessions.length} sessions</span>
            </h2>

            {sessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sessions.map(sess => (
                  <div
                    key={sess.id}
                    className="p-4 rounded-2xl bg-white/5 border border-pink-500/15 flex items-center justify-between gap-3 hover:border-pink-500/30 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-pink-300 text-xl tracking-wider">
                          PIN: {sess.room_pin}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold text-xs uppercase border border-pink-500/30">
                          {sess.status}
                        </span>
                      </div>
                      <p className="text-xs text-pink-200/60 mt-1 capitalize font-medium">
                        {sess.activity_type.replace(/_/g, ' ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/host/session/${sess.id}`}
                        className="px-3 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs transition-colors"
                      >
                        {isRtl ? 'تحكم' : 'Host'}
                      </Link>
                      <a
                        href={`/projector/${sess.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-pink-300 transition-colors"
                        title="Projector"
                      >
                        <Eye size={16} />
                      </a>
                      <button
                        onClick={() => handleDeleteSession(sess.id)}
                        className="p-2 rounded-xl text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-pink-200/50 text-xs">
                {isRtl ? 'لا توجد جلسات حالياً' : 'No sessions available'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: EVENTS MANAGER */}
      {/* ============================================================ */}
      {activeTab === 'events' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar size={22} className="text-pink-400" />
              <span>{isRtl ? 'جدول الفعاليات الحضورية' : 'Campus Events Schedule'}</span>
            </h2>
            <button
              onClick={() => {
                setEditingEventId(null)
                setEventForm({
                  title: '',
                  title_ar: '',
                  description: '',
                  description_ar: '',
                  venue: 'Main Auditorium Hall B',
                  check_in_code: 'SAKURA26',
                  check_in_open: true,
                  starts_at: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                  banner_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop',
                  status: 'published',
                })
                setShowEventModal(true)
              }}
              className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-pink-600/30"
            >
              <Plus size={16} />
              <span>{isRtl ? 'إضافة فعالية جديدة' : 'Add New Event'}</span>
            </button>
          </div>

          {/* Events List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map(ev => (
              <div
                key={ev.id}
                className="p-5 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-xl flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-pink-500/20 text-pink-300 font-bold border border-pink-400/20">
                      CODE: {ev.check_in_code || 'N/A'}
                    </span>
                    <button
                      onClick={() => handleToggleEventCheckIn(ev.id, ev.check_in_open)}
                      className={`text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 transition-colors ${
                        ev.check_in_open
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}
                    >
                      {ev.check_in_open ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
                      <span>{ev.check_in_open ? (isRtl ? 'التسجيل مفتوح' : 'Check-In Open') : (isRtl ? 'التسجيل مغلق' : 'Check-In Closed')}</span>
                    </button>
                  </div>

                  <h3 className="text-lg font-black text-white leading-snug">
                    {isRtl ? ev.title_ar || ev.title : ev.title}
                  </h3>
                  <p className="text-xs text-pink-200/60 mt-1">{ev.venue}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-pink-200/50">
                  <span>{new Date(ev.starts_at || Date.now()).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/events/${ev.id}`}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-300 font-semibold"
                    >
                      {isRtl ? 'عرض' : 'View'}
                    </Link>
                    <button
                      onClick={() => {
                        setEditingEventId(ev.id)
                        setEventForm({
                          title: ev.title,
                          title_ar: ev.title_ar || '',
                          description: ev.description || '',
                          description_ar: ev.description_ar || '',
                          venue: ev.venue || '',
                          check_in_code: ev.check_in_code || '',
                          check_in_open: ev.check_in_open,
                          starts_at: ev.starts_at ? new Date(ev.starts_at).toISOString().slice(0, 16) : '',
                          banner_url: ev.banner_url || '',
                          status: ev.status,
                        })
                        setShowEventModal(true)
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-pink-300"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: BADGES & PASSPORT STAMPS */}
      {/* ============================================================ */}
      {activeTab === 'stamps' && (
        <div className="space-y-8 animate-fade-in">
          {/* MANUAL AWARD TOOL CARD */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-pink-950/40 via-purple-950/40 to-pink-950/40 border-2 border-pink-400/30 backdrop-blur-xl shadow-2xl">
            <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <Award size={22} className="text-pink-400" />
              <span>{isRtl ? 'منح وسام / ختم لعضو في النادي 🎖️' : 'Award Passport Badge to Member 🎖️'}</span>
            </h2>
            <p className="text-xs text-pink-200/70 mb-5">
              {isRtl
                ? 'اختر أي عضو مسجل في المنصة وامنحه ختماً مباشراً يُضاف فوراً إلى جوازه الرقمي.'
                : 'Select any registered member and grant them a collectible stamp directly into their passport.'}
            </p>

            <form onSubmit={handleAwardStamp} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-pink-200 mb-1.5">
                  {isRtl ? 'اختر العضو' : 'Select Member'}
                </label>
                <select
                  value={awardUserId}
                  onChange={e => setAwardUserId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-pink-400/30 text-white text-xs sm:text-sm focus:outline-none focus:border-pink-400"
                  required
                >
                  <option value="">{isRtl ? '-- اختر العضو --' : '-- Choose Member --'}</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nickname} {p.avatar_url ? `(${p.avatar_url})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-pink-200 mb-1.5">
                  {isRtl ? 'اختر الختم / الشارة' : 'Select Stamp / Badge'}
                </label>
                <select
                  value={awardStampId}
                  onChange={e => setAwardStampId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-pink-400/30 text-white text-xs sm:text-sm focus:outline-none focus:border-pink-400"
                  required
                >
                  <option value="">{isRtl ? '-- اختر الختم --' : '-- Choose Stamp --'}</option>
                  {stamps.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.icon_url || '🌸'} {isRtl ? s.name_ar || s.name : s.name} ({s.rarity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isAwarding}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 text-white font-extrabold text-sm shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  {isAwarding ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>{isRtl ? 'منح الختم للجواز ✨' : 'Award to Passport ✨'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Stamps Catalog Header & Add Button */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles size={20} className="text-pink-400" />
              <span>{isRtl ? 'كتالوج أختام الجواز المتاحة' : 'Stamp Badges Catalog'}</span>
            </h2>
            <button
              onClick={() => {
                setStampForm({
                  name: '',
                  name_ar: '',
                  description: '',
                  description_ar: '',
                  icon_url: '🌸',
                  rarity: 'common',
                  unlock_type: 'manual',
                })
                setShowStampModal(true)
              }}
              className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-pink-600/30"
            >
              <Plus size={16} />
              <span>{isRtl ? 'إنشاء ختم جديد' : 'Create New Stamp'}</span>
            </button>
          </div>

          {/* Stamps Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {stamps.map(st => {
              const rarityMeta = RARITIES.find(r => r.id === st.rarity) || RARITIES[0]
              return (
                <div
                  key={st.id}
                  className="p-5 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-xl flex flex-col items-center text-center justify-between relative group hover:border-pink-400/40 transition-all"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-pink-400/20 flex items-center justify-center text-3xl mb-3 shadow-inner">
                    {st.icon_url || '🌸'}
                  </div>

                  <h3 className="font-black text-sm text-white mb-1">
                    {isRtl ? st.name_ar || st.name : st.name}
                  </h3>

                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border mb-3 ${rarityMeta.color}`}>
                    {isRtl ? rarityMeta.label_ar : rarityMeta.label}
                  </span>

                  <button
                    onClick={() => handleDeleteStamp(st.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors text-xs flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    <span>{isRtl ? 'حذف' : 'Delete'}</span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: QUIZZES & QUESTIONS */}
      {/* ============================================================ */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen size={20} className="text-pink-400" />
              <span>{isRtl ? 'حزم الكويزات وبنك الأسئلة' : 'Quiz Question Packages'}</span>
            </h2>
            <button
              onClick={() => {
                setQuizForm({
                  title: '',
                  title_ar: '',
                  activity_type: 'whos_that_character',
                  difficulty: 'medium',
                })
                setShowQuizModal(true)
              }}
              className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-pink-600/30"
            >
              <Plus size={16} />
              <span>{isRtl ? 'إنشاء حزمة كويز جديدة' : 'Create New Quiz'}</span>
            </button>
          </div>

          {/* Quizzes List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map(q => (
              <div
                key={q.id}
                className="p-6 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-xl flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-400/20">
                      {q.activity_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-pink-200/50 uppercase font-mono">{q.difficulty}</span>
                  </div>
                  <h3 className="text-lg font-black text-white">
                    {isRtl ? q.title_ar || q.title : q.title}
                  </h3>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <button
                    onClick={() => {
                      setSelectedQuizIdForQuestion(q.id)
                      setShowQuestionModal(true)
                    }}
                    className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>{isRtl ? 'إضافة سؤال بالعربية' : 'Add Arabic Question'}</span>
                  </button>

                  <button
                    onClick={async () => {
                      if (!confirm(isRtl ? 'حذف هذا الكويز؟' : 'Delete this quiz?')) return
                      await supabase.from('quizzes').delete().eq('id', q.id)
                      setQuizzes(prev => prev.filter(item => item.id !== q.id))
                      showFeedback(isRtl ? 'تم حذف الكويز' : 'Quiz deleted')
                    }}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: ZOOM & GUESS QUESTIONS MANAGEMENT */}
      {/* ============================================================ */}
      {activeTab === 'zoom_guess' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                <span>{isRtl ? 'بنك أسئلة خمن بالزووم (عدسة ساكورا)' : 'Zoom & Guess Character Bank'}</span>
              </h2>
              <p className="text-xs text-pink-200/70 mt-1">
                {isRtl
                  ? 'تبدأ الصورة مقصوصة ومكبرة جداً، وتصغر تلقائياً كل 10 ثوانٍ. واللاعب الأسرع يحصد أعلى النقاط!'
                  : 'Image starts zoomed in / cropped, zooming out every 10 seconds. Fastest player wins maximum points!'}
              </p>
            </div>

            <button
              onClick={() => {
                setEditingZoomId(null)
                setZoomForm({
                  image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1000&auto=format&fit=crop',
                  character_name: '',
                  character_name_ar: '',
                  aliases: '',
                  anime_origin: '',
                  anime_origin_ar: '',
                  hint: '',
                  hint_ar: '',
                  focus_point: '50% 30%',
                  total_time_seconds: 40,
                  base_points: 1000,
                })
                setShowZoomModal(true)
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-pink-600/30"
            >
              <Plus size={16} />
              <span>{isRtl ? 'إضافة شخصية جديدة 🔍' : 'Add Zoom Character 🔍'}</span>
            </button>
          </div>

          {/* Questions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {zoomQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-3xl bg-black/40 border-2 border-pink-500/20 backdrop-blur-xl overflow-hidden flex flex-col justify-between hover:border-pink-400/40 transition-all shadow-xl"
              >
                <div>
                  {/* Image Preview with Zoom Simulation */}
                  <div className="relative aspect-[16/10] bg-black overflow-hidden border-b border-pink-500/20">
                    <img
                      src={q.image_url}
                      alt={q.character_name}
                      className="w-full h-full object-cover select-none"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-pink-300 border border-white/10">
                      #{idx + 1} • {q.base_points} PTS
                    </div>
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-amber-300 border border-white/10">
                      {q.total_time_seconds}s (10s/step)
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-lg font-black text-white">
                        {isRtl ? q.character_name_ar : q.character_name}
                      </h3>
                      <div className="text-xs text-pink-300/80 font-bold">
                        {q.character_name} • {isRtl ? q.anime_origin_ar : q.anime_origin}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-pink-100/70">
                      <span className="font-bold text-pink-300">💡 {isRtl ? 'التلميح:' : 'Clue:'} </span>
                      <span>{isRtl ? q.hint_ar : q.hint}</span>
                    </div>

                    {q.aliases && q.aliases.length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-pink-300/70 block mb-1">
                          {isRtl ? 'الأسماء المقبولة:' : 'Aliases:'}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {q.aliases.map((a, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-pink-500/10 border border-pink-400/20 text-[10px] text-pink-200"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setEditingZoomId(q.id)
                      setZoomForm({
                        image_url: q.image_url,
                        character_name: q.character_name,
                        character_name_ar: q.character_name_ar,
                        aliases: q.aliases.join(', '),
                        anime_origin: q.anime_origin,
                        anime_origin_ar: q.anime_origin_ar,
                        hint: q.hint,
                        hint_ar: q.hint_ar,
                        focus_point: q.focus_point || '50% 30%',
                        total_time_seconds: q.total_time_seconds,
                        base_points: q.base_points,
                      })
                      setShowZoomModal(true)
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-pink-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Edit2 size={13} />
                    <span>{isRtl ? 'تعديل' : 'Edit'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!confirm(isRtl ? 'حذف هذا السؤال من بنك الزووم؟' : 'Delete this zoom question?')) return
                      setZoomQuestions(prev => prev.filter(item => item.id !== q.id))
                      showFeedback(isRtl ? 'تم حذف السؤال من بنك الزووم' : 'Question removed from Zoom bank')
                    }}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: ADD/EDIT EVENT */}
      {/* ============================================================ */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-[#20102c] border-2 border-pink-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <h3 className="text-xl font-black text-white mb-4">
              {editingEventId
                ? (isRtl ? 'تعديل الفعالية 📅' : 'Edit Event 📅')
                : (isRtl ? 'إضافة فعالية جديدة 📅' : 'Add New Event 📅')}
            </h3>

            <form onSubmit={handleSaveEvent} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'عنوان الفعالية بالعربية' : 'Event Title (Arabic)'}
                </label>
                <input
                  type="text"
                  value={eventForm.title_ar}
                  onChange={e => setEventForm({ ...eventForm, title_ar: e.target.value })}
                  placeholder="مثال: ليلة الأنمي الأسطورية"
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'عنوان الفعالية بالإنجليزية' : 'Event Title (English)'}
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="e.g. Legendary Anime Night"
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'مكان الفعالية' : 'Venue'}
                  </label>
                  <input
                    type="text"
                    value={eventForm.venue}
                    onChange={e => setEventForm({ ...eventForm, venue: e.target.value })}
                    placeholder="Hall B"
                    className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  />
                </div>
                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'رمز تسجيل الحضور (Check-In Code)' : 'Check-In Code'}
                  </label>
                  <input
                    type="text"
                    value={eventForm.check_in_code}
                    onChange={e => setEventForm({ ...eventForm, check_in_code: e.target.value.toUpperCase() })}
                    placeholder="SAKURA"
                    className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white font-mono uppercase"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'وقت البدء' : 'Starts At'}
                </label>
                <input
                  type="datetime-local"
                  value={eventForm.starts_at}
                  onChange={e => setEventForm({ ...eventForm, starts_at: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="checkInToggle"
                  checked={eventForm.check_in_open}
                  onChange={e => setEventForm({ ...eventForm, check_in_open: e.target.checked })}
                  className="w-4 h-4 rounded text-pink-600 focus:ring-0"
                />
                <label htmlFor="checkInToggle" className="text-white font-bold cursor-pointer">
                  {isRtl ? 'فتح تسجيل الحضور فوراً للطلاب' : 'Open Check-in Immediately'}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 font-bold"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-extrabold shadow-lg"
                >
                  {isRtl ? 'حفظ الفعالية' : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: ADD STAMP */}
      {/* ============================================================ */}
      {showStampModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-[#20102c] border-2 border-pink-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <h3 className="text-xl font-black text-white mb-4">
              {isRtl ? 'إضافة ختم جديد للجواز 🎖️' : 'Create New Passport Stamp 🎖️'}
            </h3>

            <form onSubmit={handleSaveStamp} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'اسم الختم بالعربية' : 'Stamp Name (Arabic)'}
                </label>
                <input
                  type="text"
                  value={stampForm.name_ar}
                  onChange={e => setStampForm({ ...stampForm, name_ar: e.target.value })}
                  placeholder="مثال: فارس سبيستون"
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'اسم الختم بالإنجليزية' : 'Stamp Name (English)'}
                </label>
                <input
                  type="text"
                  value={stampForm.name}
                  onChange={e => setStampForm({ ...stampForm, name: e.target.value })}
                  placeholder="e.g. Spacetoon Knight"
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'الأيقونة (إيموجي)' : 'Icon Emoji'}
                  </label>
                  <input
                    type="text"
                    value={stampForm.icon_url}
                    onChange={e => setStampForm({ ...stampForm, icon_url: e.target.value })}
                    placeholder="🌸"
                    className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white text-xl text-center"
                    required
                  />
                </div>
                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'الندرة' : 'Rarity'}
                  </label>
                  <select
                    value={stampForm.rarity || 'common'}
                    onChange={e => setStampForm({ ...stampForm, rarity: e.target.value as PassportStamp['rarity'] })}
                    className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  >
                    {RARITIES.map(r => (
                      <option key={r.id} value={r.id}>
                        {isRtl ? r.label_ar : r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStampModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 font-bold"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-extrabold shadow-lg"
                >
                  {isRtl ? 'إنشاء الختم' : 'Save Stamp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: ADD QUIZ */}
      {/* ============================================================ */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-[#20102c] border-2 border-pink-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <h3 className="text-xl font-black text-white mb-4">
              {isRtl ? 'إنشاء حزمة كويز جديدة 📚' : 'Create Quiz 📚'}
            </h3>

            <form onSubmit={handleSaveQuiz} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'اسم الكويز بالعربية' : 'Quiz Title (Arabic)'}
                </label>
                <input
                  type="text"
                  value={quizForm.title_ar}
                  onChange={e => setQuizForm({ ...quizForm, title_ar: e.target.value })}
                  placeholder="مثال: تحدي أنمي الشتاء"
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'نوع النشاط' : 'Activity Type'}
                </label>
                <select
                  value={quizForm.activity_type}
                  onChange={e => setQuizForm({ ...quizForm, activity_type: e.target.value as ActivityType })}
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                >
                  {ACTIVITIES.map(a => (
                    <option key={a.id} value={a.id}>
                      {isRtl ? a.name_ar : a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowQuizModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 font-bold"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-extrabold shadow-lg"
                >
                  {isRtl ? 'حفظ الكويز' : 'Save Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: ADD ARABIC QUESTION TO QUIZ */}
      {/* ============================================================ */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl bg-[#20102c] border-2 border-pink-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8">
            <h3 className="text-xl font-black text-white mb-2">
              {isRtl ? 'إضافة سؤال جديد باللغة العربية 🌸' : 'Add New Question in Arabic 🌸'}
            </h3>
            <p className="text-xs text-pink-200/70 mb-4">
              {isRtl ? 'اكتب نص السؤال والخيارات بالعربية مع تحديد الإجابة الصحيحة' : 'Enter question text, 4 choices, and mark the correct option'}
            </p>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'نص السؤال بالعربية (الأساسي)' : 'Question Text in Arabic (Primary)'}
                </label>
                <textarea
                  value={questionForm.question_text_ar}
                  onChange={e => setQuestionForm({ ...questionForm, question_text_ar: e.target.value })}
                  placeholder="مثال: من هو بطل ون بيس الذي يحلم بأن يصبح ملك القراصنة؟"
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  required
                />
              </div>

              {/* 4 CHOICES */}
              <div className="space-y-2">
                <label className="block text-pink-200 font-bold">
                  {isRtl ? 'الخيارات الأربعة (حدد الإجابة الصحيحة):' : '4 Choices (Select Correct One):'}
                </label>

                {[
                  { key: 'optA_ar', label: 'A', idx: 0 },
                  { key: 'optB_ar', label: 'B', idx: 1 },
                  { key: 'optC_ar', label: 'C', idx: 2 },
                  { key: 'optD_ar', label: 'D', idx: 3 },
                ].map(item => (
                  <div key={item.key} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctChoice"
                      id={`correct_${item.idx}`}
                      checked={questionForm.correctIndex === item.idx}
                      onChange={() => setQuestionForm({ ...questionForm, correctIndex: item.idx })}
                      className="w-4 h-4 text-emerald-500 focus:ring-0"
                    />
                    <span className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-300 font-black flex items-center justify-center shrink-0">
                      {item.label}
                    </span>
                    <input
                      type="text"
                      value={questionForm[item.key as keyof typeof questionForm] as string}
                      onChange={e => setQuestionForm({ ...questionForm, [item.key]: e.target.value })}
                      placeholder={isRtl ? `الخيار ${item.label} بالعربية` : `Choice ${item.label} in Arabic`}
                      className="flex-1 p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white text-xs"
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'النقاط' : 'Points'}
                  </label>
                  <input
                    type="number"
                    value={questionForm.points}
                    onChange={e => setQuestionForm({ ...questionForm, points: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  />
                </div>
                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'وقت الإجابة (ثواني)' : 'Time Limit (Seconds)'}
                  </label>
                  <input
                    type="number"
                    value={questionForm.time_limit_seconds}
                    onChange={e => setQuestionForm({ ...questionForm, time_limit_seconds: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'تفسير الإجابة / معلومة إضافية تظهر عند الكشف' : 'Explanation on Reveal'}
                </label>
                <input
                  type="text"
                  value={questionForm.explanation_ar}
                  onChange={e => setQuestionForm({ ...questionForm, explanation_ar: e.target.value })}
                  placeholder="مثال: لوفي هو صاحب فاكهة الإله الشمسي نيكا"
                  className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 font-bold"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-extrabold shadow-lg"
                >
                  {isRtl ? 'حفظ السؤال في الكويز' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: ADD / EDIT ZOOM & GUESS QUESTION */}
      {/* ============================================================ */}
      {showZoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl bg-[#20102c] border-2 border-pink-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8">
            <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <span className="text-2xl">🔍</span>
              <span>
                {editingZoomId
                  ? (isRtl ? 'تعديل سؤال الزووم 🔍' : 'Edit Zoom Character Question 🔍')
                  : (isRtl ? 'إضافة سؤال زووم جديد 🔍' : 'Add New Zoom Character Question 🔍')}
              </span>
            </h3>
            <p className="text-xs text-pink-200/70 mb-4">
              {isRtl
                ? 'حدد رابط صورة الشخصية والإجابات المقبولة ونقطة تركيز التكبير'
                : 'Provide image URL, accepted answer aliases, and zoom focus point'}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                sound.playClick()

                const newQuestion: ZoomGuessQuestionData = {
                  id: editingZoomId || `zg-custom-${Date.now()}`,
                  image_url: zoomForm.image_url.trim() || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1000&auto=format&fit=crop',
                  character_name: zoomForm.character_name.trim(),
                  character_name_ar: zoomForm.character_name_ar.trim() || zoomForm.character_name.trim(),
                  aliases: zoomForm.aliases
                    .split(/[,،]/)
                    .map(a => a.trim())
                    .filter(Boolean),
                  anime_origin: zoomForm.anime_origin.trim() || 'Anime',
                  anime_origin_ar: zoomForm.anime_origin_ar.trim() || 'أنمي',
                  hint: zoomForm.hint.trim() || 'Anime character clue',
                  hint_ar: zoomForm.hint_ar.trim() || 'تلميح عن الشخصية',
                  focus_point: zoomForm.focus_point || '50% 30%',
                  total_time_seconds: Number(zoomForm.total_time_seconds) || 40,
                  base_points: Number(zoomForm.base_points) || 1000,
                }

                if (editingZoomId) {
                  setZoomQuestions(prev => prev.map(q => q.id === editingZoomId ? newQuestion : q))
                  showFeedback(isRtl ? 'تم تحديث السؤال بنجاح! 🔍' : 'Question updated! 🔍')
                } else {
                  setZoomQuestions(prev => [newQuestion, ...prev])
                  showFeedback(isRtl ? 'تمت إضافة السؤال لبنك الزووم! 🔍' : 'Zoom question added! 🔍')
                }

                setShowZoomModal(false)
                setEditingZoomId(null)
              }}
              className="space-y-4 text-xs sm:text-sm"
            >
              {/* Image URL & Live Preview */}
              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'رابط صورة الشخصية (URL)' : 'Character Image URL'}
                </label>
                <input
                  type="url"
                  value={zoomForm.image_url}
                  onChange={e => setZoomForm({ ...zoomForm, image_url: e.target.value })}
                  placeholder="https://example.com/character.jpg"
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white font-mono text-xs"
                  required
                />
                {zoomForm.image_url && (
                  <div className="mt-2 w-full h-32 rounded-2xl overflow-hidden border border-pink-400/30 bg-black flex items-center justify-center">
                    <img
                      src={zoomForm.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1000&auto=format&fit=crop'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Character Names in Arabic & English */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'اسم الشخصية بالعربية (الأساسي)' : 'Character Name (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={zoomForm.character_name_ar}
                    onChange={e => setZoomForm({ ...zoomForm, character_name_ar: e.target.value })}
                    placeholder="مثال: ناروتو أوزوماكي"
                    className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'اسم الشخصية بالإنجليزية' : 'Character Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={zoomForm.character_name}
                    onChange={e => setZoomForm({ ...zoomForm, character_name: e.target.value })}
                    placeholder="e.g. Naruto Uzumaki"
                    className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                    required
                  />
                </div>
              </div>

              {/* Accepted Aliases */}
              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'الأسماء والتهجئات المقبولة الأخرى (افصل بينها بفواصل)' : 'Accepted Aliases & Alternate Spellings (Comma separated)'}
                </label>
                <input
                  type="text"
                  value={zoomForm.aliases}
                  onChange={e => setZoomForm({ ...zoomForm, aliases: e.target.value })}
                  placeholder="ناروتو, اوزوماكي, Naruto, Uzumaki"
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                />
              </div>

              {/* Anime Origin in Arabic & English */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'اسم الأنمي بالعربية' : 'Anime Origin (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={zoomForm.anime_origin_ar}
                    onChange={e => setZoomForm({ ...zoomForm, anime_origin_ar: e.target.value })}
                    placeholder="مثال: ناروتو شيبودن"
                    className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  />
                </div>

                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'اسم الأنمي بالإنجليزية' : 'Anime Origin (English)'}
                  </label>
                  <input
                    type="text"
                    value={zoomForm.anime_origin}
                    onChange={e => setZoomForm({ ...zoomForm, anime_origin: e.target.value })}
                    placeholder="e.g. Naruto Shippuden"
                    className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  />
                </div>
              </div>

              {/* Clues */}
              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'التلميح بالعربية' : 'Clue / Hint (Arabic)'}
                </label>
                <input
                  type="text"
                  value={zoomForm.hint_ar}
                  onChange={e => setZoomForm({ ...zoomForm, hint_ar: e.target.value })}
                  placeholder="مثال: نينجا قرية كونوها صاحب عزيمة جبارة"
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                />
              </div>

              {/* Focus Point & Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'نقطة تركيز التكبير' : 'Zoom Focus Point'}
                  </label>
                  <select
                    value={zoomForm.focus_point}
                    onChange={e => setZoomForm({ ...zoomForm, focus_point: e.target.value })}
                    className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white text-xs"
                  >
                    <option value="50% 30%">Face & Eyes (50% 30%)</option>
                    <option value="50% 20%">Hair / Forehead (50% 20%)</option>
                    <option value="50% 50%">Center (50% 50%)</option>
                    <option value="35% 35%">Top-Left (35% 35%)</option>
                    <option value="65% 35%">Top-Right (65% 35%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'الوقت الإجمالي (ث)' : 'Total Time (s)'}
                  </label>
                  <input
                    type="number"
                    value={zoomForm.total_time_seconds}
                    onChange={e => setZoomForm({ ...zoomForm, total_time_seconds: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  />
                </div>

                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'النقاط القصوى' : 'Base Points'}
                  </label>
                  <input
                    type="number"
                    value={zoomForm.base_points}
                    onChange={e => setZoomForm({ ...zoomForm, base_points: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowZoomModal(false)
                    setEditingZoomId(null)
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 font-bold"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 text-white font-extrabold shadow-lg"
                >
                  {isRtl ? 'حفظ الشخصية في البنك' : 'Save Character'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
