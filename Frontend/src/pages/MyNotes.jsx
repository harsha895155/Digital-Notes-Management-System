import { useState, useEffect, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import axios from "axios";
import API_BASE_URL, { getAuthHeaders } from "../api/config";
import { toast, showConfirm } from "../context/ToastContext";
import FileUpload from "../components/FileUpload";
import AttachmentList from "../components/AttachmentList";
import AttachmentPreview from "../components/AttachmentPreview";
import { formatFileSize, getFileInfo, downloadAttachment } from "../utils/fileUtils";

function MyNotes({ fetchTotalNotes, fetchUpcomingNotes }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState([]);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const [selectedCategory, setSelectedCategory] = useState(() => {
    return searchParams.get("category") || location.state?.category || "All Notes";
  });
  const [selectedFolder, setSelectedFolder] = useState("");
  const [deadline, setDeadline] = useState("");

  // Folder states
  const [folder, setFolder] = useState("");
  const [expandedCategories, setExpandedCategories] = useState({});
  const [activeFolderInputCatId, setActiveFolderInputCatId] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolderInForm, setCreatingFolderInForm] = useState(false);
  const [formFolderName, setFormFolderName] = useState("");
  const [activeCreateTab, setActiveCreateTab] = useState("category");
  const [catForNewFolder, setCatForNewFolder] = useState("");
  const [topFolderName, setTopFolderName] = useState("");

  // Refs for scrolling to Note Form Box and autofocusing title
  const noteFormRef = useRef(null);
  const titleInputRef = useRef(null);

  // Attachment states
  const [stagedAttachments, setStagedAttachments] = useState([]);
  const [editAttachments, setEditAttachments] = useState([]);
  const [deletingAttId, setDeletingAttId] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [cardPreviewItem, setCardPreviewItem] = useState(null);

  const fetchNotes = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.email) return;

      const res = await axios.get(`${API_BASE_URL}/api/notes/${user.email}`, {
        headers: getAuthHeaders(),
      });
      setNotes(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchCategories = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.email) return;

      const res = await axios.get(`${API_BASE_URL}/api/categories/${user.email}`, {
        headers: getAuthHeaders(),
      });
      setCategories(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleDeleteCategory = async (id, categoryName) => {
    const notesInCategory = notes.filter(
      (note) => note.category === categoryName
    ).length;

    const confirmDelete = await showConfirm({
      title: "Delete Category?",
      message: `This category contains ${notesInCategory} note${
        notesInCategory === 1 ? "" : "s"
      }. Delete category and all its notes? This action cannot be undone.`,
      confirmText: "Delete Category",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!confirmDelete) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/categories/${id}`, {
        headers: getAuthHeaders(),
      });

      await fetchCategories();
      await fetchNotes();
      if (fetchTotalNotes) await fetchTotalNotes();
      if (fetchUpcomingNotes) await fetchUpcomingNotes();

      setSelectedCategory("All Notes");
      toast.success(
        "Category and related notes deleted successfully",
        "Category Deleted"
      );
    } catch (error) {
      toast.error("Failed to delete category", "Error");
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchCategories();
    if (fetchTotalNotes) fetchTotalNotes();
    if (fetchUpcomingNotes) fetchUpcomingNotes();
  }, []);

  useEffect(() => {
    const catQuery = searchParams.get("category");
    const catState = location.state?.category;
    const target = catQuery || catState;
    if (target) {
      setSelectedCategory(target);
      setSelectedFolder("");
    }
  }, [location.search, location.state, searchParams]);

  const handleCreateCategory = async () => {
    if (!newCategory.trim()) {
      toast.warning("Please enter a category name first.", "Missing Category Name");
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));

      await axios.post(
        `${API_BASE_URL}/api/categories`,
        {
          name: newCategory,
          userEmail: user.email,
        },
        { headers: getAuthHeaders() }
      );

      setNewCategory("");
      await fetchCategories();

      toast.success("Category created successfully", "Category Added");
    } catch (error) {
      toast.error("Failed to create category", "Error");
    }
  };

  const handleCreateFolder = async (categoryId, folderName, isFromNoteForm = false) => {
    const trimmed = (folderName || "").trim();
    if (!trimmed) {
      toast.warning("Please enter a folder name.", "Missing Folder Name");
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/categories/${categoryId}/folders`,
        { name: trimmed },
        { headers: getAuthHeaders() }
      );

      await fetchCategories();

      if (isFromNoteForm) {
        setFolder(trimmed);
        setFormFolderName("");
        setCreatingFolderInForm(false);
      } else {
        setActiveFolderInputCatId(null);
        setNewFolderName("");
        setExpandedCategories((prev) => ({ ...prev, [categoryId]: true }));
      }

      toast.success(`Folder "${trimmed}" created successfully`, "Folder Created");
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to create folder";
      toast.error(msg, "Error");
    }
  };

  const handleDeleteFolder = async (categoryId, folderId, folderName) => {
    const confirmed = await showConfirm({
      title: "Delete Folder?",
      message: `Are you sure you want to delete folder "${folderName}"? Notes in this folder will remain in the category without a folder.`,
      confirmText: "Delete Folder",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      await axios.delete(
        `${API_BASE_URL}/api/categories/${categoryId}/folders/${folderId}`,
        { headers: getAuthHeaders() }
      );

      await fetchCategories();
      await fetchNotes();

      if (selectedFolder === folderName) {
        setSelectedFolder("");
      }

      toast.success(`Folder "${folderName}" removed successfully`, "Folder Deleted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete folder", "Error");
    }
  };

  const toggleCategoryExpand = (catId, e) => {
    if (e) e.stopPropagation();
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleAddNote = async () => {
    if (!title.trim() || !content.trim() || !category) {
      toast.warning(
        "Please fill in title, content, and category.",
        "Incomplete Note"
      );
      return;
    }

    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const userEmail = storedUser?.email;

      if (!userEmail) {
        toast.warning(
          "Your session appears to have expired. Please login again.",
          "Session Expired"
        );
        return;
      }

      if (editId) {
        const res = await axios.put(
          `${API_BASE_URL}/api/notes/${editId}`,
          {
            title: title.trim(),
            description: content.trim(),
            category,
            folder: folder || "",
            deadline: deadline || null,
            attachments: editAttachments,
          },
          { headers: getAuthHeaders() }
        );

        setNotes((prevNotes) =>
          prevNotes.map((note) => (note._id === res.data._id ? res.data : note))
        );

        toast.success("Note updated successfully", "Note Saved");
        handleCancelEdit();
      } else {
        const res = await axios.post(
          `${API_BASE_URL}/api/notes`,
          {
            title: title.trim(),
            description: content.trim(),
            category,
            folder: folder || "",
            deadline: deadline || null,
            userEmail,
            attachments: stagedAttachments,
          },
          { headers: getAuthHeaders() }
        );

        setNotes((prevNotes) => [res.data, ...prevNotes]);
        setSelectedCategory("All Notes");
        setSearch("");

        toast.success(
          "Note added successfully to your collection",
          "Note Created"
        );
        handleCancelEdit();
      }

      await fetchNotes();
      await fetchCategories();
      if (fetchTotalNotes) await fetchTotalNotes();
      if (fetchUpcomingNotes) await fetchUpcomingNotes();
    } catch (error) {
      console.error("FULL ERROR:", error);
      const serverMsg =
        error.response?.data?.message ||
        error.response?.data?.error;
      const isNetworkErr = error.message === "Network Error" || !error.response;
      const displayMsg =
        serverMsg ||
        (isNetworkErr
          ? "Cannot connect to server. Please ensure the backend is running and reachable."
          : error.message || "Failed to save note");

      toast.error(displayMsg, "Error Saving Note");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: "Delete Note?",
      message:
        "Are you sure you want to permanently delete this note and its attachments?",
      confirmText: "Delete Note",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/notes/${id}`, {
        headers: getAuthHeaders(),
      });

      setNotes((prevNotes) => prevNotes.filter((note) => note._id !== id));

      await fetchNotes();
      await fetchCategories();
      if (fetchTotalNotes) await fetchTotalNotes();
      if (fetchUpcomingNotes) await fetchUpcomingNotes();

      toast.success("Note deleted successfully", "Note Removed");
    } catch (error) {
      console.log(error);
      toast.error(
        error.response?.data?.message || error.message || "Failed to delete note",
        "Error"
      );
    }
  };

  const handleEdit = (note) => {
    setTitle(note.title);
    setContent(note.description || "");
    setCategory(note.category || "");
    setFolder(note.folder || "");
    setCreatingFolderInForm(false);
    setDeadline(
      note.deadline
        ? new Date(note.deadline).toISOString().split("T")[0]
        : ""
    );
    setEditId(note._id);
    setEditAttachments(note.attachments || []);
    setStagedAttachments([]);

    // Smooth scroll directly to the note form box and focus title input
    setTimeout(() => {
      if (noteFormRef.current) {
        noteFormRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    }, 50);
  };

  const handleCancelEdit = () => {
    setTitle("");
    setContent("");
    setCategory("");
    setFolder("");
    setCreatingFolderInForm(false);
    setFormFolderName("");
    setDeadline("");
    setEditId(null);
    setStagedAttachments([]);
    setEditAttachments([]);
  };

  const handleDeleteAttachment = async (att) => {
    const confirmed = await showConfirm({
      title: "Remove Attachment?",
      message: `Remove "${att.originalName}"? This action will permanently delete the file.`,
      confirmText: "Remove",
      cancelText: "Cancel",
      type: "danger",
    });

    if (!confirmed) return;

    if (editId && att._id) {
      try {
        setDeletingAttId(att._id);
        await axios.delete(
          `${API_BASE_URL}/api/notes/${editId}/attachments/${att._id}`,
          { headers: getAuthHeaders() }
        );

        setEditAttachments((prev) => prev.filter((a) => a._id !== att._id));
        setNotes((prevNotes) =>
          prevNotes.map((n) =>
            n._id === editId
              ? {
                  ...n,
                  attachments: (n.attachments || []).filter(
                    (a) => a._id !== att._id
                  ),
                }
              : n
          )
        );

        toast.success("Attachment removed successfully.", "Attachment Deleted");
      } catch (err) {
        toast.error("Failed to remove attachment.", "Error");
      } finally {
        setDeletingAttId(null);
      }
    } else {
      // Staged attachment (not yet saved to a note)
      setStagedAttachments((prev) =>
        prev.filter((a) => (a._id || a.storageKey) !== (att._id || att.storageKey))
      );
      toast.info("Attachment removed from draft.", "Removed");
    }
  };

  const toggleCardExpanded = (noteId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [noteId]: !prev[noteId],
    }));
  };

  return (
    <div className="note-form mb-4">
      <div className="dashboard-content">
        <h2 className="mb-4">My Notes</h2>

        {/* Manage Categories & Folders */}
        <div className="note-form mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <h4 className="mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-folder2 text-brown"></i>
              <span>Manage Categories &amp; Folders</span>
            </h4>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className={`btn ${
                  activeCreateTab === "category" ? "btn-dark" : "btn-outline-secondary"
                }`}
                onClick={() => setActiveCreateTab("category")}
              >
                <i className="bi bi-folder-plus me-1"></i> New Category
              </button>
              <button
                type="button"
                className={`btn ${
                  activeCreateTab === "folder" ? "btn-dark" : "btn-outline-secondary"
                }`}
                onClick={() => {
                  setActiveCreateTab("folder");
                  if (!catForNewFolder && categories.length > 0) {
                    setCatForNewFolder(categories[0]._id);
                  }
                }}
                disabled={categories.length === 0}
                title={categories.length === 0 ? "Create a category first" : "Create a folder inside a category"}
              >
                <i className="bi bi-folder2-open me-1"></i> New Folder in Category
              </button>
            </div>
          </div>

          {activeCreateTab === "category" ? (
            <div className="d-flex gap-2 flex-wrap">
              <input
                type="text"
                className="form-control"
                style={{ flex: "1 1 200px" }}
                placeholder="Enter Category Name (e.g. Work, College, Personal)..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateCategory();
                  }
                }}
              />
              <button className="btn btn-success" onClick={handleCreateCategory} style={{ whiteSpace: "nowrap" }}>
                Create Category
              </button>
            </div>
          ) : (
            <div className="row g-2">
              <div className="col-md-5">
                <select
                  className="form-control"
                  value={catForNewFolder}
                  onChange={(e) => setCatForNewFolder(e.target.value)}
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      📁 {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-5">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter Folder Name (e.g. Sprint 1, Invoices, Week 4)..."
                  value={topFolderName}
                  onChange={(e) => setTopFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (catForNewFolder && topFolderName.trim()) {
                        handleCreateFolder(catForNewFolder, topFolderName);
                        setTopFolderName("");
                      }
                    }
                  }}
                />
              </div>
              <div className="col-md-2">
                <button
                  type="button"
                  className="btn btn-success w-100"
                  onClick={() => {
                    if (!catForNewFolder) {
                      toast.warning("Please select a category first.", "Missing Category");
                      return;
                    }
                    if (!topFolderName.trim()) {
                      toast.warning("Please enter a folder name.", "Missing Folder Name");
                      return;
                    }
                    handleCreateFolder(catForNewFolder, topFolderName);
                    setTopFolderName("");
                  }}
                >
                  Create Folder
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add / Edit Note */}
        <div
          ref={noteFormRef}
          id="note-form-box"
          className={`note-form ${editId ? "note-form-editing" : ""}`}
          style={{ scrollMarginTop: "90px" }}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">{editId ? "Edit Note" : "Add Note"}</h4>
            {editId && (
              <span className="badge bg-warning text-dark">
                Editing existing note
              </span>
            )}
          </div>

          <input
            ref={titleInputRef}
            type="text"
            className="form-control mb-3"
            placeholder="Enter Note Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Category & Folder Selection */}
          <div className="row g-2 mb-3">
            <div className={category ? "col-md-6" : "col-12"}>
              <label className="form-label fw-semibold small mb-1">Category *</label>
              <select
                className="form-control"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setFolder("");
                  setCreatingFolderInForm(false);
                }}
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat.name}>
                    📁 {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Folder Selection (Visible when category is selected) */}
            {category && (
              <div className="col-md-6">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label fw-semibold small mb-0">Folder (Optional)</label>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                    style={{ color: "#8b5e3c", fontSize: "0.8rem" }}
                    onClick={() => setCreatingFolderInForm(!creatingFolderInForm)}
                  >
                    {creatingFolderInForm ? "✕ Cancel" : "+ New Folder"}
                  </button>
                </div>

                {creatingFolderInForm ? (
                  <div className="d-flex gap-1">
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`New folder in ${category}...`}
                      value={formFolderName}
                      onChange={(e) => setFormFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const catObj = categories.find((c) => c.name === category);
                          if (catObj) handleCreateFolder(catObj._id, formFolderName, true);
                        }
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn text-white"
                      style={{ backgroundColor: "#8b5e3c", whiteSpace: "nowrap" }}
                      onClick={() => {
                        const catObj = categories.find((c) => c.name === category);
                        if (catObj) handleCreateFolder(catObj._id, formFolderName, true);
                      }}
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <select
                    className="form-control"
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                  >
                    <option value="">📂 General (No Folder)</option>
                    {(categories.find((c) => c.name === category)?.folders || []).map((f) => (
                      <option key={f._id} value={f.name}>
                        📂 {f.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <label className="mb-2 fw-semibold">Deadline (Optional)</label>
          <input
            type="date"
            className="form-control mb-3"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />

          <textarea
            className="form-control mb-3"
            rows="5"
            placeholder="Write your note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* Attachments Upload Section */}
          <div className="mb-3">
            <label className="mb-2 fw-semibold d-flex align-items-center gap-2">
              <i className="bi bi-paperclip"></i>
              <span>File Attachments</span>
              <small className="text-muted fw-normal">
                (Optional • PDFs, Word, Images, Spreadsheets, Presentations, ZIPs)
              </small>
            </label>

            <FileUpload
              noteId={editId}
              onUploadSuccess={(newAttachments, updatedNote) => {
                if (editId) {
                  if (updatedNote && updatedNote.attachments) {
                    setEditAttachments(updatedNote.attachments);
                    setNotes((prevNotes) =>
                      prevNotes.map((n) =>
                        n._id === editId ? updatedNote : n
                      )
                    );
                  } else {
                    setEditAttachments((prev) => [
                      ...prev,
                      ...newAttachments,
                    ]);
                  }
                } else {
                  setStagedAttachments((prev) => [
                    ...prev,
                    ...newAttachments,
                  ]);
                }
              }}
            />

            {/* Display Current Attachments */}
            {(editId ? editAttachments : stagedAttachments).length > 0 && (
              <AttachmentList
                title={editId ? "Attached Files" : "Staged Files"}
                attachments={editId ? editAttachments : stagedAttachments}
                onDelete={handleDeleteAttachment}
                deletingId={deletingAttId}
              />
            )}
          </div>

          <div className="d-flex gap-2">
            <button className="btn add-btn" onClick={handleAddNote}>
              {editId ? "Update Note" : "Add Note"}
            </button>
            {editId && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleCancelEdit}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        {/* Notes Layout */}
        <div className="notes-layout mt-4">
          <div className="sidebar">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h4 className="mb-0">Categories</h4>
              <span className="badge bg-secondary">{notes.length} notes</span>
            </div>

            {/* All Notes */}
            <div
              className={`category-item ${
                selectedCategory === "All Notes" ? "active-category" : ""
              }`}
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

            {/* Categories with Subfolders */}
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
                      style={{ cursor: "pointer" }}
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
                          <i className={`bi bi-chevron-${isExpanded ? "down" : "right"}`}></i>
                        </button>
                      ) : (
                        <span className="chevron-spacer"></span>
                      )}
                      <span>📁</span>
                      <span className="fw-semibold category-label">{cat.name}</span>
                    </div>

                    {/* Actions: Notes count, "+ Folder" button, Delete button */}
                    <div className="d-flex align-items-center gap-1">
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
                        <i className="bi bi-folder-plus"></i>
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-danger btn-icon"
                        title={`Delete category "${cat.name}" and its notes`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat._id, cat.name);
                        }}
                      >
                        ✕
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
                            className={`subfolder-item ${
                              isFolderActive ? "active-subfolder" : ""
                            }`}
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
                                className="btn-delete-subfolder"
                                title={`Delete folder "${f.name}"`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFolder(cat._id, f._id, f.name);
                                }}
                              >
                                ✕
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
                          <i className="bi bi-folder-plus"></i>
                          <span>+ New Folder</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="notes-content">
            <input
              type="text"
              className="form-control mb-3"
              placeholder="Search Notes by title, content, or folder..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Active Filter Breadcrumb */}
            {(selectedCategory !== "All Notes" || selectedFolder) && (
              <div className="category-filter-breadcrumb mb-3 d-flex align-items-center justify-content-between">
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
                      <i className="bi bi-chevron-right text-muted small"></i>
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

            <div className="notes-grid">
              {notes
                .filter((note) => {
                  const matchesSearch =
                    note.title.toLowerCase().includes(search.toLowerCase()) ||
                    note.description
                      .toLowerCase()
                      .includes(search.toLowerCase()) ||
                    (note.folder &&
                      note.folder.toLowerCase().includes(search.toLowerCase()));

                  const matchesCategory =
                    selectedCategory === "All Notes"
                      ? true
                      : note.category === selectedCategory;

                  let matchesFolder = true;
                  if (selectedFolder === "__general__") {
                    matchesFolder = !note.folder;
                  } else if (selectedFolder) {
                    matchesFolder = note.folder === selectedFolder;
                  }

                  return matchesSearch && matchesCategory && matchesFolder;
                })
                .map((note) => (
                  <div key={note._id} className="note-card">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center gap-1 flex-wrap">
                        <span className="badge bg-secondary">
                          {note.category}
                        </span>
                        {note.folder && (
                          <span
                            className="badge text-dark"
                            style={{
                              backgroundColor: "#e2d5c8",
                              border: "1px solid #d4c2b2",
                            }}
                            title={`Folder: ${note.folder}`}
                          >
                            <i className="bi bi-folder2 me-1"></i>
                            {note.folder}
                          </span>
                        )}
                      </div>
                      {note.attachments && note.attachments.length > 0 && (
                        <span className="attachment-badge" title={`${note.attachments.length} attachment(s)`}>
                          <i className="bi bi-paperclip"></i>
                          <span>{note.attachments.length}</span>
                        </span>
                      )}
                    </div>

                    <h4>{note.title}</h4>

                    {note.deadline && (
                      <p className="text-danger small">
                        📅 Due:{" "}
                        {new Date(note.deadline)
                          .toLocaleDateString("en-GB")
                          .replace(/\//g, "-")}
                      </p>
                    )}

                    <p>{note.description}</p>

                    {/* Attachments Section in Note Card */}
                    {note.attachments && note.attachments.length > 0 && (
                      <div className="note-attachments-card-section mb-3">
                        <button
                          type="button"
                          className="note-attachments-summary-btn"
                          onClick={() => toggleCardExpanded(note._id)}
                        >
                          <i className="bi bi-paperclip"></i>
                          <span>
                            {note.attachments.length}{" "}
                            {note.attachments.length === 1
                              ? "Attachment"
                              : "Attachments"}
                          </span>
                          <i
                            className={`bi ${
                              expandedCards[note._id]
                                ? "bi-chevron-up"
                                : "bi-chevron-down"
                            } ms-1`}
                          ></i>
                        </button>

                        {expandedCards[note._id] && (
                          <div className="note-attachments-expanded">
                            {note.attachments.map((att, idx) => {
                              const info = getFileInfo(att);
                              return (
                                <div
                                  key={att._id || idx}
                                  className="note-attachment-row-mini"
                                >
                                  <div className="d-flex align-items-center gap-2 min-w-0">
                                    <i
                                      className={`bi ${info.icon}`}
                                      style={{ color: info.color }}
                                    ></i>
                                    <span
                                      className="mini-name"
                                      title={att.originalName}
                                    >
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
                                        onClick={() => setCardPreviewItem(att)}
                                      >
                                        <i className="bi bi-eye"></i>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-light p-1"
                                      title="Download"
                                      onClick={() => downloadAttachment(att)}
                                    >
                                      <i className="bi bi-download"></i>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="d-flex mt-2">
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => handleEdit(note)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn btn-danger btn-sm ms-2"
                        onClick={() => handleDelete(note._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Attachment Preview Modal for Note Cards */}
      {cardPreviewItem && (
        <AttachmentPreview
          attachment={cardPreviewItem}
          onClose={() => setCardPreviewItem(null)}
        />
      )}
    </div>
  );
}

export default MyNotes;
