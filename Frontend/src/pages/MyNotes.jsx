import { useState, useEffect } from "react";
import axios from "axios";

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
    `https://gnapika-backend.onrender.com/api/notes/${user.email}`
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
    `https://gnapika-backend.onrender.com/api/categories/${user.email}`
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

  const confirmDelete = window.confirm(
    `This category contains ${notesInCategory} notes.\n\nDelete category and all notes?`
  );

  if (!confirmDelete) {
    return;
  }

  try {

    await axios.delete(
      `https://gnapika-backend.onrender.com/api/categories/${id}`
    );

    await fetchCategories();
    await fetchNotes();

    await fetchTotalNotes();

    await fetchUpcomingNotes();

    setSelectedCategory("All Notes");

    alert(
      "Category and related notes deleted successfully"
    );

  } catch (error) {

    alert("Failed to delete category");

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
    alert("Enter category name");
    return;
  }

  try {
    const user = JSON.parse(
      localStorage.getItem("user")
    );

    await axios.post(
      "https://gnapika-backend.onrender.com/api/categories",
      {
        name: newCategory,
        userEmail: user.email,
      }
    );

    setNewCategory("");
    await fetchCategories();

    alert("Category Created Successfully");
  } catch (error) {
    alert("Failed to create category");
  }


};

const handleAddNote = async () => {

  if (
    !title.trim() ||
    !content.trim() ||
    !category
  ) {
    alert("Please fill all fields");
    return;
  }

  try {

    const user = JSON.parse(
      localStorage.getItem("user")
    );

    if (editId) {
      const res = await axios.put(
        `https://gnapika-backend.onrender.com/api/notes/${editId}`,
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

      alert("Note Updated Successfully");
      setEditId(null);
    } else {
      const res = await axios.post(
        "https://gnapika-backend.onrender.com/api/notes",
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

      alert("Note Added Successfully");
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

    alert(
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message
    );

  }

};

const handleDelete = async (id) => {

  try {

    await axios.delete(
      `https://gnapika-backend.onrender.com/api/notes/${id}`
    );

    setNotes((prevNotes) =>
      prevNotes.filter((note) => note._id !== id)
    );

    await fetchNotes();
    await fetchCategories();

    await fetchTotalNotes();

    await fetchUpcomingNotes();

    alert("Note Deleted Successfully");

  } catch (error) {

    console.log(error);

    alert(
      error.response?.data?.message ||
      error.message
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
