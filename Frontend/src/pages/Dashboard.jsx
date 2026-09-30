
import { useNavigate } from "react-router-dom";
import diary from "./image.png";
import MyNotes from "./MyNotes";
import { useState, useEffect } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import logo from "./logo.png";

function Dashboard() {
  const navigate = useNavigate();
const [totalNotes, setTotalNotes] = useState(0);
const [date, setDate] = useState(new Date());
  const user = JSON.parse(localStorage.getItem("user"));
  const [notes, setNotes] = useState([]);
const [upcomingNotes, setUpcomingNotes] =
  useState([]);
  const [task, setTask] = useState("");

const [todos, setTodos] = useState([]);
  const todayNotes = notes.filter(
  (note) =>
    note.deadline &&
    new Date(note.deadline)
      .toDateString() ===
    new Date().toDateString()
);
const fetchTodos = async () => {
  const user = JSON.parse(
    localStorage.getItem("user")
  );

  const res = await axios.get(
    `https://gnapika-backend.onrender.com/api/todos/${user.email}`
  );

  setTodos(res.data);
};
const handleAddTodo = async () => {
  if (!task.trim()) return;

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  await axios.post(
    "https://gnapika-backend.onrender.com/api/todos",
    {
      task,
      userEmail: user.email,
       taskDate: new Date()
      .toISOString()
      .split("T")[0],
    }
  );

  setTask("");

  fetchTodos();
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
  if (
    loginTime &&
    Date.now() - Number(loginTime) > 3600000
  ) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");

    alert("Session expired. Please login again.");
    navigate("/");
  }
}, [user, navigate]);

  const handleLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("loginTime");

  navigate("/");
};

const fetchTotalNotes = async () => {
  try {
    const user = JSON.parse(
      localStorage.getItem("user")
    );

    const res = await axios.get(
      `https://gnapika-backend.onrender.com/api/notes/${user.email}`
    );

    setTotalNotes(res.data.length);
  } catch (error) {
    console.log(error);
  }
};
const fetchUpcomingNotes = async () => {
  try {
    const user = JSON.parse(
      localStorage.getItem("user")
    );

    const res = await axios.get(
      `https://gnapika-backend.onrender.com/api/notes/${user.email}`
    );
    setNotes(res.data);

    const today = new Date();

    const nextFiveDays = new Date();
    nextFiveDays.setDate(
      today.getDate() + 5
    );

    const filtered = res.data.filter(
      (note) =>
        note.deadline &&
        new Date(note.deadline) >= today &&
        new Date(note.deadline) <=
          nextFiveDays
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
      `https://gnapika-backend.onrender.com/api/todos/${id}`
    );

    fetchTodos();
  } catch (error) {
    console.log(error);
  }
};
  return (
    <div className="dashboard-bg">

      <nav className="navbar navbar-expand-lg bg-white shadow-sm">
        <div className="container">

          <div className="brand-section">
  <img
    src={logo}
    alt="StudyHub"
    className="brand-logo"
  />

  <div className="brand-text">
    <h2 className="Gnapika-title">
       Gnapika
    </h2>

    <small className="Gnapika-tagline">
      Your ideas, always within reach.
    </small>
  </div>
</div>

          <div>
            <button
              className="btn btn-outline-secondary me-2"
              onClick={handleChangePassword}
            >
              Change Password
            </button>

            <button
              className="btn btn-danger"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>

        </div>
      </nav>

      <div className="container py-4">

        <div className="welcome-banner">

          <div>
            <h2>
              Hello, {user?.fullName} 👋
            </h2>

            <p>
              Welcome to your Digital Notes Dashboard.
            </p>
          </div>

          <img
            src={diary}
            alt="Diary"
            className="banner-img"
          />

        </div>

        <div className="row mt-4">

       <div className="col-lg-3 mb-3">
            <div className="stat-card">
              <h5>Total Notes</h5>
              <h2>{totalNotes}</h2>
            </div>
           <div className="stat-card mt-3 upcoming-card">
            <h5>Upcoming Deadline</h5>
             {
             upcomingNotes.length === 0 ? (
    <p className="text-muted mb-0">
      No deadlines in next 5 days
    </p> ): (
      upcomingNotes.map((note) => (
       
        <div
          key={note._id}
          className="deadline-item">
           
            <span className="deadline-title">
              {note.title}
            </span>
            <span className="deadline-date">
              {
                new Date(note.deadline)
  .toLocaleDateString("en-GB")
  .replace(/\//g, "-")
              }
            </span>
        </div>
      
      )
    ))}
  
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
        new Date(note.deadline)
          .toDateString() ===
        date.toDateString()
    );

    return hasDeadline ? (
      <div className="deadline-dot"></div>
    ) : null;
  }}
/>
<div className="todo-sheet">

  <h2 className="todo-title">
    TO DO TODAY
  </h2>

  <div className="todo-input-row">

    <input
      type="text"
      placeholder="Add task..."
      value={task}
      onChange={(e) =>
        setTask(e.target.value)
      }
    />

    <button
      className="todo-add-btn"
      onClick={handleAddTodo}
    >
      +
    </button>

  </div>

  {todos.map((todo) => (

    <div
      key={todo._id}
      className="todo-line"
    >

      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() =>
          toggleTodo(todo._id)
        }
      />

      <span
        className={
          todo.completed
            ? "done"
            : ""
        }
      >
        {todo.task}
      </span>

    </div>

  ))}

</div>
    </div>
  </div>
        </div>

      <MyNotes
        fetchTotalNotes={fetchTotalNotes}
        fetchUpcomingNotes={fetchUpcomingNotes}
      />

      </div>

    </div>
  );
}

export default Dashboard;
