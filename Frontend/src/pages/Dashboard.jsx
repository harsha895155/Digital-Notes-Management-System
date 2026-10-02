import { useNavigate } from "react-router-dom";
import diary from "./image.png";
import MyNotes from "./MyNotes";
import { useState, useEffect } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import logo from "./logo.png";
import API_BASE_URL, { getAuthHeaders } from "../api/config";
import { toast, showConfirm } from "../context/ToastContext";
import FileUpload from "../components/FileUpload";
import AttachmentList from "../components/AttachmentList";

function Dashboard() {
  const navigate = useNavigate();
  const [totalNotes, setTotalNotes] = useState(0);
  const [date, setDate] = useState(new Date());
  const user = JSON.parse(localStorage.getItem("user"));
  const [notes, setNotes] = useState([]);
  const [upcomingNotes, setUpcomingNotes] = useState([]);
  const [task, setTask] = useState("");
  const [todos, setTodos] = useState([]);
  const [activeTodoForFiles, setActiveTodoForFiles] = useState(null);

  const fetchTodos = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser?.email) return;

      const res = await axios.get(`${API_BASE_URL}/api/todos/${storedUser.email}`, {
        headers: getAuthHeaders(),
      });

      setTodos(res.data);

      // If active task modal is open, refresh its attachments reference
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
        {
          task,
          userEmail: storedUser.email,
          taskDate: new Date().toISOString().split("T")[0],
        },
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
    const loginTime = localStorage.getItem("loginTime");

    if (!token || !user) {
      navigate("/");
      return;
    }

    fetchTotalNotes();
    fetchUpcomingNotes();
    fetchTodos();

    if (loginTime && Date.now() - Number(loginTime) > 3600000) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("loginTime");

      toast.warning(
        "Your session has expired. Please login again.",
        "Session Timeout"
      );
      navigate("/");
    }
  }, [user, navigate]);

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

      const res = await axios.get(
        `${API_BASE_URL}/api/notes/${storedUser.email}`,
        { headers: getAuthHeaders() }
      );

      setTotalNotes(res.data.length);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchUpcomingNotes = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser?.email) return;

      const res = await axios.get(
        `${API_BASE_URL}/api/notes/${storedUser.email}`,
        { headers: getAuthHeaders() }
      );
      setNotes(res.data);

      const today = new Date();
      const nextFiveDays = new Date();
      nextFiveDays.setDate(today.getDate() + 5);

      const filtered = res.data.filter(
        (note) =>
          note.deadline &&
          new Date(note.deadline) >= today &&
          new Date(note.deadline) <= nextFiveDays
      );

      setUpcomingNotes(filtered);
    } catch (error) {
      console.log(error);
    }
  };

  const handleChangePassword = () => {
    navigate("/change-password");
  };

  const toggleTodo = async (id) => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/todos/${id}`,
        {},
        { headers: getAuthHeaders() }
      );
      fetchTodos();
    } catch (error) {
      console.log(error);
    }
  };

  const handleDeleteTodoAttachment = async (att) => {
    if (!activeTodoForFiles) return;

    const confirmed = await showConfirm({
      title: "Remove Task Attachment?",
      message: `Remove "${att.originalName}" from this task? This cannot be undone.`,
      confirmText: "Remove",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      await axios.delete(
        `${API_BASE_URL}/api/todos/${activeTodoForFiles._id}/attachments/${att._id}`,
        { headers: getAuthHeaders() }
      );
      toast.success("Attachment removed from task.", "Deleted");
      await fetchTodos();
    } catch (err) {
      toast.error("Failed to remove task attachment.", "Error");
    }
  };

  return (
    <div className="dashboard-bg">
      <nav className="navbar navbar-expand-lg bg-white shadow-sm">
        <div className="container">
          <div className="brand-section">
            <img src={logo} alt="MindDesk" className="brand-logo" />
            <div className="brand-text">
              <h2 className="Gnapika-title">MindDesk</h2>
              <small className="Gnapika-tagline">
                Your ideas, always within reach.
              </small>
            </div>
          </div>

          <div className="d-flex align-items-center">
            <button
              className="btn btn-outline-secondary me-2"
              onClick={handleChangePassword}
            >
              Change Password
            </button>

            <button className="btn btn-danger" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container py-4">
        <div className="welcome-banner">
          <div>
            <h2>Hello, {user?.fullName} 👋</h2>
            <p>Welcome to your Digital Notes Dashboard.</p>
          </div>

          <img src={diary} alt="Diary" className="banner-img" />
        </div>

        <div className="row mt-4">
          <div className="col-lg-3 mb-3">
            <div className="stat-card">
              <h5>Total Notes</h5>
              <h2>{totalNotes}</h2>
            </div>
            <div className="stat-card mt-3 upcoming-card">
              <h5>Upcoming Deadline</h5>
              {upcomingNotes.length === 0 ? (
                <p className="text-muted mb-0">No deadlines in next 5 days</p>
              ) : (
                upcomingNotes.map((note) => (
                  <div key={note._id} className="deadline-item">
                    <span className="deadline-title">{note.title}</span>
                    <span className="deadline-date">
                      {new Date(note.deadline)
                        .toLocaleDateString("en-GB")
                        .replace(/\//g, "-")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="col-lg-9 mb-3">
            <div className="calendar-card">
              <Calendar
                value={date}
                onChange={setDate}
                tileContent={({ date }) => {
                  const hasDeadline = notes.some(
                    (note) =>
                      note.deadline &&
                      new Date(note.deadline).toDateString() ===
                        date.toDateString()
                  );

                  return hasDeadline ? <div className="deadline-dot"></div> : null;
                }}
              />

              <div className="todo-sheet">
                <h2 className="todo-title">TO DO TODAY</h2>

                <div className="todo-input-row">
                  <input
                    type="text"
                    placeholder="Add task..."
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddTodo();
                    }}
                  />

                  <button className="todo-add-btn" onClick={handleAddTodo}>
                    +
                  </button>
                </div>

                {todos.map((todo) => {
                  const attCount = todo.attachments ? todo.attachments.length : 0;
                  return (
                    <div
                      key={todo._id}
                      className="todo-line d-flex align-items-center justify-content-between"
                    >
                      <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => toggleTodo(todo._id)}
                        />

                        <span className={todo.completed ? "done" : ""}>
                          {todo.task}
                        </span>

                        {attCount > 0 && (
                          <span
                            className="todo-attachment-indicator"
                            title={`${attCount} file attachment(s)`}
                            onClick={() => setActiveTodoForFiles(todo)}
                          >
                            <i className="bi bi-paperclip"></i>
                            <span>{attCount}</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="todo-attachment-btn"
                        title="Attach or view files for this task"
                        onClick={() => setActiveTodoForFiles(todo)}
                      >
                        <i className="bi bi-paperclip"></i>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <MyNotes
          fetchTotalNotes={fetchTotalNotes}
          fetchUpcomingNotes={fetchUpcomingNotes}
        />
      </div>

      {/* Task Attachments Modal */}
      {activeTodoForFiles && (
        <div
          className="attachment-modal-overlay"
          onClick={() => setActiveTodoForFiles(null)}
        >
          <div
            className="attachment-modal-container"
            style={{ maxWidth: "600px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="attachment-modal-header">
              <div className="attachment-modal-title">
                <i className="bi bi-paperclip" style={{ color: "#8b5e3c" }}></i>
                <span>Task Attachments</span>
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => setActiveTodoForFiles(null)}
              ></button>
            </div>

            <div className="p-3" style={{ background: "#ffffff", maxHeight: "70vh", overflowY: "auto" }}>
              <div className="p-2 mb-3 rounded" style={{ background: "#faf7f2", border: "1px solid #ebd8c8" }}>
                <small className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.7rem" }}>
                  Task
                </small>
                <div className="fw-semibold text-dark">{activeTodoForFiles.task}</div>
              </div>

              <FileUpload
                todoId={activeTodoForFiles._id}
                onUploadSuccess={() => {
                  fetchTodos();
                }}
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
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveTodoForFiles(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
