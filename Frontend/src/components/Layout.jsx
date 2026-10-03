import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

const PAGE_TITLES = {
  "/dashboard":       { title: "Dashboard", subtitle: "Welcome back — here's your overview" },
  "/mynotes":         { title: "My Notes", subtitle: "Manage and organize your notes" },
  "/categories":      { title: "Categories", subtitle: "Organize your notes into meaningful groups." },
  "/calendar":        { title: "Calendar", subtitle: "View deadlines on your calendar" },
  "/tasks":           { title: "Today's Tasks", subtitle: "Manage and complete your daily to-dos" },
  "/profile":         { title: "Profile", subtitle: "Manage your personal information and account settings" },
  "/change-password": { title: "Change Password", subtitle: "Keep your account secure" },
};

export default function Layout({ user, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const pageInfo = PAGE_TITLES[location.pathname] || {
    title: "MindDesk",
    subtitle: "Digital Notes Management",
  };

  return (
    <div className="md-app">
      <Sidebar
        user={user}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="md-main">
        {/* Top Bar */}
        <header className="md-topbar">
          <div className="md-topbar-left">
            <button
              className="md-hamburger"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              <i className="bi bi-list" />
            </button>
            <div>
              <div className="md-topbar-title">{pageInfo.title}</div>
              <div className="md-topbar-subtitle">{pageInfo.subtitle}</div>
            </div>
          </div>
          <div className="md-topbar-right">
            <span className="md-topbar-date">
              <i className="bi bi-clock me-1" style={{ fontSize: "0.72rem" }} />
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="md-page-content md-fadein">
          {children}
        </main>
      </div>
    </div>
  );
}
