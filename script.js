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
let filteredNotes = [];

/* ---------------- Helpers ---------------- */
function formatDate(dateString) {
  if (!dateString) return "--";
  const date = new Date(dateString);
  if (isNaN(date)) return "--";
  return date.toLocaleString();
}

function formatShortDate(dateString) {
  if (!dateString) return "--";
  const date = new Date(dateString);
  if (isNaN(date)) return "--";
  return date.toLocaleDateString();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function truncateText(text, maxLength = 120) {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
}

/* ---------------- Dark Mode ---------------- */
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

/* ---------------- Elements ---------------- */
const authSection = document.getElementById("authSection");
const noteSection = document.getElementById("noteSection");
const welcomeText = document.getElementById("welcomeText");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

const addBtn = document.getElementById("addBtn");
const noteTitle = document.getElementById("noteTitle");
const noteInput = document.getElementById("noteInput");
const noteCategory = document.getElementById("noteCategory");
const noteReminder = document.getElementById("noteReminder");
const notePinned = document.getElementById("notePinned");

const searchInput = document.getElementById("searchInput");
const filterCategory = document.getElementById("filterCategory");
const filterPinned = document.getElementById("filterPinned");
const exportPdfBtn = document.getElementById("exportPdfBtn");

/* ---------------- Auth ---------------- */
if (signupBtn) {
  signupBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showToast("Enter email and password", "error");
      return;
    }

    if (password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      showToast("Signup successful", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showToast("Enter email and password", "error");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("Login successful", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      showToast("Logged out successfully", "success");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 700);
    } catch (error) {
      showToast("Logout failed", "error");
    }
  });
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (authSection && noteSection) {
    if (user) {
      authSection.style.display = "none";
      noteSection.style.display = "block";
      if (welcomeText) {
        welcomeText.textContent = user.email;
      }
    } else {
      authSection.style.display = "block";
      noteSection.style.display = "none";
    }
  }

  updateProfile(user);

  if (document.getElementById("notesContainer")) {
    if (user) {
      loadNotes();
    } else {
      document.getElementById("notesContainer").innerHTML =
        '<p class="empty-text">Please login first to view your saved notes.</p>';
      updateStats([]);
    }
  }
});

/* ---------------- Add Note ---------------- */
if (addBtn) {
  addBtn.addEventListener("click", async () => {
    if (!currentUser) {
      showToast("Please login first", "error");
      return;
    }

    const title = noteTitle.value.trim();
    const text = noteInput.value.trim();
    const category = noteCategory.value;
    const reminder = noteReminder.value;
    const pinned = notePinned.checked;

    if (!title) {
      showToast("Please enter a note title", "error");
      return;
    }

    if (!text) {
      showToast("Please enter a note", "error");
      return;
    }

    try {
      const userNotesRef = ref(db, "notes/" + currentUser.uid);

      await push(userNotesRef, {
        title,
        text,
        category,
        reminder: reminder || "",
        pinned,
        createdAt: new Date().toISOString()
      });

      noteTitle.value = "";
      noteInput.value = "";
      noteCategory.value = "Personal";
      noteReminder.value = "";
      notePinned.checked = false;

      showToast("Note saved successfully", "success");

      setTimeout(() => {
        window.location.href = "notes.html";
      }, 700);
    } catch (error) {
      console.error(error);
      showToast("Note was not saved", "error");
    }
  });
}

/* ---------------- Load Notes ---------------- */
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
      }));

      allNotes.sort((a, b) => {
        if ((b.pinned ? 1 : 0) !== (a.pinned ? 1 : 0)) {
          return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    applyFilters();
    checkDueReminders();
  });
}

/* ---------------- Profile + Stats ---------------- */
function updateProfile(user) {
  const profileEmail = document.getElementById("profileEmail");
  const profileSummary = document.getElementById("profileSummary");

  if (profileEmail) {
    profileEmail.textContent = user ? user.email : "Not logged in";
  }

  if (profileSummary) {
    if (user) {
      profileSummary.textContent = "Your notes, reminders, and important items are shown below.";
    } else {
      profileSummary.textContent = "Login to see your note summary";
    }
  }
}

