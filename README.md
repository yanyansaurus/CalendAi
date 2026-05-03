# CalendAI
# MeetMate - AI Executive Assistant

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?logo=google)](https://deepmind.google/technologies/gemini/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**MeetMate** is an AI‑powered executive assistant that lets you manage your Google Meet and Zoom calendar via chat.  
Built for the **Codekada Hackathon**.

---

## 📚 Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Platform-specific Setup](#platform-specific-setup)
  - [Windows](#windows)
  - [macOS](#macos)
  - [Linux (Ubuntu/Debian)](#linux-ubuntudebian)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Running the Application](#running-the-application)
- [Building for Production](#building-for-production)

---

## Tech Stack

| Category          | Technology                                      |
|-------------------|-------------------------------------------------|
| Framework         | Next.js (App Router)                            |
| Authentication    | NextAuth.js                                     |
| AI Integration    | Google Gemini AI                                |
| Database / Cache  | Vercel KV (Redis)                               |
| External APIs     | Google Calendar API, Zoom API                   |
| Styling           | Tailwind CSS                                    |

---

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js) – or `yarn` / `pnpm`
- **Git** (to clone the repository)

---

## Platform-specific Setup

Install Node.js and Git on your operating system.

### Windows

1. **Node.js**  
   - Download the official Windows installer (LTS version) from [nodejs.org](https://nodejs.org/).  
   - Run the installer. **Important:** Check the option *“Automatically install the necessary tools”*.  
   - After installation, open a new **Command Prompt** or **PowerShell** and verify:
     ```cmd
     node --version
     npm --version
