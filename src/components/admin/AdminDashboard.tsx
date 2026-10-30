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
  Clock,
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
  WHOS_THAT_CHARACTER_QUESTIONS,
  SPACETOON_NOSTALGIA_QUESTIONS,
  ANIME_EXPERT_EXAM_QUESTIONS,
  AUDIO_GUESS_QUESTIONS,
  type ZoomGuessQuestionData,
  type QuizQuestionData,
  type AudioGuessQuestionData,
} from '@/lib/gameData'
import {
  Music,
  Headphones,
  Volume2,
  VolumeX,
} from 'lucide-react'

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
  { id: 'audio_guess', name: 'Audio & OST Guess', name_ar: 'خمّن الأوست والصوت 🎵', emoji: '🎵' },
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
  const [activeTab, setActiveTab] = useState<'sessions' | 'events' | 'stamps' | 'quizzes' | 'zoom_guess' | 'audio_guess'>('sessions')

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
    media_url: '',
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
    explanation: '',
  })

  // 4b. Interactive Questions Editor State (Who's That Character, Spacetoon Nostalgia, Anime Expert Exam)
  const [selectedQuizPkg, setSelectedQuizPkg] = useState<string>('spacetoon_nostalgia')
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [customQuestions, setCustomQuestions] = useState<Record<string, QuizQuestionData[]>>(() => {
    const initial: Record<string, QuizQuestionData[]> = {
      whos_that_character: WHOS_THAT_CHARACTER_QUESTIONS,
      spacetoon_nostalgia: SPACETOON_NOSTALGIA_QUESTIONS,
      anime_expert_exam: ANIME_EXPERT_EXAM_QUESTIONS,
    }
    if (typeof window !== 'undefined') {
      try {
        const pkgs = ['whos_that_character', 'spacetoon_nostalgia', 'anime_expert_exam']
        for (const p of pkgs) {
          const saved = localStorage.getItem(`sakura_custom_questions_${p}`)
          if (saved) {
            const parsed = JSON.parse(saved)
            if (Array.isArray(parsed) && parsed.length > 0) {
              initial[p] = parsed
            }
          }
        }
      } catch (e) {
        console.warn('Error reading quiz questions from localStorage:', e)
      }
    }
    return initial
  })

  // 4c. Audio & OST Guess Questions State
  const [audioQuestions, setAudioQuestions] = useState<AudioGuessQuestionData[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sakura_audio_guess_questions')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        }
      } catch (e) {
        console.warn('Error reading audio questions from localStorage:', e)
      }
    }
    return AUDIO_GUESS_QUESTIONS
  })
  const [showAudioModal, setShowAudioModal] = useState(false)
  const [editingAudioId, setEditingAudioId] = useState<string | null>(null)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const [audioForm, setAudioForm] = useState({
    title: '',
    title_ar: '',
    audio_url: '',
    answer: '',
    answer_ar: '',
    aliases: '',
    anime_origin: '',
    anime_origin_ar: '',
    hint: '',
    hint_ar: '',
    image_url: '',
    total_time_seconds: 30,
    base_points: 1000,
    hasOptions: true,
    optA_text: '',
    optA_text_ar: '',
    optB_text: '',
    optB_text_ar: '',
    optC_text: '',
    optC_text_ar: '',
    optD_text: '',
    optD_text_ar: '',
    correctIndex: 0,
  })

  // 5. Zoom & Guess Questions State (Persisted in localStorage & Supabase)
  const [zoomQuestions, setZoomQuestions] = useState<ZoomGuessQuestionData[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('sakura_zoom_guess_questions')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        }
      } catch (e) {
        console.warn('Error reading zoom questions from localStorage:', e)
      }
    }
    return ZOOM_GUESS_QUESTIONS
  })
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

  // Persistent save helper for Zoom & Guess questions
  const saveZoomQuestions = async (updatedList: ZoomGuessQuestionData[]) => {
    // 1. Immediately update React state
    setZoomQuestions(updatedList)

    // 2. Immediately persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sakura_zoom_guess_questions', JSON.stringify(updatedList))
      } catch (e) {
        console.warn('Failed to save zoom questions to localStorage:', e)
      }
    }

    // 3. Persist to Supabase in background (best effort, graceful fallback)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const dummyAdminId = '00000000-0000-0000-0000-000000000000'

      const { data: existing } = await supabase
        .from('quizzes')
        .select('id')
        .eq('activity_type', 'zoom_guess')
        .limit(1)

      if (existing && existing.length > 0) {
        await supabase
          .from('quizzes')
          .update({
            title: 'Zoom & Guess Master Bank',
            title_ar: 'بنك أسئلة خمن بالزووم',
            settings: { questions: updatedList } as unknown as import('@/types/database').Json,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing[0].id)
      } else {
        await supabase
          .from('quizzes')
          .insert({
            title: 'Zoom & Guess Master Bank',
            title_ar: 'بنك أسئلة خمن بالزووم',
            activity_type: 'zoom_guess',
            difficulty: 'mixed',
            status: 'published',
            settings: { questions: updatedList } as unknown as import('@/types/database').Json,
            created_by: user?.id || dummyAdminId,
          })
      }
    } catch (err) {
      console.warn('Could not sync zoom questions to Supabase (saved locally):', err)
    }
  }

  // Reset zoom questions to default curated set
  const handleResetZoomQuestions = () => {
    if (!confirm(isRtl ? 'هل تريد استعادة بنك أسئلة الزووم الافتراضي؟ ستفقد التعديلات المخصصة.' : 'Reset Zoom & Guess question bank to original defaults?')) return
    saveZoomQuestions(ZOOM_GUESS_QUESTIONS)
    showFeedback(isRtl ? 'تمت استعادة الأسئلة الافتراضية بنجاح 🌸' : 'Reset to curated defaults 🌸')
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

      // Try loading custom zoom questions from Supabase if present
      try {
        const { data: zoomQuizData } = await supabase
          .from('quizzes')
          .select('settings')
          .eq('activity_type', 'zoom_guess')
          .order('updated_at', { ascending: false })
          .limit(1)

        if (zoomQuizData && zoomQuizData.length > 0) {
          const remoteQs = (zoomQuizData[0].settings as any)?.questions
          if (Array.isArray(remoteQs) && remoteQs.length > 0) {
            setZoomQuestions(remoteQs)
            if (typeof window !== 'undefined') {
              localStorage.setItem('sakura_zoom_guess_questions', JSON.stringify(remoteQs))
            }
          }
        }
      } catch (e) {
        console.warn('Remote zoom questions load skipped:', e)
      }
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

      const settingsPayload: Record<string, unknown> = {
        question_index: 0,
        show_questions_on_device: true,
      }
      if (selectedActivity === 'zoom_guess') {
        settingsPayload.game_mode = 'zoom_guess'
        settingsPayload.zoom_questions = zoomQuestions
      }
      if (selectedActivity === 'draw_it_guess_it') {
        settingsPayload.game_mode = 'draw_it_guess_it'
        settingsPayload.round_duration = 60
      }
      if (selectedActivity === 'audio_guess') {
        settingsPayload.game_mode = 'audio_guess'
        settingsPayload.audio_questions = audioQuestions
      }
      if (['whos_that_character', 'spacetoon_nostalgia', 'anime_expert_exam'].includes(selectedActivity)) {
        settingsPayload.quiz_questions = customQuestions[selectedActivity] || []
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
      if (error && selectedActivity === 'audio_guess') {
        const fallbackRes = await supabase
          .from('game_sessions')
          .insert({
            activity_type: 'whos_that_character',
            room_pin: pin,
            status: 'lobby',
            host_id: user?.id || dummyAdminId,
            settings: { question_index: 0, game_mode: 'audio_guess', audio_questions: audioQuestions } as unknown as import('@/types/database').Json,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()
        newSess = fallbackRes.data
        error = fallbackRes.error
      }

      if (error && selectedActivity === 'zoom_guess') {
        const fallbackRes = await supabase
          .from('game_sessions')
          .insert({
            activity_type: 'whos_that_character',
            room_pin: pin,
            status: 'lobby',
            host_id: user?.id || dummyAdminId,
            settings: { question_index: 0, game_mode: 'zoom_guess', zoom_questions: zoomQuestions } as unknown as import('@/types/database').Json,
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

  // --- Quiz Questions Handlers ---
  const handleOpenAddQuestion = (pkgId: string) => {
    setSelectedQuizPkg(pkgId)
    setEditingQuestionId(null)
    setQuestionForm({
      question_text_ar: '',
      question_text: '',
      media_url: '',
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
      explanation: '',
    })
    setShowQuestionModal(true)
  }

  const handleOpenEditQuestion = (pkgId: string, q: QuizQuestionData) => {
    setSelectedQuizPkg(pkgId)
    setEditingQuestionId(q.id)
    const optA = q.options[0] || { text: '', text_ar: '', is_correct: false }
    const optB = q.options[1] || { text: '', text_ar: '', is_correct: false }
    const optC = q.options[2] || { text: '', text_ar: '', is_correct: false }
    const optD = q.options[3] || { text: '', text_ar: '', is_correct: false }
    const correctIdx = q.options.findIndex(o => o.is_correct)

    setQuestionForm({
      question_text_ar: q.question_text_ar || '',
      question_text: q.question_text || '',
      media_url: q.media_url || '',
      optA_ar: optA.text_ar || optA.text || '',
      optA_en: optA.text || '',
      optB_ar: optB.text_ar || optB.text || '',
      optB_en: optB.text || '',
      optC_ar: optC.text_ar || optC.text || '',
      optC_en: optC.text || '',
      optD_ar: optD.text_ar || optD.text || '',
      optD_en: optD.text || '',
      correctIndex: correctIdx >= 0 ? correctIdx : 0,
      points: q.points || 1000,
      time_limit_seconds: q.time_limit_seconds || 20,
      explanation_ar: q.explanation_ar || '',
      explanation: q.explanation || '',
    })
    setShowQuestionModal(true)
  }

  const handleSaveQuizQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    sound.playClick()

    const pkgId = selectedQuizPkg
    const currentList = customQuestions[pkgId] || []

    const formattedOptions = [
      { id: 'opt-a', text: questionForm.optA_en || questionForm.optA_ar, text_ar: questionForm.optA_ar || questionForm.optA_en, is_correct: questionForm.correctIndex === 0 },
      { id: 'opt-b', text: questionForm.optB_en || questionForm.optB_ar, text_ar: questionForm.optB_ar || questionForm.optB_en, is_correct: questionForm.correctIndex === 1 },
      { id: 'opt-c', text: questionForm.optC_en || questionForm.optC_ar, text_ar: questionForm.optC_ar || questionForm.optC_en, is_correct: questionForm.correctIndex === 2 },
      { id: 'opt-d', text: questionForm.optD_en || questionForm.optD_ar, text_ar: questionForm.optD_ar || questionForm.optD_en, is_correct: questionForm.correctIndex === 3 },
    ]

    let updatedList: QuizQuestionData[]
    if (editingQuestionId) {
      updatedList = currentList.map(item => {
        if (item.id === editingQuestionId) {
          return {
            ...item,
            question_text_ar: questionForm.question_text_ar.trim() || item.question_text_ar,
            question_text: questionForm.question_text.trim() || item.question_text,
            media_url: questionForm.media_url.trim() || undefined,
            time_limit_seconds: Number(questionForm.time_limit_seconds) || 20,
            points: Number(questionForm.points) || 1000,
            explanation_ar: questionForm.explanation_ar.trim() || undefined,
            explanation: questionForm.explanation.trim() || undefined,
            options: formattedOptions,
          }
        }
        return item
      })
    } else {
      const newQuestion: QuizQuestionData = {
        id: `custom-${pkgId}-${Date.now()}`,
        question_text_ar: questionForm.question_text_ar.trim() || 'سؤال ساكورا التفاعلي',
        question_text: questionForm.question_text.trim() || 'Sakura Quiz Question',
        question_type: questionForm.media_url ? 'image_question' : 'multiple_choice',
        media_url: questionForm.media_url.trim() || undefined,
        time_limit_seconds: Number(questionForm.time_limit_seconds) || 20,
        points: Number(questionForm.points) || 1000,
        explanation_ar: questionForm.explanation_ar.trim() || undefined,
        explanation: questionForm.explanation.trim() || undefined,
        options: formattedOptions,
      }
      updatedList = [...currentList, newQuestion]
    }

    setCustomQuestions(prev => ({ ...prev, [pkgId]: updatedList }))
    try {
      localStorage.setItem(`sakura_custom_questions_${pkgId}`, JSON.stringify(updatedList))
    } catch {}

    sound.playCorrect()
    showFeedback(isRtl ? 'تم حفظ السؤال وتحديث بنك الأسئلة بنجاح! 🌸' : 'Question saved and bank updated! 🌸')
    setShowQuestionModal(false)
  }

  const handleDeleteQuizQuestion = (pkgId: string, qId: string) => {
    if (!confirm(isRtl ? 'هل أنت متأكد من حذف هذا السؤال؟' : 'Delete this question?')) return
    sound.playClick()
    const currentList = customQuestions[pkgId] || []
    const updated = currentList.filter(item => item.id !== qId)
    setCustomQuestions(prev => ({ ...prev, [pkgId]: updated }))
    try {
      localStorage.setItem(`sakura_custom_questions_${pkgId}`, JSON.stringify(updated))
    } catch {}
    showFeedback(isRtl ? 'تم حذف السؤال' : 'Question deleted')
  }

  const handleResetQuizPackage = (pkgId: string) => {
    if (!confirm(isRtl ? 'استعادة الأسئلة الافتراضية الأصلية لهذه الحزمة؟' : 'Reset this quiz to original defaults?')) return
    sound.playClick()
    let defaults = WHOS_THAT_CHARACTER_QUESTIONS
    if (pkgId === 'spacetoon_nostalgia') defaults = SPACETOON_NOSTALGIA_QUESTIONS
    if (pkgId === 'anime_expert_exam') defaults = ANIME_EXPERT_EXAM_QUESTIONS

    setCustomQuestions(prev => ({ ...prev, [pkgId]: defaults }))
    try {
      localStorage.removeItem(`sakura_custom_questions_${pkgId}`)
    } catch {}
    showFeedback(isRtl ? 'تمت استعادة بنك الأسئلة الافتراضي' : 'Default questions restored')
  }

  // --- Audio Guess Handlers ---
  const handleOpenAddAudio = () => {
    setEditingAudioId(null)
    setAudioForm({
      title: 'Guess the anime from this theme song!',
      title_ar: 'خمّن الأنمي الشهير من هذا المقطع الصوتي!',
      audio_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Japanese_classical_music_flute.ogg',
      answer: '',
      answer_ar: '',
      aliases: '',
      anime_origin: '',
      anime_origin_ar: '',
      hint: '',
      hint_ar: '',
      image_url: '',
      total_time_seconds: 30,
      base_points: 1000,
      hasOptions: true,
      optA_text: '',
      optA_text_ar: '',
      optB_text: '',
      optB_text_ar: '',
      optC_text: '',
      optC_text_ar: '',
      optD_text: '',
      optD_text_ar: '',
      correctIndex: 0,
    })
    setShowAudioModal(true)
  }

  const handleOpenEditAudio = (q: AudioGuessQuestionData) => {
    setEditingAudioId(q.id)
    const optA = q.options?.[0] || { text: '', text_ar: '', is_correct: false }
    const optB = q.options?.[1] || { text: '', text_ar: '', is_correct: false }
    const optC = q.options?.[2] || { text: '', text_ar: '', is_correct: false }
    const optD = q.options?.[3] || { text: '', text_ar: '', is_correct: false }
    const correctIdx = q.options ? q.options.findIndex(o => o.is_correct) : 0

    setAudioForm({
      title: q.title,
      title_ar: q.title_ar,
      audio_url: q.audio_url,
      answer: q.answer,
      answer_ar: q.answer_ar,
      aliases: q.aliases ? q.aliases.join(', ') : '',
      anime_origin: q.anime_origin,
      anime_origin_ar: q.anime_origin_ar,
      hint: q.hint,
      hint_ar: q.hint_ar,
      image_url: q.image_url || '',
      total_time_seconds: q.total_time_seconds || 30,
      base_points: q.base_points || 1000,
      hasOptions: Array.isArray(q.options) && q.options.length > 0,
      optA_text: optA.text || '',
      optA_text_ar: optA.text_ar || '',
      optB_text: optB.text || '',
      optB_text_ar: optB.text_ar || '',
      optC_text: optC.text || '',
      optC_text_ar: optC.text_ar || '',
      optD_text: optD.text || '',
      optD_text_ar: optD.text_ar || '',
      correctIndex: correctIdx >= 0 ? correctIdx : 0,
    })
    setShowAudioModal(true)
  }

  const handleSaveAudioQuestion = (e: React.FormEvent) => {
    e.preventDefault()
    sound.playClick()

    const parsedAliases = audioForm.aliases
      .split(/[,،]/)
      .map(a => a.trim())
      .filter(Boolean)

    const options = audioForm.hasOptions
      ? [
          { id: 'opt-a', text: audioForm.optA_text || audioForm.optA_text_ar, text_ar: audioForm.optA_text_ar || audioForm.optA_text, is_correct: audioForm.correctIndex === 0 },
          { id: 'opt-b', text: audioForm.optB_text || audioForm.optB_text_ar, text_ar: audioForm.optB_text_ar || audioForm.optB_text, is_correct: audioForm.correctIndex === 1 },
          { id: 'opt-c', text: audioForm.optC_text || audioForm.optC_text_ar, text_ar: audioForm.optC_text_ar || audioForm.optC_text, is_correct: audioForm.correctIndex === 2 },
          { id: 'opt-d', text: audioForm.optD_text || audioForm.optD_text_ar, text_ar: audioForm.optD_text_ar || audioForm.optD_text, is_correct: audioForm.correctIndex === 3 },
        ]
      : undefined

    let updated: AudioGuessQuestionData[]
    if (editingAudioId) {
      updated = audioQuestions.map(item => {
        if (item.id === editingAudioId) {
          return {
            ...item,
            title: audioForm.title.trim() || item.title,
            title_ar: audioForm.title_ar.trim() || item.title_ar,
            audio_url: audioForm.audio_url.trim() || item.audio_url,
            answer: audioForm.answer.trim() || item.answer,
            answer_ar: audioForm.answer_ar.trim() || item.answer_ar,
            aliases: parsedAliases.length > 0 ? parsedAliases : item.aliases,
            anime_origin: audioForm.anime_origin.trim() || item.anime_origin,
            anime_origin_ar: audioForm.anime_origin_ar.trim() || item.anime_origin_ar,
            hint: audioForm.hint.trim() || item.hint,
            hint_ar: audioForm.hint_ar.trim() || item.hint_ar,
            image_url: audioForm.image_url.trim() || undefined,
            total_time_seconds: Number(audioForm.total_time_seconds) || 30,
            base_points: Number(audioForm.base_points) || 1000,
            options,
          }
        }
        return item
      })
    } else {
      const newAudioQ: AudioGuessQuestionData = {
        id: `ag-custom-${Date.now()}`,
        title: audioForm.title.trim() || 'Guess the anime from audio!',
        title_ar: audioForm.title_ar.trim() || 'خمّن الأنمي من المقطع الصوتي!',
        audio_url: audioForm.audio_url.trim(),
        answer: audioForm.answer.trim(),
        answer_ar: audioForm.answer_ar.trim() || audioForm.answer.trim(),
        aliases: parsedAliases,
        anime_origin: audioForm.anime_origin.trim(),
        anime_origin_ar: audioForm.anime_origin_ar.trim() || audioForm.anime_origin.trim(),
        hint: audioForm.hint.trim(),
        hint_ar: audioForm.hint_ar.trim() || audioForm.hint.trim(),
        image_url: audioForm.image_url.trim() || undefined,
        total_time_seconds: Number(audioForm.total_time_seconds) || 30,
        base_points: Number(audioForm.base_points) || 1000,
        options,
      }
      updated = [...audioQuestions, newAudioQ]
    }

    setAudioQuestions(updated)
    try {
      localStorage.setItem('sakura_audio_guess_questions', JSON.stringify(updated))
    } catch {}

    sound.playCorrect()
    showFeedback(isRtl ? 'تم حفظ المقطع الصوتي في بنك الأسئلة بنجاح! 🎵' : 'Audio track saved to question bank! 🎵')
    setShowAudioModal(false)
  }

  const handleDeleteAudioQuestion = (id: string) => {
    if (!confirm(isRtl ? 'هل أنت متأكد من حذف هذا المقطع الصوتي؟' : 'Delete this audio question?')) return
    sound.playClick()
    const updated = audioQuestions.filter(item => item.id !== id)
    setAudioQuestions(updated)
    try {
      localStorage.setItem('sakura_audio_guess_questions', JSON.stringify(updated))
    } catch {}
    showFeedback(isRtl ? 'تم حذف المقطع الصوتي' : 'Audio track deleted')
  }

  const handleResetAudioQuestions = () => {
    if (!confirm(isRtl ? 'استعادة المقاطع الصوتية الافتراضية الأصلية؟' : 'Reset to default audio tracks?')) return
    sound.playClick()
    setAudioQuestions(AUDIO_GUESS_QUESTIONS)
    try {
      localStorage.removeItem('sakura_audio_guess_questions')
    } catch {}
    showFeedback(isRtl ? 'تمت استعادة المقاطع الافتراضية' : 'Default audio tracks restored')
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
        explanation: '',
        media_url: '',
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
          { id: 'quizzes', label: isRtl ? '📚 بنك أسئلة الكويز' : '📚 Quizzes & Questions', count: Object.values(customQuestions).reduce((acc, l) => acc + l.length, 0) },
          { id: 'audio_guess', label: isRtl ? '🎵 خمّن الأوست والصوت' : '🎵 Audio & OST Guess', count: audioQuestions.length },
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
          {/* Quiz Package Selector */}
          <div className="p-4 rounded-3xl bg-black/40 border border-pink-500/20 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-bold text-pink-300 block mb-1">
                {isRtl ? 'اختر حزمة الكويز لتعديل أسئلتها:' : 'Select Quiz Package to Edit Questions:'}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'spacetoon_nostalgia', name: isRtl ? '📺 نوستالجيا سبيستون' : '📺 Spacetoon Nostalgia', count: customQuestions['spacetoon_nostalgia']?.length || 0 },
                  { id: 'whos_that_character', name: isRtl ? '🎭 من هذه الشخصية؟' : "🎭 Who's That Character?", count: customQuestions['whos_that_character']?.length || 0 },
                  { id: 'anime_expert_exam', name: isRtl ? '📚 اختبار خبير الأنمي' : '📚 Anime Expert Exam', count: customQuestions['anime_expert_exam']?.length || 0 },
                ].map(pkg => (
                  <button
                    key={pkg.id}
                    onClick={() => {
                      setSelectedQuizPkg(pkg.id)
                      sound.playClick()
                    }}
                    className={`px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                      selectedQuizPkg === pkg.id
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30'
                        : 'bg-white/5 text-pink-200/70 hover:bg-white/10'
                    }`}
                  >
                    <span>{pkg.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-black/40 text-[11px] font-mono">{pkg.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Package Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleResetQuizPackage(selectedQuizPkg)}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-pink-300 font-bold text-xs flex items-center gap-1.5 border border-pink-500/20 transition-colors"
                title={isRtl ? 'استعادة الأسئلة الافتراضية' : 'Reset to Curated Defaults'}
              >
                <RefreshCw size={14} />
                <span>{isRtl ? 'استعادة الافتراضي' : 'Reset Defaults'}</span>
              </button>

              <button
                onClick={() => handleOpenAddQuestion(selectedQuizPkg)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-pink-600/30"
              >
                <Plus size={16} />
                <span>{isRtl ? 'إضافة سؤال جديد 🌸' : 'Add Question 🌸'}</span>
              </button>
            </div>
          </div>

          {/* Active Questions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(customQuestions[selectedQuizPkg] || []).map((q, idx) => {
              const correctOpt = q.options.find(o => o.is_correct)
              return (
                <div
                  key={q.id}
                  className="p-5 rounded-3xl bg-black/40 border-2 border-pink-500/20 backdrop-blur-xl flex flex-col justify-between gap-4 hover:border-pink-400/40 transition-all shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono text-xs font-bold border border-pink-400/30">
                        #{idx + 1} • {q.points || 1000} PTS
                      </span>
                      <span className="text-xs text-amber-300 font-mono font-bold flex items-center gap-1">
                        <Clock size={13} />
                        <span>{q.time_limit_seconds || 20}s (Kahoot Speed)</span>
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-black text-white leading-snug">
                        {isRtl ? q.question_text_ar : q.question_text}
                      </h4>
                      {q.question_text && q.question_text !== q.question_text_ar && (
                        <p className="text-xs text-pink-200/60 mt-0.5">
                          {q.question_text}
                        </p>
                      )}
                    </div>

                    {/* 4 Options Preview */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={opt.id || optIdx}
                          className={`p-2 rounded-xl text-xs flex items-center justify-between gap-1.5 border ${
                            opt.is_correct
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                              : 'bg-white/5 border-white/5 text-gray-300'
                          }`}
                        >
                          <span className="truncate">{opt.text_ar || opt.text}</span>
                          {opt.is_correct && <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />}
                        </div>
                      ))}
                    </div>

                    {q.explanation_ar && (
                      <p className="text-[11px] text-pink-200/60 bg-white/5 p-2 rounded-xl border border-white/5">
                        <span className="font-bold text-pink-300">💡 {isRtl ? 'الملاحظة:' : 'Note:'} </span>
                        <span>{q.explanation_ar}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <button
                      onClick={() => handleOpenEditQuestion(selectedQuizPkg, q)}
                      className="px-3.5 py-1.5 rounded-xl bg-pink-600/30 hover:bg-pink-600/50 text-pink-200 font-bold text-xs flex items-center gap-1.5 border border-pink-400/30 transition-all"
                    >
                      <Edit2 size={13} />
                      <span>{isRtl ? 'تعديل السؤال' : 'Edit Question'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteQuizQuestion(selectedQuizPkg, q.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                      title={isRtl ? 'حذف السؤال' : 'Delete'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4B: AUDIO & OST GUESS QUESTIONS */}
      {/* ============================================================ */}
      {activeTab === 'audio_guess' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Music size={22} className="text-pink-400" />
                <span>{isRtl ? 'بنك مقاطع الصوت والأوست (Audio & OST Guess)' : 'Audio & OST Guess Bank'}</span>
              </h2>
              <p className="text-xs text-pink-200/70 mt-1">
                {isRtl
                  ? 'يستمع اللاعبون للمقطع الصوتي أو شارة البداية، ويخمنون الأنمي أو الأوست بأسرع ما يمكن!'
                  : 'Players listen to the audio track or OST, and race to guess the anime title for speed points!'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleResetAudioQuestions}
                className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 border border-pink-500/20 transition-colors"
                title={isRtl ? 'استعادة المقاطع الافتراضية' : 'Reset to Curated Defaults'}
              >
                <RefreshCw size={14} />
                <span>{isRtl ? 'استعادة الافتراضي' : 'Reset Defaults'}</span>
              </button>

              <button
                onClick={handleOpenAddAudio}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-pink-600/30"
              >
                <Plus size={16} />
                <span>{isRtl ? 'إضافة مقطع صوتي جديد 🎵' : 'Add Audio Track 🎵'}</span>
              </button>
            </div>
          </div>

          {/* Audio Tracks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {audioQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-3xl bg-black/40 border-2 border-pink-500/20 backdrop-blur-xl p-5 flex flex-col justify-between hover:border-pink-400/40 transition-all shadow-xl space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-pink-500/15">
                    <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono text-xs font-bold border border-pink-400/30">
                      Track #{idx + 1} • {q.base_points} PTS
                    </span>
                    <span className="text-xs text-amber-300 font-mono font-bold flex items-center gap-1">
                      <Clock size={13} />
                      <span>{q.total_time_seconds}s</span>
                    </span>
                  </div>

                  {/* Audio Player Bar */}
                  <div className="p-3 rounded-2xl bg-[#1d0b2e] border border-pink-500/20 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-pink-300 text-xs font-bold">
                        <Headphones size={15} />
                        <span>{isRtl ? 'استماع ومعاينة المقطع' : 'Audio Player Preview'}</span>
                      </div>
                    </div>
                    <audio controls src={q.audio_url} className="w-full h-8 mt-1" />
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-pink-400 tracking-wider">
                      {isRtl ? q.anime_origin_ar || q.anime_origin : q.anime_origin}
                    </span>
                    <h3 className="text-lg font-black text-white mt-0.5">
                      {isRtl ? q.answer_ar : q.answer}
                    </h3>
                    <div className="text-xs text-pink-200/70 font-semibold">
                      ({q.answer})
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-pink-100/70">
                    <span className="font-bold text-pink-300">💡 {isRtl ? 'التلميح:' : 'Clue:'} </span>
                    <span>{isRtl ? q.hint_ar : q.hint}</span>
                  </div>

                  {q.aliases && q.aliases.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-pink-300/70 block mb-1">
                        {isRtl ? 'الأسماء المقبولة:' : 'Accepted Aliases:'}
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

                {/* Actions */}
                <div className="p-2 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenEditAudio(q)}
                    className="px-3 py-1.5 rounded-xl bg-pink-600/30 hover:bg-pink-600/50 text-pink-200 font-bold text-xs flex items-center gap-1.5 border border-pink-400/30 transition-all"
                  >
                    <Edit2 size={13} />
                    <span>{isRtl ? 'تعديل المقطع' : 'Edit Track'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteAudioQuestion(q.id)}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                    title={isRtl ? 'حذف' : 'Delete'}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleResetZoomQuestions}
                className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 border border-pink-500/20 transition-colors"
                title={isRtl ? 'استعادة بنك الأسئلة الافتراضي' : 'Reset to Curated Defaults'}
              >
                <RefreshCw size={14} />
                <span>{isRtl ? 'استعادة الافتراضي' : 'Reset Defaults'}</span>
              </button>

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
                        aliases: Array.isArray(q.aliases) ? q.aliases.join(', ') : (q.aliases || ''),
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
                      const updated = zoomQuestions.filter(item => item.id !== q.id)
                      saveZoomQuestions(updated)
                      showFeedback(isRtl ? 'تم حذف السؤال وحفظ التغييرات 🗑️' : 'Question removed & saved 🗑️')
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
      {/* MODAL 4: ADD / EDIT QUIZ QUESTION */}
      {/* ============================================================ */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl bg-[#20102c] border-2 border-pink-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8">
            <h3 className="text-xl font-black text-white mb-2">
              {editingQuestionId
                ? (isRtl ? 'تعديل السؤال في بنك الأسئلة ✏️' : 'Edit Question in Bank ✏️')
                : (isRtl ? 'إضافة سؤال جديد لحزمة الكويز 🌸' : 'Add New Question to Quiz 🌸')}
            </h3>
            <p className="text-xs text-pink-200/70 mb-4">
              {isRtl ? 'اكتب نص السؤال بالعربية والإنجليزية مع تحديد الخيار الصحيح ونقاط السؤال' : 'Enter question text, options, and select the correct answer'}
            </p>

            <form onSubmit={handleSaveQuizQuestion} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'نص السؤال بالعربية (الأساسي)' : 'Question Text (Arabic - Primary)'}
                </label>
                <textarea
                  value={questionForm.question_text_ar}
                  onChange={e => setQuestionForm({ ...questionForm, question_text_ar: e.target.value })}
                  placeholder="مثال: في شارة أبطال الديجيتال، أكمل: في فخ غريب وقعنا.. في عالم الأرقام ____؟"
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'ترجمة السؤال بالإنجليزية (اختياري)' : 'Question Text (English - Optional)'}
                </label>
                <input
                  type="text"
                  value={questionForm.question_text}
                  onChange={e => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  placeholder="e.g. Complete the Digimon Adventure opening lyrics..."
                  className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                />
              </div>

              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'رابط الصورة التوضيحية (اختياري)' : 'Image / Media URL (Optional)'}
                </label>
                <input
                  type="url"
                  value={questionForm.media_url}
                  onChange={e => setQuestionForm({ ...questionForm, media_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                />
              </div>

              {/* 4 CHOICES */}
              <div className="space-y-2">
                <label className="block text-pink-200 font-bold">
                  {isRtl ? 'الخيارات الأربعة (حدد الدائرة بجانب الإجابة الصحيحة):' : '4 Choices (Select correct radio button):'}
                </label>

                {[
                  { arKey: 'optA_ar', enKey: 'optA_en', label: 'A', idx: 0 },
                  { arKey: 'optB_ar', enKey: 'optB_en', label: 'B', idx: 1 },
                  { arKey: 'optC_ar', enKey: 'optC_en', label: 'C', idx: 2 },
                  { arKey: 'optD_ar', enKey: 'optD_en', label: 'D', idx: 3 },
                ].map(item => (
                  <div key={item.arKey} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctChoice"
                      id={`correct_${item.idx}`}
                      checked={questionForm.correctIndex === item.idx}
                      onChange={() => setQuestionForm({ ...questionForm, correctIndex: item.idx })}
                      className="w-4 h-4 text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <span className={`w-7 h-7 rounded-lg font-black flex items-center justify-center shrink-0 ${
                      questionForm.correctIndex === item.idx
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'bg-pink-500/20 text-pink-300'
                    }`}>
                      {item.label}
                    </span>
                    <input
                      type="text"
                      value={questionForm[item.arKey as keyof typeof questionForm] as string}
                      onChange={e => setQuestionForm({ ...questionForm, [item.arKey]: e.target.value })}
                      placeholder={isRtl ? `الخيار ${item.label} بالعربية` : `Choice ${item.label} (Arabic)`}
                      className="flex-1 p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white text-xs"
                      required
                    />
                    <input
                      type="text"
                      value={questionForm[item.enKey as keyof typeof questionForm] as string}
                      onChange={e => setQuestionForm({ ...questionForm, [item.enKey]: e.target.value })}
                      placeholder={isRtl ? 'الإنجليزية (اختياري)' : 'English'}
                      className="w-1/3 p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'النقاط القصوى' : 'Max Points'}
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
                    {isRtl ? 'وقت الإجابة (ثواني - نظام كاهوت)' : 'Time Limit (Seconds)'}
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
                  placeholder="مثال: كلمات الأغنية الأسطورية من إبداع طارق العربي طرقان"
                  className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuestionModal(false)
                    setEditingQuestionId(null)
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 font-bold"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 text-white font-extrabold shadow-lg"
                >
                  {isRtl ? 'حفظ السؤال في البنك' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  const updated = zoomQuestions.map(q => q.id === editingZoomId ? newQuestion : q)
                  saveZoomQuestions(updated)
                  showFeedback(isRtl ? 'تم تحديث السؤال وحفظ التغييرات بنجاح! 🔍' : 'Question updated and saved! 🔍')
                } else {
                  const updated = [newQuestion, ...zoomQuestions]
                  saveZoomQuestions(updated)
                  showFeedback(isRtl ? 'تمت إضافة السؤال وحفظه في بنك الزووم! 🔍' : 'Zoom question added and saved! 🔍')
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
      {/* ============================================================ */}
      {/* MODAL 6: ADD / EDIT AUDIO & OST QUESTION */}
      {/* ============================================================ */}
      {showAudioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl bg-[#20102c] border-2 border-pink-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8">
            <h3 className="text-xl font-black text-white mb-2">
              {editingAudioId
                ? (isRtl ? 'تعديل مقطع الأوست والصوت 🎵' : 'Edit Audio Track 🎵')
                : (isRtl ? 'إضافة مقطع صوتي جديد للعبة 🎵' : 'Add New Audio Track 🎵')}
            </h3>
            <p className="text-xs text-pink-200/70 mb-4">
              {isRtl
                ? 'أدخل رابط المقطع الصوتي والإجابة الصحيحة مع أسماء الأنمي المقبولة'
                : 'Enter audio URL, anime answer, and accepted aliases'}
            </p>

            <form onSubmit={handleSaveAudioQuestion} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'رابط المقطع الصوتي (Audio URL - mp3/ogg/wav)' : 'Audio URL (Direct mp3/ogg link)'}
                </label>
                <input
                  type="url"
                  value={audioForm.audio_url}
                  onChange={e => setAudioForm({ ...audioForm, audio_url: e.target.value })}
                  placeholder="https://.../track.mp3"
                  className="w-full p-2.5 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  required
                />
                {audioForm.audio_url && (
                  <div className="mt-2 p-2 rounded-xl bg-black/40 border border-pink-500/20 flex flex-col gap-1">
                    <span className="text-[10px] text-pink-300 font-bold">{isRtl ? 'معاينة تجريبية للصوت:' : 'Live Audio Test:'}</span>
                    <audio controls src={audioForm.audio_url} className="w-full h-8" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'اسم الأنمي بالعربية (الإجابة الصحيحة)' : 'Anime Answer (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={audioForm.answer_ar}
                    onChange={e => setAudioForm({ ...audioForm, answer_ar: e.target.value })}
                    placeholder="مثال: المحقق كونان"
                    className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'اسم الأنمي بالإنجليزية' : 'Anime Answer (English)'}
                  </label>
                  <input
                    type="text"
                    value={audioForm.answer}
                    onChange={e => setAudioForm({ ...audioForm, answer: e.target.value })}
                    placeholder="e.g. Detective Conan"
                    className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'الأسماء المقبولة والتهجئات البديلة (افصل بينها بفواصل)' : 'Accepted Aliases (Comma-separated)'}
                </label>
                <input
                  type="text"
                  value={audioForm.aliases}
                  onChange={e => setAudioForm({ ...audioForm, aliases: e.target.value })}
                  placeholder="مثال: كونان, Detective Conan, Meitantei Conan"
                  className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'التصنيف / المنشأ بالعربية' : 'Category (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={audioForm.anime_origin_ar}
                    onChange={e => setAudioForm({ ...audioForm, anime_origin_ar: e.target.value })}
                    placeholder="مثال: أنمي غموض (سبيستون)"
                    className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  />
                </div>
                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'التصنيف بالإنجليزية' : 'Category (English)'}
                  </label>
                  <input
                    type="text"
                    value={audioForm.anime_origin}
                    onChange={e => setAudioForm({ ...audioForm, anime_origin: e.target.value })}
                    placeholder="e.g. Mystery Anime"
                    className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-pink-200 font-bold mb-1">
                  {isRtl ? 'التلميح بالعربية' : 'Clue / Hint (Arabic)'}
                </label>
                <input
                  type="text"
                  value={audioForm.hint_ar}
                  onChange={e => setAudioForm({ ...audioForm, hint_ar: e.target.value })}
                  placeholder="مثال: سينشي كودو والمتحرون الصغار"
                  className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'النقاط القصوى' : 'Base Points'}
                  </label>
                  <input
                    type="number"
                    value={audioForm.base_points}
                    onChange={e => setAudioForm({ ...audioForm, base_points: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  />
                </div>
                <div>
                  <label className="block text-pink-200 font-bold mb-1">
                    {isRtl ? 'وقت التخمين (ثواني)' : 'Time Limit (Seconds)'}
                  </label>
                  <input
                    type="number"
                    value={audioForm.total_time_seconds}
                    onChange={e => setAudioForm({ ...audioForm, total_time_seconds: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl bg-black/50 border border-pink-400/30 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowAudioModal(false)
                    setEditingAudioId(null)
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 font-bold"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 text-white font-extrabold shadow-lg"
                >
                  {isRtl ? 'حفظ المقطع الصوتي' : 'Save Audio Track'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
