import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL, { getAuthHeaders } from "../api/config";
import { toast } from "../context/ToastContext";
import Layout from "../components/Layout";

// Helper to pick an intuitive emoji icon based on category name or selected icon
export const getCategoryIcon = (name = "") => {
  const lower = name.toLowerCase().trim();
  if (lower.includes("work") || lower.includes("office") || lower.includes("job")) return "💼";
  if (lower.includes("study") || lower.includes("college") || lower.includes("school") || lower.includes("exam") || lower.includes("course")) return "🎓";
  if (lower.includes("personal") || lower.includes("life") || lower.includes("myself") || lower.includes("home")) return "👤";
  if (lower.includes("idea") || lower.includes("think") || lower.includes("creative") || lower.includes("brainstorm")) return "💡";
  if (lower.includes("important") || lower.includes("star") || lower.includes("urgent") || lower.includes("priority")) return "⭐";
  if (lower.includes("code") || lower.includes("dev") || lower.includes("tech") || lower.includes("program") || lower.includes("software")) return "💻";
  if (lower.includes("project") || lower.includes("launch") || lower.includes("sprint")) return "🚀";
  if (lower.includes("money") || lower.includes("finance") || lower.includes("budget") || lower.includes("bank")) return "💰";
  if (lower.includes("book") || lower.includes("read") || lower.includes("novel")) return "📚";
  if (lower.includes("health") || lower.includes("fit") || lower.includes("gym") || lower.includes("workout")) return "🏃";
  if (lower.includes("travel") || lower.includes("trip") || lower.includes("vacation") || lower.includes("flight")) return "✈️";
  if (lower.includes("music") || lower.includes("song") || lower.includes("album")) return "🎵";
  return "📁";
};

