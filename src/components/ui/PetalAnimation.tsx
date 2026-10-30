'use client'

import { useEffect, useState } from 'react'

// Lightweight SVG petal component
function Petal({
  x,
  delay,
  duration,
  size,
  opacity,
}: {
  x: number
  delay: number
  duration: number
  size: number
  opacity: number
}) {
  return (
    <div
      aria-hidden="true"
      className="fixed pointer-events-none select-none"
      style={{
        left: `${x}%`,
        top: '-30px',
        fontSize: `${size}px`,
        animation: `petalFall ${duration}s ${delay}s linear infinite, petalSway ${duration * 0.7}s ${delay}s ease-in-out infinite`,
        opacity,
        zIndex: 0,
      }}
    >
      🌸
    </div>
  )
}

export default function PetalAnimation() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Only render on client, and only if reduced motion not requested
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!prefersReducedMotion) {
      setMounted(true)
    }
  }, [])

  if (!mounted) return null

  // Sparse, performance-friendly petal count
  const petals = [
    { x: 8, delay: 0, duration: 12, size: 14, opacity: 0.5 },
    { x: 22, delay: 3, duration: 16, size: 12, opacity: 0.4 },
    { x: 38, delay: 6, duration: 14, size: 10, opacity: 0.35 },
    { x: 55, delay: 2, duration: 18, size: 16, opacity: 0.45 },
    { x: 72, delay: 8, duration: 13, size: 11, opacity: 0.4 },
    { x: 88, delay: 4, duration: 15, size: 13, opacity: 0.35 },
  ]

  return (
    <>
      {petals.map((petal, i) => (
        <Petal key={i} {...petal} />
      ))}
    </>
  )
}
