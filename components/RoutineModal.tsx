"use client";
import { useState } from "react";
import { IconTrash, IconCheckCircle, IconArrowRight } from '@/components/Icons'

interface RoutineInput {
  wakeUp: string;
  sleep: string;
  breakfast: boolean;
  breakfastDuration: number;
  lunch: boolean;
  lunchDuration: number;
  dinner: boolean;
  dinnerDuration: number;
  exercise: boolean;
  exerciseDuration: number;
  grocery: boolean;
  groceryDuration: number;
  otherTasks: { name: string; duration: number }[];
}

interface Task {
  id: string;
  title: string;
  start: string;   // HH:MM
  duration: number; // minutes
  accepted: boolean;
}

export default function RoutineModal({ onClose, onSave }: { onClose: () => void; onSave: (tasks: Task[]) => void }) {
  const [step, setStep] = useState<"form" | "schedule">("form");
  const [isGenerating, setIsGenerating] = useState(false);
  const [routine, setRoutine] = useState<RoutineInput>({
    wakeUp: "07:00",
    sleep: "23:00",
    breakfast: true, breakfastDuration: 30,
    lunch: true, lunchDuration: 45,
    dinner: true, dinnerDuration: 45,
    exercise: true, exerciseDuration: 60,
    grocery: true, groceryDuration: 60,
    otherTasks: [],
  });
  const [generatedTasks, setGeneratedTasks] = useState<Task[]>([]);
  const [customTaskName, setCustomTaskName] = useState("");
  const [customTaskDuration, setCustomTaskDuration] = useState(30);

  // Generate schedule from routine inputs
  const generateSchedule = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(routine),
      });
      const tasks = await res.json();
      setGeneratedTasks(tasks.map((t: any) => ({ ...t, id: Date.now().toString() + Math.random(), accepted: true })));
      setStep("schedule");
    } catch (e) {
      console.error(e);
      alert("Failed to generate schedule.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleAccept = (id: string) => {
    setGeneratedTasks(prev => prev.map(t => t.id === id ? { ...t, accepted: !t.accepted } : t));
  };

  const addCustomTask = () => {
    if (customTaskName) {
      setGeneratedTasks(prev => [...prev, {
        id: Date.now().toString(),
        title: customTaskName,
        start: "12:00",
        duration: customTaskDuration,
        accepted: true,
      }]);
      setCustomTaskName("");
      setCustomTaskDuration(30);
    }
  };

  if (step === "form") {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="glass rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
          <h2 className="text-xl font-bold mb-4 text-[var(--text)]">Let's build your daily routine</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">We noticed your calendar is a bit empty. Set your preferences to auto-generate a structured day!</p>
          
          <div className="space-y-4 text-sm text-[var(--text)]">
            <div className="flex justify-between items-center bg-[var(--surface-3)] p-2 rounded">
              <label>Wake up time</label>
              <input type="time" value={routine.wakeUp} onChange={e => setRoutine({...routine, wakeUp: e.target.value})} className="border border-[var(--border)] bg-[var(--bg)] p-1 rounded outline-none" />
            </div>
            <div className="flex justify-between items-center bg-[var(--surface-3)] p-2 rounded">
              <label>Sleep time</label>
              <input type="time" value={routine.sleep} onChange={e => setRoutine({...routine, sleep: e.target.value})} className="border border-[var(--border)] bg-[var(--bg)] p-1 rounded outline-none" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-[var(--brand-light)] mt-4 mb-2">Meals & Habits</h3>
              <label className="flex items-center gap-3"><input type="checkbox" checked={routine.breakfast} onChange={e => setRoutine({...routine, breakfast: e.target.checked})} className="accent-[var(--brand)]" /> Breakfast <input type="number" disabled={!routine.breakfast} value={routine.breakfastDuration} onChange={e => setRoutine({...routine, breakfastDuration: +e.target.value})} className="w-16 border border-[var(--border)] bg-[var(--bg)] p-1 rounded ml-auto outline-none" /> min</label>
              <label className="flex items-center gap-3"><input type="checkbox" checked={routine.lunch} onChange={e => setRoutine({...routine, lunch: e.target.checked})} className="accent-[var(--brand)]" /> Lunch <input type="number" disabled={!routine.lunch} value={routine.lunchDuration} onChange={e => setRoutine({...routine, lunchDuration: +e.target.value})} className="w-16 border border-[var(--border)] bg-[var(--bg)] p-1 rounded ml-auto outline-none" /> min</label>
              <label className="flex items-center gap-3"><input type="checkbox" checked={routine.dinner} onChange={e => setRoutine({...routine, dinner: e.target.checked})} className="accent-[var(--brand)]" /> Dinner <input type="number" disabled={!routine.dinner} value={routine.dinnerDuration} onChange={e => setRoutine({...routine, dinnerDuration: +e.target.value})} className="w-16 border border-[var(--border)] bg-[var(--bg)] p-1 rounded ml-auto outline-none" /> min</label>
              <label className="flex items-center gap-3"><input type="checkbox" checked={routine.exercise} onChange={e => setRoutine({...routine, exercise: e.target.checked})} className="accent-[var(--brand)]" /> Exercise <input type="number" disabled={!routine.exercise} value={routine.exerciseDuration} onChange={e => setRoutine({...routine, exerciseDuration: +e.target.value})} className="w-16 border border-[var(--border)] bg-[var(--bg)] p-1 rounded ml-auto outline-none" /> min</label>
              <label className="flex items-center gap-3"><input type="checkbox" checked={routine.grocery} onChange={e => setRoutine({...routine, grocery: e.target.checked})} className="accent-[var(--brand)]" /> Grocery <input type="number" disabled={!routine.grocery} value={routine.groceryDuration} onChange={e => setRoutine({...routine, groceryDuration: +e.target.value})} className="w-16 border border-[var(--border)] bg-[var(--bg)] p-1 rounded ml-auto outline-none" /> min</label>
            </div>
          </div>
          
          <div className="flex justify-end mt-8 gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-[var(--border)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-2)] transition-colors">Skip</button>
            <button onClick={generateSchedule} disabled={isGenerating} className="btn-brand flex-1 flex justify-center py-2">
              {isGenerating ? "Generating..." : "Generate Schedule"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        <h2 className="text-xl font-bold mb-4 text-[var(--text)]">Your proposed daily schedule</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">Review, edit, and accept the blocks you want to add to your calendar.</p>
        
        <div className="space-y-3 mb-6">
          {generatedTasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 bg-[var(--surface-3)] p-3 rounded-lg border border-[var(--border)]">
              <input type="checkbox" checked={task.accepted} onChange={() => toggleAccept(task.id)} className="accent-[var(--brand)] w-4 h-4 cursor-pointer" />
              <input value={task.title} className="border border-[var(--border)] bg-[var(--bg)] p-1 rounded flex-1 text-sm outline-none text-[var(--text)]" onChange={e => setGeneratedTasks(prev => prev.map(t => t.id === task.id ? {...t, title: e.target.value} : t))} />
              <input type="time" value={task.start} className="border border-[var(--border)] bg-[var(--bg)] p-1 rounded w-24 text-sm outline-none text-[var(--text)]" onChange={e => setGeneratedTasks(prev => prev.map(t => t.id === task.id ? {...t, start: e.target.value} : t))} />
              <div className="flex items-center gap-1">
                <input type="number" value={task.duration} className="border border-[var(--border)] bg-[var(--bg)] p-1 rounded w-16 text-sm outline-none text-[var(--text)]" onChange={e => setGeneratedTasks(prev => prev.map(t => t.id === task.id ? {...t, duration: +e.target.value} : t))} />
                <span className="text-xs text-[var(--text-muted)]">min</span>
              </div>
              <button onClick={() => setGeneratedTasks(prev => prev.filter(t => t.id !== task.id))} className="text-red-400 hover:text-red-500 transition-colors ml-1" title="Remove"><IconTrash size={15} /></button>
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-2 mb-6 bg-[var(--surface-3)] p-3 rounded-lg border border-[var(--border)]">
          <input placeholder="New task name" value={customTaskName} onChange={e => setCustomTaskName(e.target.value)} className="border border-[var(--border)] bg-[var(--bg)] p-1.5 rounded flex-1 text-sm outline-none text-[var(--text)]" />
          <input type="number" value={customTaskDuration} onChange={e => setCustomTaskDuration(+e.target.value)} className="border border-[var(--border)] bg-[var(--bg)] p-1.5 rounded w-16 text-sm outline-none text-[var(--text)]" />
          <span className="text-xs text-[var(--text-muted)]">min</span>
          <button onClick={addCustomTask} className="bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--brand)] hover:text-white transition-colors px-3 py-1.5 rounded-lg text-sm font-semibold">+</button>
        </div>

        <div className="flex justify-end mt-4 gap-3">
          <button onClick={() => setStep("form")} className="px-4 py-2 border border-[var(--border)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-2)] transition-colors">Back</button>
          <button onClick={() => {
            const acceptedTasks = generatedTasks.filter(t => t.accepted);
            onSave(acceptedTasks);
          }} className="btn-brand px-6 py-2">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Save to Calendar <IconCheckCircle size={14} /></span>
          </button>
        </div>
      </div>
    </div>
  );
}
