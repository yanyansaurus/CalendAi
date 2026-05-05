import { NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const routine = await req.json();
    const model = getGeminiModel();
    const prompt = `
      You are an expert scheduling assistant. Based on the user's routine preferences:
      - Wake up: ${routine.wakeUp}
      - Sleep: ${routine.sleep}
      - Breakfast: ${routine.breakfast ? `${routine.breakfastDuration} min` : "none"}
      - Lunch: ${routine.lunch ? `${routine.lunchDuration} min` : "none"}
      - Dinner: ${routine.dinner ? `${routine.dinnerDuration} min` : "none"}
      - Exercise: ${routine.exercise ? `${routine.exerciseDuration} min` : "none"}
      - Grocery: ${routine.grocery ? `${routine.groceryDuration} min` : "none"}
      - Other tasks: ${routine.otherTasks && routine.otherTasks.length > 0 ? routine.otherTasks.map((t: any) => `${t.name} (${t.duration} min)`).join(", ") : "none"}
      
      Generate a realistic daily schedule from wake-up to bedtime. Place meals at typical times (e.g., breakfast after waking, lunch around 12-1pm, dinner around 6-7pm). Fit exercise, grocery, and other tasks into available gaps. 
      Output a JSON array of tasks, each with "title" (string), "start" (string, format HH:MM), "duration" (number in minutes). 
      Ensure the times flow chronologically and make logical sense.
      Only output valid JSON array format, with NO markdown code blocks. Example:
      [
        {"title": "Wake up & Breakfast", "start": "07:00", "duration": 30},
        {"title": "Morning Focus", "start": "09:00", "duration": 120}
      ]
    `;
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    const text = result.response.text();
    const tasks = JSON.parse(text);
    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error("Failed to generate schedule:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
