'use client'

import { useRef, useEffect } from 'react'
import { Award, Download, X, Sparkles } from 'lucide-react'
import { sound } from '@/lib/sound'

interface SakuraCertificateModalProps {
  isOpen: boolean
  onClose: () => void
  participantName: string
  score: number
  eventPin?: string
  locale?: string
}

export default function SakuraCertificateModal({
  isOpen,
  onClose,
  participantName,
  score,
  eventPin = 'SAKURA-SU',
  locale = 'ar',
}: SakuraCertificateModalProps) {
  const isRtl = locale === 'ar'
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    drawCertificate()
  }, [isOpen, participantName, score, eventPin])

  const drawCertificate = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 1600
    const H = 1100
    canvas.width = W
    canvas.height = H

    // 1. Background gradient (Midnight luxury plum & deep obsidian)
    const bgGrad = ctx.createLinearGradient(0, 0, W, H)
    bgGrad.addColorStop(0, '#190a24')
    bgGrad.addColorStop(0.5, '#2a0e38')
    bgGrad.addColorStop(1, '#0e0414')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    // 2. Ornamental Japanese Borders
    ctx.strokeStyle = '#f472b6' // Sakura pink
    ctx.lineWidth = 6
    ctx.strokeRect(50, 50, W - 100, H - 100)

    ctx.strokeStyle = '#f59e0b' // Gold inner border
    ctx.lineWidth = 2
    ctx.strokeRect(65, 65, W - 130, H - 130)

    // Corner decorative accents
    const drawCorner = (x: number, y: number, angle: number) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle)
      ctx.strokeStyle = '#f472b6'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(40, 0)
      ctx.moveTo(0, 0)
      ctx.lineTo(0, 40)
      ctx.stroke()
      ctx.restore()
    }
    drawCorner(80, 80, 0)
    drawCorner(W - 80, 80, Math.PI / 2)
    drawCorner(W - 80, H - 80, Math.PI)
    drawCorner(80, H - 80, (Math.PI * 3) / 2)

    // 3. Header: University & Club
    ctx.textAlign = 'center'
    ctx.fillStyle = '#fbcfe8' // soft pink
    ctx.font = 'bold 36px sans-serif'
    ctx.fillText('جامعة صحار — SOHAR UNIVERSITY', W / 2, 160)

    ctx.fillStyle = '#f472b6'
    ctx.font = 'bold 26px sans-serif'
    ctx.fillText('نادي ساكورا للثقافة والأنمي • SAKURA CLUB', W / 2, 210)

    // Gold Divider
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(W / 2 - 250, 240)
    ctx.lineTo(W / 2 + 250, 240)
    ctx.stroke()

    // 4. Main Certificate Title
    ctx.fillStyle = '#ffffff'
    ctx.font = '900 64px sans-serif'
    ctx.fillText('شهادة تميز ومشاركة', W / 2, 340)

    ctx.fillStyle = '#fb7185'
    ctx.font = 'bold 30px sans-serif'
    ctx.fillText('CERTIFICATE OF PARTICIPATION & EXCELLENCE', W / 2, 395)

    // 5. Presentee intro
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '28px sans-serif'
    ctx.fillText('تُمنح هذه الشهادة بكل فخر لعضو نادي ساكورا المتميز:', W / 2, 490)

    // 6. Participant Nickname (Big, Glowing)
    ctx.fillStyle = '#fcd34d' // radiant gold
    ctx.font = '900 76px sans-serif'
    ctx.fillText(participantName || 'عضو ساكورا', W / 2, 600)

    // Decorative underline under name
    ctx.strokeStyle = '#f43f5e'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(W / 2 - 300, 630)
    ctx.lineTo(W / 2 + 300, 630)
    ctx.stroke()

    // 7. Achievement Statement & Score
    ctx.fillStyle = '#cbd5e1'
    ctx.font = '26px sans-serif'
    ctx.fillText(
      `لمشاركته الفعالة وحضوره المتميز في فعاليات نادي ساكورا الثقافية والترفيهية`,
      W / 2,
      700
    )

    ctx.fillStyle = '#34d399' // Emerald score
    ctx.font = 'bold 38px sans-serif'
    ctx.fillText(`مجموع النقاط المحققة: ${score} نقطة ⚡`, W / 2, 765)

    // 8. Seal and Signatures
    // Date & Room PIN
    ctx.textAlign = 'left'
    ctx.fillStyle = '#94a3b8'
    ctx.font = '22px sans-serif'
    const today = new Date().toLocaleDateString(isRtl ? 'ar-OM' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    ctx.fillText(`التاريخ: ${today}`, 150, 920)
    ctx.fillText(`رمز الغرفة: #${eventPin}`, 150, 960)

    // Club Seal Stamp (Right)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#f472b6'
    ctx.font = 'bold 24px sans-serif'
    ctx.fillText('إدارة نادي ساكورا 🌸', W - 150, 920)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '20px sans-serif'
    ctx.fillText('جامعة صحار — سلطنة عُمان', W - 150, 960)

    // Center Official Stamp Graphic
    ctx.save()
    ctx.translate(W / 2, 940)
    ctx.strokeStyle = '#f43f5e'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(0, 0, 55, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#f43f5e'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('ختم رسمي', 0, -8)
    ctx.fillText('SU CLUB', 0, 18)
    ctx.restore()
  }

  const handleDownload = () => {
    sound.playClick()
    const canvas = canvasRef.current
    if (!canvas) return
    const imageUri = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `Sakura_Club_Certificate_${participantName.replace(/\s+/g, '_')}.png`
    link.href = imageUri
    link.click()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#1d0c2b] border-2 border-pink-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-pink-200 transition-all"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <Award className="w-8 h-8 text-amber-400" />
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              {isRtl ? 'شهادة مشاركة وتميز لنادي ساكورا 🌸' : 'Sakura Club Certificate of Achievement 🌸'}
            </h3>
            <p className="text-xs text-pink-200/70">
              {isRtl ? 'جامعة صحار — احفظ شهادتك وافخر بمشاركتك!' : 'Sohar University — Download and share your achievement!'}
            </p>
          </div>
        </div>

        {/* Certificate Preview (responsive scaled canvas) */}
        <div className="w-full rounded-2xl overflow-hidden border-2 border-pink-500/30 shadow-2xl bg-black mb-6 flex items-center justify-center">
          <canvas ref={canvasRef} className="w-full h-auto max-h-[500px] object-contain" />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-pink-300 font-bold flex items-center gap-1.5">
            <Sparkles size={16} className="text-amber-400" />
            {isRtl ? 'صيغة عالية الدقة (HD PNG) صالحة للنشر في الستوري' : 'High-definition PNG ready for story sharing'}
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 font-bold text-sm"
            >
              {isRtl ? 'إغلاق' : 'Close'}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              <Download size={18} />
              <span>{isRtl ? 'تحميل الشهادة الآن 📥' : 'Download Certificate 📥'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

