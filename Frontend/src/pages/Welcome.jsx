import { Link } from "react-router-dom";
import bg from "./Welcome.png";

function Welcome() {
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
      {/* Top Navigation Bar - covers the top space and establishes strong branding */}
      <header className="md-welcome-nav">
        <div className="md-welcome-brand">
          <div className="md-brand-icon" style={{ width: 38, height: 38, fontSize: "1.2rem" }}>📓</div>
          <div>
            <div className="md-brand-name" style={{ color: "var(--md-text-dark)", fontSize: "1.3rem", lineHeight: 1.1 }}>MindDesk</div>
            <div className="md-brand-sub" style={{ color: "var(--md-text-muted)", fontSize: "0.68rem" }}>Digital Notes System</div>
          </div>
        </div>

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
      </header>

      {/* Main Hero Content */}
      <div className="md-welcome-hero">
        <div className="md-welcome-left">
          {/* Badge */}
          <div className="md-welcome-hero-badge">
            <i className="bi bi-stars" />
            The Smart Notes Workspace
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

          {/* CTA Buttons - High Contrast & Clearly Visible */}
          <div className="md-welcome-cta">
            <Link
              to="/login"
              className="md-welcome-btn-primary"
            >
              <i className="bi bi-arrow-right-circle-fill" />
              Get Started
            </Link>
            <Link
              to="/register"
              className="md-welcome-btn-secondary"
            >
              <i className="bi bi-person-plus-fill" />
              Create Account
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
      <footer style={{
        padding: "14px 8%",
        borderTop: "1px solid rgba(0,0,0,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
        background: "rgba(255,255,255,0.5)",
        backdropFilter: "blur(6px)",
      }}>
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
          minddesk43@gmail.com
        </a>
      </footer>
    </div>
  );
}

export default Welcome;