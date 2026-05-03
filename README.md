# MeetMate - AI Executive Assistant

MeetMate is an AI-powered executive assistant that lets you manage your Google Meet and Zoom calendar via chat. Built for the Codekada Hackathon.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Authentication:** NextAuth.js
- **AI Integration:** Google Gemini AI
- **Database / Cache:** Vercel KV (Redis)
- **External APIs:** Google Calendar API, Zoom API
- **Styling:** Tailwind CSS

## Prerequisites
- Node.js (v18 or higher recommended)
- npm, yarn, or pnpm

## Installation

1. Clone the repository and navigate into the project directory.
2. Install the dependencies:

```bash
npm install
```

*(Note: Since a `package-lock.json` is present, `npm` is the recommended package manager.)*

## Environment Setup

1. Copy the example environment file to `.env.local`:

```bash
cp .env.local.example .env.local
```

2. Fill in the required environment variables in `.env.local`:

### Google OAuth & Calendar
- Go to [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
- Enable the **Google Calendar API**.
- Configure the OAuth consent screen and add the scope: `https://www.googleapis.com/auth/calendar`
- Create OAuth 2.0 Client ID credentials (Web application) and add `http://localhost:3000/api/auth/callback/google` to the authorized redirect URIs.
- Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Zoom OAuth
- Go to the [Zoom App Marketplace](https://marketplace.zoom.us/) and click "Build App" → OAuth.
- Add redirect URI: `http://localhost:3000/api/auth/callback/zoom`
- Add the required scopes: `meeting:write`, `meeting:write:admin`
- Set `ZOOM_CLIENT_ID` and `***REMOVED***`.

### Gemini AI
- Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).
- Set `GEMINI_API_KEY`.

### NextAuth Setup
- Generate a random secret for NextAuth:
```bash
openssl rand -base64 32
```
- Set `NEXTAUTH_SECRET` to the generated value.
- Ensure `NEXTAUTH_URL` is set to `http://localhost:3000` (for local development).

### Vercel KV Database
- Go to your Vercel Dashboard → Storage → Create a KV database.
- Copy the provided environment variables and paste them into your `.env.local`:
  - `KV_URL`
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`
  - `KV_REST_API_READ_ONLY_TOKEN`

## Running the Application

Once your dependencies are installed and `.env.local` is fully configured:

1. Start the development server:

```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) with your browser to use MeetMate.

## Building for Production

To create an optimized production build:

```bash
npm run build
npm run start
```
