# 🌸 Sakura — Live Japanese Culture & Anime Club Platform

Sakura is a live, real-time interactive gaming and community platform designed for university Japanese culture and anime student clubs.

Attendees join live activities from their mobile phones via room PINs, while the organizer controls the game from a laptop connected to an event hall projector.

---

## ✨ Key Features

* **5 Interactive Game Modes:**
  1. 🎭 **Who's That Character?** — Dynamic silhouette and progressive reveal anime character identification.
  2. 📺 **Spacetoon Nostalgia** — Trivia celebrating golden-era 90s/2000s Arabic-dubbed anime (Venus Center dubs, iconic OSTs, APTX 4869).
  3. 📚 **Anime Expert Exam** — Timed multiple-choice tournament with speed bonuses and combo multipliers.
  4. ⚔️ **Sakura Feud** — Two-team survey showdown with face-offs, strikes, and steal rounds.
  5. 🎨 **Draw It, Guess It** — Live interactive canvas drawing with real-time guess feeds.
* **🌸 Digital Passport & Collectible Stamps:**
  * Persistent attendee passport profiles with unlockable titles and stamps.
  * Automatic stamp unlocks on event attendance, quiz wins, and check-ins.
* **🌐 Full Bilingual Experience:**
  * Native English and Arabic (RTL) support with localized terminology.
* **🖥️ Dual-Screen Architecture:**
  * **Projector View (`/projector/[id]`):** Big-screen visualizer displaying leaderboards, silhouettes, and feud boards.
  * **Host Controller (`/host/session/[id]`):** Live room management, round transitions, and score administration.
  * **Mobile Player View (`/play/[id]`):** Low-latency mobile participation and answer submission.
* **⚡ Live Real-Time Sync:**
  * Powered by Supabase Realtime subscriptions with server-authoritative scoring.

---

## 🛠️ Tech Stack

* **Framework:** Next.js 16 (App Router, Turbopack)
* **Styling:** Tailwind CSS v4 with custom Midnight Plum & Sakura Pink design system
* **Backend & Database:** Supabase (PostgreSQL, Realtime, Row Level Security)
* **Audio:** Web Audio API synth sound effects
* **Icons:** Lucide React

---

## 🚀 Getting Started

### 1. Prerequisites
* Node.js 18+
* A Supabase project

### 2. Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup
Paste the contents of `supabase/COMPLETE_SETUP.sql` into your [Supabase SQL Editor](https://supabase.com/dashboard) and click **RUN**.

### 4. Install & Run Dev Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🔑 Admin Access

* **Admin Portal:** `/admin`
* **Default Admin Email:** `admin@sakura.club`
* **Default Admin Password:** `SakuraAdmin2026!`

*(Any account registered with an email containing `admin` is automatically assigned super admin privileges).*
