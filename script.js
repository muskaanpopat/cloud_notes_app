import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
  update
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAhyKVWnQFHSrJoN1udjnXURAPtYW5zs54",
  authDomain: "cloud-notes-app-2f858.firebaseapp.com",
  databaseURL: "https://cloud-notes-app-2f858-default-rtdb.firebaseio.com/",
  projectId: "cloud-notes-app-2f858",
  storageBucket: "cloud-notes-app-2f858.firebasestorage.app",
  messagingSenderId: "548953269003",
  appId: "1:548953269003:web:f99a11e8919fd696e5380e"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

let currentUser = null;
let allNotes = [];

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* ---------- Dark Mode ---------- */
const themeToggle = document.getElementById("themeToggle");

if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  if (themeToggle) themeToggle.textContent = "☀ Light Mode";
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
      localStorage.setItem("theme", "dark");
      themeToggle.textContent = "☀ Light Mode";
    } else {
      localStorage.setItem("theme", "light");
      themeToggle.textContent = "🌙 Dark Mode";
    }
  });
}

/* ---------- Auth Elements ---------- */
const authSection = document.getElementById("authSection");
const noteSection = document.getElementById("noteSection");
const welcomeText = document.getElementById("welcomeText");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

if (signupBtn) {
  signupBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      alert("Enter email and password");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("Signup successful");
    } catch (error) {
      alert(error.message);
    }
  });
}

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      alert("Enter email and password");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Login successful");
    } catch (error) {
      alert(error.message);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (authSection && noteSection) {
    if (user) {
      authSection.style.display = "none";
      noteSection.style.display = "block";
      if (welcomeText) {
        welcomeText.textContent = `Welcome, ${user.email}`;
      }
      loadNotes();
    } else {
      authSection.style.display = "block";
      noteSection.style.display = "none";
    }
  } else {
    if (user) {
      loadNotes();
    } else if (document.getElementById("notesContainer")) {
      document.getElementById("notesContainer").innerHTML =
        '<p class="empty-text">Please login first</p>';
    }
  }
});

/* ---------- Add Note ---------- */
const addBtn = document.getElementById("addBtn");
const noteInput = document.getElementById("noteInput");

if (addBtn && noteInput) {
  addBtn.addEventListener("click", async () => {
    if (!currentUser) {
      alert("Please login first");
      return;
    }

    const noteText = noteInput.value.trim();

    if (noteText === "") {
      alert("Please enter a note");
      return;
    }

    try {
      const userNotesRef = ref(db, "notes/" + currentUser.uid);

      await push(userNotesRef, {
        text: noteText,
        createdAt: new Date().toISOString()
      });

      window.location.href = "notes.html";
    } catch (error) {
      console.error(error);
      alert("Note was not saved");
    }
  });
}

/* ---------- Load Notes ---------- */
function loadNotes() {
  const notesContainer = document.getElementById("notesContainer");
  if (!notesContainer || !currentUser) return;

  const userNotesRef = ref(db, "notes/" + currentUser.uid);

  onValue(userNotesRef, (snapshot) => {
    const data = snapshot.val();
    allNotes = [];

    if (data) {
      allNotes = Object.keys(data).map((key) => ({
        id: key,
        ...data[key]
      })).reverse();
    }

    renderNotes(allNotes);
  });
}

/* ---------- Render Notes ---------- */
function renderNotes(notes) {
  const notesContainer = document.getElementById("notesContainer");
  if (!notesContainer) return;

  notesContainer.innerHTML = "";

  if (!notes.length) {
    notesContainer.innerHTML = '<p class="empty-text">No notes saved yet</p>';
    return;
  }

  notes.forEach((note) => {
    const noteDiv = document.createElement("div");
    noteDiv.className = "note";

    noteDiv.innerHTML = `
      <div class="note-date">📅 ${formatDate(note.createdAt)}</div>
      <div class="note-text">${escapeHtml(note.text)}</div>
      <div class="note-actions">
        <button class="edit-btn" data-id="${note.id}">Edit</button>
        <button class="delete-btn" data-id="${note.id}">Delete</button>
      </div>
    `;

    noteDiv.querySelector(".edit-btn").addEventListener("click", () => {
      editNote(note.id, note.text);
    });

    noteDiv.querySelector(".delete-btn").addEventListener("click", () => {
      deleteNote(note.id);
    });

    notesContainer.appendChild(noteDiv);
  });
}

/* ---------- Search ---------- */
const searchInput = document.getElementById("searchInput");

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase().trim();

    const filtered = allNotes.filter((note) =>
      note.text.toLowerCase().includes(value)
    );

    renderNotes(filtered);
  });
}

/* ---------- Edit/Delete ---------- */
async function deleteNote(id) {
  if (!currentUser) return;

  try {
    await remove(ref(db, "notes/" + currentUser.uid + "/" + id));
  } catch (error) {
    alert("Could not delete note");
  }
}

async function editNote(id, oldText) {
  if (!currentUser) return;

  const newText = prompt("Edit your note:", oldText);

  if (newText === null) return;

  const trimmedText = newText.trim();

  if (trimmedText === "") {
    alert("Note cannot be empty");
    return;
  }

  try {
    await update(ref(db, "notes/" + currentUser.uid + "/" + id), {
      text: trimmedText
    });
  } catch (error) {
    alert("Could not edit note");
  }
}