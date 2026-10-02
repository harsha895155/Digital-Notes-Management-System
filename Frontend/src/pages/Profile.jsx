import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL, { getAuthHeaders } from "../api/config";
import { toast, showConfirm } from "../context/ToastContext";
import Layout from "../components/Layout";

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  const [stats, setStats] = useState({
    totalNotes: 0,
    categories: 0,
    todayTasks: 0,
    completedTasks: 0,
    upcomingDeadlines: 0,
  });

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    username: "",
    phone: "",
    bio: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Fetch full profile and real stats
  const fetchProfile = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE_URL}/api/profile`, {
        headers: getAuthHeaders(),
      });

      if (res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setEditForm({
          fullName: res.data.user.fullName || "",
          username: res.data.user.username || "",
          phone: res.data.user.phone || "",
          bio: res.data.user.bio || "",
        });
      }

      if (res.data?.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      if (err.response?.status === 401) {
        toast.warning("Session expired. Please log in again.", "Session Timeout");
        handleLogout();
        return;
      }
      setError("Unable to load your profile. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");
    toast.info("Logged out successfully.", "See You Soon");
    navigate("/login");
  };

  // Open Edit Modal
  const openEditModal = () => {
    if (user) {
      setEditForm({
        fullName: user.fullName || "",
        username: user.username || "",
        phone: user.phone || "",
        bio: user.bio || "",
      });
    }
    setIsEditModalOpen(true);
  };

  // Handle Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editForm.fullName.trim() || editForm.fullName.trim().length < 2) {
      toast.warning("Full name must be at least 2 characters.", "Validation Error");
      return;
    }

    try {
      setSaving(true);
      const res = await axios.put(
        `${API_BASE_URL}/api/profile`,
        editForm,
        { headers: getAuthHeaders() }
      );

      const updatedUser = res.data.user;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setIsEditModalOpen(false);
      toast.success("Profile updated successfully.", "Saved");
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error(
        err.response?.data?.message || "Failed to update profile. Please try again.",
        "Update Error"
      );
    } finally {
      setSaving(false);
    }
  };

  // Handle Avatar Selection & Upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(file.type)) {
      toast.warning("Please select a JPG, PNG, or WEBP image.", "Invalid File Type");
      e.target.value = "";
      return;
    }

    // Validate size (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.warning("Image must be smaller than 5 MB.", "File Too Large");
      e.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setUploadingAvatar(true);
      const res = await axios.post(`${API_BASE_URL}/api/profile/avatar`, formData, {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "multipart/form-data",
        },
      });

      const updatedUser = res.data.user;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Profile photo updated successfully!", "Photo Updated");
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error(
        err.response?.data?.message || "Failed to upload photo. Please try again.",
        "Upload Failed"
      );
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Remove Avatar
  const handleRemoveAvatar = async () => {
    const confirmed = await showConfirm({
      title: "Remove Profile Photo?",
      message: "Are you sure you want to remove your profile photo?",
      confirmText: "Remove",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!confirmed) return;

    try {
      setUploadingAvatar(true);
      const res = await axios.delete(`${API_BASE_URL}/api/profile/avatar`, {
        headers: getAuthHeaders(),
      });
      const updatedUser = res.data.user;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Profile photo removed.", "Photo Removed");
    } catch (err) {
      console.error("Avatar delete error:", err);
      toast.error("Failed to remove profile photo.", "Error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  // Formatted date
  const memberDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric",
      })
    : "Recently joined";

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="md-fadein" style={{ maxWidth: "1120px", margin: "0 auto" }}>
        {/* Header */}
        <div className="md-profile-header">
          <div>
            <h1 className="md-page-title" style={{ fontSize: "1.75rem", marginBottom: "4px" }}>
              Profile
            </h1>
            <p className="md-page-subtitle" style={{ fontSize: "0.9rem", color: "var(--md-text-muted)" }}>
              Manage your personal information and account settings.
            </p>
          </div>
          <button
            type="button"
            className="md-btn md-btn-primary"
            onClick={openEditModal}
            disabled={loading || !!error}
          >
            <i className="bi bi-pencil-square" />
            Edit Profile
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="md-card" style={{ padding: "48px 24px", textAlign: "center" }}>
            <div className="spinner-border" style={{ color: "var(--md-primary)", width: "2.5rem", height: "2.5rem" }} role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 style={{ marginTop: "16px", color: "var(--md-text-dark)", fontWeight: 600 }}>Loading Profile</h5>
            <p style={{ color: "var(--md-text-muted)", fontSize: "0.88rem" }}>Fetching your account information...</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="md-card" style={{ padding: "36px 24px", textAlign: "center", border: "1px solid var(--md-danger-light)" }}>
            <div style={{ fontSize: "2.5rem", color: "var(--md-danger)", marginBottom: "12px" }}>
              <i className="bi bi-exclamation-triangle" />
            </div>
            <h5 style={{ color: "var(--md-text-dark)", fontWeight: 700 }}>Unable to Load Profile</h5>
            <p style={{ color: "var(--md-text-muted)", marginBottom: "20px" }}>{error}</p>
            <button className="md-btn md-btn-primary" onClick={fetchProfile}>
              <i className="bi bi-arrow-clockwise" />
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Top 2-Column Section: Summary (Left) + Personal Info (Right) */}
            <div className="md-profile-grid" style={{ marginBottom: "24px" }}>
              
              {/* Left Column: Profile Summary Card */}
              <div className="md-card md-profile-summary-card">
                <div className="md-avatar-container">
                  <div className="md-avatar-lg-wrapper">
                    {user?.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt={user.fullName || "User Avatar"}
                        className="md-avatar-lg-img"
                      />
                    ) : (
                      <div className="md-avatar-lg">{initials}</div>
                    )}
                    {uploadingAvatar && (
                      <div className="md-avatar-loading-overlay">
                        <div className="spinner-border spinner-border-sm text-light" role="status" />
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleAvatarChange}
                  />

                  <div className="md-avatar-actions">
                    <button
                      type="button"
                      className="md-btn md-btn-sm md-btn-outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      title="Upload new photo"
                    >
                      <i className="bi bi-camera" />
                      {user?.profileImage ? "Change Photo" : "Upload Photo"}
                    </button>
                    {user?.profileImage && (
                      <button
                        type="button"
                        className="md-btn md-btn-sm md-btn-ghost text-danger"
                        onClick={handleRemoveAvatar}
                        disabled={uploadingAvatar}
                        title="Remove photo"
                      >
                        <i className="bi bi-trash3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="md-summary-info">
                  <h3 className="md-summary-name">{user?.fullName || "User"}</h3>
                  <div className="md-summary-email">{user?.email}</div>
                  {user?.username && (
                    <div className="md-summary-username">
                      <i className="bi bi-at" />
                      {user.username}
                    </div>
                  )}

                  <div className="md-summary-status">
                    <span className="md-status-dot" />
                    <span>{user?.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : "Active"}</span>
                  </div>

                  <div className="md-summary-divider" />

                  <div className="md-summary-meta">
                    <div className="md-meta-label">Member Since</div>
                    <div className="md-meta-val">
                      <i className="bi bi-calendar-check me-1" />
                      {memberDate}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="md-btn md-btn-primary"
                    style={{ width: "100%", marginTop: "16px" }}
                    onClick={openEditModal}
                  >
                    <i className="bi bi-pencil-square" />
                    Edit Profile
                  </button>
                </div>
              </div>

              {/* Right Column: Personal Information Card */}
              <div className="md-card md-profile-details-card">
                <div className="md-section-header" style={{ marginBottom: "20px" }}>
                  <div className="md-section-title">
                    <i className="bi bi-person-lines-fill" />
                    Personal Information
                  </div>
                  <button
                    type="button"
                    className="md-btn md-btn-ghost md-btn-sm"
                    onClick={openEditModal}
                  >
                    <i className="bi bi-pencil" />
                    Edit
                  </button>
                </div>

                <div className="md-info-list">
                  <div className="md-info-row">
                    <div className="md-info-label">
                      <i className="bi bi-person" />
                      Full Name
                    </div>
                    <div className="md-info-value fw-semibold">{user?.fullName || "—"}</div>
                  </div>

                  <div className="md-info-row">
                    <div className="md-info-label">
                      <i className="bi bi-envelope" />
                      Email Address
                    </div>
                    <div className="md-info-value">
                      <span>{user?.email || "—"}</span>
                      <span className="md-badge md-badge-accent ms-2" style={{ fontSize: "0.7rem" }}>Primary</span>
                    </div>
                  </div>

                  <div className="md-info-row">
                    <div className="md-info-label">
                      <i className="bi bi-at" />
                      Username
                    </div>
                    <div className="md-info-value">
                      {user?.username ? (
                        <span className="fw-semibold">@{user.username}</span>
                      ) : (
                        <span className="text-muted fst-italic">Not set</span>
                      )}
                    </div>
                  </div>

                  <div className="md-info-row">
                    <div className="md-info-label">
                      <i className="bi bi-telephone" />
                      Phone Number
                    </div>
                    <div className="md-info-value">
                      {user?.phone ? (
                        <span>{user.phone}</span>
                      ) : (
                        <span className="text-muted fst-italic">Not provided</span>
                      )}
                    </div>
                  </div>

                  <div className="md-info-row">
                    <div className="md-info-label">
                      <i className="bi bi-chat-square-text" />
                      Bio
                    </div>
                    <div className="md-info-value">
                      {user?.bio ? (
                        <span style={{ lineHeight: 1.5 }}>{user.bio}</span>
                      ) : (
                        <span className="text-muted fst-italic">No bio added yet. Tell us a bit about yourself!</span>
                      )}
                    </div>
                  </div>

                  <div className="md-info-row">
                    <div className="md-info-label">
                      <i className="bi bi-calendar3" />
                      Date Joined
                    </div>
                    <div className="md-info-value">{memberDate}</div>
                  </div>

                  <div className="md-info-row" style={{ borderBottom: "none" }}>
                    <div className="md-info-label">
                      <i className="bi bi-shield-check" />
                      Account Status
                    </div>
                    <div className="md-info-value">
                      <span className="md-badge md-badge-success">
                        <span className="md-status-dot me-1" />
                        {user?.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : "Active"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row 1: Real Activity Statistics */}
            <div className="md-card" style={{ marginBottom: "24px" }}>
              <div className="md-section-header" style={{ marginBottom: "18px" }}>
                <div className="md-section-title">
                  <i className="bi bi-bar-chart-line" />
                  Your Activity
                </div>
                <span className="md-badge md-badge-muted">Live Data</span>
              </div>

              <div className="md-stat-grid">
                <div className="md-stat-card">
                  <div className="md-stat-icon">📝</div>
                  <div className="md-stat-label">Total Notes</div>
                  <div className="md-stat-value">{stats.totalNotes}</div>
                  <div className="md-stat-change">Created by you</div>
                </div>

                <div className="md-stat-card">
                  <div className="md-stat-icon">📁</div>
                  <div className="md-stat-label">Categories</div>
                  <div className="md-stat-value">{stats.categories}</div>
                  <div className="md-stat-change">Active folders</div>
                </div>

                <div className="md-stat-card">
                  <div className="md-stat-icon">✅</div>
                  <div className="md-stat-label">Today's Tasks</div>
                  <div className="md-stat-value">{stats.completedTasks}/{stats.todayTasks}</div>
                  <div className="md-stat-change">Tasks completed</div>
                </div>

                <div className="md-stat-card">
                  <div className="md-stat-icon">⏰</div>
                  <div className="md-stat-label">Deadlines</div>
                  <div className="md-stat-value">{stats.upcomingDeadlines}</div>
                  <div className="md-stat-change">In next 5 days</div>
                </div>
              </div>
            </div>

            {/* Bottom Row 2: Security & Password Card */}
            <div className="md-card">
              <div className="md-security-panel">
                <div className="md-security-info">
                  <div className="md-section-title" style={{ marginBottom: "6px" }}>
                    <i className="bi bi-shield-lock" />
                    Security & Password
                  </div>
                  <p style={{ color: "var(--md-text-muted)", fontSize: "0.88rem", margin: 0 }}>
                    Keep your account secure by using a strong, unique password.
                  </p>
                  <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="fw-semibold text-dark" style={{ letterSpacing: "2px" }}>••••••••••••</span>
                    <span className="md-badge md-badge-muted" style={{ fontSize: "0.72rem" }}>Encrypted</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="md-btn md-btn-outline"
                  onClick={() => navigate("/change-password")}
                >
                  <i className="bi bi-key" />
                  Change Password
                </button>
              </div>
            </div>
          </>
        )}

        {/* Edit Profile Modal */}
        {isEditModalOpen && (
          <div className="attachment-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
            <div
              className="attachment-modal-container"
              style={{ maxWidth: "560px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="attachment-modal-header">
                <div className="attachment-modal-title">
                  <i className="bi bi-pencil-square" style={{ color: "var(--md-primary)" }} />
                  <span>Edit Profile</span>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setIsEditModalOpen(false)}
                />
              </div>

              <form onSubmit={handleSaveProfile} autoComplete="off">
                <div className="p-4" style={{ background: "var(--md-card)", maxHeight: "75vh", overflowY: "auto" }}>
                  <div className="md-form-group" style={{ marginBottom: "16px" }}>
                    <label className="md-form-label" htmlFor="edit-fullname">
                      Full Name <span style={{ color: "var(--md-danger)" }}>*</span>
                    </label>
                    <div className="md-form-control-icon">
                      <i className="bi bi-person" />
                      <input
                        id="edit-fullname"
                        type="text"
                        className="md-form-control"
                        required
                        value={editForm.fullName}
                        onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                        placeholder="e.g. Harsha Vardhan"
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div className="md-form-group" style={{ marginBottom: "16px" }}>
                    <label className="md-form-label" htmlFor="edit-username">
                      Username (Optional)
                    </label>
                    <div className="md-form-control-icon">
                      <i className="bi bi-at" />
                      <input
                        id="edit-username"
                        type="text"
                        className="md-form-control"
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                        placeholder="e.g. harshavardhan"
                        maxLength={50}
                      />
                    </div>
                    <small style={{ fontSize: "0.75rem", color: "var(--md-text-muted)", marginTop: "4px", display: "block" }}>
                      Letters, numbers, and underscores only.
                    </small>
                  </div>

                  <div className="md-form-group" style={{ marginBottom: "16px" }}>
                    <label className="md-form-label" htmlFor="edit-phone">
                      Phone Number (Optional)
                    </label>
                    <div className="md-form-control-icon">
                      <i className="bi bi-telephone" />
                      <input
                        id="edit-phone"
                        type="tel"
                        className="md-form-control"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="e.g. +91 98765 43210"
                        maxLength={25}
                      />
                    </div>
                  </div>

                  <div className="md-form-group" style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <label className="md-form-label" htmlFor="edit-bio">
                        Bio / About You (Optional)
                      </label>
                      <span style={{ fontSize: "0.75rem", color: "var(--md-text-muted)" }}>
                        {editForm.bio.length}/500
                      </span>
                    </div>
                    <textarea
                      id="edit-bio"
                      className="md-form-control"
                      rows={3}
                      style={{ paddingLeft: "14px" }}
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Share a short bio or description..."
                      maxLength={500}
                    />
                  </div>
                </div>

                <div className="attachment-modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button
                    type="button"
                    className="md-btn md-btn-ghost"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="md-btn md-btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg" />
                        Save Changes
                      </>
                    )}
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
