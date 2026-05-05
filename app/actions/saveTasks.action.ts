"use server";
import { auth } from "@/lib/auth";
import { createCalendarEvent } from "@/lib/googleCalendar";

export async function saveTasksToCalendar(tasks: { title: string; start: string; duration: number }[]) {
  const session = await auth();
  if (!session?.googleAccessToken) throw new Error("Unauthorized");

  const now = new Date();
  // Using tomorrow's date for building the routine to not mess up today if it's already late
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + 1);
  const dateStr = targetDate.toISOString().slice(0, 10);

  for (const task of tasks) {
    const startDateTime = new Date(`${dateStr}T${task.start}:00`);
    const endDateTime = new Date(startDateTime.getTime() + task.duration * 60000);
    
    await createCalendarEvent(session.googleAccessToken, {
      title: task.title,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
    });
  }
  
  return { success: true };
}
