"use server";
import { auth } from "@/lib/auth";
import { google } from "googleapis";
import { getGeminiModel, WEEKLY_ROUTINE_PROMPT } from "@/lib/gemini";

async function getUserCalendarEvents(accessToken: string, startDate: Date, endDate: Date) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });
  return res.data.items || [];
}

export async function analyzeWeeklyRoutine(userDetails?: string) {
  const session = await auth();
  if (!session?.user?.email || !session.googleAccessToken) {
    throw new Error("Unauthorized or Google Token missing");
  }

  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const events = await getUserCalendarEvents(session.googleAccessToken, now, weekLater);

  const model = getGeminiModel();

  let promptText = `${WEEKLY_ROUTINE_PROMPT}\n\nUser timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}\nCalendar events:\n${JSON.stringify(events, null, 2)}`;

  if (userDetails) {
    promptText += `\n\nUSER DETAILS PROVIDED: ${userDetails}\nGenerate the suggestedRoutine array of tasks based on these details.`;
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    generationConfig: { responseMimeType: "application/json" },
  });

  const response = JSON.parse(result.response.text());
  return response;
}
