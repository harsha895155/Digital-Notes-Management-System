import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api, { API_BASE_URL, getAuthHeaders } from "../api/config";
import { toast, showConfirm } from "../context/ToastContext";
import Layout from "../components/Layout";
import AttachmentPreview from "../components/AttachmentPreview";
import { formatFileSize, getFileInfo, downloadAttachment } from "../utils/fileUtils";
import { getOfflineStore, saveOfflineStore, queueOfflineMutation } from "../utils/offlineSync";

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

  // Selection & Filter States (matching Note Page layout in screenshot)
  const [selectedCategory, setSelectedCategory] = useState("All Notes");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [search, setSearch] = useState("");

  // Subfolder creation & accordion states
  const [expandedCategories, setExpandedCategories] = useState({});
  const [activeFolderInputCatId, setActiveFolderInputCatId] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");

  // Quick Inline Add Category state
  const [quickCatName, setQuickCatName] = useState("");
  const [isQuickAddingCat, setIsQuickAddingCat] = useState(false);

  // Modals States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingCategory, setDeletingCategory] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Attachments preview & card expansion
  const [expandedCards, setExpandedCards] = useState({});
  const [previewAttachment, setPreviewAttachment] = useState(null);

  // Fetch Categories & Notes (Instant Cache-First + Stale-While-Revalidate)
  const loadData = async () => {
    const token = localStorage.getItem("token");
    if (!token || !user?.email) {
      navigate("/login");
      return;
    }

    // Step 1: Immediately read cached data from IndexedDB (0ms wait)
    try {
      const cachedCats = await getOfflineStore("categories");
      const cachedNotes = await getOfflineStore("notes");
      if (cachedCats && cachedCats.length > 0) {
        setCategories(cachedCats);
        if (cachedNotes) setNotes(cachedNotes);
        setLoading(false); // Instant render without waiting!
      }
    } catch (e) {
      console.warn("Could not read offline store:", e);
    }

    // Step 2: Fetch fresh data from backend
    try {
      const [catRes, notesRes] = await Promise.all([
        api.get(`/api/categories/${user.email}`),
        api.get(`/api/notes/${user.email}`),
      ]);

      if (catRes && catRes.data) {
        setCategories(catRes.data);
        saveOfflineStore("categories", catRes.data);
      }
      if (notesRes && notesRes.data) {
        setNotes(notesRes.data);
        saveOfflineStore("notes", notesRes.data);
      }
      setError(null);
    } catch (err) {
      console.warn("apiClient request for categories failed or timed out:", err);
      // Fallback: Try native fetch with token
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [cRes, nRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/categories/${encodeURIComponent(user.email)}`, { headers }).then(r => r.ok ? r.json() : null),
          fetch(`${API_BASE_URL}/api/notes/${encodeURIComponent(user.email)}`, { headers }).then(r => r.ok ? r.json() : null)
        ]);
        if (Array.isArray(cRes)) {
          setCategories(cRes);
          saveOfflineStore("categories", cRes);
          if (Array.isArray(nRes)) {
            setNotes(nRes);
            saveOfflineStore("notes", nRes);
          }
          setError(null);
          return;
        }
      } catch (fallbackErr) {
        console.warn("Direct fetch fallback also failed:", fallbackErr);
      }

      setCategories((prev) => {
        if (prev.length === 0) {
          setError(
            !navigator.onLine
              ? "You are currently offline. Any categories saved locally will show here."
              : "Connecting to server is taking a moment. Click Retry below."
          );
        }
        return prev;
      });
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

  // Filter notes according to search, selected category, and selected folder
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        note.title?.toLowerCase().includes(q) ||
        note.description?.toLowerCase().includes(q) ||
        (note.folder && note.folder.toLowerCase().includes(q));

      const matchesCategory =
        selectedCategory === "All Notes" ? true : note.category === selectedCategory;

      let matchesFolder = true;
      if (selectedFolder === "__general__") {
        matchesFolder = !note.folder;
      } else if (selectedFolder) {
        matchesFolder = note.folder === selectedFolder;
      }

      return matchesSearch && matchesCategory && matchesFolder;
    });
  }, [notes, search, selectedCategory, selectedFolder]);

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loginTime");
    toast.info("Logged out successfully.", "See You Soon");
    navigate("/");
  };

  // Toggle Category Expand for Subfolders
  const toggleCategoryExpand = (catId, e) => {
    if (e) e.stopPropagation();
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Create Subfolder in Category
  const handleCreateFolder = async (categoryId, folderName) => {
    const trimmed = (folderName || "").trim();
    if (!trimmed) {
      toast.warning("Please enter a folder name.", "Missing Folder Name");
      return;
    }

    try {
      await api.post(`/api/categories/${categoryId}/folders`, { name: trimmed });

      const res = await api.get(`/api/categories/${user.email}`);
      const updated = res.data || [];
      setCategories(updated);
      saveOfflineStore("categories", updated);
      setActiveFolderInputCatId(null);
      setNewFolderName("");
      setExpandedCategories((prev) => ({ ...prev, [categoryId]: true }));
      toast.success(`Folder "${trimmed}" created successfully.`, "Folder Created");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create folder.", "Error");
    }
  };

  // Delete Subfolder from Category
  const handleDeleteFolder = async (categoryId, folderId, folderName) => {
    const confirmed = await showConfirm({
      title: "Delete Folder?",
      message: `Delete folder "${folderName}"? Notes in this folder will remain in the category without a folder.`,
      confirmText: "Delete Folder",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      await api.delete(`/api/categories/${categoryId}/folders/${folderId}`);

      const [catRes, notesRes] = await Promise.all([
        api.get(`/api/categories/${user.email}`),
        api.get(`/api/notes/${user.email}`),
      ]);

      const updatedCats = catRes.data || [];
      const updatedNotes = notesRes.data || [];
      setCategories(updatedCats);
      setNotes(updatedNotes);
      saveOfflineStore("categories", updatedCats);
      saveOfflineStore("notes", updatedNotes);

      if (selectedFolder === folderName) setSelectedFolder("");
      toast.success(`Folder "${folderName}" removed successfully.`, "Folder Deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete folder.", "Error");
    }
  };

  // Create Category (from Modal or Quick Add)
  const handleCreateCategory = async (nameToCreate) => {
    const trimmed = (nameToCreate || newCategoryName || quickCatName).trim();

    if (!trimmed) {
      toast.warning("Please enter a category name.", "Required Field");
      return;
    }

    if (trimmed.length > 50) {
      toast.warning("Category name cannot exceed 50 characters.", "Too Long");
      return;
    }

    const isDuplicate = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      toast.error(`A category named "${trimmed}" already exists.`, "Duplicate Category");
      return;
    }

    // Offline handling
    if (!navigator.onLine) {
      const localCat = {
        _id: `local_cat_${Date.now()}`,
        name: trimmed,
        userEmail: user.email,
        folders: [],
        createdAt: new Date().toISOString(),
      };
      const updated = [...categories, localCat];
      setCategories(updated);
      saveOfflineStore("categories", updated);
      await queueOfflineMutation({
        entity: "categories",
        action: "CREATE",
        data: { name: trimmed, userEmail: user.email },
      });
      setNewCategoryName("");
      setQuickCatName("");
      setIsQuickAddingCat(false);
      setIsAddModalOpen(false);
      setSelectedCategory(trimmed);
      toast.info(`Category "${trimmed}" saved locally (Offline mode).`, "Category Added");
      return;
    }

    try {
      setCreating(true);
      const res = await api.post(`/api/categories`, {
        name: trimmed,
        userEmail: user.email,
      });

      if (res.data) {
        const updated = [...categories, res.data];
        setCategories(updated);
        saveOfflineStore("categories", updated);
        setNewCategoryName("");
        setQuickCatName("");
        setIsQuickAddingCat(false);
        setIsAddModalOpen(false);
        setSelectedCategory(trimmed);
        toast.success(`Category "${trimmed}" created successfully.`, "Category Added");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create category.", "Error");
    } finally {
      setCreating(false);
    }
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

    const isDuplicate = categories.some(
      (c) => c._id !== editingCategory._id && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      toast.error(`A category named "${trimmed}" already exists.`, "Duplicate Category");
      return;
    }

    if (trimmed === editingCategory.name) {
      setEditingCategory(null);
      return;
    }

    try {
      setSavingEdit(true);
      const oldName = editingCategory.name;

      const res = await api.put(`/api/categories/${editingCategory._id}`, {
        name: trimmed,
      });

      const updatedCats = categories.map((c) =>
        c._id === editingCategory._id ? { ...c, name: trimmed } : c
      );
      const updatedNotes = notes.map((n) =>
        n.category === oldName ? { ...n, category: trimmed } : n
      );

      setCategories(updatedCats);
      setNotes(updatedNotes);
      saveOfflineStore("categories", updatedCats);
      saveOfflineStore("notes", updatedNotes);

      if (selectedCategory === oldName) {
        setSelectedCategory(trimmed);
      }

      toast.success(res.data?.message || `Category renamed to "${trimmed}".`, "Category Updated");
      setEditingCategory(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update category.", "Error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Confirm and Delete Category
  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;

    try {
      setDeleting(true);
      await api.delete(`/api/categories/${deletingCategory._id}`);

      const deletedName = deletingCategory.name;
      const updatedCats = categories.filter((c) => c._id !== deletingCategory._id);
      const updatedNotes = notes.filter((n) => n.category !== deletedName);

      setCategories(updatedCats);
      setNotes(updatedNotes);
      saveOfflineStore("categories", updatedCats);
      saveOfflineStore("notes", updatedNotes);

      if (selectedCategory === deletedName) {
        setSelectedCategory("All Notes");
        setSelectedFolder("");
      }

      toast.success(
        `Category "${deletedName}" and related notes deleted successfully.`,
        "Category Deleted"
      );
      setDeletingCategory(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete category.", "Error");
    } finally {
      setDeleting(false);
    }
  };

  // Toggle card attachments expanded
  const toggleCardExpanded = (noteId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [noteId]: !prev[noteId],
    }));
  };

  // Navigate to Notes page with note/category
  const handleOpenInNotes = (catName) => {
    navigate("/mynotes", { state: { category: catName } });
  };

  return (
    <Layout user={user} onLogout={handleLogout}>
      <div className="md-fadein" style={{ width: "100%", maxWidth: "100%" }}>

        {/* Top Header */}
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <h2 className="mb-0" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "var(--md-text-dark)" }}>
              Categories
            </h2>
            <p className="text-muted small mb-0">Organize your notes into meaningful groups.</p>
          </div>
          <button
            type="button"
            className="md-btn md-btn-primary"
            onClick={() => {
              setNewCategoryName("");
              setIsAddModalOpen(true);
            }}
          >
            <i className="bi bi-plus-lg me-1" />
            Add Category
          </button>
        </div>

        {/* ===================== LOADING STATE ===================== */}
        {loading && (
          <div className="md-categories-state-box">
            <div className="spinner-border text-brown" role="status" style={{ width: "2.5rem", height: "2.5rem" }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="mt-3 fw-bold text-dark">Loading Categories...</h5>
            <p className="text-muted">Fetching your categories and notes.</p>
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
            <button type="button" className="md-btn md-btn-primary mt-2" onClick={loadData}>
              <i className="bi bi-arrow-clockwise me-1" /> Retry
            </button>
          </div>
        )}

        {/* ===================== MAIN TWO-COLUMN NOTES LAYOUT ===================== */}
        {!loading && !error && (
          <div className="notes-layout mt-3">

            {/* LEFT COLUMN: Categories Card (Matching image from Note page) */}
            <div className="sidebar">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h4 className="mb-0">Categories</h4>
                <span className="badge bg-secondary">{notes.length} notes</span>
              </div>

              {/* All Notes Option */}
              <div
                className={`category-item ${selectedCategory === "All Notes" ? "active-category" : ""}`}
                onClick={() => {
                  setSelectedCategory("All Notes");
                  setSelectedFolder("");
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <span>📁</span>
                  <span className="fw-semibold">All Notes</span>
                </div>
                <span className="badge rounded-pill bg-light text-dark small">
                  {notes.length}
                </span>
              </div>

              {/* Categories with Subfolders & Actions */}
              {categories.map((cat) => {
                const catNotes = notes.filter((n) => n.category === cat.name);
                const isSelected = selectedCategory === cat.name && !selectedFolder;
                const isCatActive = selectedCategory === cat.name;
                const isExpanded = expandedCategories[cat._id] ?? isCatActive;
                const isAddingFolder = activeFolderInputCatId === cat._id;
                const catFolders = cat.folders || [];

                return (
                  <div key={cat._id} className="category-group">
                    <div
                      className={`category-item ${
                        isSelected ? "active-category" : isCatActive ? "category-parent-active" : ""
                      }`}
                    >
                      {/* Expand/Collapse Chevron + Category Name */}
                      <div
                        className="d-flex align-items-center gap-2 flex-grow-1"
                        style={{ cursor: "pointer", minWidth: 0 }}
                        onClick={() => {
                          setSelectedCategory(cat.name);
                          setSelectedFolder("");
                          setExpandedCategories((prev) => ({
                            ...prev,
                            [cat._id]: true,
                          }));
                        }}
                      >
                        {catFolders.length > 0 ? (
                          <button
                            type="button"
                            className="btn-chevron"
                            onClick={(e) => toggleCategoryExpand(cat._id, e)}
                            title={isExpanded ? "Collapse folders" : "Expand folders"}
                          >
                            <i className={`bi bi-chevron-${isExpanded ? "down" : "right"}`} />
                          </button>
                        ) : (
                          <span className="chevron-spacer" />
                        )}
                        <span>📁</span>
                        <span className="fw-semibold category-label text-truncate" title={cat.name}>
                          {cat.name}
                        </span>
                      </div>

                      {/* Actions: Notes count, "+ Folder" button, Edit button, Delete button */}
                      <div className="d-flex align-items-center gap-1 flex-shrink-0">
                        <span className="badge rounded-pill bg-light text-dark small" title={`${catNotes.length} note(s)`}>
                          {catNotes.length}
                        </span>

                        {/* Quick "+ Folder" button */}
                        <button
                          type="button"
                          className="btn-icon"
                          title={`Create new folder in "${cat.name}"`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCategories((prev) => ({ ...prev, [cat._id]: true }));
                            setActiveFolderInputCatId(isAddingFolder ? null : cat._id);
                            setNewFolderName("");
                          }}
                        >
                          <i className="bi bi-folder-plus" />
                        </button>

                        {/* Edit Category Button */}
                        <button
                          type="button"
                          className="btn-icon"
                          title={`Edit category "${cat.name}"`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategory(cat);
                            setEditCategoryName(cat.name);
                          }}
                        >
                          <i className="bi bi-pencil" />
                        </button>

                        {/* Delete Category Button */}
                        <button
                          type="button"
                          className="btn btn-sm btn-danger btn-icon"
                          title={`Delete category "${cat.name}"`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingCategory(cat);
                          }}
                        >
                          <i className="bi bi-x-lg" />
                        </button>
                      </div>
                    </div>

                    {/* Inline "New Folder in Category" Input */}
                    {isAddingFolder && (
                      <div className="subfolder-create-inline p-2">
                        <div className="input-group input-group-sm">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder={`New folder in ${cat.name}...`}
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleCreateFolder(cat._id, newFolderName);
                              } else if (e.key === "Escape") {
                                setActiveFolderInputCatId(null);
                              }
                            }}
                            autoFocus
                          />
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleCreateFolder(cat._id, newFolderName)}
                          >
                            Add
                          </button>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setActiveFolderInputCatId(null)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Folders List (Nested inside Category) */}
                    {isExpanded && (
                      <div className="subfolder-list">
                        {/* All in Category Option */}
                        <div
                          className={`subfolder-item ${
                            selectedCategory === cat.name && !selectedFolder ? "active-subfolder" : ""
                          }`}
                          onClick={() => {
                            setSelectedCategory(cat.name);
                            setSelectedFolder("");
                          }}
                        >
                          <span className="small">📂 All {cat.name}</span>
                          <span className="badge bg-light text-secondary small-badge">
                            {catNotes.length}
                          </span>
                        </div>

                        {/* General / Root (Notes with no folder) */}
                        {catNotes.some((n) => !n.folder) && catFolders.length > 0 && (
                          <div
                            className={`subfolder-item ${
                              selectedCategory === cat.name && selectedFolder === "__general__"
                                ? "active-subfolder"
                                : ""
                            }`}
                            onClick={() => {
                              setSelectedCategory(cat.name);
                              setSelectedFolder("__general__");
                            }}
                          >
                            <span className="small">📂 General (Root)</span>
                            <span className="badge bg-light text-secondary small-badge">
                              {catNotes.filter((n) => !n.folder).length}
                            </span>
                          </div>
                        )}

                        {/* Defined Folders in this Category */}
                        {catFolders.map((f) => {
                          const folderNotes = catNotes.filter((n) => n.folder === f.name);
                          const isFolderActive =
                            selectedCategory === cat.name && selectedFolder === f.name;

                          return (
                            <div
                              key={f._id}
                              className={`subfolder-item ${isFolderActive ? "active-subfolder" : ""}`}
                              onClick={() => {
                                setSelectedCategory(cat.name);
                                setSelectedFolder(f.name);
                              }}
                            >
                              <span className="small text-truncate" title={f.name}>
                                📂 {f.name}
                              </span>

                              <div className="d-flex align-items-center gap-1">
                                <span className="badge bg-light text-secondary small-badge">
                                  {folderNotes.length}
                                </span>
                                <button
                                  type="button"
                                  className="btn-folder-delete"
                                  title={`Delete folder "${f.name}"`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFolder(cat._id, f._id, f.name);
                                  }}
                                >
                                  <i className="bi bi-x" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Quick "+ New Folder" link */}
                        {!isAddingFolder && (
                          <button
                            type="button"
                            className="btn-add-subfolder-link"
                            onClick={() => {
                              setActiveFolderInputCatId(cat._id);
                              setNewFolderName("");
                            }}
                          >
                            <i className="bi bi-folder-plus" />
                            <span>+ New Folder</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Quick Inline "Add Category" Form at bottom of sidebar */}
              <div className="mt-3 pt-2" style={{ borderTop: "1px dashed var(--md-card-border)" }}>
                {isQuickAddingCat ? (
                  <div className="input-group input-group-sm">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Category name..."
                      value={quickCatName}
                      onChange={(e) => setQuickCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateCategory(quickCatName);
                        } else if (e.key === "Escape") {
                          setIsQuickAddingCat(false);
                        }
                      }}
                      autoFocus
                    />
                    <button
                      className="btn btn-sm text-white"
                      style={{ backgroundColor: "var(--md-primary)" }}
                      onClick={() => handleCreateCategory(quickCatName)}
                      disabled={creating || !quickCatName.trim()}
                    >
                      Add
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setIsQuickAddingCat(false)}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm w-100 d-flex align-items-center justify-content-center gap-1 text-muted"
                    style={{ background: "#FAF7F2", border: "1px solid var(--md-card-border)", borderRadius: "8px" }}
                    onClick={() => {
                      setIsQuickAddingCat(true);
                      setQuickCatName("");
                    }}
                  >
                    <i className="bi bi-plus-lg" />
                    <span>+ New Category</span>
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Search Bar & Notes Content (Matching image from Note page) */}
            <div className="notes-content">
              {/* Search Notes Input */}
              <input
                type="text"
                className="form-control mb-3"
                placeholder="Search Notes by title, content, or folder..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search notes"
              />

              {/* Active Filter Breadcrumb */}
              {(selectedCategory !== "All Notes" || selectedFolder) && (
                <div className="category-filter-breadcrumb mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="text-muted small">Viewing:</span>
                    <span
                      className="badge bg-secondary cursor-pointer"
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedFolder("")}
                      title="Click to view all folders in this category"
                    >
                      📁 {selectedCategory}
                    </span>
                    {selectedFolder && (
                      <>
                        <i className="bi bi-chevron-right text-muted small" />
                        <span className="badge bg-info text-dark">
                          📂 {selectedFolder === "__general__" ? "General (No folder)" : selectedFolder}
                        </span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-0 px-2"
                    style={{ fontSize: "0.8rem" }}
                    onClick={() => {
                      setSelectedCategory("All Notes");
                      setSelectedFolder("");
                    }}
                  >
                    Show All Notes
                  </button>
                </div>
              )}

              {/* Notes Grid */}
              {filteredNotes.length === 0 ? (
                <div className="md-categories-state-box">
                  <div className="md-state-icon">📝</div>
                  <h5 className="mt-3 fw-bold text-dark">
                    {search.trim() ? "No matching notes found" : `No notes in "${selectedCategory}"`}
                  </h5>
                  <p className="text-muted" style={{ maxWidth: 420 }}>
                    {search.trim()
                      ? `No notes match your search term "${search}".`
                      : `You haven't created any notes in ${selectedCategory === "All Notes" ? "your account" : `"${selectedCategory}"`} yet.`}
                  </p>
                  <button
                    type="button"
                    className="md-btn md-btn-primary mt-2"
                    onClick={() => handleOpenInNotes(selectedCategory !== "All Notes" ? selectedCategory : "")}
                  >
                    <i className="bi bi-pencil-square me-1" />
                    + Create Note in {selectedCategory === "All Notes" ? "Notes" : selectedCategory}
                  </button>
                </div>
              ) : (
                <div className="notes-grid">
                  {filteredNotes.map((note) => (
                    <div key={note._id} className="note-card">
                      {/* Top Badges */}
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="d-flex align-items-center gap-1 flex-wrap">
                          <span className="badge bg-secondary">{note.category}</span>
                          {note.folder && (
                            <span
                              className="badge text-dark"
                              style={{ backgroundColor: "#e2d5c8", border: "1px solid #d4c2b2" }}
                              title={`Folder: ${note.folder}`}
                            >
                              <i className="bi bi-folder2 me-1" />
                              {note.folder}
                            </span>
                          )}
                        </div>
                        {note.attachments && note.attachments.length > 0 && (
                          <span className="attachment-badge" title={`${note.attachments.length} attachment(s)`}>
                            <i className="bi bi-paperclip" />
                            <span>{note.attachments.length}</span>
                          </span>
                        )}
                      </div>

                      {/* Note Title */}
                      <h4 className="note-title">{note.title}</h4>

                      {/* Deadline */}
                      {note.deadline && (
                        <p className="note-deadline mb-2">
                          <i className="bi bi-calendar-event me-1" />
                          Due: {new Date(note.deadline).toLocaleDateString("en-GB").replace(/\//g, "-")}
                        </p>
                      )}

                      {/* Note Description */}
                      <p className="note-content mb-3">{note.description}</p>

                      {/* Attachments Section in Note Card */}
                      {note.attachments && note.attachments.length > 0 && (
                        <div className="note-attachments-card-section mb-3">
                          <button
                            type="button"
                            className="note-attachments-summary-btn"
                            onClick={() => toggleCardExpanded(note._id)}
                          >
                            <i className="bi bi-paperclip" />
                            <span>
                              {note.attachments.length} {note.attachments.length === 1 ? "Attachment" : "Attachments"}
                            </span>
                            <i
                              className={`bi ${expandedCards[note._id] ? "bi-chevron-up" : "bi-chevron-down"} ms-1`}
                            />
                          </button>

                          {expandedCards[note._id] && (
                            <div className="note-attachments-expanded">
                              {note.attachments.map((att, idx) => {
                                const info = getFileInfo(att);
                                return (
                                  <div key={att._id || idx} className="note-attachment-row-mini">
                                    <div className="d-flex align-items-center gap-2 min-w-0">
                                      <i className={`bi ${info.icon}`} style={{ color: info.color }} />
                                      <span className="mini-name" title={att.originalName}>
                                        {att.originalName}
                                      </span>
                                      <span className="text-muted small">
                                        ({formatFileSize(att.size)})
                                      </span>
                                    </div>
                                    <div className="d-flex align-items-center gap-1">
                                      {info.isPreviewable && (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-light p-1"
                                          title="Preview"
                                          onClick={() => setPreviewAttachment(att)}
                                        >
                                          <i className="bi bi-eye" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-light p-1"
                                        title="Download"
                                        onClick={() => downloadAttachment(att)}
                                      >
                                        <i className="bi bi-download" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleOpenInNotes(note.category)}
                        >
                          <i className="bi bi-journal-text me-1" />
                          Open in Notes
                        </button>
                        <span className="text-muted small">
                          {note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateCategory(newCategoryName);
              }}
            >
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
                  <span>Organize your notes into meaningful groups.</span>
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

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <AttachmentPreview
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

    </Layout>
  );
}
