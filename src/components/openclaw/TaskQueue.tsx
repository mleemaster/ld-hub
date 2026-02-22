/*
 * Task queue manager for OpenClaw.
 * Displays pending tasks with reorder/edit/delete, plus completed/failed history.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import TaskForm from "@/components/openclaw/TaskForm";

interface Task {
  _id: string;
  prompt: string;
  status: string;
  order: number;
  result?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function TaskQueue() {
  const [pending, setPending] = useState<Task[]>([]);
  const [history, setHistory] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/openclaw/tasks");
      const data = await res.json();
      setPending(data.pending || []);
      setHistory(data.history || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function handleCreate(prompt: string) {
    await fetch("/api/openclaw/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    await fetchTasks();
  }

  async function handleEdit(prompt: string) {
    if (!editingTask) return;
    await fetch(`/api/openclaw/tasks/${editingTask._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    setEditingTask(null);
    await fetchTasks();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/openclaw/tasks/${id}`, { method: "DELETE" });
    setDeletingId(null);
    await fetchTasks();
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const newList = [...pending];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newList.length) return;

    [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
    setPending(newList);

    await fetch("/api/openclaw/tasks/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskIds: newList.map((t) => t._id) }),
    });
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface-secondary p-6">
        <h3 className="text-sm font-medium text-text-secondary mb-4">Task Queue</h3>
        <p className="text-sm text-text-tertiary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-secondary p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-secondary">Task Queue</h3>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          Add Task
        </Button>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-text-tertiary">No pending tasks</p>
      ) : (
        <div className="space-y-2">
          {pending.map((task, i) => (
            <div
              key={task._id}
              className="flex items-center gap-2 py-2 px-3 rounded-xl bg-surface border border-border"
            >
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMove(i, "up")}
                  disabled={i === 0}
                  className="text-text-tertiary hover:text-text-primary disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => handleMove(i, "down")}
                  disabled={i === pending.length - 1}
                  className="text-text-tertiary hover:text-text-primary disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{task.prompt}</p>
                {task.status === "in_progress" && (
                  <span className="text-xs text-accent">In progress</span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setEditingTask(task)}
                  className="p-1.5 rounded-lg hover:bg-surface-tertiary text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                  </svg>
                </button>

                {deletingId === task._id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(task._id)}
                      className="px-2 py-1 rounded-lg bg-danger text-white text-xs cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-2 py-1 rounded-lg bg-surface-tertiary text-text-secondary text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeletingId(task._id)}
                    className="p-1.5 rounded-lg hover:bg-surface-tertiary text-text-tertiary hover:text-danger transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6">
          <h4 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
            History
          </h4>
          <div className="space-y-2">
            {history.map((task) => (
              <div
                key={task._id}
                className="py-2 px-3 rounded-xl bg-surface border border-border"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-text-secondary truncate">
                    {task.prompt}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        task.status === "completed"
                          ? "bg-success/10 text-success"
                          : "bg-danger/10 text-danger"
                      }`}
                    >
                      {task.status}
                    </span>
                    {task.completedAt && (
                      <span className="text-xs text-text-tertiary">
                        {timeAgo(task.completedAt)}
                      </span>
                    )}
                  </div>
                </div>
                {task.result && (
                  <p className="text-xs text-text-tertiary mt-1">{task.result}</p>
                )}
                {task.error && (
                  <p className="text-xs text-danger mt-1">{task.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleCreate}
      />

      <TaskForm
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleEdit}
        initialPrompt={editingTask?.prompt || ""}
        isEditing
      />
    </div>
  );
}
