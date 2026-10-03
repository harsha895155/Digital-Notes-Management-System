import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import bg from "./Welcome.png";

function Welcome() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on ESC or window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      className="md-welcome-page"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Top Navigation Bar */}
      <header className="md-welcome-nav">
        <div className="md-welcome-brand">
          <div className="md-brand-icon" style={{ width: 38, height: 38, fontSize: "1.2rem" }}>📓</div>
          <div>
            <div className="md-brand-name" style={{ color: "var(--md-text-dark)", fontSize: "1.3rem", lineHeight: 1.1 }}>MindDesk</div>
            <div className="md-brand-sub" style={{ color: "var(--md-text-muted)", fontSize: "0.68rem" }}>Digital Notes System</div>
          </div>
        </div>

        {/* Desktop Nav Actions */}
        <div className="md-welcome-nav-actions">
          <a
            href="mailto:minddesk43@gmail.com"
            className="md-welcome-email-pill"
            title="Email MindDesk Support"
          >
            <i className="bi bi-envelope-fill" />
            <span>minddesk43@gmail.com</span>
          </a>
          <Link
            to="/login"
            className="md-btn md-btn-ghost md-btn-sm"
            style={{ fontWeight: 700, color: "var(--md-text-dark)", padding: "8px 16px" }}
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="md-btn md-btn-primary md-btn-sm"
            style={{ padding: "8px 18px", boxShadow: "0 2px 10px rgba(139, 79, 39, 0.25)" }}
          >
            <i className="bi bi-person-plus" />
            Sign Up Free
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="md-welcome-hamburger"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          <i className={`bi ${mobileMenuOpen ? "bi-x-lg" : "bi-list"}`} />
        </button>
      </header>

      {/* Mobile Nav Drawer & Backdrop */}
      {mobileMenuOpen && (
        <div
          className="md-welcome-drawer-overlay"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="md-welcome-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="md-welcome-drawer-header">
              <div className="md-welcome-brand">
                <div className="md-brand-icon" style={{ width: 34, height: 34, fontSize: "1.1rem" }}>📓</div>
                <div className="md-brand-name" style={{ color: "var(--md-text-dark)", fontSize: "1.15rem" }}>MindDesk</div>
              </div>
              <button
                className="md-welcome-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="md-welcome-drawer-links">
              <Link
                to="/login"
                className="md-btn md-btn-ghost md-btn-lg w-100"
                style={{ fontWeight: 700, color: "var(--md-text-dark)" }}
                onClick={() => setMobileMenuOpen(false)}
              >
                <i className="bi bi-box-arrow-in-right me-2" />
                Sign In
              </Link>
              <Link
                to="/register"
                className="md-btn md-btn-primary md-btn-lg w-100"
                style={{ boxShadow: "0 4px 14px rgba(139, 79, 39, 0.25)" }}
                onClick={() => setMobileMenuOpen(false)}
              >
                <i className="bi bi-person-plus-fill me-2" />
                Sign Up Free
              </Link>
            </div>

            <div className="md-welcome-drawer-footer">
              <div style={{ fontSize: "0.76rem", color: "var(--md-text-muted)", marginBottom: "8px", fontWeight: 600 }}>
                NEED HELP OR HAVE QUESTIONS?
              </div>
              <a
                href="mailto:minddesk43@gmail.com"
                className="md-welcome-email-pill w-100 text-center justify-content-center"
                title="Email MindDesk Support"
              >
                <i className="bi bi-envelope-fill me-1" />
                <span>minddesk43@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Hero Content */}
      <div className="md-welcome-hero">
        <div className="md-welcome-left">
          {/* Badge */}
          <div className="md-welcome-hero-badge">
            <i className="bi bi-stars" />
            <span>The Smart Notes Workspace</span>
          </div>

          {/* Headline */}
          <h1 className="md-welcome-hero-title">
            Turn Thoughts Into<br />
            <span>Lasting Knowledge.</span>
          </h1>

          <p className="md-welcome-hero-sub">
            MindDesk helps you capture notes, organize knowledge into categories,
            track deadlines, and boost daily productivity — all in one beautiful workspace.
          </p>

          {/* CTA Buttons */}
          <div className="md-welcome-cta">
            <Link
              to="/login"
              className="md-welcome-btn-primary"
            >
              <i className="bi bi-arrow-right-circle-fill" />
              <span>Get Started</span>
            </Link>
            <Link
              to="/register"
              className="md-welcome-btn-secondary"
            >
              <i className="bi bi-person-plus-fill" />
              <span>Create Account</span>
            </Link>
          </div>

          {/* Feature Cards */}
          <div className="md-welcome-features">
            <div className="md-welcome-feature-box">
              <span className="md-welcome-feature-icon">📝</span>
              <div className="md-welcome-feature-title">Create</div>
              <div className="md-welcome-feature-desc">Capture thoughts effortlessly</div>
            </div>
            <div className="md-welcome-feature-box">
              <span className="md-welcome-feature-icon">📁</span>
              <div className="md-welcome-feature-title">Organize</div>
              <div className="md-welcome-feature-desc">Notes in categories & folders</div>
            </div>
            <div className="md-welcome-feature-box">
              <span className="md-welcome-feature-icon">⏰</span>
              <div className="md-welcome-feature-title">Track</div>
              <div className="md-welcome-feature-desc">Deadlines on your calendar</div>
            </div>
            <div className="md-welcome-feature-box">
              <span className="md-welcome-feature-icon">🔒</span>
              <div className="md-welcome-feature-title">Secure</div>
              <div className="md-welcome-feature-desc">JWT protected accounts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <footer className="md-welcome-footer">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 28, height: 28, background: "var(--md-primary)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", color: "white" }}>
            📓
          </div>
          <span style={{ color: "var(--md-text)", fontSize: "0.84rem", fontWeight: 600 }}>
            MindDesk © {new Date().getFullYear()}
          </span>
        </div>
        <a
          href="mailto:minddesk43@gmail.com"
          className="md-welcome-email-pill"
          title="Contact MindDesk"
        >
          <i className="bi bi-envelope-fill" />
          <span>minddesk43@gmail.com</span>
        </a>
      </footer>
    </div>
  );
}

export default Welcome;