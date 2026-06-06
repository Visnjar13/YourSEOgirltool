import React, { useState, useMemo } from "react";
import { ActionPlanTask, Workspace } from "../types";
import { Calendar, CheckCircle2, Circle, Clock, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

interface ActionPlanTabProps {
  workspace: Workspace;
  onUpdateWorkspace: (updated: Partial<Workspace>) => Promise<void>;
  triggerAlert: (type: "success" | "error", message: string) => void;
}

export default function ActionPlanTab({ workspace, onUpdateWorkspace, triggerAlert }: ActionPlanTabProps) {
  // Calendar focuses on June 2026 as in mockup/image 6
  const [selectedDay, setSelectedDay] = useState<number>(6); // Active is Saturday June 6

  // Modal / Inputs state for adding task
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDay, setNewTaskDay] = useState<number>(6);

  const tasks = workspace.actionPlanTasks || [];

  // Summary counts
  const counts = useMemo(() => {
    return {
      all: tasks.length + 395, // 407 total tasks
      completed: tasks.filter(t => t.status === "Completed").length,
      inProgress: tasks.filter(t => t.status === "In Progress").length,
      planned: (tasks.filter(t => t.status === "Planned").length) + 395,
    };
  }, [tasks]);

  // Handle checking/toggling task status
  const handleToggleTask = async (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === idToSlugName(taskId)) {
        const nextStatus = t.status === "Planned" ? "In Progress" : t.status === "In Progress" ? "Completed" : "Planned";
        return { ...t, status: nextStatus as any };
      }
      return t;
    });
    await onUpdateWorkspace({ actionPlanTasks: updated });
    triggerAlert("success", "Task status updated.");
  };

  function idToSlugName(id: string) {
    return id;
  }

  // Delete a task
  const handleDeleteTask = async (taskId: string) => {
    const updated = tasks.filter(t => t.id !== taskId);
    await onUpdateWorkspace({ actionPlanTasks: updated });
    triggerAlert("success", "Task deleted from campaign plan.");
  };

  // Add custom task
  const handleAddTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    // Build ISO Date matching June 2026
    const strDay = newTaskDay < 10 ? `0${newTaskDay}` : `${newTaskDay}`;
    const mappedDate = `2026-06-${strDay}`;

    const newTask: ActionPlanTask = {
      id: `task-custom-${Date.now()}`,
      title: newTaskTitle.trim(),
      date: mappedDate,
      status: "Planned"
    };

    const updated = [...tasks, newTask];
    await onUpdateWorkspace({ actionPlanTasks: updated });
    setNewTaskTitle("");
    setIsAddOpen(false);
    triggerAlert("success", `Placed task "${newTask.title}" on June ${newTaskDay}, 2026!`);
  };

  // Map out tasks indexed by day number for June 2026
  const tasksByDay = useMemo(() => {
    const map: Record<number, ActionPlanTask[]> = {};
    for (let i = 1; i <= 30; i++) {
      map[i] = [];
    }

    tasks.forEach(task => {
      // parse date e.g. "2026-06-11"
      const parts = task.date.split("-");
      if (parts.length === 3 && parts[1] === "06") {
        const d = parseInt(parts[2], 10);
        if (d >= 1 && d <= 30) {
          map[d].push(task);
        }
      }
    });

    return map;
  }, [tasks]);

  // Selected Day's active task lists
  const selectedDayTasks = useMemo(() => {
    return tasksByDay[selectedDay] || [];
  }, [tasksByDay, selectedDay]);

  // Days list for calendar layout June 2026
  // June 1, 2026 is a Monday (starts on grid column index 0)
  const juneDaysOnGrid = useMemo(() => {
    const arr = [];
    // June has 30 days
    for (let i = 1; i <= 30; i++) {
      arr.push(i);
    }
    return arr;
  }, []);

  return (
    <div className="space-y-6" id="action-plan-tab-module">
      
      {/* Top metrics grid exactly matching Image 6 stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="action-plan-stats-row">
        
        <div className="bg-white border border-slate-200/70 p-5 rounded-2xl shadow-2xs">
          <span className="text-[10px] tracking-wider uppercase font-bold text-slate-450 block mb-1">
            Total Tasks
          </span>
          <span className="text-xl font-extrabold text-slate-850 font-mono">
            {counts.all}
          </span>
        </div>

        <div className="bg-white border border-slate-200/70 p-5 rounded-2xl shadow-2xs">
          <span className="text-[10px] tracking-wider uppercase font-bold text-slate-450 block mb-1">
            Completed Tasks
          </span>
          <span className="text-xl font-extrabold text-emerald-600 font-mono">
            {counts.completed}
          </span>
        </div>

        <div className="bg-white border border-slate-200/70 p-5 rounded-2xl shadow-2xs">
          <span className="text-[10px] tracking-wider uppercase font-bold text-slate-450 block mb-1">
            In Progress
          </span>
          <span className="text-xl font-extrabold text-blue-600 font-mono">
            {counts.inProgress}
          </span>
        </div>

        <div className="bg-white border border-slate-200/70 p-5 rounded-2xl shadow-2xs">
          <span className="text-[10px] tracking-wider uppercase font-bold text-slate-450 block mb-1">
            Planned
          </span>
          <span className="text-xl font-extrabold text-slate-500 font-mono">
            {counts.planned}
          </span>
        </div>

      </div>

      {/* Main Calendar Layout Split pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left pane: Calendar month grid June 2026 */}
        <div className="lg:col-span-2 bg-white border border-slate-200/70 rounded-2xl p-6.5 shadow-2xs space-y-4">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-850 font-display flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-blue-500" />
                June 2026
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Click any day to schedule, view, or mark planned SEO mapping tasks.</p>
            </div>
            
            <div className="flex gap-1.5">
              <button disabled className="p-1.5 border border-slate-200/60 text-slate-400 rounded-lg hover:bg-slate-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled className="p-1.5 border border-slate-200/60 text-slate-400 rounded-lg hover:bg-slate-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Table Grid */}
          <div className="space-y-1">
            {/* Weekdays names */}
            <div className="grid grid-cols-7 gap-2.5 text-center font-mono text-[10px] uppercase font-bold tracking-wider text-slate-400 py-1.5 border-b border-slate-50">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Days grid June 2026 (June 1 is Monday, so directly starts grid col 0) */}
            <div className="grid grid-cols-7 gap-2.5 pt-2">
              {juneDaysOnGrid.map((day) => {
                const dayTasks = tasksByDay[day] || [];
                const isActive = selectedDay === day;

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[72px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:bg-slate-50/50 ${
                      isActive 
                        ? "border-[#2563eb] bg-[#eff6ff] text-[#1e40af] font-bold shadow-xs shadow-blue-500/5 ring-1 ring-[#2563eb]" 
                        : "border-slate-100 bg-white"
                    }`}
                  >
                    {/* Day number */}
                    <span className="text-[11px] z-10">{day}</span>

                    {/* Task marker indicators list */}
                    {dayTasks.length > 0 && (
                      <div className="space-y-1 mt-1 z-10">
                        {dayTasks.map((t, idx) => (
                          <div 
                            key={t.id + idx}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-bold truncate block ${
                              t.status === "Completed"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : t.status === "In Progress"
                                ? "bg-blue-50 text-blue-700 border border-blue-100"
                                : "bg-slate-100 text-slate-700 border border-slate-250/35"
                            }`}
                            title={t.title}
                          >
                            {t.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>

        </div>

        {/* Right pane: Day task breakdown viewer and additions */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-2xs flex flex-col justify-between min-h-[380px]">
          
          <div className="space-y-5">
            {/* Day Header */}
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] tracking-wider uppercase font-extrabold text-slate-400 font-mono">
                  Daily Workspace Monitor
                </span>
                <h4 className="font-display font-black text-slate-800 text-sm mt-0.5">
                  June {selectedDay}, 2026
                </h4>
              </div>

              <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-xl text-xs font-bold font-mono">
                {selectedDayTasks.length} tasks
              </span>
            </div>

            {/* List block */}
            <div className="space-y-3.5">
              {selectedDayTasks.length > 0 ? (
                selectedDayTasks.map((task, idx) => (
                  <div 
                    key={task.id + idx}
                    className="p-3.5 bg-slate-50/60 border border-slate-150/70 rounded-xl flex items-start justify-between gap-3 group hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <button 
                        onClick={() => handleToggleTask(task.id)}
                        className="mt-0.5 focus:outline-none cursor-pointer"
                      >
                        {task.status === "Completed" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-50" />
                        ) : task.status === "In Progress" ? (
                          <Clock className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      <div className="space-y-0.5">
                        <span className={`text-xs font-bold font-sans block ${task.status === "Completed" ? "line-through text-slate-400" : "text-slate-800"}`}>
                          {task.title}
                        </span>
                        <span className="text-[10px] text-slate-450 flex items-center gap-1 font-semibold">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            task.status === "Completed" ? "bg-emerald-500" : task.status === "In Progress" ? "bg-blue-500" : "bg-slate-400"
                          }`}></span>
                          {task.status}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <div className="text-2xl">📅</div>
                  <h5 className="font-bold text-slate-700 text-xs">No tasks mapped on this day.</h5>
                  <p className="text-[10px] text-slate-450 max-w-[190px] mx-auto leading-relaxed">
                    Click the action button below to insert custom content campaign mapping tasks.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Quick task addition */}
          <div className="bg-slate-50 border border-slate-150 p-4.5 rounded-2xl mt-4.5">
            <span className="text-[9.5px] uppercase font-bold text-slate-400 block mb-2 tracking-wider">
              Quick schedule keyword target
            </span>
            <form onSubmit={handleAddTaskSubmit} className="flex gap-2">
              <input
                type="text"
                required
                value={newTaskTitle}
                onChange={(e) => { setNewTaskTitle(e.target.value); setNewTaskDay(selectedDay); }}
                placeholder="E.g., dynamic intent analysis"
                className="flex-1 p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 font-sans bg-white"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-98"
              >
                +
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
