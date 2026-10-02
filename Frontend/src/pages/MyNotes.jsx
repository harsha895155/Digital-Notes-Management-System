import { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../api/config";
import { toast, showConfirm } from "../context/ToastContext";

function MyNotes({
  fetchTotalNotes,
  fetchUpcomingNotes,
}) {

const [title, setTitle] = useState("");
const [content, setContent] = useState("");
const [notes, setNotes] = useState([]);
const [editId, setEditId] = useState(null);
const [search, setSearch] = useState("");

const [categories, setCategories] = useState([]);
const [category, setCategory] = useState("");
const [newCategory, setNewCategory] = useState("");

const [selectedCategory, setSelectedCategory] =
useState("All Notes");
const [deadline, setDeadline] =
  useState("");
const fetchNotes = async () => {
try {
const user = JSON.parse(
localStorage.getItem("user")
);


  const res = await axios.get(
    `${API_BASE_URL}/api/notes/${user.email}`
  );

  setNotes(res.data);
} catch (error) {
  console.log(error);
}


};

const fetchCategories = async () => {
try {
const user = JSON.parse(
localStorage.getItem("user")
);


  const res = await axios.get(
    `${API_BASE_URL}/api/categories/${user.email}`
  );

  setCategories(res.data);
} catch (error) {
  console.log(error);
}


};
const handleDeleteCategory = async (
  id,
  categoryName
) => {

  const notesInCategory = notes.filter(
    (note) => note.category === categoryName
  ).length;

  const confirmDelete = await showConfirm({
    title: "Delete Category?",
    message: `This category contains ${notesInCategory} note${notesInCategory === 1 ? "" : "s"}. Delete category and all its notes? This action cannot be undone.`,
    confirmText: "Delete Category",
    cancelText: "Cancel",
    type: "danger",
  });

  if (!confirmDelete) {
    return;
  }

  try {

    await axios.delete(
      `${API_BASE_URL}/api/categories/${id}`
    );

    await fetchCategories();
    await fetchNotes();

    await fetchTotalNotes();

    await fetchUpcomingNotes();

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
  fetchTotalNotes();
  fetchUpcomingNotes();
}, []);

const handleCreateCategory = async () => {
  if (!newCategory.trim()) {
    toast.warning("Please enter a category name first.", "Missing Category Name");
    return;
  }

  try {
    const user = JSON.parse(
      localStorage.getItem("user")
    );

    await axios.post(
      `${API_BASE_URL}/api/categories`,
      {
        name: newCategory,
        userEmail: user.email,
      }
    );

    setNewCategory("");
    await fetchCategories();

    toast.success("Category created successfully", "Category Added");
  } catch (error) {
    toast.error("Failed to create category", "Error");
  }


};

const handleAddNote = async () => {

  if (
    !title.trim() ||
    !content.trim() ||
    !category
  ) {
    toast.warning("Please fill in title, content, and category.", "Incomplete Note");
    return;
  }

  try {

    const user = JSON.parse(
      localStorage.getItem("user")
    );

    if (editId) {
      const res = await axios.put(
        `${API_BASE_URL}/api/notes/${editId}`,
        {
          title,
          description: content,
          category,
          deadline,
        }
      );

      setNotes((prevNotes) =>
        prevNotes.map((note) =>
          note._id === res.data._id ? res.data : note
        )
      );

      toast.success("Note updated successfully", "Note Saved");
      setEditId(null);
    } else {
      const res = await axios.post(
        `${API_BASE_URL}/api/notes`,
        {
          title,
          description: content,
          category,
          deadline,
          userEmail: user.email,
        }
      );

      setNotes((prevNotes) => [res.data, ...prevNotes]);
      setSelectedCategory("All Notes");
      setSearch("");

      toast.success("Note added successfully to your collection", "Note Created");
    }

    setTitle("");
    setContent("");
    setCategory("");
    setDeadline("");
    await fetchNotes();
    await fetchCategories();
    await fetchTotalNotes();
    await fetchUpcomingNotes();

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
    message: "Are you sure you want to permanently delete this note?",
    confirmText: "Delete Note",
    cancelText: "Cancel",
    type: "danger",
  });

  if (!confirmed) return;

  try {

    await axios.delete(
      `${API_BASE_URL}/api/notes/${id}`
    );

    setNotes((prevNotes) =>
      prevNotes.filter((note) => note._id !== id)
    );

    await fetchNotes();
    await fetchCategories();

    await fetchTotalNotes();

    await fetchUpcomingNotes();

    toast.success("Note deleted successfully", "Note Removed");

  } catch (error) {

    console.log(error);

    toast.error(
      error.response?.data?.message ||
      error.message ||
      "Failed to delete note",
      "Error"
    );

  }

};

const handleEdit = (note) => {

  setTitle(note.title);

  setContent(
    note.description || ""
  );

  setCategory(
    note.category || ""
  );

  setDeadline(
    note.deadline
      ? new Date(note.deadline)
          .toISOString()
          .split("T")[0]
      : ""
  );

  setEditId(note._id);

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });

};
    return (
      
      <div className="note-form mb-4">

      <div className="dashboard-content">

      <h2 className="mb-4">
        My Notes
      </h2>

    {/* Create Category */}

      <div className="note-form mb-4">
    <h4>Create Category</h4>

    <div className="d-flex gap-2">

      <input
        type="text"
        className="form-control"
        placeholder="Enter Category Name"
        value={newCategory}
        onChange={(e) =>
          setNewCategory(e.target.value)
        }
      />

      <button
        className="btn btn-success"
        onClick={handleCreateCategory}
      >
        Create
      </button>

    </div>

      </div>

    {/* Add Note */}

      <div className="note-form">
    <input
      type="text"
      className="form-control mb-3"
      placeholder="Enter Note Title"
      value={title}
      onChange={(e) =>
        setTitle(e.target.value)
      }
    />

    <select
      className="form-control mb-3"
      value={category}
      onChange={(e) =>
        setCategory(e.target.value)
      }
    >
      <option value="">
        Select Category
      </option>

      {categories.map((cat) => (
        <option
          key={cat._id}
          value={cat.name}
        >
          {cat.name}
        </option>
      ))}
    </select>

    <label className="mb-2 fw-semibold">
      Deadline (Optional)
    </label>

    <input
      type="date"
      className="form-control mb-3"
      value={deadline}
      onChange={(e) =>
        setDeadline(e.target.value)
      }
    />

    <textarea
      className="form-control mb-3"
      rows="5"
      placeholder="Write your note..."
      value={content}
      onChange={(e) =>
        setContent(e.target.value)
      }
    />

    <button
      className="btn add-btn"
      onClick={handleAddNote}
    >
      {editId
        ? "Update Note"
        : "Add Note"}
    </button>


      </div>

{/* Notes Layout */}

  <div className="notes-layout">

<div className="sidebar">

  <h4>Categories</h4>

  <div
    className={`category-item ${
      selectedCategory === "All Notes"
        ? "active-category"
        : ""
    }`}
    onClick={() =>
      setSelectedCategory("All Notes")
    }
  >
    📁 All Notes
  </div>

  {categories.map((cat) => (
    <div
      key={cat._id}
      className={`category-item ${
        selectedCategory === cat.name
          ? "active-category"
          : ""
      }`}
    >

      <span
        onClick={() =>
          setSelectedCategory(cat.name)
        }
      >
        📁 {cat.name}
      </span>

      <button
        className="btn btn-sm btn-danger"
        onClick={() =>
          handleDeleteCategory(
            cat._id,
            cat.name
          )
        }
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
    onChange={(e) =>
      setSearch(e.target.value)
    }
  />

  <div className="notes-grid">

    {notes
      .filter((note) => {

        const matchesSearch =
          note.title
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          note.description
            .toLowerCase()
            .includes(search.toLowerCase());

        const matchesCategory =
          selectedCategory === "All Notes"
            ? true
            : note.category ===
              selectedCategory;

        return (
          matchesSearch &&
          matchesCategory
        );

      })
      .map((note) => (

        <div
          key={note._id}
          className="note-card"
        >

          <span className="badge bg-secondary mb-2">
            {note.category}
          </span>

          <h4>{note.title}</h4>

          {note.deadline && (
            <p className="text-danger small">
              📅 Due:
              {" "}
             {new Date(note.deadline)
  .toLocaleDateString("en-GB")
  .replace(/\//g, "-")}
            </p>
          )}

          <p>
            {note.description}
          </p>

          <button
            className="btn btn-warning btn-sm"
            onClick={() =>
              handleEdit(note)
            }
          >
            Edit
          </button>

          <button
            className="btn btn-danger btn-sm ms-2"
            onClick={() =>
              handleDelete(
                note._id
              )
            }
          >
            Delete
          </button>

        </div>

      ))}

  </div>

</div>

  </div>

</div>


  </div>



);
}

export default MyNotes;
