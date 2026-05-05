# ExecutiveVAi - All-in-One AI Assistant

ExecutiveVAi is your comprehensive AI-powered executive assistant designed to handle scheduling, communication, and financial management. Originally built for the Codekada Hackathon, it transforms your daily workflow into a streamlined, high-integrity executive experience.

---

## 🌟 Key Features

### 1. Executive AI Chatbot (The Command Center)
- **Context-Aware Conversations**: A high-performance assistant that remembers your schedule, recent emails, and financial goals.
- **Natural Language Execution**: "Schedule a sync," "Check my budget," or "Draft a reply to John"—the AI parses intent and executes across multiple APIs.
- **Proactive Suggestions**: Offers "Suggested Answers" and quick-actions based on the current context of the conversation.

### 2. Routine Architect (AI Analyzer)
- **Weekly Time Analysis**: Analyzes your entire week's calendar to determine productivity scores and identify time-wasters.
- **Smart Routine Suggestions**: Scans for gaps in your schedule and suggests "Focus Blocks," "Deep Work," or "Administrative Time" to balance your routine.
- **Habit-Forming Guidance**: Identifies if you're missing lunch breaks or working too many back-to-back meetings and offers corrections.

### 3. Smart Calendar & Scheduling
- **Interactive Booking (Draft-First)**: Every scheduling request triggers an interactive UI card. Review, edit, and confirm titles or times before they hit your calendar.
- **Smart Conflict Resolution**: If you try to double-book, the AI halts the action, warns you of the conflict, and scans your calendar to suggest the nearest vacant time slot.
- **Timezone Precision**: Anchored to your specific local time (e.g., Asia/Manila). Daily briefings and free-slot calculations are accurate to your local 12 AM - 11:59 PM window.
- **Platform Choice**: Automatically asks "Zoom or Google Meet?" for every meeting request and provides one-tap selection buttons.

### 4. Intelligent Communication (Gatekeeping)
- **Inbox Triage**: AI-driven filter that sorts emails into categories like "Needs Immediate Action," "Read Later," and "Spam/Delegable."
- **Interactive Email Drafting**: Auto-drafts replies based on your personal tone and email context. Renders an interactive UI card where you can freely edit the *To*, *Subject*, and *Body* before sending.
- **Resilient Analysis**: Uses a multi-model failover system (Groq/Gemini) to ensure email summaries are always available, even under heavy API load.

### 5. Finance Engine (Track Finances)
- **Intelligent Receipt Scanning**: Uses Gemini Vision to extract structured data from receipts and invoices.
- **Human-in-the-Loop Verification**: Review, edit, and confirm extracted data before it persists to your budget.
- **Comprehensive Dashboard**: Track income, expenses, and savings with real-time budget limit alerts and category breakdowns.

---

## 🛠️ Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Authentication:** NextAuth.js
- **AI Intelligence:** 
  - **Primary:** Groq (Llama 3.3 70B, GPT-OSS 120B)
  - **Failover:** Google Gemini 3.1 Pro / Flash / Lite
- **Database:** Redis Labs (Persistent KV)
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

#### Install Prerequisites by OS

<details>
<summary>🍎 <b>macOS</b></summary>

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js & Git
brew install node git

# Verify
node -v && npm -v && git --version
```
</details>

<details>
<summary>🐧 <b>Linux (Ubuntu/Debian)</b></summary>

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Verify
node -v && npm -v && git --version
```
</details>

<details>
<summary>🪟 <b>Windows</b></summary>

```powershell
# Option 1: Download installers
# Node.js → https://nodejs.org/ (LTS recommended)
# Git     → https://git-scm.com/download/win

# Option 2: Install via winget (Windows 11)
winget install OpenJS.NodeJS.LTS
winget install Git.Git

# Verify (restart terminal after install)
node -v && npm -v && git --version
```
</details>

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
   Use Git Bash or Command Prompt:
   ```cmd
   git clone https://github.com/yanyansaurus/CalendAi.git
   cd CalendAi
   npm install
   ```
2. **Environment**:
   Manually copy `.env.example` to `.env.local` or use PowerShell:
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
- Add scopes: `meeting:write:admin`
- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`
- `ZOOM_ACCOUNT_ID`

### 3. Gemini & Groq AI
- Get your Gemini key from [Google AI Studio](https://aistudio.google.com/app/apikey).
- Get your Groq key from [console.groq.com](https://console.groq.com/keys).
- `GEMINI_API_KEY`
- `GROQ_API_KEY`

### 4. Database (Redis Labs)
- `calend_ai_kv_REDIS_URL`: Your Redis connection string.

### 5. NextAuth
- `NEXTAUTH_SECRET`: Generate using `openssl rand -base64 32`.
- `NEXTAUTH_URL`: `http://localhost:3000` (Local) or your production domain.

---

## 🏗️ Building for Production
```bash
npm run build
npm run start
```

---

## 📄 License
This project is licensed under the MIT License.
