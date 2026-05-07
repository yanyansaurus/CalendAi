'use client'
import { useEffect, useState, useCallback } from 'react'
import confetti from 'canvas-confetti'
import { 
  IconCheck, IconPlus, IconX, IconTrash, 
  IconCalendar, IconClipboard, IconTarget 
} from '@/components/Icons'

interface Task {
  id: string
  title: string
  description?: string
  priority: 'high' | 'medium' | 'low' | 'recreational'
  status: 'todo' | 'in_progress' | 'done'
  dueDate?: string
  createdAt: string
}

const PRIORITY_CONFIG = {
  high:         { label: 'High Priority',   color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  medium:       { label: 'Medium Priority',  color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  low:          { label: 'Low Priority',     color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  recreational: { label: 'Recreational',     color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
}

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState<Task['priority']>('medium')
  const [newDue, setNewDue] = useState('')
  const [filter, setFilter] = useState<'all' | Task['priority']>('all')

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks ?? [])
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, description: newDesc, priority: newPriority, dueDate: newDue || undefined }),
    })
    if (res.ok) {
      const data = await res.json()
      setTasks(data.tasks)
      setNewTitle('')
      setNewDesc('')
      setNewPriority('medium')
      setNewDue('')
      setShowAdd(false)
    }
  }

  const cycleStatus = async (task: Task) => {
    const next: Record<string, string> = { todo: 'in_progress', in_progress: 'done', done: 'todo' }
    const nextStatus = next[task.status]
    
    // Feature: Interactive Task Completion Fireworks 🎉
    if (nextStatus === 'done') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [PRIORITY_CONFIG[task.priority].color, '#ffffff', '#818cf8'],
        zIndex: 9999
      })
    }

    const res = await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id, status: nextStatus }),
    })
    if (res.ok) {
      const data = await res.json()
      setTasks(data.tasks)
    }
  }

  const handleDelete = async (taskId: string) => {
    const res = await fetch('/api/tasks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    })
    if (res.ok) {
      const data = await res.json()
      setTasks(data.tasks)
    }
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.priority === filter)

  const grouped = {
    high: filtered.filter(t => t.priority === 'high'),
    medium: filtered.filter(t => t.priority === 'medium'),
    low: filtered.filter(t => t.priority === 'low'),
    recreational: filtered.filter(t => t.priority === 'recreational'),
  }

  if (loading) {
    return (
      <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
          <div className="typing-dot" style={{ width: 10, height: 10 }} />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading tasks…</p>
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%' }} className="container-padding">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Task Board</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {tasks.length} tasks · {tasks.filter(t => t.status === 'done').length} completed
          </p>
        </div>
        <button className="btn-brand" onClick={() => setShowAdd(!showAdd)} style={{ fontSize: 13, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
          {showAdd ? <><IconX size={14} /> Close</> : <><IconPlus size={14} /> Add Task</>}
        </button>
      </div>

      {/* Add Task Form */}
      {showAdd && (
        <div className="glass" style={{ padding: 20, borderRadius: 14, marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              placeholder="Task title..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              style={{
                background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '10px 14px', color: 'var(--text)', fontSize: 14, outline: 'none',
              }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <input
              placeholder="Description (optional)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              style={{
                background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 14px', color: 'var(--text)', fontSize: 13, outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={newPriority}
                onChange={e => setNewPriority(e.target.value as Task['priority'])}
                style={{
                  background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none',
                }}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
                <option value="recreational">Recreational</option>
              </select>
              <input
                type="date"
                value={newDue}
                onChange={e => setNewDue(e.target.value)}
                style={{
                  background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none',
                }}
              />
              <button className="btn-brand" onClick={handleAdd} style={{ fontSize: 13, padding: '8px 20px', marginLeft: 'auto' }}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {(['all', 'high', 'medium', 'low', 'recreational'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: filter === f ? '1px solid var(--brand)' : '1px solid var(--border)',
              background: filter === f ? 'rgba(99,102,241,0.15)' : 'var(--surface-2)',
              color: filter === f ? 'var(--brand-light)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            {f === 'all' ? <><IconClipboard size={14} /> All</> : PRIORITY_CONFIG[f].label}
          </button>
        ))}
      </div>

      {/* Task Groups */}
      {(Object.entries(grouped) as [Task['priority'], Task[]][]).map(([priority, groupTasks]) => {
        if (groupTasks.length === 0) return null
        const config = PRIORITY_CONFIG[priority]
        return (
          <section key={priority} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: config.color }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: config.color }}>{config.label}</h3>
              <span style={{ fontSize: 11, color: 'var(--text-subtle)', marginLeft: 4 }}>({groupTasks.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groupTasks.map(task => (
                <div key={task.id} className="glass" style={{
                  padding: 14, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
                  borderLeft: `3px solid ${config.color}`,
                  opacity: task.status === 'done' ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}>
                  {/* Status toggle */}
                  <button
                    onClick={() => cycleStatus(task)}
                    style={{
                      width: 24, height: 24, borderRadius: 6, border: `2px solid ${config.color}`,
                      background: task.status === 'done' ? config.color : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, color: '#fff', flexShrink: 0, transition: 'all 0.15s',
                    }}
                  >
                    {task.status === 'done' ? <IconCheck size={14} /> : task.status === 'in_progress' ? <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid #fff`, borderRightColor: 'transparent', animation: 'spin 1s linear infinite' }} /> : ''}
                  </button>

                  {/* Task info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 600,
                      textDecoration: task.status === 'done' ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{task.title}</p>
                    {task.description && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{task.description}</p>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-subtle)' }}>
                        {STATUS_LABELS[task.status]}
                      </span>
                      {task.dueDate && (
                        <span style={{ fontSize: 10, color: 'var(--text-subtle)' }}>
                          <IconCalendar size={10} /> {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(task.id)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-subtle)',
                      cursor: 'pointer', fontSize: 14, padding: 4, flexShrink: 0,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => (e.target as HTMLElement).style.color = '#f87171'}
                    onMouseLeave={e => (e.target as HTMLElement).style.color = 'var(--text-subtle)'}
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <IconTarget size={48} color="var(--text-subtle)" />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {filter === 'all' ? 'No tasks yet. Click "+ Add Task" to get started!' : `No ${filter} priority tasks.`}
          </p>
        </div>
      )}
    </div>
  )
}
