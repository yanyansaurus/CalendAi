# ExecutiveVAi - All-in-One AI Assistant

ExecutiveVAi is a production-grade, all-in-one AI command center designed to reclaim the executive's most valuable asset: **Time**. By unifying scheduling, communication, and financial oversight into a single, high-performance interface, it transforms the modern "daily grind" into a streamlined, automated experience.

---

## 🔗 Live Experience
**Experience the future of executive work live at:**
[**executive-vai-azure.vercel.app**](https://executive-vai-azure.vercel.app/)

---

## 🌟 Key Features

### 1. Executive AI Chatbot (The Command Center)
- **Context-Aware Conversations**: A high-performance assistant that remembers your schedule, recent emails, and financial goals.
- **Natural Language Execution**: "Schedule a sync," "Check my budget," or "Draft a reply to John"—the AI parses intent and executes across multiple APIs.
- **Resilience Bridge**: Optimized failover logic prioritizing Groq (Llama 3.3/3.1) for speed, with robust Gemini fallback to ensure 24/7 availability.

### 2. Routine Architect (AI Analyzer)
- **Weekly Time Analysis**: Analyzes your entire week's calendar to determine productivity scores and identify time-wasters.
- **Smart Routine Suggestions**: Scans for gaps in your schedule and suggests "Focus Blocks," "Deep Work," or "Administrative Time."
- **Habit-Forming Guidance**: Identifies missing breaks or back-to-back meeting fatigue and offers corrections.

### 3. Smart Calendar & Scheduling
- **Interactive Booking (Draft-First)**: Every scheduling request triggers an interactive UI card. Review, edit, and confirm before they hit your calendar.
- **Smart Conflict Resolution**: AI warns you of conflicts and scans your calendar to suggest the nearest vacant time slot.
- **Timezone Precision**: Anchored to your local time (e.g., Asia/Manila) for accurate briefings and slot calculations.

### 4. Intelligent Communication (Gatekeeping)
- **Inbox Triage**: Sorts emails into "Needs Immediate Attention," "Read Later," and "Can Wait."
- **Mark as Read Sync**: "Dismissing" an email in the dashboard automatically marks it as **READ** in your actual Gmail inbox.
- **Read All Button**: Clear your entire dashboard summary with a single click—batch-processing unread labels instantly with celebratory confetti feedback.
- **Dynamic Scanning UI**: Real-time status updates ("Analyzing priorities...", "Categorizing requests...") make the AI analysis transparent and engaging.

### 5. Finance Engine (Track Finances)
- **Intelligent Receipt Scanning**: Uses Gemini Vision to extract structured data from receipts and invoices.
- **Human-in-the-Loop Verification**: Review, edit, and confirm extracted data before it persists to your budget.
- **Comprehensive Dashboard**: Track income, expenses, and savings with real-time budget limit alerts.

---

## 🛠️ Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Authentication:** NextAuth.js
- **AI Intelligence:** 
  - **Primary:** Groq (Llama 3.3 70B, Llama 3.1 70B/8B, Gemma2 9B)
  - **Failover:** Google Gemini Pro / Flash
- **Database:** Redis Labs (Persistent KV with 2s hardened connection timeout)
- **APIs:** Google Calendar, Gmail, Zoom
- **Styling:** Vanilla CSS & Tailwind CSS

---

## 🚀 Local Setup Guide

### 📋 Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | v18.0+ | [nodejs.org](https://nodejs.org/) |
| **npm** | v9.0+ | *(included with Node.js)* |
| **Git** | latest | [git-scm.com](https://git-scm.com/) |
| **Redis** | — | [Redis Labs (cloud)](https://redis.com/try-free/) or local |

---

### 💻 Platform Specifics

#### **macOS & Linux**
1. **Clone & Install**:
   ```bash
   git clone https://github.com/yanyansaurus/CalendAi.git
   cd CalendAi
   npm install
   ```
2. **Environment**:
   ```bash
   cp .env.example .env.local
   ```
3. **Run**:
   ```bash
   npm run dev
   ```

#### **Windows**
1. **Clone & Install**:
   ```cmd
   git clone https://github.com/yanyansaurus/CalendAi.git
   cd CalendAi
   npm install
   ```
2. **Environment**:
   ```powershell
   copy .env.example .env.local
   ```
3. **Run**:
   ```cmd
   npm run dev
   ```

---

## ⚙️ Configuration (Environment Variables)

Fill in the following in your `.env.local`:

### 1. Google Integration (Cloud Console)
- Enable **Google Calendar API** and **Gmail API**.
- Add Redirect URI: `http://localhost:3000/api/auth/callback/google`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### 2. Zoom Integration (Server-to-Server OAuth)
- Go to [marketplace.zoom.us](https://marketplace.zoom.us/) → Build App → **Server-to-Server OAuth**
- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`
- `ZOOM_ACCOUNT_ID`

### 3. AI Intelligence
- Get Gemini key from [Google AI Studio](https://aistudio.google.com/app/apikey). (Ensure **Generative Language API** is enabled)
- Get Groq key from [console.groq.com](https://console.groq.com/keys).
- `GEMINI_API_KEY`
- `GROQ_API_KEY`

### 4. Database (Redis)
- `calend_ai_kv_REDIS_URL`: Your Redis-compatible connection string.

### 5. NextAuth
- `NEXTAUTH_SECRET`: Generate using `openssl rand -base64 32`.
- `NEXTAUTH_URL`: `http://localhost:3000`

---

## 🏗️ Building for Production
```bash
npm run build
npm run start
```

---

## 📄 License
This project is licensed under the MIT License.
