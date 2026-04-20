// popup.js — Rap Quote Replacer
const defaultCategories = ["humor", "inspiration", "ego", "chill", "gangsta", "protest"];

async function loadSettings() {
  const settings = await chrome.storage.local.get(["isEnabled", "activeCategories", "quoteCount"]);

  document.getElementById("enableToggle").checked = settings.isEnabled !== false;

  const activeCats = settings.activeCategories || defaultCategories;
  document.querySelectorAll('.chip input[type="checkbox"]').forEach(cb => {
    cb.checked = activeCats.includes(cb.value);
  });

  const count = settings.quoteCount ?? 3;
  document.getElementById("quoteCount").value = count;
  document.getElementById("sliderValue").textContent = count;
}

async function updateReplacementCount() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "getReplacementCount" }, res => {
    if (chrome.runtime.lastError) return;
    if (res && res.count !== undefined) {
      document.getElementById("replacementCount").textContent = res.count;
    }
  });
}

async function applyChanges() {
  const isEnabled = document.getElementById("enableToggle").checked;
  const quoteCount = parseInt(document.getElementById("quoteCount").value, 10);
  const activeCategories = Array.from(document.querySelectorAll('.chip input[type="checkbox"]'))
    .filter(cb => cb.checked).map(cb => cb.value);

  await chrome.storage.local.set({ isEnabled, activeCategories, quoteCount });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, {
    action: "applySettings",
    enabled: isEnabled,
    categories: activeCategories,
    quoteCount: quoteCount,
  }, () => chrome.runtime.lastError);

  const btn = document.getElementById("applyBtn");
  btn.textContent = "✓ Applied!";
  btn.classList.add("success");
  setTimeout(() => {
    btn.textContent = "Apply Changes";
    btn.classList.remove("success");
  }, 1500);

  updateReplacementCount();
}

function randomizeCategories() {
  const checkboxes = Array.from(document.querySelectorAll('.chip input[type="checkbox"]'));
  checkboxes.forEach(cb => cb.checked = false);
  const num = Math.floor(Math.random() * 3) + 2;
  checkboxes.sort(() => Math.random() - 0.5).slice(0, num).forEach(cb => cb.checked = true);
}

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  updateReplacementCount();

  document.getElementById("applyBtn").addEventListener("click", applyChanges);
  document.getElementById("randomizeBtn").addEventListener("click", randomizeCategories);
  document.getElementById("enableToggle").addEventListener("change", applyChanges);
  // Visual feedback when toggle changes without Apply


  document.getElementById("quoteCount").addEventListener("input", e => {
    document.getElementById("sliderValue").textContent = e.target.value;
  });
});
