import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import axios from "axios";
import API_BASE_URL, { getAuthHeaders } from "../api/config";
import { toast, showConfirm } from "../context/ToastContext";
import Layout from "../components/Layout";
import { downloadAttachment } from "../utils/fileUtils";
import "./CalendarPage.css";

// Helper: Format date into "YYYY-MM-DD" local key
const toDateKey = (dateInput) => {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper: Check if date is strictly before today (ignoring hours)
const isDateOverdue = (dateInput) => {
  if (!dateInput) return false;
  const dKey = toDateKey(dateInput);
  const todayKey = toDateKey(new Date());
  return dKey < todayKey;
};

// Helper: Human-friendly relative date text
const getRelativeDateLabel = (targetDate) => {
  const tKey = toDateKey(targetDate);
  const todayKey = toDateKey(new Date());
  if (tKey === todayKey) return { label: "Today", tagClass: "today" };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (tKey === toDateKey(tomorrow)) return { label: "Tomorrow", tagClass: "upcoming" };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (tKey === toDateKey(yesterday)) return { label: "Yesterday (Overdue)", tagClass: "overdue" };

  const diffTime = new Date(tKey).getTime() - new Date(todayKey).getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `${Math.abs(diffDays)} days ago (Overdue)`, tagClass: "overdue" };
  }
  return { label: `In ${diffDays} days`, tagClass: "upcoming" };
};