function updateStats(notes) {
  const totalNotesEl = document.getElementById("totalNotes");
  const pinnedNotesEl = document.getElementById("pinnedNotes");
  const reminderCountEl = document.getElementById("reminderCount");
  const latestNoteDateEl = document.getElementById("latestNoteDate");
  const profileSummary = document.getElementById("profileSummary");

  const pinnedCount = notes.filter(note => note.pinned).length;
  const remindersCount = notes.filter(note => note.reminder).length;

  if (totalNotesEl) totalNotesEl.textContent = notes.length;
  if (pinnedNotesEl) pinnedNotesEl.textContent = pinnedCount;
  if (reminderCountEl) reminderCountEl.textContent = remindersCount;
  if (latestNoteDateEl) {
    latestNoteDateEl.textContent = notes.length ? formatShortDate(notes[0].createdAt) : "--";
  }

  if (profileSummary && currentUser) {
    profileSummary.textContent = `You have ${notes.length} notes, ${pinnedCount} pinned notes, and ${remindersCount} reminders.`;
  }
}

/* ---------------- Render Notes ---------------- */
function renderNotes(notes) {
  const notesContainer = document.getElementById("notesContainer");
  if (!notesContainer) return;

  notesContainer.innerHTML = "";

  if (!notes.length) {
    notesContainer.innerHTML = '<p class="empty-text">No notes found.</p>';
    return;
  }

  notes.forEach((note) => {
    const noteDiv = document.createElement("div");
    noteDiv.className = "note";

    noteDiv.innerHTML = `
      <div class="note-top">
        <h3 class="note-title">${escapeHtml(note.title || "Untitled Note")}</h3>
        ${note.pinned ? '<span class="pin-badge">⭐ Pinned</span>' : ""}
      </div>

      <div class="note-meta">
        <span class="meta-chip">${escapeHtml(note.category || "Other")}</span>
      </div>

      <div class="note-date">📅 Created: ${formatDate(note.createdAt)}</div>
      ${
        note.reminder
          ? `<div class="note-reminder">⏰ Reminder: ${formatDate(note.reminder)}</div>`
          : `<div class="note-reminder">⏰ Reminder: Not set</div>`
      }

      <div class="note-text">${escapeHtml(note.text)}</div>

      <div class="note-actions">
        <button class="pin-btn" data-id="${note.id}">
          ${note.pinned ? "📌 Unpin" : "⭐ Pin"}
        </button>
        <button class="edit-btn" data-id="${note.id}">✏ Edit</button>
        <button class="delete-btn" data-id="${note.id}">🗑 Delete</button>
      </div>
    `;

    noteDiv.querySelector(".edit-btn").addEventListener("click", () => {
      editNote(note);
    });

    noteDiv.querySelector(".delete-btn").addEventListener("click", () => {
      deleteNote(note.id);
    });

    noteDiv.querySelector(".pin-btn").addEventListener("click", () => {
      togglePin(note.id, note.pinned);
    });

    notesContainer.appendChild(noteDiv);
  });
}

/* ---------------- Filters ---------------- */
function applyFilters() {
  const searchValue = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const categoryValue = filterCategory ? filterCategory.value : "All";
  const pinnedValue = filterPinned ? filterPinned.value : "All";

  filteredNotes = allNotes.filter((note) => {
    const matchesSearch =
      (note.title || "").toLowerCase().includes(searchValue) ||
      (note.text || "").toLowerCase().includes(searchValue);

    const matchesCategory =
      categoryValue === "All" || (note.category || "Other") === categoryValue;

    const matchesPinned =
      pinnedValue === "All" ||
      (pinnedValue === "Pinned" && note.pinned) ||
      (pinnedValue === "Unpinned" && !note.pinned);

    return matchesSearch && matchesCategory && matchesPinned;
  });

  renderNotes(filteredNotes);
  updateStats(filteredNotes);
}

if (searchInput) searchInput.addEventListener("input", applyFilters);
if (filterCategory) filterCategory.addEventListener("change", applyFilters);
if (filterPinned) filterPinned.addEventListener("change", applyFilters);

