import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import PetalAnimation from '@/components/ui/PetalAnimation'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Sakura — Where Anime Meets Japanese Culture',
    template: '%s | Sakura',
  },
  description:
    'Sakura is the official interactive platform for Japanese culture and anime club events. Live quizzes, team games, and a collectible digital passport.',
  keywords: ['anime', 'Japanese culture', 'Spacetoon', 'quiz', 'club events', 'sakura'],
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    apple: '/logo.png',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value ?? 'en'
  const isRtl = locale === 'ar'

  return (
    <html
      lang={locale}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+Arabic:wght@300;400;500;600;700;800;900&family=Noto+Sans+JP:wght@400;500;700;900&family=DM+Serif+Display:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <PetalAnimation />
        {children}
      </body>
    </html>
  )
}