export default function CalendarPage() {
  const navigate = useNavigate();

  // Authentication & User State
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  // Data States
  const [notes, setNotes] = useState([]);
  const [todos, setTodos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // View & Filter States
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // 'month' | 'week' | 'agenda'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'notes' | 'tasks'
  const [metricFilter, setMetricFilter] = useState("all"); // 'all' | 'overdue' | 'today' | 'upcoming' | 'tasks'

  // Quick Action States
  const [quickTaskText, setQuickTaskText] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Modals
  const [selectedNoteForModal, setSelectedNoteForModal] = useState(null);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [newNoteForm, setNewNoteForm] = useState({
    title: "",
    category: "",
    description: "",
    deadline: "",
    tags: "",
    reminderTime: "at_deadline",
  });
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Fetch all user notes, todos, categories
  const fetchData = async () => {
    const token = localStorage.getItem("token");
    if (!token || !user?.email) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      const [notesRes, todosRes, catRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/notes/${user.email}`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/todos/${user.email}`, { headers: getAuthHeaders() }),
        axios.get(`${API_BASE_URL}/api/categories/${user.email}`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
      ]);

      setNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
      setTodos(Array.isArray(todosRes.data) ? todosRes.data : []);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
    } catch (err) {
      console.error("Calendar fetch error:", err);
      toast.error("Unable to load calendar events. Please try again.", "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");
    toast.info("Logged out successfully.", "See You Soon");
    navigate("/");
  };

  // Compute Metrics Summary
  const metrics = useMemo(() => {
    const todayKey = toDateKey(new Date());

    let totalDeadlines = 0;
    let dueToday = 0;
    let overdueCount = 0;

    notes.forEach((n) => {
      if (n.deadline) {
        totalDeadlines++;
        const dKey = toDateKey(n.deadline);
        if (dKey === todayKey) dueToday++;
        else if (dKey < todayKey) overdueCount++;
      }
    });

    let scheduledTasks = 0;
    todos.forEach((t) => {
      if (t.taskDate) {
        scheduledTasks++;
        const tKey = t.taskDate.split("T")[0];
        if (tKey === todayKey && !t.completed) dueToday++;
        else if (tKey < todayKey && !t.completed) overdueCount++;
      }
    });

    return {
      totalDeadlines,
      dueToday,
      overdueCount,
      scheduledTasks,
    };
  }, [notes, todos]);

  // Map events by Date Key for instant O(1) lookup
  const eventsByDate = useMemo(() => {
    const map = {};

    // Group Notes
    notes.forEach((note) => {
      if (!note.deadline) return;
      const key = toDateKey(note.deadline);
      if (!key) return;
      if (!map[key]) map[key] = { notes: [], todos: [] };
      map[key].notes.push(note);
    });

    // Group Todos
    todos.forEach((todo) => {
      const key = todo.taskDate ? todo.taskDate.split("T")[0] : toDateKey(todo.createdAt);
      if (!key) return;
      if (!map[key]) map[key] = { notes: [], todos: [] };
      map[key].todos.push(todo);
    });

    return map;
  }, [notes, todos]);

  // Selected date key
  const selectedDateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);

  // Items on Selected Date
  const selectedDayItems = useMemo(() => {
    const dayData = eventsByDate[selectedDateKey] || { notes: [], todos: [] };
    let filteredNotes = dayData.notes;
    let filteredTodos = dayData.todos;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filteredNotes = filteredNotes.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.description?.toLowerCase().includes(q) ||
          n.category?.toLowerCase().includes(q)
      );
      filteredTodos = filteredTodos.filter((t) => t.task?.toLowerCase().includes(q));
    }

    if (selectedCategory !== "All") {
      filteredNotes = filteredNotes.filter((n) => n.category === selectedCategory);
    }

    return {
      notes: typeFilter === "tasks" ? [] : filteredNotes,
      todos: typeFilter === "notes" ? [] : filteredTodos,
    };
  }, [eventsByDate, selectedDateKey, searchQuery, selectedCategory, typeFilter]);

  // Quick Add Task on Selected Date
  const handleAddQuickTask = async (e) => {
    e?.preventDefault();
    if (!quickTaskText.trim()) return;

    try {
      setIsAddingTask(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/todos`,
        {
          task: quickTaskText.trim(),
          userEmail: user.email,
          taskDate: selectedDateKey,
        },
        { headers: getAuthHeaders() }
      );

      setTodos((prev) => [res.data, ...prev]);
      setQuickTaskText("");
      toast.success("Task scheduled for selected date.", "Task Created");
    } catch (err) {
      console.error("Add task error:", err);
      toast.error("Failed to add task.", "Error");
    } finally {
      setIsAddingTask(false);
    }
  };

  // Toggle Todo completion
  const handleToggleTodo = async (todoId) => {
    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/todos/${todoId}`,
        {},
        { headers: getAuthHeaders() }
      );
      setTodos((prev) =>
        prev.map((t) => (t._id === todoId ? { ...t, completed: !t.completed } : t))
      );
      toast.info(
        res.data?.completed ? "Task marked as completed." : "Task marked as pending.",
        "Task Updated"
      );
    } catch (err) {
      console.error("Toggle todo error:", err);
      toast.error("Failed to update task status.", "Error");
    }
  };

  // Delete Todo
  const handleDeleteTodo = async (todoId) => {
    const confirmed = await showConfirm({
      title: "Delete Task?",
      message: "Are you sure you want to remove this scheduled task?",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!confirmed) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/todos/${todoId}`, {
        headers: getAuthHeaders(),
      });
      setTodos((prev) => prev.filter((t) => t._id !== todoId));
      toast.success("Task deleted.", "Removed");
    } catch (err) {
      console.error("Delete task error:", err);
      toast.error("Failed to delete task.", "Error");
    }
  };

  // Open Quick Note Add Modal
  const openAddNoteModal = () => {
    setNewNoteForm({
      title: "",
      category: categories[0]?.name || "Personal",
      description: "",
      deadline: selectedDateKey,
      tags: "",
      reminderTime: "at_deadline",
    });
    setIsAddNoteModalOpen(true);
  };

  // Submit Quick Note Add
  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!newNoteForm.title.trim() || !newNoteForm.category.trim()) {
      toast.warning("Title and Category are required.", "Missing Information");
      return;
    }

    try {
      setIsSubmittingNote(true);
      const parsedTags = newNoteForm.tags
        ? newNoteForm.tags
            .split(",")
            .map((t) => t.trim().replace(/^#/, ""))
            .filter(Boolean)
        : [];

      const res = await axios.post(
        `${API_BASE_URL}/api/notes`,
        {
          title: newNoteForm.title.trim(),
          description: newNoteForm.description.trim() || "Created from Calendar",
          category: newNoteForm.category.trim(),
          deadline: newNoteForm.deadline ? new Date(newNoteForm.deadline) : null,
          reminderTime: newNoteForm.reminderTime || "at_deadline",
          tags: parsedTags,
          userEmail: user.email,
        },
        { headers: getAuthHeaders() }
      );

      setNotes((prev) => [res.data, ...prev]);
      setIsAddNoteModalOpen(false);
      toast.success("Note created with deadline on calendar.", "Note Saved");
    } catch (err) {
      console.error("Create note error:", err);
      toast.error("Failed to create note.", "Error");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Export Calendar to iCal (.ics) format
  const handleExportICal = () => {
    try {
      const icsLines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//MindDesk//Digital Notes Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
      ];

      const formatIcsDate = (dateVal) => {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      };

      notes
        .filter((n) => n.deadline)
        .forEach((n) => {
          const dt = formatIcsDate(n.deadline);
          if (!dt) return;
          icsLines.push(
            "BEGIN:VEVENT",
            `UID:minddesk-note-${n._id}@minddesk.app`,
            `DTSTAMP:${formatIcsDate(new Date())}`,
            `DTSTART:${dt}`,
            `SUMMARY:${(n.title || "Untitled Note").replace(/[\n\r]/g, " ")}`,
            `DESCRIPTION:${(n.category ? `Category: ${n.category}\\n` : "") +
              (n.description || "")
                .replace(/<[^>]*>?/gm, "")
                .slice(0, 200)
                .replace(/[\n\r]/g, " ")}`,
            `CATEGORIES:${n.category || "Notes"}`,
            "STATUS:CONFIRMED",
            "END:VEVENT"
          );
        });

      todos
        .filter((t) => t.taskDate)
        .forEach((t) => {
          const dt = formatIcsDate(t.taskDate);
          if (!dt) return;
          icsLines.push(
            "BEGIN:VTODO",
            `UID:minddesk-todo-${t._id}@minddesk.app`,
            `DTSTAMP:${formatIcsDate(new Date())}`,
            `DUE:${dt}`,
            `SUMMARY:${(t.task || "Untitled Task").replace(/[\n\r]/g, " ")}`,
            `STATUS:${t.completed ? "COMPLETED" : "NEEDS-ACTION"}`,
            "END:VTODO"
          );
        });

      icsLines.push("END:VCALENDAR");

      const blob = new Blob([icsLines.join("\r\n")], {
        type: "text/calendar;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `minddesk-calendar-${selectedDateKey}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("iCal calendar file exported successfully.", "Export Complete");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to generate iCal export.", "Export Error");
    }
  };

  // Calculate 7-day Week View array
  const weekDays = useMemo(() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const monday = new Date(d.setDate(diff));
    const days = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      days.push(current);
    }
    return days;
  }, [selectedDate]);

  // Agenda Groups
  const agendaSections = useMemo(() => {
    const todayKey = toDateKey(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = toDateKey(tomorrow);

    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndKey = toDateKey(weekEnd);

    const overdueList = [];
    const todayList = [];
    const tomorrowList = [];
    const thisWeekList = [];
    const futureList = [];
    const completedList = [];

    // Filter and group notes
    notes
      .filter((n) => n.deadline)
      .forEach((note) => {
        const dKey = toDateKey(note.deadline);
        const item = { type: "note", data: note, dateKey: dKey };

        if (dKey < todayKey) overdueList.push(item);
        else if (dKey === todayKey) todayList.push(item);
        else if (dKey === tomorrowKey) tomorrowList.push(item);
        else if (dKey <= weekEndKey) thisWeekList.push(item);
        else futureList.push(item);
      });

    // Filter and group todos
    todos
      .filter((t) => t.taskDate)
      .forEach((todo) => {
        const dKey = todo.taskDate.split("T")[0];
        const item = { type: "task", data: todo, dateKey: dKey };

        if (todo.completed) {
          completedList.push(item);
          return;
        }

        if (dKey < todayKey) overdueList.push(item);
        else if (dKey === todayKey) todayList.push(item);
        else if (dKey === tomorrowKey) tomorrowList.push(item);
        else if (dKey <= weekEndKey) thisWeekList.push(item);
        else futureList.push(item);
      });

    return [
      { id: "overdue", title: "Overdue Deadlines", icon: "bi-exclamation-triangle-fill", items: overdueList, isOverdue: true },
      { id: "today", title: "Due Today", icon: "bi-star-fill", items: todayList, isToday: true },
      { id: "tomorrow", title: "Tomorrow", icon: "bi-calendar-check", items: tomorrowList },
      { id: "this_week", title: "This Week", icon: "bi-calendar-week", items: thisWeekList },
      { id: "future", title: "Later & Upcoming", icon: "bi-calendar3", items: futureList },
      { id: "completed", title: "Completed Tasks", icon: "bi-check2-circle", items: completedList, isCompleted: true },
    ].filter((s) => s.items.length > 0);
  }, [notes, todos]);

  const relativeLabelInfo = getRelativeDateLabel(selectedDate);

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="md-calendar-page">
        {/* ===================== METRICS SUMMARY ROW ===================== */}
        <div className="cal-metrics-row">
          <div
            className={`cal-metric-card ${metricFilter === "all" ? "active-filter" : ""}`}
            onClick={() => setMetricFilter("all")}
          >
            <div className="cal-metric-icon deadlines">
              <i className="bi bi-calendar-event" />
            </div>
            <div>
              <div className="cal-metric-val">{metrics.totalDeadlines}</div>
              <div className="cal-metric-lbl">Total Deadlines</div>
            </div>
          </div>

          <div
            className={`cal-metric-card ${metricFilter === "today" ? "active-filter" : ""}`}
            onClick={() => {
              setMetricFilter("today");
              setSelectedDate(new Date());
            }}
          >
            <div className="cal-metric-icon today">
              <i className="bi bi-clock-history" />
            </div>
            <div>
              <div className="cal-metric-val">{metrics.dueToday}</div>
              <div className="cal-metric-lbl">Due Today</div>
            </div>
          </div>

          <div
            className={`cal-metric-card ${metricFilter === "overdue" ? "active-filter" : ""}`}
            onClick={() => {
              setMetricFilter("overdue");
              setViewMode("agenda");
            }}
          >
            <div className="cal-metric-icon overdue">
              <i className="bi bi-exclamation-octagon" />
            </div>
            <div>
              <div className="cal-metric-val">{metrics.overdueCount}</div>
              <div className="cal-metric-lbl">Overdue</div>
            </div>
          </div>

          <div
            className={`cal-metric-card ${metricFilter === "tasks" ? "active-filter" : ""}`}
            onClick={() => setMetricFilter("tasks")}
          >
            <div className="cal-metric-icon tasks">
              <i className="bi bi-check2-square" />
            </div>
            <div>
              <div className="cal-metric-val">{metrics.scheduledTasks}</div>
              <div className="cal-metric-lbl">Scheduled Tasks</div>
            </div>
          </div>
        </div>

        {/* ===================== CONTROLS & TOOLBAR ===================== */}
        <div className="cal-toolbar-card">
          <div className="cal-toolbar-left">
            {/* View Mode Toggle */}
            <div className="cal-view-pills">
              <button
                type="button"
                className={`cal-view-btn ${viewMode === "month" ? "active" : ""}`}
                onClick={() => setViewMode("month")}
              >
                <i className="bi bi-calendar3" />
                Month
              </button>
              <button
                type="button"
                className={`cal-view-btn ${viewMode === "week" ? "active" : ""}`}
                onClick={() => setViewMode("week")}
              >
                <i className="bi bi-calendar-week" />
                Week
              </button>
              <button
                type="button"
                className={`cal-view-btn ${viewMode === "agenda" ? "active" : ""}`}
                onClick={() => setViewMode("agenda")}
              >
                <i className="bi bi-view-list" />
                Agenda
              </button>
            </div>

            {/* Jump to Today */}
            <button
              type="button"
              className="cal-btn-outline"
              onClick={() => setSelectedDate(new Date())}
            >
              <i className="bi bi-dot" style={{ color: "#d97706", fontSize: "1.2rem" }} />
              Today
            </button>

            {/* Filter by Type */}
            <select
              className="cal-filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Items</option>
              <option value="notes">Notes Only</option>
              <option value="tasks">Tasks Only</option>
            </select>

            {/* Filter by Category */}
            {categories.length > 0 && (
              <select
                className="cal-filter-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="cal-toolbar-right">
            {/* Live Search */}
            <div className="cal-search-wrap">
              <i className="bi bi-search" />
              <input
                type="text"
                placeholder="Search events..."
                className="cal-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Export iCal */}
            <button
              type="button"
              className="cal-btn-outline"
              onClick={handleExportICal}
              title="Export all deadlines to iCal / Google Calendar"
            >
              <i className="bi bi-download" />
              Export .ics
            </button>

            {/* Add Note Button */}
            <button
              type="button"
              className="cal-btn-primary"
              onClick={openAddNoteModal}
            >
              <i className="bi bi-plus-lg" />
              New Note
            </button>
          </div>
        </div>

        {/* ===================== VIEW 1: MONTH VIEW ===================== */}
        {viewMode === "month" && (
          <div className="cal-month-layout">
            {/* Left: Interactive Calendar */}
            <div className="cal-calendar-box">
              <Calendar
                value={selectedDate}
                onChange={setSelectedDate}
                tileContent={({ date: d, view }) => {
                  if (view !== "month") return null;
                  const key = toDateKey(d);
                  const dayData = eventsByDate[key];
                  if (!dayData) return null;

                  const hasOverdue = dayData.notes.some((n) => isDateOverdue(n.deadline));
                  const hasToday = key === toDateKey(new Date());
                  const hasNote = dayData.notes.length > 0;
                  const hasTask = dayData.todos.length > 0;
                  const total = dayData.notes.length + dayData.todos.length;

                  return (
                    <div className="cal-tile-badge-wrapper">
                      <div className="cal-tile-dots">
                        {hasOverdue && <span className="cal-dot overdue" title="Overdue item" />}
                        {hasToday && <span className="cal-dot today" title="Due today" />}
                        {hasNote && !hasOverdue && !hasToday && (
                          <span className="cal-dot upcoming" title="Note deadline" />
                        )}
                        {hasTask && <span className="cal-dot task" title="Scheduled task" />}
                      </div>
                      {total >= 2 && <span className="cal-tile-count-pill">{total}</span>}
                    </div>
                  );
                }}
              />
            </div>

            {/* Right: Day Inspector Panel */}
            <div className="cal-inspector-card">
              <div className="cal-inspector-header">
                <div className="cal-inspector-date-title">
                  <span>
                    {selectedDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className={`cal-inspector-tag ${relativeLabelInfo.tagClass}`}>
                    {relativeLabelInfo.label}
                  </span>
                </div>
                <div className="cal-inspector-relative">
                  <i className="bi bi-calendar2-range" />
                  <span>{selectedDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
              </div>

              {/* Quick Add Task on this Day */}
              <div className="cal-quickadd-box">
                <div className="cal-quickadd-title">
                  <span>
                    <i className="bi bi-lightning-charge me-1" />
                    Quick Task on this Day
                  </span>
                </div>
                <form className="cal-quickadd-form" onSubmit={handleAddQuickTask}>
                  <input
                    type="text"
                    className="cal-quickadd-input"
                    placeholder="e.g. Submit chemistry assignment..."
                    value={quickTaskText}
                    onChange={(e) => setQuickTaskText(e.target.value)}
                    disabled={isAddingTask}
                  />
                  <button
                    type="submit"
                    className="cal-quickadd-btn"
                    disabled={isAddingTask || !quickTaskText.trim()}
                  >
                    {isAddingTask ? "Adding..." : "Add"}
                  </button>
                </form>
              </div>

              {/* Note Deadlines Section */}
              <div className="cal-section-subtitle">
                <i className="bi bi-journal-bookmark" style={{ color: "#8b5e3c" }} />
                <span>Note Deadlines ({selectedDayItems.notes.length})</span>
              </div>

              <div className="cal-items-scroll">
                {selectedDayItems.notes.length === 0 ? (
                  <div className="cal-empty-state">
                    <i className="bi bi-calendar-x cal-empty-icon" />
                    <p>No note deadlines for this day.</p>
                  </div>
                ) : (
                  selectedDayItems.notes.map((note) => {
                    const overdue = isDateOverdue(note.deadline);
                    return (
                      <div
                        key={note._id}
                        className={`cal-event-card ${overdue ? "overdue" : ""}`}
                      >
                        <div className="cal-event-card-header">
                          <span
                            className="cal-event-card-title"
                            onClick={() => setSelectedNoteForModal(note)}
                          >
                            {note.title}
                          </span>
                          {note.category && (
                            <span className="cal-badge">{note.category}</span>
                          )}
                        </div>

                        <div className="cal-event-card-footer">
                          <span>
                            {note.reminderTime && note.reminderTime !== "at_deadline" ? (
                              <span>⏰ {note.reminderTime.replace(/_/g, " ")}</span>
                            ) : (
                              <span>⏰ At deadline</span>
                            )}
                          </span>

                          <div className="cal-card-actions">
                            <button
                              type="button"
                              className="cal-card-btn"
                              onClick={() => setSelectedNoteForModal(note)}
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              className="cal-card-btn"
                              onClick={() => navigate("/mynotes")}
                            >
                              Edit Note
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Tasks Section */}
              <div className="cal-section-subtitle" style={{ marginTop: "10px" }}>
                <i className="bi bi-check2-all" style={{ color: "#2563eb" }} />
                <span>Tasks Scheduled ({selectedDayItems.todos.length})</span>
              </div>

              <div className="cal-items-scroll">
                {selectedDayItems.todos.length === 0 ? (
                  <div className="cal-empty-state">
                    <i className="bi bi-clipboard-check cal-empty-icon" />
                    <p>No tasks scheduled for this day.</p>
                  </div>
                ) : (
                  selectedDayItems.todos.map((todo) => (
                    <div key={todo._id} className="cal-task-item">
                      <div className="cal-task-left">
                        <input
                          type="checkbox"
                          className="cal-task-checkbox"
                          checked={!!todo.completed}
                          onChange={() => handleToggleTodo(todo._id)}
                        />
                        <span
                          className={`cal-task-label ${todo.completed ? "completed" : ""}`}
                        >
                          {todo.task}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="cal-task-delete-btn"
                        onClick={() => handleDeleteTodo(todo._id)}
                        title="Delete Task"
                      >
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== VIEW 2: WEEK VIEW ===================== */}
        {viewMode === "week" && (
          <div className="cal-week-grid">
            {weekDays.map((wDate) => {
              const wKey = toDateKey(wDate);
              const isTodayCol = wKey === toDateKey(new Date());
              const dayData = eventsByDate[wKey] || { notes: [], todos: [] };

              return (
                <div
                  key={wKey}
                  className={`cal-week-col ${isTodayCol ? "is-today" : ""}`}
                  onClick={() => setSelectedDate(wDate)}
                >
                  <div className="cal-week-col-header">
                    <div className="cal-week-col-day">
                      {wDate.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div className="cal-week-col-num">{wDate.getDate()}</div>
                  </div>

                  <div className="cal-week-col-body">
                    {/* Note Deadlines */}
                    {dayData.notes.map((note) => {
                      const overdue = isDateOverdue(note.deadline);
                      return (
                        <div
                          key={note._id}
                          className={`cal-week-item note-item ${overdue ? "is-overdue" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNoteForModal(note);
                          }}
                        >
                          <div className="fw-bold text-truncate">{note.title}</div>
                          <div className="d-flex justify-content-between align-items-center mt-1">
                            <span className="cal-badge">{note.category}</span>
                            {overdue && <span className="text-danger small">Overdue</span>}
                          </div>
                        </div>
                      );
                    })}

                    {/* Tasks */}
                    {dayData.todos.map((todo) => (
                      <div
                        key={todo._id}
                        className="cal-week-item task-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTodo(todo._id);
                        }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!todo.completed}
                            onChange={() => {}}
                            className="cal-task-checkbox"
                          />
                          <span
                            className={`text-truncate ${todo.completed ? "text-decoration-line-through text-muted" : ""}`}
                          >
                            {todo.task}
                          </span>
                        </div>
                      </div>
                    ))}

                    {dayData.notes.length === 0 && dayData.todos.length === 0 && (
                      <div className="text-center text-muted small my-auto py-3 opacity-50">
                        No events
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===================== VIEW 3: AGENDA VIEW ===================== */}
        {viewMode === "agenda" && (
          <div className="cal-agenda-container">
            {agendaSections.length === 0 ? (
              <div className="cal-calendar-box text-center py-5">
                <i className="bi bi-calendar-check" style={{ fontSize: "2.5rem", color: "#8b5e3c" }} />
                <h4 className="mt-3 fw-bold" style={{ color: "#2b1d14" }}>All caught up!</h4>
                <p className="text-muted">You have no upcoming deadlines or scheduled tasks.</p>
                <button
                  type="button"
                  className="cal-btn-primary mt-2"
                  onClick={openAddNoteModal}
                >
                  Create a Deadline
                </button>
              </div>
            ) : (
              agendaSections.map((sec) => (
                <div key={sec.id} className="cal-agenda-section">
                  <div className="cal-agenda-header">
                    <div className="cal-agenda-title">
                      <i className={`bi ${sec.icon}`} style={{ color: sec.isOverdue ? "#dc2626" : "#8b5e3c" }} />
                      <span>{sec.title}</span>
                    </div>
                    <span className="cal-agenda-count">{sec.items.length} items</span>
                  </div>

                  <div className="cal-agenda-list">
                    {sec.items.map((item, idx) => {
                      if (item.type === "note") {
                        const note = item.data;
                        const overdue = isDateOverdue(note.deadline);
                        return (
                          <div
                            key={note._id || idx}
                            className={`cal-agenda-row ${overdue ? "overdue" : ""} ${item.dateKey === toDateKey(new Date()) ? "today" : ""}`}
                          >
                            <div className="cal-agenda-left">
                              <div className="cal-agenda-icon note">
                                <i className="bi bi-journal-text" />
                              </div>
                              <div className="cal-agenda-details">
                                <div
                                  className="cal-agenda-item-title"
                                  style={{ cursor: "pointer" }}
                                  onClick={() => setSelectedNoteForModal(note)}
                                >
                                  {note.title}
                                </div>
                                <div className="cal-agenda-item-meta">
                                  {note.category && <span className="cal-badge">{note.category}</span>}
                                  <span>
                                    <i className="bi bi-calendar-event me-1" />
                                    {new Date(note.deadline).toLocaleDateString("en-US", {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                  {note.reminderTime && (
                                    <span>
                                      <i className="bi bi-alarm me-1" />
                                      {note.reminderTime.replace(/_/g, " ")}
                                    </span>
                                  )}
                                  {note.attachments?.length > 0 && (
                                    <span>
                                      <i className="bi bi-paperclip me-1" />
                                      {note.attachments.length} files
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="cal-agenda-right">
                              <button
                                type="button"
                                className="cal-btn-outline"
                                onClick={() => setSelectedNoteForModal(note)}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                className="cal-btn-outline"
                                onClick={() => navigate("/mynotes")}
                              >
                                Edit in Notes
                              </button>
                            </div>
                          </div>
                        );
                      } else {
                        const todo = item.data;
                        return (
                          <div
                            key={todo._id || idx}
                            className={`cal-agenda-row ${todo.completed ? "opacity-75" : ""}`}
                          >
                            <div className="cal-agenda-left">
                              <div className="cal-agenda-icon task">
                                <i className="bi bi-check2-square" />
                              </div>
                              <div className="cal-agenda-details">
                                <div
                                  className={`cal-agenda-item-title ${todo.completed ? "text-decoration-line-through text-muted" : ""}`}
                                >
                                  {todo.task}
                                </div>
                                <div className="cal-agenda-item-meta">
                                  <span className="cal-badge" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                                    Task
                                  </span>
                                  <span>
                                    <i className="bi bi-calendar-check me-1" />
                                    {item.dateKey}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="cal-agenda-right">
                              <button
                                type="button"
                                className="cal-btn-outline"
                                onClick={() => handleToggleTodo(todo._id)}
                              >
                                {todo.completed ? "Mark Pending" : "Mark Done"}
                              </button>
                              <button
                                type="button"
                                className="cal-task-delete-btn"
                                onClick={() => handleDeleteTodo(todo._id)}
                              >
                                <i className="bi bi-trash3" />
                              </button>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ===================== MODAL: NOTE DETAILS PREVIEW ===================== */}
        {selectedNoteForModal && (
          <div
            className="cal-modal-overlay"
            onClick={() => setSelectedNoteForModal(null)}
          >
            <div
              className="cal-modal-container"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cal-modal-header">
                <div className="cal-modal-title">
                  <i className="bi bi-journal-text" style={{ color: "#8b5e3c" }} />
                  <span>{selectedNoteForModal.title}</span>
                </div>
                <button
                  type="button"
                  className="cal-modal-close-btn"
                  onClick={() => setSelectedNoteForModal(null)}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <div className="cal-modal-body">
                {/* Meta Header */}
                <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                  <span className="cal-badge">{selectedNoteForModal.category}</span>
                  {selectedNoteForModal.deadline && (
                    <span className="cal-badge" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                      📅 Due: {new Date(selectedNoteForModal.deadline).toLocaleDateString()}
                    </span>
                  )}
                  {selectedNoteForModal.reminderTime && (
                    <span className="cal-badge" style={{ background: "#fef3c7", color: "#b45309" }}>
                      ⏰ {selectedNoteForModal.reminderTime.replace(/_/g, " ")}
                    </span>
                  )}
                </div>

                {/* Description */}
                <div
                  className="p-3 rounded-3 mb-3"
                  style={{ background: "#faf6f0", minHeight: "80px", color: "#3b281b" }}
                >
                  {selectedNoteForModal.description ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: selectedNoteForModal.description,
                      }}
                    />
                  ) : (
                    <em className="text-muted">No description provided.</em>
                  )}
                </div>

                {/* Tags */}
                {selectedNoteForModal.tags?.length > 0 && (
                  <div className="mb-3">
                    <label className="fw-semibold small text-muted d-block mb-1">Tags</label>
                    <div className="d-flex flex-wrap gap-1">
                      {selectedNoteForModal.tags.map((t, i) => (
                        <span key={i} className="badge bg-secondary-subtle text-dark">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {selectedNoteForModal.attachments?.length > 0 && (
                  <div>
                    <label className="fw-semibold small text-muted d-block mb-1">
                      Attachments ({selectedNoteForModal.attachments.length})
                    </label>
                    <div className="d-flex flex-column gap-2">
                      {selectedNoteForModal.attachments.map((att) => (
                        <div
                          key={att._id || att.storageKey}
                          className="d-flex align-items-center justify-content-between p-2 rounded-2 border"
                          style={{ background: "#ffffff" }}
                        >
                          <div className="d-flex align-items-center gap-2 text-truncate">
                            <i className="bi bi-paperclip" />
                            <span className="small text-truncate">{att.originalName}</span>
                          </div>
                          <button
                            type="button"
                            className="cal-btn-outline py-1 px-2"
                            onClick={() => downloadAttachment(att)}
                          >
                            <i className="bi bi-download" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="cal-modal-footer">
                <button
                  type="button"
                  className="cal-btn-outline"
                  onClick={() => setSelectedNoteForModal(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="cal-btn-primary"
                  onClick={() => {
                    setSelectedNoteForModal(null);
                    navigate("/mynotes");
                  }}
                >
                  <i className="bi bi-pencil-square" />
                  Edit in Notes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== MODAL: QUICK ADD NOTE WITH DEADLINE ===================== */}
        {isAddNoteModalOpen && (
          <div
            className="cal-modal-overlay"
            onClick={() => setIsAddNoteModalOpen(false)}
          >
            <div
              className="cal-modal-container"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cal-modal-header">
                <div className="cal-modal-title">
                  <i className="bi bi-calendar-plus" style={{ color: "#8b5e3c" }} />
                  <span>New Note with Deadline</span>
                </div>
                <button
                  type="button"
                  className="cal-modal-close-btn"
                  onClick={() => setIsAddNoteModalOpen(false)}
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>

              <form onSubmit={handleCreateNote}>
                <div className="cal-modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Title</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. History Project Final Draft"
                      value={newNoteForm.title}
                      onChange={(e) => setNewNoteForm({ ...newNoteForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Category</label>
                      <select
                        className="form-select"
                        value={newNoteForm.category}
                        onChange={(e) => setNewNoteForm({ ...newNoteForm, category: e.target.value })}
                        required
                      >
                        {categories.map((c) => (
                          <option key={c._id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                        {categories.length === 0 && (
                          <>
                            <option value="Personal">Personal</option>
                            <option value="Work">Work</option>
                            <option value="Study">Study</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="col-6">
                      <label className="form-label fw-semibold small">Deadline Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={newNoteForm.deadline}
                        onChange={(e) => setNewNoteForm({ ...newNoteForm, deadline: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Reminder</label>
                      <select
                        className="form-select"
                        value={newNoteForm.reminderTime}
                        onChange={(e) => setNewNoteForm({ ...newNoteForm, reminderTime: e.target.value })}
                      >
                        <option value="at_deadline">At deadline</option>
                        <option value="15_min_before">15 minutes before</option>
                        <option value="30_min_before">30 minutes before</option>
                        <option value="1_hour_before">1 hour before</option>
                        <option value="1_day_before">1 day before</option>
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Tags (comma-separated)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="project, exam, urgent"
                        value={newNoteForm.tags}
                        onChange={(e) => setNewNoteForm({ ...newNoteForm, tags: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label fw-semibold small">Content / Notes</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="Add key notes, instructions or reminders..."
                      value={newNoteForm.description}
                      onChange={(e) => setNewNoteForm({ ...newNoteForm, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="cal-modal-footer">
                  <button
                    type="button"
                    className="cal-btn-outline"
                    onClick={() => setIsAddNoteModalOpen(false)}
                    disabled={isSubmittingNote}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cal-btn-primary"
                    disabled={isSubmittingNote}
                  >
                    {isSubmittingNote ? "Creating..." : "Create Note"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