/* ---------------- Delete ---------------- */
async function deleteNote(id) {
  if (!currentUser) return;

  const confirmDelete = confirm("Are you sure you want to delete this note?");
  if (!confirmDelete) return;

  try {
    await remove(ref(db, "notes/" + currentUser.uid + "/" + id));
    showToast("Note deleted", "success");
  } catch (error) {
    showToast("Could not delete note", "error");
  }
}

/* ---------------- Pin / Unpin ---------------- */
async function togglePin(id, currentPinned) {
  if (!currentUser) return;

  try {
    await update(ref(db, "notes/" + currentUser.uid + "/" + id), {
      pinned: !currentPinned
    });

    showToast(!currentPinned ? "Note pinned" : "Note unpinned", "success");
  } catch (error) {
    showToast("Could not update pin status", "error");
  }
}

/* ---------------- Edit ---------------- */
async function editNote(note) {
  if (!currentUser) return;

  const newTitle = prompt("Edit note title:", note.title || "");
  if (newTitle === null) return;

  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle) {
    showToast("Title cannot be empty", "error");
    return;
  }

  const newText = prompt("Edit note text:", note.text || "");
  if (newText === null) return;

  const trimmedText = newText.trim();
  if (!trimmedText) {
    showToast("Note cannot be empty", "error");
    return;
  }

  const newCategory = prompt(
    "Edit category (Personal / Study / Work / Ideas / Other):",
    note.category || "Personal"
  );
  if (newCategory === null) return;

  const trimmedCategory = newCategory.trim() || "Other";

  const newReminder = prompt(
    "Edit reminder (Example: 2026-03-30T18:30) or leave blank:",
    note.reminder || ""
  );
  if (newReminder === null) return;

  try {
    await update(ref(db, "notes/" + currentUser.uid + "/" + note.id), {
      title: trimmedTitle,
      text: trimmedText,
      category: trimmedCategory,
      reminder: newReminder.trim()
    });

    showToast("Note updated successfully", "success");
  } catch (error) {
    showToast("Could not edit note", "error");
  }
}

/* ---------------- Reminder Check ---------------- */
function checkDueReminders() {
  const now = new Date();

  allNotes.forEach((note) => {
    if (!note.reminder) return;

    const reminderTime = new Date(note.reminder);
    if (isNaN(reminderTime)) return;

    const diff = reminderTime.getTime() - now.getTime();

    if (diff <= 60000 && diff >= 0) {
      const reminderKey = "reminder_shown_" + note.id + "_" + note.reminder;

      if (!sessionStorage.getItem(reminderKey)) {
        showToast(`Reminder: ${note.title}`, "info");
        sessionStorage.setItem(reminderKey, "shown");
      }
    }
  });
}

/* ---------------- Export PDF ---------------- */
if (exportPdfBtn) {
  exportPdfBtn.addEventListener("click", exportNotesAsPDF);
}

function exportNotesAsPDF() {
  if (!filteredNotes.length) {
    showToast("No notes to export", "error");
    return;
  }

  if (!window.jspdf) {
    showToast("PDF library not loaded", "error");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 15;

  doc.setFontSize(18);
  doc.text("Cloud Notes Export", 14, y);
  y += 10;

  doc.setFontSize(11);
  doc.text(`User: ${currentUser ? currentUser.email : "Unknown"}`, 14, y);
  y += 8;
  doc.text(`Exported: ${new Date().toLocaleString()}`, 14, y);
  y += 12;

  filteredNotes.forEach((note, index) => {
    const lines = [
      `${index + 1}. ${note.title || "Untitled Note"}`,
      `Category: ${note.category || "Other"}`,
      `Pinned: ${note.pinned ? "Yes" : "No"}`,
      `Created: ${formatDate(note.createdAt)}`,
      `Reminder: ${note.reminder ? formatDate(note.reminder) : "Not set"}`,
      `Note: ${note.text || ""}`
    ];

    doc.setFontSize(12);

    lines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, 180);

      if (y > 270) {
        doc.addPage();
        y = 15;
      }

      doc.text(wrapped, 14, y);
      y += wrapped.length * 7;
    });

    y += 6;
  });

  doc.save("cloud-notes.pdf");
  showToast("PDF exported successfully", "success");
}