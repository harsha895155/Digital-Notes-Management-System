import { useNavigate, useLocation } from "react-router-dom";
import MyNotes from "./MyNotes";
import { useState, useEffect } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import API_BASE_URL, { getAuthHeaders } from "../api/config";
import { toast, showConfirm } from "../context/ToastContext";
import FileUpload from "../components/FileUpload";
import AttachmentList from "../components/AttachmentList";
import Layout from "../components/Layout";

// Map URL path → tab id
function pathToView(pathname) {
  if (pathname === "/mynotes")  return "notes";
  if (pathname === "/calendar") return "calendar";
  return "dashboard";
}

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [totalNotes, setTotalNotes] = useState(0);
  const [date, setDate] = useState(new Date());
  const user = JSON.parse(localStorage.getItem("user"));
  const [notes, setNotes] = useState([]);
  const [upcomingNotes, setUpcomingNotes] = useState([]);
  const [task, setTask] = useState("");
  const [todos, setTodos] = useState([]);
  const [activeTodoForFiles, setActiveTodoForFiles] = useState(null);

  // Derive active tab from the current URL — updates whenever the user navigates
  const activeView = pathToView(location.pathname);

  const fetchTodos = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser?.email) return;
      const res = await axios.get(`${API_BASE_URL}/api/todos/${storedUser.email}`, {
        headers: getAuthHeaders(),
      });
      setTodos(res.data);
      setActiveTodoForFiles((currentActive) => {
        if (!currentActive) return null;
        const fresh = res.data.find((t) => t._id === currentActive._id);
        return fresh || null;
      });
    } catch (err) {
      console.error("fetchTodos error:", err);
    }
  };

  const handleAddTodo = async () => {
    if (!task.trim()) return;
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      await axios.post(
        `${API_BASE_URL}/api/todos`,
        { task, userEmail: storedUser.email, taskDate: new Date().toISOString().split("T")[0] },
        { headers: getAuthHeaders() }
      );
      setTask("");
      fetchTodos();
      toast.success("Task added to your daily to-do list.", "Task Created");
    } catch (err) {
      toast.error("Failed to add task.", "Error");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user) { navigate("/"); return; }
    fetchTotalNotes();
    fetchUpcomingNotes();
    fetchTodos();
  }, [user, navigate]);

  useEffect(() => {
    if (location.pathname === "/tasks") {
      setTimeout(() => {
        const el = document.getElementById("todo-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          const input = el.querySelector("input");
          if (input) input.focus();
        }
      }, 150);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");
    toast.info("Logged out successfully.", "See You Soon");
    navigate("/");
  };

  const fetchTotalNotes = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser?.email) return;
      const res = await axios.get(`${API_BASE_URL}/api/notes/${storedUser.email}`, { headers: getAuthHeaders() });
      setTotalNotes(res.data.length);
    } catch (error) { console.log(error); }
  };

  const fetchUpcomingNotes = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser?.email) return;
      const res = await axios.get(`${API_BASE_URL}/api/notes/${storedUser.email}`, { headers: getAuthHeaders() });
      setNotes(res.data);
      const today = new Date();
      const nextFiveDays = new Date();
      nextFiveDays.setDate(today.getDate() + 5);
      const filtered = res.data.filter(
        (note) => note.deadline && new Date(note.deadline) >= today && new Date(note.deadline) <= nextFiveDays
      );
      setUpcomingNotes(filtered);
    } catch (error) { console.log(error); }
  };

  const toggleTodo = async (id) => {
    try {
      await axios.put(`${API_BASE_URL}/api/todos/${id}`, {}, { headers: getAuthHeaders() });
      fetchTodos();
    } catch (error) { console.log(error); }
  };

  const handleDeleteTodoAttachment = async (att) => {
    if (!activeTodoForFiles) return;
    const confirmed = await showConfirm({
      title: "Remove Task Attachment?",
      message: `Remove "${att.originalName}" from this task? This cannot be undone.`,
      confirmText: "Remove", cancelText: "Cancel", type: "danger",
    });
    if (!confirmed) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/todos/${activeTodoForFiles._id}/attachments/${att._id}`, { headers: getAuthHeaders() });
      toast.success("Attachment removed from task.", "Deleted");
      await fetchTodos();
    } catch (err) {
      toast.error("Failed to remove task attachment.", "Error");
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const completedTodos = todos.filter((t) => t.completed).length;

  return (
    <Layout user={user} onLogout={handleLogout}>

      {/* ===================== DASHBOARD VIEW ===================== */}
      {activeView === "dashboard" && (
        <div className="md-fadein">
          {/* Welcome Banner */}
          <div className="md-welcome-banner">
            <div>
              <div className="md-welcome-greeting">
                {greeting()}, {user?.fullName?.split(" ")[0] || "there"} 👋
              </div>
              <div className="md-welcome-sub">
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
              <div className="md-welcome-tagline">
                <span className="md-welcome-badge"><i className="bi bi-journal-text" /> {totalNotes} Notes</span>
                <span className="md-welcome-badge"><i className="bi bi-check2-circle" /> {completedTodos}/{todos.length} Tasks Done</span>
                <span className="md-welcome-badge"><i className="bi bi-alarm" /> {upcomingNotes.length} Deadlines Soon</span>
              </div>
            </div>
            <div className="md-welcome-icon">📓</div>
          </div>

          {/* Stats Row */}
          <div className="md-stat-grid" style={{ marginBottom: "24px" }}>
            <div className="md-stat-card">
              <div className="md-stat-icon">📝</div>
              <div className="md-stat-label">Total Notes</div>
              <div className="md-stat-value">{totalNotes}</div>
              <div className="md-stat-change">All your knowledge</div>
            </div>
            <div className="md-stat-card">
              <div className="md-stat-icon">✅</div>
              <div className="md-stat-label">Tasks Done Today</div>
              <div className="md-stat-value">{completedTodos}</div>
              <div className="md-stat-change">of {todos.length} total</div>
            </div>
            <div className="md-stat-card">
              <div className="md-stat-icon">⏰</div>
              <div className="md-stat-label">Upcoming Deadlines</div>
              <div className="md-stat-value">{upcomingNotes.length}</div>
              <div className="md-stat-change">in the next 5 days</div>
            </div>
            <div className="md-stat-card">
              <div className="md-stat-icon">📂</div>
              <div className="md-stat-label">To-Do Items</div>
              <div className="md-stat-value">{todos.length}</div>
              <div className="md-stat-change">{todos.length - completedTodos} remaining</div>
            </div>
          </div>

          {/* Main Grid: Deadlines + Todos */}
          <div className="md-dashboard-grid" style={{ marginBottom: "24px" }}>
            {/* Upcoming Deadlines */}
            <div className="md-card">
              <div className="md-section-header">
                <div className="md-section-title">
                  <i className="bi bi-alarm" />
                  Upcoming Deadlines
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="md-badge md-badge-warning">{upcomingNotes.length} soon</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none p-0 fw-bold"
                    style={{ color: "var(--md-primary)", fontSize: "0.82rem" }}
                    onClick={() => navigate("/calendar")}
                  >
                    View Calendar &rarr;
                  </button>
                </div>
              </div>
              {upcomingNotes.length === 0 ? (
                <div className="md-empty-state" style={{ padding: "28px 16px" }}>
                  <i className="bi bi-calendar-check" style={{ fontSize: "2rem" }} />
                  <h5>All Clear!</h5>
                  <p>No deadlines in the next 5 days.</p>
                </div>
              ) : (
                <div className="md-deadline-list">
                  {upcomingNotes.map((note, i) => {
                    const daysLeft = Math.ceil((new Date(note.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                    const urgency = daysLeft <= 1 ? "urgent" : daysLeft <= 3 ? "soon" : "";
                    return (
                      <div key={note._id} className={`md-deadline-item ${urgency}`}>
                        <div className="md-deadline-icon">
                          {daysLeft <= 1 ? "🔴" : daysLeft <= 3 ? "🟡" : "📅"}
                        </div>
                        <div className="md-deadline-info">
                          <div className="md-deadline-title">{note.title}</div>
                          <div className="md-deadline-meta">
                            <span className="md-deadline-date">
                              <i className="bi bi-calendar3" />
                              {new Date(note.deadline).toLocaleDateString("en-GB").replace(/\//g, "-")}
                            </span>
                            {note.category && (
                              <span className="md-cat-badge">{note.category}</span>
                            )}
                          </div>
                        </div>
                        <span className="md-badge md-badge-warning" style={{ fontSize: "0.7rem" }}>
                          {daysLeft === 0 ? "Today" : daysLeft === 1 ? "1 day" : `${daysLeft} days`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* To-Do Today */}
            <div className="md-card" id="todo-section">
              <div className="md-section-header">
                <div className="md-section-title">
                  <i className="bi bi-check2-square" />
                  To-Do Today
                </div>
                <span className="md-badge md-badge-muted">{completedTodos}/{todos.length}</span>
              </div>

              {/* Add Task */}
              <div className="md-input-row" style={{ marginBottom: "14px" }}>
                <input
                  className="md-form-control"
                  type="text"
                  placeholder="Add a task... (Enter to add)"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddTodo(); }}
                />
                <button
                  className="md-btn md-btn-primary"
                  onClick={handleAddTodo}
                  style={{ padding: "10px 16px" }}
                >
                  <i className="bi bi-plus-lg" />
                </button>
              </div>

              {todos.length === 0 ? (
                <div className="md-empty-state" style={{ padding: "28px 16px" }}>
                  <i className="bi bi-clipboard" style={{ fontSize: "2rem" }} />
                  <h5>Nothing yet</h5>
                  <p>Add your first task above.</p>
                </div>
              ) : (
                <div className="md-todo-list">
                  {todos.map((todo) => {
                    const attCount = todo.attachments ? todo.attachments.length : 0;
                    return (
                      <div key={todo._id} className="md-todo-item">
                        <input
                          type="checkbox"
                          className="md-todo-check"
                          checked={todo.completed}
                          onChange={() => toggleTodo(todo._id)}
                        />
                        <span className={`md-todo-text${todo.completed ? " completed" : ""}`}>
                          {todo.task}
                        </span>
                        {attCount > 0 && (
                          <span
                            className="md-todo-badge"
                            title={`${attCount} file(s)`}
                            onClick={() => setActiveTodoForFiles(todo)}
                          >
                            <i className="bi bi-paperclip" />
                            {attCount}
                          </span>
                        )}
                        <div className="md-todo-actions">
                          <button
                            className="md-todo-action-btn"
                            title="Attach files"
                            onClick={() => setActiveTodoForFiles(todo)}
                          >
                            <i className="bi bi-paperclip" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== NOTES VIEW ===================== */}
      {activeView === "notes" && (
        <div className="md-fadein">
          <div className="md-page-header">
            <div className="md-page-title">My Notes</div>
            <div className="md-page-subtitle">Create, organize, and manage all your notes</div>
          </div>
          <MyNotes
            fetchTotalNotes={fetchTotalNotes}
            fetchUpcomingNotes={fetchUpcomingNotes}
          />
        </div>
      )}

      {/* ===================== CALENDAR VIEW ===================== */}
      {activeView === "calendar" && (
        <div className="md-fadein">
          <div className="md-page-header">
            <div className="md-page-title">Calendar</div>
            <div className="md-page-subtitle">Visual overview of your deadlines</div>
          </div>
          <div className="md-calendar-wrap">
            <Calendar
              value={date}
              onChange={setDate}
              tileContent={({ date: d }) => {
                const hasDeadline = notes.some(
                  (note) => note.deadline && new Date(note.deadline).toDateString() === d.toDateString()
                );
                return hasDeadline ? <div className="deadline-dot" /> : null;
              }}
            />
          </div>

          {/* Notes on selected date */}
          {notes.filter(n => n.deadline && new Date(n.deadline).toDateString() === date.toDateString()).length > 0 && (
            <div className="md-card" style={{ marginTop: "20px" }}>
              <div className="md-section-header">
                <div className="md-section-title">
                  <i className="bi bi-calendar-event" />
                  Deadlines on {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </div>
              </div>
              <div className="md-deadline-list">
                {notes
                  .filter(n => n.deadline && new Date(n.deadline).toDateString() === date.toDateString())
                  .map(note => (
                    <div key={note._id} className="md-deadline-item">
                      <div className="md-deadline-icon">📅</div>
                      <div className="md-deadline-info">
                        <div className="md-deadline-title">{note.title}</div>
                        <div className="md-deadline-meta">
                          {note.category && <span className="md-cat-badge">{note.category}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Task Attachments Modal ===== */}
      {activeTodoForFiles && (
        <div className="attachment-modal-overlay" onClick={() => setActiveTodoForFiles(null)}>
          <div
            className="attachment-modal-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="attachment-modal-header">
              <div className="attachment-modal-title">
                <i className="bi bi-paperclip" style={{ color: "#8b5e3c" }} />
                <span>Task Attachments</span>
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => setActiveTodoForFiles(null)}
              />
            </div>

            <div className="p-3" style={{ background: "#ffffff", maxHeight: "70vh", overflowY: "auto" }}>
              <div className="p-2 mb-3 rounded" style={{ background: "#faf7f2", border: "1px solid #ebd8c8" }}>
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.7rem" }}>Task</small>
                <div className="fw-semibold text-dark">{activeTodoForFiles.task}</div>
              </div>
              <FileUpload
                todoId={activeTodoForFiles._id}
                onUploadSuccess={() => { fetchTodos(); }}
              />
              <AttachmentList
                title="Task Files"
                attachments={activeTodoForFiles.attachments || []}
                onDelete={handleDeleteTodoAttachment}
              />
            </div>

            <div className="attachment-modal-footer">
              <button
                type="button"
                className="md-btn md-btn-ghost md-btn-sm"
                onClick={() => setActiveTodoForFiles(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Dashboard;
