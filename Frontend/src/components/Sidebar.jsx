import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { path: "/dashboard",   icon: "bi-grid-1x2",     label: "Dashboard" },
  { path: "/mynotes",     icon: "bi-journal-text", label: "Notes" },
  { path: "/categories",  icon: "bi-folder",       label: "Categories" },
  { path: "/calendar",    icon: "bi-calendar3",    label: "Calendar" },
  { path: "/tasks",       icon: "bi-check2-square",label: "Today's Tasks" },
  { path: "/profile",     icon: "bi-person",       label: "Profile" },
];

const BOTTOM_ITEMS = [
  { path: "/change-password", icon: "bi-shield-lock", label: "Change Password" },
];

export default function Sidebar({ user, onLogout, isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const isActive = (path) => location.pathname === path;

  const handleNav = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`md-sidebar-overlay${isOpen ? " open" : ""}`}
        onClick={onClose}
      />

      <aside className={`md-sidebar${isOpen ? " open" : ""}`}>
        {/* Brand */}
        <div className="md-brand">
          <div className="md-brand-header-row">
            <div className="md-brand-logo" style={{ cursor: "pointer", margin: 0 }} onClick={() => handleNav("/dashboard")}>
              <div className="md-brand-icon">📓</div>
              <div>
                <div className="md-brand-name">MindDesk</div>
                <div className="md-brand-sub">Notes System</div>
              </div>
            </div>
            <button
              type="button"
              className="md-sidebar-close-btn"
              onClick={onClose}
              aria-label="Close sidebar menu"
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>

          {/* User chip - clickable to profile */}
          {user && (
            <div
              className={`md-sidebar-user${isActive("/profile") ? " active-user" : ""}`}
              onClick={() => handleNav("/profile")}
              title="View & Edit Profile"
              style={{ cursor: "pointer" }}
            >
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.fullName || "User"}
                  className="md-avatar-img"
                />
              ) : (
                <div className="md-avatar">{initials}</div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="md-sidebar-user-name">
                  {user.fullName || user.email}
                </div>
                <div className="md-sidebar-user-status">
                  <span className="md-status-dot" />
                  {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : "Active"}
                </div>
              </div>
              <i className="bi bi-chevron-right" style={{ fontSize: "0.75rem", opacity: 0.5, color: "#fff" }} />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="md-nav">
          <div className="md-nav-section">
            <span className="md-nav-label">Main Menu</span>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.path}
                className={`md-nav-item${isActive(item.path) ? " active" : ""}`}
                onClick={() => handleNav(item.path)}
              >
                <i className={`bi ${item.icon}`} />
                {item.label}
              </button>
            ))}
          </div>

          <div className="md-nav-section" style={{ marginTop: "8px" }}>
            <span className="md-nav-label">Settings</span>
            {BOTTOM_ITEMS.map((item) => (
              <button
                key={item.path}
                className={`md-nav-item${isActive(item.path) ? " active" : ""}`}
                onClick={() => handleNav(item.path)}
              >
                <i className={`bi ${item.icon}`} />
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Bottom */}
        <div className="md-sidebar-bottom">
          <button className="md-logout-btn" onClick={onLogout}>
            <i className="bi bi-box-arrow-left" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
