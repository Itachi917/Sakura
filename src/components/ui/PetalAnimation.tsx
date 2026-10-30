'use client'

import { useEffect, useState } from 'react'

// Different types of elements: petals, single leaves, blossoms
type ElementType = 'petal-pink' | 'petal-pale' | 'leaf-green' | 'blossom'

interface SakuraParticle {
  id: number
  x: number // percentage
  delay: number // seconds
  duration: number // seconds
  size: number // px
  opacity: number
  type: ElementType
  swayDuration: number
}

function SakuraSvg({ type, size }: { type: ElementType; size: number }) {
  if (type === 'leaf-green') {
    // Sakura tree green leaf
    return (
      <svg width={size} height={size * 1.5} viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 2C6 9 3 18 12 34C21 18 18 9 12 2Z"
          fill="url(#leafGrad)"
          stroke="#4ade80"
          strokeWidth="0.5"
        />
        <path d="M12 4V32M12 12L7 16M12 18L17 22M12 24L8 27" stroke="#22c55e" strokeWidth="0.6" strokeLinecap="round" opacity="0.6" />
        <defs>
          <linearGradient id="leafGrad" x1="12" y1="2" x2="12" y2="34" gradientUnits="userSpaceOnUse">
            <stop stopColor="#86efac" stopOpacity="0.85" />
            <stop offset="0.6" stopColor="#4ade80" stopOpacity="0.75" />
            <stop offset="1" stopColor="#16a34a" stopOpacity="0.6" />
          </linearGradient>
        </defs>
      </svg>
    )
  }

  if (type === 'blossom') {
    // Mini 5-petal cherry blossom flower
    return (
      <svg width={size * 1.4} height={size * 1.4} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g fill="url(#blossomGrad)">
          <path d="M16 16C16 11 13 8 16 4C19 8 16 11 16 16Z" />
          <path d="M16 16C21 15 24 12 27 15C24 18 21 17 16 16Z" />
          <path d="M16 16C19 20 20 24 18 27C15 24 16 20 16 16Z" />
          <path d="M16 16C13 21 11 24 8 23C8 19 12 17 16 16Z" />
          <path d="M16 16C11 14 7 13 7 9C11 9 13 13 16 16Z" />
        </g>
        <circle cx="16" cy="16" r="2.5" fill="#f43f5e" opacity="0.8" />
        <defs>
          <linearGradient id="blossomGrad" x1="7" y1="4" x2="27" y2="27" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fbcfe8" />
            <stop offset="1" stopColor="#f472b6" />
          </linearGradient>
        </defs>
      </svg>
    )
  }

  if (type === 'petal-pale') {
    // Delicate pale pink cherry petal with notch
    return (
      <svg width={size} height={size * 1.3} viewBox="0 0 20 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M10 1C6 3 2 9 3 17C4 22 8 25 10 25C12 25 16 22 17 17C18 9 14 3 10 1Z"
          fill="url(#palePetalGrad)"
        />
        <defs>
          <linearGradient id="palePetalGrad" x1="10" y1="1" x2="10" y2="25" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="0.5" stopColor="#fce7f3" stopOpacity="0.8" />
            <stop offset="1" stopColor="#fbcfe8" stopOpacity="0.75" />
          </linearGradient>
        </defs>
      </svg>
    )
  }

  // Classic vibrant sakura petal (default)
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 22 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M11 1C6.5 3.5 1.5 10.5 2.5 19C3.5 24.5 8 27.5 11 27.5C14 27.5 18.5 24.5 19.5 19C20.5 10.5 15.5 3.5 11 1ZM11 4C10.5 2.5 11.5 2.5 11 4Z"
        fill="url(#vibrantPetalGrad)"
      />
      <defs>
        <linearGradient id="vibrantPetalGrad" x1="11" y1="1" x2="11" y2="27.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbcfe8" stopOpacity="0.95" />
          <stop offset="0.6" stopColor="#f472b6" stopOpacity="0.85" />
          <stop offset="1" stopColor="#db2777" stopOpacity="0.75" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function PetalAnimation() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!prefersReducedMotion) {
      setMounted(true)
    }
  }, [])

  if (!mounted) return null

  // A lush distribution of 22 gently drifting sakura petals and leaves
  const particles: SakuraParticle[] = [
    { id: 1, x: 4, delay: 0.2, duration: 13, size: 18, opacity: 0.65, type: 'petal-pink', swayDuration: 4.5 },
    { id: 2, x: 12, delay: 3.5, duration: 16, size: 15, opacity: 0.5, type: 'leaf-green', swayDuration: 5.2 },
    { id: 3, x: 19, delay: 6.8, duration: 14, size: 17, opacity: 0.6, type: 'petal-pale', swayDuration: 4.8 },
    { id: 4, x: 27, delay: 1.5, duration: 18, size: 20, opacity: 0.7, type: 'blossom', swayDuration: 6.0 },
    { id: 5, x: 34, delay: 8.2, duration: 15, size: 14, opacity: 0.55, type: 'petal-pink', swayDuration: 4.2 },
    { id: 6, x: 42, delay: 4.1, duration: 17, size: 16, opacity: 0.45, type: 'leaf-green', swayDuration: 5.5 },
    { id: 7, x: 49, delay: 0.8, duration: 13.5, size: 19, opacity: 0.65, type: 'petal-pale', swayDuration: 4.6 },
    { id: 8, x: 57, delay: 5.4, duration: 15.5, size: 18, opacity: 0.6, type: 'petal-pink', swayDuration: 5.0 },
    { id: 9, x: 64, delay: 2.3, duration: 19, size: 21, opacity: 0.7, type: 'blossom', swayDuration: 6.2 },
    { id: 10, x: 71, delay: 7.6, duration: 14, size: 15, opacity: 0.5, type: 'leaf-green', swayDuration: 4.4 },
    { id: 11, x: 79, delay: 3.1, duration: 16.5, size: 18, opacity: 0.65, type: 'petal-pink', swayDuration: 5.1 },
    { id: 12, x: 86, delay: 9.0, duration: 14.5, size: 16, opacity: 0.55, type: 'petal-pale', swayDuration: 4.7 },
    { id: 13, x: 93, delay: 1.8, duration: 17.5, size: 19, opacity: 0.6, type: 'leaf-green', swayDuration: 5.8 },
    { id: 14, x: 8, delay: 10.2, duration: 15, size: 15, opacity: 0.45, type: 'petal-pink', swayDuration: 4.9 },
    { id: 15, x: 23, delay: 12.0, duration: 18, size: 17, opacity: 0.55, type: 'petal-pale', swayDuration: 5.3 },
    { id: 16, x: 38, delay: 11.1, duration: 16, size: 16, opacity: 0.6, type: 'petal-pink', swayDuration: 4.5 },
    { id: 17, x: 53, delay: 9.7, duration: 17, size: 18, opacity: 0.5, type: 'leaf-green', swayDuration: 5.6 },
    { id: 18, x: 68, delay: 13.4, duration: 15.5, size: 20, opacity: 0.65, type: 'blossom', swayDuration: 6.1 },
    { id: 19, x: 83, delay: 11.8, duration: 14, size: 15, opacity: 0.5, type: 'petal-pale', swayDuration: 4.3 },
    { id: 20, x: 96, delay: 6.2, duration: 16, size: 17, opacity: 0.6, type: 'petal-pink', swayDuration: 5.0 },
  ]

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
      style={{ perspective: '800px' }}
    >
      {particles.map(p => (
        <div
          key={p.id}
          className="fixed top-0"
          style={{
            left: `${p.x}%`,
            animation: `sakuraFall ${p.duration}s ${p.delay}s linear infinite`,
            willChange: 'transform, top, opacity',
            opacity: p.opacity,
          }}
        >
          <div
            style={{
              animation: `sakuraTumble ${p.swayDuration}s ease-in-out infinite alternate`,
              transformStyle: 'preserve-3d',
            }}
          >
            <SakuraSvg type={p.type} size={p.size} />
          </div>
        </div>
      ))}
    </div>
  )
}