export default function Categories() {
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
  const [categories, setCategories] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingCategory, setDeletingCategory] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Open dropdown ID for card menus
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Close card menus on outside click
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Fetch Categories & Notes
  const loadData = async () => {
    const token = localStorage.getItem("token");
    if (!token || !user?.email) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch categories and user's notes simultaneously
      const [catRes, notesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/categories/${user.email}`, {
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_BASE_URL}/api/notes/${user.email}`, {
          headers: getAuthHeaders(),
        }),
      ]);

      setCategories(catRes.data || []);
      setNotes(notesRes.data || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
      setError("Unable to load categories. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute map of note counts per category
  const noteCountMap = useMemo(() => {
    const counts = {};
    for (const note of notes) {
      if (note.category) {
        counts[note.category] = (counts[note.category] || 0) + 1;
      }
    }
    return counts;
  }, [notes]);

  // Filtered categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter((cat) => cat.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");
    toast.info("Logged out successfully.", "See You Soon");
    navigate("/");
  };

  // Navigate to Notes page filtered by category
  const handleViewCategoryNotes = (categoryName) => {
    navigate("/mynotes", { state: { category: categoryName } });
  };

  // Create Category
  const handleCreateCategory = async (e) => {
    e?.preventDefault();
    const trimmed = newCategoryName.trim();

    if (!trimmed) {
      toast.warning("Please enter a category name.", "Required Field");
      return;
    }

    if (trimmed.length > 50) {
      toast.warning("Category name cannot exceed 50 characters.", "Too Long");
      return;
    }

    // Check duplicate
    const isDuplicate = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      toast.error(`A category named "${trimmed}" already exists.`, "Duplicate Category");
      return;
    }

    try {
      setCreating(true);
      const res = await axios.post(
        `${API_BASE_URL}/api/categories`,
        { name: trimmed, userEmail: user.email },
        { headers: getAuthHeaders() }
      );

      if (res.data) {
        setCategories((prev) => [...prev, res.data]);
        setNewCategoryName("");
        setIsAddModalOpen(false);
        toast.success(`Category "${trimmed}" created successfully.`, "Category Added");
      }
    } catch (err) {
      console.error("Create category error:", err);
      toast.error(
        err.response?.data?.message || "Failed to create category.",
        "Error"
      );
    } finally {
      setCreating(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (cat, e) => {
    e?.stopPropagation();
    setActiveMenuId(null);
    setEditingCategory(cat);
    setEditCategoryName(cat.name);
  };

  // Save Category Edit
  const handleSaveEdit = async (e) => {
    e?.preventDefault();
    if (!editingCategory) return;
    const trimmed = editCategoryName.trim();

    if (!trimmed) {
      toast.warning("Category name cannot be empty.", "Required Field");
      return;
    }

    if (trimmed.length > 50) {
      toast.warning("Category name cannot exceed 50 characters.", "Too Long");
      return;
    }

    // Check duplicate against other categories
    const isDuplicate = categories.some(
      (c) => c._id !== editingCategory._id && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      toast.error(`A category named "${trimmed}" already exists.`, "Duplicate Category");
      return;
    }

    // If unchanged, just close
    if (trimmed === editingCategory.name) {
      setEditingCategory(null);
      return;
    }

    try {
      setSavingEdit(true);
      const oldName = editingCategory.name;

      const res = await axios.put(
        `${API_BASE_URL}/api/categories/${editingCategory._id}`,
        { name: trimmed },
        { headers: getAuthHeaders() }
      );

      // Update state locally
      setCategories((prev) =>
        prev.map((c) => (c._id === editingCategory._id ? { ...c, name: trimmed } : c))
      );

      // Update notes state locally
      setNotes((prevNotes) =>
        prevNotes.map((n) => (n.category === oldName ? { ...n, category: trimmed } : n))
      );

      toast.success(
        res.data?.message || `Category renamed to "${trimmed}".`,
        "Category Updated"
      );
      setEditingCategory(null);
    } catch (err) {
      console.error("Update category error:", err);
      toast.error(
        err.response?.data?.message || "Failed to update category.",
        "Error"
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (cat, e) => {
    e?.stopPropagation();
    setActiveMenuId(null);
    setDeletingCategory(cat);
  };

  // Confirm and Delete Category
  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;

    try {
      setDeleting(true);
      await axios.delete(`${API_BASE_URL}/api/categories/${deletingCategory._id}`, {
        headers: getAuthHeaders(),
      });

      const deletedName = deletingCategory.name;

      // Update local state
      setCategories((prev) => prev.filter((c) => c._id !== deletingCategory._id));
      setNotes((prev) => prev.filter((n) => n.category !== deletedName));

      toast.success(
        `Category "${deletedName}" and related notes deleted successfully.`,
        "Category Deleted"
      );
      setDeletingCategory(null);
    } catch (err) {
      console.error("Delete category error:", err);
      toast.error(
        err.response?.data?.message || "Failed to delete category.",
        "Error"
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="md-categories-container md-fadein">

        {/* Page Top Header Section */}
        <div className="md-categories-header">
          <div>
            <h1 className="md-categories-title">Categories</h1>
            <p className="md-categories-subtitle">
              Organize your notes into meaningful groups.
            </p>
          </div>
          <button
            type="button"
            className="md-btn md-btn-primary md-add-category-btn"
            onClick={() => {
              setNewCategoryName("");
              setIsAddModalOpen(true);
            }}
          >
            <i className="bi bi-plus-lg" />
            <span>Add Category</span>
          </button>
        </div>

        {/* Search & Stats Bar */}
        <div className="md-categories-toolbar">
          <div className="md-search-box">
            <i className="bi bi-search md-search-icon" />
            <input
              type="text"
              className="md-search-input"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search categories"
            />
            {searchQuery && (
              <button
                type="button"
                className="md-search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <i className="bi bi-x-circle-fill" />
              </button>
            )}
          </div>
          <div className="md-categories-count-badge">
            <span className="fw-semibold text-dark">{filteredCategories.length}</span>
            <span className="text-muted ms-1">
              {filteredCategories.length === 1 ? "category" : "categories"}
            </span>
          </div>
        </div>

        {/* ===================== LOADING STATE ===================== */}
        {loading && (
          <div className="md-categories-state-box">
            <div className="spinner-border text-brown" role="status" style={{ width: "2.5rem", height: "2.5rem" }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="mt-3 fw-bold text-dark">Loading Categories...</h5>
            <p className="text-muted">Fetching your categories and note counts.</p>
          </div>
        )}

        {/* ===================== ERROR STATE ===================== */}
        {!loading && error && (
          <div className="md-categories-state-box md-error-state">
            <div className="md-state-icon text-danger">
              <i className="bi bi-exclamation-triangle" />
            </div>
            <h5 className="mt-2 fw-bold text-dark">Unable to load categories</h5>
            <p className="text-muted">{error}</p>
            <button
              type="button"
              className="md-btn md-btn-primary mt-2"
              onClick={loadData}
            >
              <i className="bi bi-arrow-clockwise me-1" />
              Retry
            </button>
          </div>
        )}

        {/* ===================== EMPTY STATE (No Categories) ===================== */}
        {!loading && !error && categories.length === 0 && (
          <div className="md-categories-state-box md-empty-state">
            <div className="md-state-icon">📁</div>
            <h4 className="mt-3 fw-bold text-dark">No Categories Yet</h4>
            <p className="text-muted" style={{ maxWidth: 420 }}>
              Create categories to organize your notes and keep your workspace clean.
            </p>
            <button
              type="button"
              className="md-btn md-btn-primary mt-2"
              onClick={() => {
                setNewCategoryName("");
                setIsAddModalOpen(true);
              }}
            >
              <i className="bi bi-plus-lg me-1" />
              Create Category
            </button>
          </div>
        )}

        {/* ===================== NO SEARCH RESULTS ===================== */}
        {!loading && !error && categories.length > 0 && filteredCategories.length === 0 && (
          <div className="md-categories-state-box md-empty-state">
            <div className="md-state-icon">🔍</div>
            <h5 className="mt-3 fw-bold text-dark">No matching categories</h5>
            <p className="text-muted">
              No categories found matching "{searchQuery}".
            </p>
            <button
              type="button"
              className="md-btn md-btn-ghost mt-2"
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </button>
          </div>
        )}

        {/* ===================== CATEGORIES GRID ===================== */}
        {!loading && !error && filteredCategories.length > 0 && (
          <div className="md-categories-grid">
            {filteredCategories.map((cat) => {
              const count = noteCountMap[cat.name] || 0;
              const folderCount = (cat.folders || []).length;
              const icon = getCategoryIcon(cat.name);
              const isMenuOpen = activeMenuId === cat._id;

              return (
                <div
                  key={cat._id}
                  className="md-category-card"
                  onClick={() => handleViewCategoryNotes(cat.name)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleViewCategoryNotes(cat.name);
                  }}
                >
                  {/* Card Header: Icon + Menu */}
                  <div className="md-category-card-header">
                    <div className="md-category-card-icon" title={cat.name}>
                      {icon}
                    </div>

                    {/* Actions Menu */}
                    <div
                      className="md-category-menu-wrapper"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="md-category-menu-btn"
                        aria-label="Category options"
                        aria-expanded={isMenuOpen}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : cat._id);
                        }}
                      >
                        <i className="bi bi-three-dots-vertical" />
                      </button>

                      {isMenuOpen && (
                        <div className="md-category-dropdown">
                          <button
                            type="button"
                            className="md-dropdown-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              handleViewCategoryNotes(cat.name);
                            }}
                          >
                            <i className="bi bi-journal-text me-2" />
                            View Notes
                          </button>
                          <button
                            type="button"
                            className="md-dropdown-item"
                            onClick={(e) => openEditModal(cat, e)}
                          >
                            <i className="bi bi-pencil me-2" />
                            Edit Category
                          </button>
                          <div className="md-dropdown-divider" />
                          <button
                            type="button"
                            className="md-dropdown-item text-danger"
                            onClick={(e) => openDeleteModal(cat, e)}
                          >
                            <i className="bi bi-trash3 me-2" />
                            Delete Category
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="md-category-card-body">
                    <h3 className="md-category-name" title={cat.name}>
                      {cat.name}
                    </h3>
                    <div className="md-category-meta">
                      <span className="md-category-note-count">
                        <i className="bi bi-file-text me-1" />
                        {count} {count === 1 ? "Note" : "Notes"}
                      </span>
                      {folderCount > 0 && (
                        <span className="md-category-folder-count">
                          <i className="bi bi-folder2 me-1" />
                          {folderCount} {folderCount === 1 ? "folder" : "folders"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: View Notes Action */}
                  <div className="md-category-card-footer">
                    <span className="md-view-notes-link">
                      View Notes
                      <i className="bi bi-arrow-right ms-1" />
                    </span>
                    <div className="md-category-quick-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="md-quick-action-btn"
                        title="Edit category"
                        aria-label={`Edit ${cat.name}`}
                        onClick={(e) => openEditModal(cat, e)}
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        type="button"
                        className="md-quick-action-btn md-quick-action-delete"
                        title="Delete category"
                        aria-label={`Delete ${cat.name}`}
                        onClick={(e) => openDeleteModal(cat, e)}
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ===================== ADD CATEGORY MODAL ===================== */}
      {isAddModalOpen && (
        <div
          className="md-modal-backdrop"
          onClick={() => {
            if (!creating) setIsAddModalOpen(false);
          }}
        >
          <div
            className="md-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-category-title"
          >
            <div className="md-modal-header">
              <div className="d-flex align-items-center gap-2">
                <div className="md-modal-icon">📁</div>
                <h5 className="md-modal-title" id="add-category-title">
                  Create Category
                </h5>
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Close modal"
                disabled={creating}
                onClick={() => setIsAddModalOpen(false)}
              />
            </div>

            <form onSubmit={handleCreateCategory}>
              <div className="md-modal-body">
                <label className="md-form-label" htmlFor="newCategoryName">
                  Category Name <span className="text-danger">*</span>
                </label>
                <input
                  id="newCategoryName"
                  type="text"
                  className="md-form-control"
                  placeholder="e.g. Work, Study, Personal, Ideas"
                  value={newCategoryName}
                  maxLength={50}
                  autoFocus
                  disabled={creating}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <div className="d-flex justify-content-between mt-1 text-muted" style={{ fontSize: "0.75rem" }}>
                  <span>Give your notes a clear organizing topic.</span>
                  <span>{newCategoryName.length}/50</span>
                </div>
              </div>

              <div className="md-modal-footer">
                <button
                  type="button"
                  className="md-btn md-btn-ghost"
                  disabled={creating}
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="md-btn md-btn-primary"
                  disabled={creating || !newCategoryName.trim()}
                >
                  {creating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" />
                      Creating...
                    </>
                  ) : (
                    "Create Category"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== EDIT CATEGORY MODAL ===================== */}
      {editingCategory && (
        <div
          className="md-modal-backdrop"
          onClick={() => {
            if (!savingEdit) setEditingCategory(null);
          }}
        >
          <div
            className="md-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-category-title"
          >
            <div className="md-modal-header">
              <div className="d-flex align-items-center gap-2">
                <div className="md-modal-icon">✏️</div>
                <h5 className="md-modal-title" id="edit-category-title">
                  Edit Category
                </h5>
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Close modal"
                disabled={savingEdit}
                onClick={() => setEditingCategory(null)}
              />
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="md-modal-body">
                <label className="md-form-label" htmlFor="editCategoryName">
                  Category Name <span className="text-danger">*</span>
                </label>
                <input
                  id="editCategoryName"
                  type="text"
                  className="md-form-control"
                  placeholder="Enter new category name..."
                  value={editCategoryName}
                  maxLength={50}
                  autoFocus
                  disabled={savingEdit}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                />
                <div className="d-flex justify-content-between mt-1 text-muted" style={{ fontSize: "0.75rem" }}>
                  <span>Renaming this category will also update all notes in it.</span>
                  <span>{editCategoryName.length}/50</span>
                </div>
              </div>

              <div className="md-modal-footer">
                <button
                  type="button"
                  className="md-btn md-btn-ghost"
                  disabled={savingEdit}
                  onClick={() => setEditingCategory(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="md-btn md-btn-primary"
                  disabled={savingEdit || !editCategoryName.trim()}
                >
                  {savingEdit ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== DELETE CONFIRMATION MODAL ===================== */}
      {deletingCategory && (
        <div
          className="md-modal-backdrop"
          onClick={() => {
            if (!deleting) setDeletingCategory(null);
          }}
        >
          <div
            className="md-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
          >
            <div className="md-modal-header">
              <div className="d-flex align-items-center gap-2">
                <div className="md-modal-icon text-danger">⚠️</div>
                <h5 className="md-modal-title text-danger" id="delete-category-title">
                  Delete Category?
                </h5>
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Close modal"
                disabled={deleting}
                onClick={() => setDeletingCategory(null)}
              />
            </div>

            <div className="md-modal-body">
              <p className="mb-2">
                Are you sure you want to delete <strong>"{deletingCategory.name}"</strong>?
              </p>

              {(noteCountMap[deletingCategory.name] || 0) > 0 ? (
                <div className="alert alert-warning d-flex align-items-start gap-2 mb-0" style={{ fontSize: "0.85rem" }}>
                  <i className="bi bi-exclamation-triangle-fill flex-shrink-0 mt-1" />
                  <div>
                    This category contains{" "}
                    <strong>
                      {noteCountMap[deletingCategory.name]}{" "}
                      {noteCountMap[deletingCategory.name] === 1 ? "note" : "notes"}
                    </strong>
                    . Deleting this category will permanently delete these notes and all attached files.
                  </div>
                </div>
              ) : (
                <p className="text-muted small mb-0">
                  This category contains 0 notes. It can be safely deleted.
                </p>
              )}
            </div>

            <div className="md-modal-footer">
              <button
                type="button"
                className="md-btn md-btn-ghost"
                disabled={deleting}
                onClick={() => setDeletingCategory(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="md-btn btn btn-danger"
                style={{ borderRadius: "10px", padding: "8px 18px" }}
                disabled={deleting}
                onClick={handleConfirmDelete}
              >
                {deleting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" />
                    Deleting...
                  </>
                ) : (
                  "Delete Category"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
