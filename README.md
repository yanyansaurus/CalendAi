# ExecutiveVAi - All-in-One AI Assistant

ExecutiveVAi is your comprehensive AI-powered executive assistant designed to handle scheduling, communication, and financial management. Originally built for the Codekada Hackathon, it transforms your daily workflow into a streamlined, high-integrity executive experience.

---

## 🌟 Key Features

### 1. Smart Calendar & Scheduling
- **Automated Booking**: Scans connected emails for meeting requests, cross-references availability, and confirms times.
- **Conflict Resolution**: Intelligent suggestions for prioritizing overlapping meetings and auto-drafting rescheduling emails.
- **Time-Blocking**: Automatically carves out "deep work" time or travel buffers between back-to-back appointments.

### 2. Intelligent Communication (Gatekeeping)
- **Inbox Triage**: AI-driven filter that sorts emails into categories like "Needs Immediate Action," "Read Later," and "Spam/Delegable."
- **Smart Drafting**: Auto-drafts replies based on your personal tone and conversation history.
- **Executive Summaries**: Distills long email threads into actionable bullet points.

### 3. Finance Engine (Track Finances)
- **Intelligent Receipt Scanning**: Uses Gemini Vision to extract structured data from receipts and invoices.
- **Human-in-the-Loop Verification**: Review, edit, and confirm extracted data before it persists to your budget.
- **Comprehensive Dashboard**: Track income, expenses, and savings with real-time budget limit alerts and category breakdowns.

---

## 🛠️ Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Authentication:** NextAuth.js
- **AI Integration:** Google Gemini 1.5 Flash (Vision + Chat)
- **Database:** Redis Labs (Persistent KV)
- **APIs:** Google Calendar, Gmail, Zoom
- **Styling:** Vanilla CSS & Tailwind CSS

---

## 🚀 Local Setup Guide

### 📋 Prerequisites
- **Node.js**: v18.0 or higher
- **npm**: v9.0 or higher
- **Redis**: A Redis Labs account (or a local instance)

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
   cp .env.local.example .env.local
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
   Manually copy `.env.local.example` to `.env.local` or use PowerShell:
   ```powershell
   copy .env.local.example .env.local
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

### 2. Zoom Integration (App Marketplace)
- Create an OAuth app.
- Add Redirect URI: `http://localhost:3000/api/auth/callback/zoom`
- Scopes: `meeting:write`, `meeting:write:admin`
- `ZOOM_CLIENT_ID`
- `***REMOVED***`

### 3. Gemini AI
- Get your key from [Google AI Studio](https://aistudio.google.com/app/apikey).
- `GEMINI_API_KEY`

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
