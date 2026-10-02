import { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_BASE_URL, { getAuthHeaders } from "../api/config";
import { toast, showConfirm } from "../context/ToastContext";
import FileUpload from "../components/FileUpload";
import AttachmentList from "../components/AttachmentList";
import AttachmentPreview from "../components/AttachmentPreview";
import { formatFileSize, getFileInfo, downloadAttachment } from "../utils/fileUtils";

function MyNotes({ fetchTotalNotes, fetchUpcomingNotes }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState([]);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("All Notes");
  const [deadline, setDeadline] = useState("");

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

  const handleAddNote = async () => {
    if (!title.trim() || !content.trim() || !category) {
      toast.warning(
        "Please fill in title, content, and category.",
        "Incomplete Note"
      );
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));

      if (editId) {
        const res = await axios.put(
          `${API_BASE_URL}/api/notes/${editId}`,
          {
            title,
            description: content,
            category,
            deadline,
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
            title,
            description: content,
            category,
            deadline,
            userEmail: user.email,
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
      console.log("FULL ERROR:", error);
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to save note",
        "Error Saving Note"
      );
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

        {/* Create Category */}
        <div className="note-form mb-4">
          <h4>Create Category</h4>
          <div className="d-flex gap-2">
            <input
              type="text"
              className="form-control"
              placeholder="Enter Category Name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <button className="btn btn-success" onClick={handleCreateCategory}>
              Create
            </button>
          </div>
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

          <select
            className="form-control mb-3"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>

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
            <h4>Categories</h4>

            <div
              className={`category-item ${
                selectedCategory === "All Notes" ? "active-category" : ""
              }`}
              onClick={() => setSelectedCategory("All Notes")}
            >
              📁 All Notes
            </div>

            {categories.map((cat) => (
              <div
                key={cat._id}
                className={`category-item ${
                  selectedCategory === cat.name ? "active-category" : ""
                }`}
              >
                <span onClick={() => setSelectedCategory(cat.name)}>
                  📁 {cat.name}
                </span>

                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDeleteCategory(cat._id, cat.name)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="notes-content">
            <input
              type="text"
              className="form-control mb-4"
              placeholder="Search Notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="notes-grid">
              {notes
                .filter((note) => {
                  const matchesSearch =
                    note.title.toLowerCase().includes(search.toLowerCase()) ||
                    note.description
                      .toLowerCase()
                      .includes(search.toLowerCase());

                  const matchesCategory =
                    selectedCategory === "All Notes"
                      ? true
                      : note.category === selectedCategory;

                  return matchesSearch && matchesCategory;
                })
                .map((note) => (
                  <div key={note._id} className="note-card">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="badge bg-secondary">
                        {note.category}
                      </span>
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
