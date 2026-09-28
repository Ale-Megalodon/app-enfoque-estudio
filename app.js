import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Configuración proporcionada para este proyecto Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyBlEOcIwdECHb7ZKE-9m5hBlekIcEXNrcQ",
  authDomain: "mi-app-estudio-9ecc9.firebaseapp.com",
  projectId: "mi-app-estudio-9ecc9",
  storageBucket: "mi-app-estudio-9ecc9.firebasestorage.app",
  messagingSenderId: "458243262715",
  appId: "1:458243262715:web:1faad61bc2d0c5d0f9c85e"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

const DEFAULT_SETTINGS = { darkMode: false, volume: 70 };
const DEFAULT_TIMER = { focusMinutes: 25, breakMinutes: 5, priority: "medium" };
const MAX_TIMERS = 5;
const MAX_FOCUS_MINUTES = 240;
const MAX_BREAK_MINUTES = 120;

const elements = {
  authView: document.querySelector("#auth-view"),
  app: document.querySelector("#app"),
  googleLogin: document.querySelector("#google-login"),
  authError: document.querySelector("#auth-error"),
  userName: document.querySelector("#user-name"),
  userInitial: document.querySelector("#user-initial"),
  userPhoto: document.querySelector("#user-photo"),
  userButton: document.querySelector("#user-button"),
  settingsButton: document.querySelector("#settings-button"),
  logoutButton: document.querySelector("#logout-button"),
  navButtons: [...document.querySelectorAll(".nav-button")],
  timerView: document.querySelector("#timer-view"),
  statsView: document.querySelector("#stats-view"),
  timerList: document.querySelector("#timer-list"),
  timerLimit: document.querySelector("#timer-limit"),
  addTimer: document.querySelector("#add-timer"),
  emptyAddTimer: document.querySelector("#empty-add-timer"),
  editActiveTimer: document.querySelector("#edit-active-timer"),
  emptyState: document.querySelector("#empty-state"),
  timerWorkspace: document.querySelector("#timer-workspace"),
  timerHeading: document.querySelector("#timer-heading"),
  timerSubtitle: document.querySelector("#timer-subtitle"),
  priorityChip: document.querySelector("#priority-chip"),
  syncStatus: document.querySelector("#sync-status"),
  phaseLabel: document.querySelector("#phase-label"),
  phaseTitle: document.querySelector("#phase-title"),
  timerState: document.querySelector("#timer-state"),
  progressRing: document.querySelector("#progress-ring"),
  timeDisplay: document.querySelector("#time-display"),
  timeCaption: document.querySelector("#time-caption"),
  focusDuration: document.querySelector("#focus-duration"),
  breakDuration: document.querySelector("#break-duration"),
  startButton: document.querySelector("#start-button"),
  pauseButton: document.querySelector("#pause-button"),
  finishButton: document.querySelector("#finish-button"),
  timerMessage: document.querySelector("#timer-message"),
  statsEmpty: document.querySelector("#stats-empty"),
  statsWorkspace: document.querySelector("#stats-workspace"),
  statsHeading: document.querySelector("#stats-heading"),
  statsTotalLabel: document.querySelector("#stats-total-label"),
  statsDataView: document.querySelector("#stats-data-view"),
  statsChartsView: document.querySelector("#stats-charts-view"),
  statsModeButtons: [...document.querySelectorAll(".stats-mode-button")],
  statDay: document.querySelector("#stat-day"),
  statYesterday: document.querySelector("#stat-yesterday"),
  statWeek: document.querySelector("#stat-week"),
  statMonth: document.querySelector("#stat-month"),
  statTotal: document.querySelector("#stat-total"),
  recentSummary: document.querySelector("#recent-summary"),
  recentList: document.querySelector("#recent-list"),
  dayBreakdown: document.querySelector("#day-breakdown"),
  yesterdayBreakdown: document.querySelector("#yesterday-breakdown"),
  weekBreakdown: document.querySelector("#week-breakdown"),
  monthBreakdown: document.querySelector("#month-breakdown"),
  weeklyChart: document.querySelector("#weekly-chart"),
  monthlyChart: document.querySelector("#monthly-chart"),
  timerModal: document.querySelector("#timer-modal"),
  timerForm: document.querySelector("#timer-form"),
  editorEyebrow: document.querySelector("#editor-eyebrow"),
  editorTitle: document.querySelector("#editor-title"),
  timerName: document.querySelector("#timer-name"),
  focusMinutes: document.querySelector("#focus-minutes"),
  breakMinutes: document.querySelector("#break-minutes"),
  timerPriority: document.querySelector("#timer-priority"),
  timerFormMessage: document.querySelector("#timer-form-message"),
  deleteTimer: document.querySelector("#delete-timer"),
  settingsModal: document.querySelector("#settings-modal"),
  darkModeToggle: document.querySelector("#dark-mode-toggle"),
  volumeSlider: document.querySelector("#volume-slider"),
  volumeLabel: document.querySelector("#volume-label"),
  notificationsButton: document.querySelector("#notifications-button"),
  notificationStatus: document.querySelector("#notification-status"),
  breakdownModal: document.querySelector("#breakdown-modal"),
  breakdownEyebrow: document.querySelector("#breakdown-eyebrow"),
  breakdownTitle: document.querySelector("#breakdown-title"),
  breakdownList: document.querySelector("#breakdown-list"),
  toast: document.querySelector("#toast"),
  toastIcon: document.querySelector("#toast-icon"),
  toastMessage: document.querySelector("#toast-message"),
  toastClose: document.querySelector("#toast-close")
};

let currentUser = null;
let timers = [];
let selectedTimerId = null;
let settings = { ...DEFAULT_SETTINGS };
let unsubscribeTimers = null;
let unsubscribeProfile = null;
let tickerId = null;
let toastTimeout = null;
let editingTimerId = null;
let volumeSaveTimeout = null;
let statsMode = "data";
let weeklyChartInstance = null;
let monthlyChartInstance = null;
const completingTimers = new Set();
const pendingTimerUpdates = new Map();

function numeric(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function validMinutes(value, maximum) {
  const minutes = numeric(value, 0);
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= maximum ? minutes : null;
}

function sanitizeSessions(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((session) => (
    session &&
    typeof session.id === "string" &&
    Number.isFinite(session.completedAt) &&
    Number.isFinite(session.minutes) &&
    session.minutes > 0
  ));
}

function timerFromData(id, raw = {}) {
  const focusMinutes = validMinutes(raw.focusMinutes, MAX_FOCUS_MINUTES) || DEFAULT_TIMER.focusMinutes;
  const breakMinutes = validMinutes(raw.breakMinutes, MAX_BREAK_MINUTES) || DEFAULT_TIMER.breakMinutes;
  const status = ["idle", "running", "paused"].includes(raw.status) ? raw.status : "idle";
  const phase = raw.phase === "break" ? "break" : "focus";
  const activeDurationMs = Math.max(0, numeric(raw.activeDurationMs, 0));
  const remainingMs = Math.max(0, numeric(raw.remainingMs, 0));

  return {
    id,
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "Temporizador sin nombre",
    focusMinutes,
    breakMinutes,
    priority: ["high", "medium", "low"].includes(raw.priority) ? raw.priority : "medium",
    sessions: sanitizeSessions(raw.sessions),
    phase,
    status,
    endTime: Number.isFinite(raw.endTime) ? raw.endTime : null,
    remainingMs,
    activeDurationMs,
    createdAt: numeric(raw.createdAt, Date.now()),
    updatedAt: numeric(raw.updatedAt, Date.now())
  };
}

function timerReference(timerId) {
  return doc(db, "users", currentUser.uid, "timers", timerId);
}

function userReference() {
  return doc(db, "users", currentUser.uid);
}

function selectedTimer() {
  return timers.find((timer) => timer.id === selectedTimerId) || null;
}

function priorityText(priority) {
  return { high: "Alta", medium: "Media", low: "Baja" }[priority] || "Media";
}

function statusText(status) {
  return { running: "EN CURSO", paused: "PAUSADO", idle: "LISTO" }[status] || "LISTO";
}

function sessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatClock(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatStudyTime(minutes) {
  const hours = Math.max(0, numeric(minutes, 0) / 60);
  return `${hours.toLocaleString("en-US", { maximumFractionDigits: 1 })} hrs`;
}

function localDayStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sumSessions(sessions, predicate) {
  return sessions.reduce((total, session) => total + (predicate(session) ? session.minutes : 0), 0);
}

function timerRemaining(timer) {
  if (timer.status === "running" && timer.endTime) return Math.max(0, timer.endTime - Date.now());
  if (timer.status === "paused") return timer.remainingMs;
  return (timer.phase === "focus" ? timer.focusMinutes : timer.breakMinutes) * 60_000;
}

function timerProgress(timer, remaining) {
  if (timer.status === "idle" || !timer.activeDurationMs) return 0;
  return Math.min(1, Math.max(0, 1 - remaining / timer.activeDurationMs));
}

function setSyncStatus(message, saving = false) {
  elements.syncStatus.textContent = message;
  elements.syncStatus.classList.toggle("is-saving", saving);
}

function applyOptimisticTimerUpdate(timerId, patch) {
  const index = timers.findIndex((timer) => timer.id === timerId);
  if (index < 0) return null;
  const previous = timers[index];
  const next = { ...previous, ...patch };
  pendingTimerUpdates.set(timerId, { patch, updatedAt: patch.updatedAt || Date.now() });
  timers = [...timers.slice(0, index), next, ...timers.slice(index + 1)];
  renderAll();
  return previous;
}

function rollbackOptimisticTimerUpdate(timerId, previous) {
  pendingTimerUpdates.delete(timerId);
  if (!previous) return;
  const index = timers.findIndex((timer) => timer.id === timerId);
  if (index < 0) return;
  timers = [...timers.slice(0, index), previous, ...timers.slice(index + 1)];
  renderAll();
}

function resolveOptimisticTimerUpdate(timerId) {
  pendingTimerUpdates.delete(timerId);
}

function renderTimers() {
  elements.timerList.replaceChildren();
  elements.addTimer.disabled = timers.length >= MAX_TIMERS;
  elements.timerLimit.textContent = timers.length >= MAX_TIMERS
    ? "Límite de 5 temporizadores alcanzado."
    : `Puedes crear hasta ${MAX_TIMERS} temporizadores.`;

  timers.forEach((timer) => {
    const card = document.createElement("div");
    card.className = `timer-card${timer.id === selectedTimerId ? " is-selected" : ""}`;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Seleccionar ${timer.title}`);
    card.innerHTML = `
      <span class="timer-card-title"></span>
      <span class="timer-card-info"></span>
      <button class="icon-button timer-card-edit" type="button" aria-label="Editar ${timer.title}" title="Editar">✎</button>`;
    card.querySelector(".timer-card-title").textContent = timer.title;
    const info = card.querySelector(".timer-card-info");
    info.textContent = `${timer.focusMinutes} / ${timer.breakMinutes} min · ${priorityText(timer.priority)}`;
    if (timer.status !== "idle") {
      const badge = document.createElement("span");
      badge.className = "timer-card-status";
      badge.textContent = timer.status === "paused" ? "PAUSA" : "ACTIVO";
      info.append(badge);
    }
    card.addEventListener("click", (event) => {
      if (event.target.closest(".timer-card-edit")) return;
      selectTimer(timer.id);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectTimer(timer.id);
      }
    });
    card.querySelector(".timer-card-edit").addEventListener("click", () => openTimerEditor(timer));
    elements.timerList.append(card);
  });
}

function renderTimerWorkspace() {
  const timer = selectedTimer();
  const hasTimer = Boolean(timer);
  elements.emptyState.hidden = hasTimer;
  elements.timerWorkspace.hidden = !hasTimer;
  if (!timer) return;

  const isFocus = timer.phase === "focus";
  const remaining = timerRemaining(timer);
  const progress = timerProgress(timer, remaining);
  const progressColor = isFocus ? "var(--accent)" : "var(--success)";
  const remainderColor = isFocus ? "rgba(234, 251, 255, .17)" : "rgba(196, 243, 222, .15)";

  elements.timerHeading.textContent = timer.title;
  elements.timerSubtitle.textContent = `${timer.focusMinutes} min de enfoque · ${timer.breakMinutes} min de descanso`;
  elements.priorityChip.textContent = `Prioridad ${priorityText(timer.priority).toLowerCase()}`;
  elements.priorityChip.className = `priority-chip priority-${timer.priority}`;
  elements.phaseLabel.textContent = isFocus ? "FOCUS" : "BREAK";
  elements.phaseTitle.textContent = isFocus ? "Momento de concentrarte" : "Momento de descansar";
  elements.timerState.textContent = statusText(timer.status);
  elements.timerState.className = `state-pill${timer.status === "running" ? " is-running" : timer.status === "paused" ? " is-paused" : ""}`;
  elements.timeDisplay.textContent = formatClock(remaining);
  elements.timeCaption.textContent = timer.status === "idle" ? "minutos disponibles" : "tiempo restante";
  elements.focusDuration.textContent = `${timer.focusMinutes} min`;
  elements.breakDuration.textContent = `${timer.breakMinutes} min`;
  elements.progressRing.style.background = `conic-gradient(${progressColor} ${progress * 360}deg, ${remainderColor} ${progress * 360}deg)`;
  elements.progressRing.classList.toggle("is-break", !isFocus);
  elements.startButton.hidden = timer.status !== "idle";
  elements.pauseButton.hidden = timer.status === "idle";
  elements.finishButton.hidden = timer.status === "idle";
  elements.startButton.innerHTML = isFocus ? 'Iniciar Focus <span aria-hidden="true">→</span>' : 'Iniciar Break <span aria-hidden="true">→</span>';
  elements.pauseButton.textContent = timer.status === "paused" ? "Reanudar" : "Pausar";
  elements.timerMessage.textContent = timer.status === "paused"
    ? "La cuenta está congelada y sincronizada."
    : timer.status === "running"
      ? "La sesión continuará aunque cambies de dispositivo."
      : "El avance se guarda en la nube al iniciar, pausar o terminar.";
}

function renderStatistics() {
  const timer = selectedTimer();
  const hasTimer = Boolean(timer);
  elements.statsEmpty.hidden = hasTimer;
  elements.statsWorkspace.hidden = !hasTimer;
  if (!timer) return;

  const now = new Date();
  const todayStart = localDayStart(now).getTime();
  const tomorrowStart = todayStart + 86_400_000;
  const yesterdayStart = todayStart - 86_400_000;
  const sevenDaysStart = todayStart - 6 * 86_400_000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const sessions = timer.sessions;
  const day = sumSessions(sessions, (session) => session.completedAt >= todayStart && session.completedAt < tomorrowStart);
  const yesterday = sumSessions(sessions, (session) => session.completedAt >= yesterdayStart && session.completedAt < todayStart);
  const week = sumSessions(sessions, (session) => session.completedAt >= sevenDaysStart && session.completedAt < tomorrowStart);
  const month = sumSessions(sessions, (session) => session.completedAt >= monthStart && session.completedAt < tomorrowStart);
  const total = sumSessions(sessions, () => true);

  elements.statsHeading.textContent = timer.title;
  elements.statsTotalLabel.textContent = `${formatStudyTime(total)} registrados`;
  elements.statDay.textContent = formatStudyTime(day);
  elements.statYesterday.textContent = formatStudyTime(yesterday);
  elements.statWeek.textContent = formatStudyTime(week);
  elements.statMonth.textContent = formatStudyTime(month);
  elements.statTotal.textContent = formatStudyTime(total);
  elements.recentSummary.textContent = `${sessions.length} ${sessions.length === 1 ? "sesión" : "sesiones"}`;
  renderRecentSessions(sessions);
  renderStatisticsMode();
}

function renderRecentSessions(sessions) {
  elements.recentList.replaceChildren();
  const latest = [...sessions].sort((a, b) => b.completedAt - a.completedAt).slice(0, 6);
  if (!latest.length) {
    const empty = document.createElement("p");
    empty.className = "session-empty";
    empty.textContent = "Aún no hay sesiones Focus registradas.";
    elements.recentList.append(empty);
    return;
  }
  latest.forEach((session) => {
    const row = document.createElement("div");
    row.className = "session-row";
    const date = new Date(session.completedAt);
    const dateText = date.toLocaleDateString("es-BO", { weekday: "short", day: "numeric", month: "short" });
    row.innerHTML = "<strong></strong><span></span>";
    row.querySelector("strong").textContent = formatStudyTime(session.minutes);
    row.querySelector("span").textContent = dateText.charAt(0).toUpperCase() + dateText.slice(1);
    elements.recentList.append(row);
  });
}

function renderAll() {
  if (!currentUser) return;
  renderTimers();
  renderTimerWorkspace();
  renderStatistics();
}

function renderStatisticsMode() {
  const showCharts = statsMode === "charts";
  elements.statsDataView.hidden = showCharts;
  elements.statsChartsView.hidden = !showCharts;
  elements.statsModeButtons.forEach((button) => {
    const active = button.dataset.statsMode === statsMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (showCharts) renderCharts();
}

function chartColors() {
  const isDark = document.body.classList.contains("dark-mode");
  return {
    grid: isDark ? "rgba(165, 201, 238, 0.14)" : "rgba(148, 163, 184, 0.2)",
    text: isDark ? "#bfd0e5" : "#64748b",
    accent: isDark ? "#7de2ff" : "#0284c7",
    area: isDark ? "rgba(125, 226, 255, 0.18)" : "rgba(2, 132, 199, 0.14)"
  };
}

function destroyCharts() {
  weeklyChartInstance?.destroy();
  monthlyChartInstance?.destroy();
  weeklyChartInstance = null;
  monthlyChartInstance = null;
}

function renderCharts() {
  const timer = selectedTimer();
  if (!timer || !window.Chart) return;
  destroyCharts();
  const now = new Date();
  const today = localDayStart(now);
  const colors = chartColors();
  const weekLabels = [];
  const weekValues = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const start = new Date(today);
    start.setDate(start.getDate() - offset);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    weekLabels.push(start.toLocaleDateString("es-BO", { weekday: "short", day: "numeric" }));
    weekValues.push(Number((sumSessions(timer.sessions, (session) => session.completedAt >= start.getTime() && session.completedAt < end.getTime()) / 60).toFixed(2)));
  }
  const year = now.getFullYear();
  const monthLabels = [];
  const monthValues = [];
  for (let month = 0; month < 12; month += 1) {
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 1).getTime();
    monthLabels.push(new Date(year, month, 1).toLocaleDateString("es-BO", { month: "short" }));
    monthValues.push(Number((sumSessions(timer.sessions, (session) => session.completedAt >= start && session.completedAt < end) / 60).toFixed(2)));
  }
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 260 },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.parsed.y} hrs` } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: colors.text, font: { size: 11 } }, border: { display: false } },
      y: { beginAtZero: true, grid: { color: colors.grid }, ticks: { color: colors.text, callback: (value) => `${value}h`, font: { size: 11 } }, border: { display: false } }
    }
  };
  weeklyChartInstance = new window.Chart(elements.weeklyChart, {
    type: "bar",
    data: { labels: weekLabels, datasets: [{ data: weekValues, backgroundColor: colors.accent, borderRadius: 7, borderSkipped: false, maxBarThickness: 34 }] },
    options: commonOptions
  });
  monthlyChartInstance = new window.Chart(elements.monthlyChart, {
    type: "line",
    data: { labels: monthLabels, datasets: [{ data: monthValues, borderColor: colors.accent, backgroundColor: colors.area, fill: true, tension: 0.38, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: colors.accent, borderWidth: 2.5 }] },
    options: commonOptions
  });
}

function setStatisticsMode(nextMode) {
  statsMode = nextMode === "charts" ? "charts" : "data";
  renderStatisticsMode();
}

function selectTimer(timerId) {
  selectedTimerId = timerId;
  renderAll();
}

function showView(view) {
  const isTimer = view === "timer";
  elements.timerView.hidden = !isTimer;
  elements.statsView.hidden = isTimer;
  elements.navButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  if (!isTimer) renderStatistics();
}

function showToast(message, icon = "✓") {
  window.clearTimeout(toastTimeout);
  elements.toastMessage.textContent = message;
  elements.toastIcon.textContent = icon;
  elements.toast.hidden = false;
  toastTimeout = window.setTimeout(() => { elements.toast.hidden = true; }, 6_000);
}

function openModal(modal) {
  if (!modal.open) modal.showModal();
}

function closeModal(modal) {
  if (modal.open) modal.close();
}

function openTimerEditor(timer = null) {
  editingTimerId = timer?.id || null;
  elements.timerForm.reset();
  elements.timerFormMessage.hidden = true;
  elements.editorEyebrow.textContent = timer ? "EDITAR TEMPORIZADOR" : "NUEVO TEMPORIZADOR";
  elements.editorTitle.textContent = timer ? "Ajusta tu espacio" : "Crea un espacio";
  elements.deleteTimer.hidden = !timer;
  elements.timerName.value = timer?.title || "";
  elements.focusMinutes.value = timer?.focusMinutes || DEFAULT_TIMER.focusMinutes;
  elements.breakMinutes.value = timer?.breakMinutes || DEFAULT_TIMER.breakMinutes;
  elements.timerPriority.value = timer?.priority || DEFAULT_TIMER.priority;
  openModal(elements.timerModal);
  window.setTimeout(() => elements.timerName.focus(), 50);
}

function editorMessage(message) {
  elements.timerFormMessage.textContent = message;
  elements.timerFormMessage.hidden = false;
}

async function saveTimer(event) {
  event.preventDefault();
  const title = elements.timerName.value.trim();
  const focusMinutes = validMinutes(elements.focusMinutes.value, MAX_FOCUS_MINUTES);
  const breakMinutes = validMinutes(elements.breakMinutes.value, MAX_BREAK_MINUTES);
  const priority = elements.timerPriority.value;
  if (!title || !focusMinutes || !breakMinutes || !["high", "medium", "low"].includes(priority)) {
    editorMessage("Completa un nombre y duraciones válidas.");
    return;
  }
  const existing = editingTimerId ? timers.find((timer) => timer.id === editingTimerId) : null;
  if (existing && existing.status !== "idle") {
    editorMessage("Pausa o termina la sesión antes de cambiar su configuración.");
    return;
  }
  if (!existing && timers.length >= MAX_TIMERS) {
    editorMessage(`Solo puedes tener ${MAX_TIMERS} temporizadores.`);
    return;
  }

  setSyncStatus("Guardando…", true);
  try {
    const now = Date.now();
    if (existing) {
      await updateDoc(timerReference(existing.id), { title, focusMinutes, breakMinutes, priority, updatedAt: now });
    } else {
      const reference = doc(collection(db, "users", currentUser.uid, "timers"));
      await setDoc(reference, {
        title,
        focusMinutes,
        breakMinutes,
        priority,
        sessions: [],
        phase: "focus",
        status: "idle",
        endTime: null,
        remainingMs: null,
        activeDurationMs: null,
        createdAt: now,
        updatedAt: now
      });
      selectedTimerId = reference.id;
    }
    closeModal(elements.timerModal);
    showToast(existing ? "Temporizador actualizado." : "Temporizador creado.");
  } catch (error) {
    editorMessage("No se pudo guardar. Comprueba la conexión y las reglas de Firestore.");
    console.error(error);
  } finally {
    setSyncStatus("Sincronizado");
  }
}

async function removeTimer() {
  const timer = timers.find((item) => item.id === editingTimerId);
  if (!timer) return;
  if (timer.status !== "idle") {
    editorMessage("Termina la sesión activa antes de eliminar el temporizador.");
    return;
  }
  if (!window.confirm(`¿Eliminar “${timer.title}” y sus estadísticas?`)) return;
  setSyncStatus("Eliminando…", true);
  try {
    await deleteDoc(timerReference(timer.id));
    if (selectedTimerId === timer.id) selectedTimerId = null;
    closeModal(elements.timerModal);
    showToast("Temporizador eliminado.");
  } catch (error) {
    editorMessage("No se pudo eliminar el temporizador.");
    console.error(error);
  } finally {
    setSyncStatus("Sincronizado");
  }
}

function syncTimerInBackground(timerId, previous, task, failureMessage) {
  task.then((committed) => {
    if (committed === false) {
      rollbackOptimisticTimerUpdate(timerId, previous);
      showToast("El temporizador cambió en otro dispositivo. Se actualizó la vista.", "!");
      return;
    }
    // El snapshot local confirmado elimina el parche pendiente; así no hay parpadeo con datos antiguos.
  }).catch((error) => {
    rollbackOptimisticTimerUpdate(timerId, previous);
    showToast(failureMessage, "!");
    console.error(error);
  }).finally(() => {
    setSyncStatus("Sincronizado");
  });
}

function startTimer() {
  const timer = selectedTimer();
  if (!timer || timer.status !== "idle") return;
  const startedAt = Date.now();
  const durationMs = (timer.phase === "focus" ? timer.focusMinutes : timer.breakMinutes) * 60_000;
  const patch = {
    status: "running",
    endTime: startedAt + durationMs,
    remainingMs: null,
    activeDurationMs: durationMs,
    updatedAt: startedAt
  };
  const previous = applyOptimisticTimerUpdate(timer.id, patch);
  startTicker();
  setSyncStatus("Sincronizando…", true);
  const task = runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(timerReference(timer.id));
    if (!snapshot.exists()) return false;
    const current = timerFromData(timer.id, snapshot.data());
    if (current.status !== "idle") return false;
    transaction.update(snapshot.ref, patch);
    return true;
  });
  syncTimerInBackground(timer.id, previous, task, "No se pudo iniciar el temporizador.");
}

function togglePause() {
  const timer = selectedTimer();
  if (!timer || timer.status === "idle") return;
  const changedAt = Date.now();
  const isPausing = timer.status === "running";
  const remainingMs = isPausing ? Math.max(0, timer.endTime - changedAt) : timer.remainingMs;
  const patch = isPausing
    ? { status: "paused", endTime: null, remainingMs, updatedAt: changedAt }
    : { status: "running", endTime: changedAt + remainingMs, remainingMs: null, updatedAt: changedAt };
  const previous = applyOptimisticTimerUpdate(timer.id, patch);
  startTicker();
  setSyncStatus("Sincronizando…", true);
  const task = runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(timerReference(timer.id));
    if (!snapshot.exists()) return false;
    const current = timerFromData(timer.id, snapshot.data());
    if (isPausing && current.status !== "running") return false;
    if (!isPausing && current.status !== "paused") return false;
    transaction.update(snapshot.ref, patch);
    return true;
  });
  syncTimerInBackground(timer.id, previous, task, "No se pudo actualizar la pausa.");
}

function finishTimer() {
  const timer = selectedTimer();
  if (!timer || timer.status === "idle") return;
  const finishedAt = Date.now();
  const remainingMs = timer.status === "running"
    ? Math.max(0, timer.endTime - finishedAt)
    : timer.remainingMs;
  const registeredMinutes = timer.phase === "focus"
    ? Math.max(0, timer.activeDurationMs - remainingMs) / 60_000
    : 0;
  const session = registeredMinutes > 0
    ? { id: sessionId(), minutes: registeredMinutes, completedAt: finishedAt }
    : null;
  const patch = {
    sessions: session ? [...timer.sessions, session] : timer.sessions,
    phase: "focus",
    status: "idle",
    endTime: null,
    remainingMs: null,
    activeDurationMs: null,
    updatedAt: finishedAt
  };
  const previous = applyOptimisticTimerUpdate(timer.id, patch);
  showToast(timer.phase === "focus"
    ? (registeredMinutes > 0 ? `${formatStudyTime(registeredMinutes)} registrados.` : "Sesión finalizada.")
    : "Descanso finalizado sin registrar tiempo de estudio.");
  setSyncStatus("Registrando…", true);
  const task = runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(timerReference(timer.id));
    if (!snapshot.exists()) return false;
    const current = timerFromData(timer.id, snapshot.data());
    if (current.status === "idle") return false;
    const cloudRemainingMs = current.status === "running"
      ? Math.max(0, current.endTime - finishedAt)
      : current.remainingMs;
    const cloudRegisteredMinutes = current.phase === "focus"
      ? Math.max(0, current.activeDurationMs - cloudRemainingMs) / 60_000
      : 0;
    const cloudSession = cloudRegisteredMinutes > 0
      ? { id: session?.id || sessionId(), minutes: cloudRegisteredMinutes, completedAt: finishedAt }
      : null;
    transaction.update(snapshot.ref, {
      sessions: cloudSession ? [...current.sessions, cloudSession] : current.sessions,
      phase: "focus",
      status: "idle",
      endTime: null,
      remainingMs: null,
      activeDurationMs: null,
      updatedAt: finishedAt
    });
    return true;
  });
  syncTimerInBackground(timer.id, previous, task, "No se pudo terminar la sesión.");
}

async function completeExpiredTimer(timer) {
  if (completingTimers.has(timer.id) || timer.status !== "running" || !timer.endTime || timer.endTime > Date.now()) return;
  completingTimers.add(timer.id);
  try {
    const result = await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(timerReference(timer.id));
      if (!snapshot.exists()) return null;
      const current = timerFromData(timer.id, snapshot.data());
      const now = Date.now();
      if (current.status !== "running" || !current.endTime || current.endTime > now) return null;
      const completedPhase = current.phase;
      const sessions = [...current.sessions];
      if (completedPhase === "focus") {
        sessions.push({
          id: sessionId(),
          minutes: current.activeDurationMs / 60_000,
          completedAt: current.endTime
        });
      }
      transaction.update(snapshot.ref, {
        sessions,
        phase: completedPhase === "focus" ? "break" : "focus",
        status: "idle",
        endTime: null,
        remainingMs: null,
        activeDurationMs: null,
        updatedAt: now
      });
      return { title: current.title, phase: completedPhase };
    });
    if (result) {
      const isFocus = result.phase === "focus";
      const message = isFocus ? `Focus terminado en ${result.title}. Es hora de descansar.` : `Descanso terminado en ${result.title}. Puedes volver a Focus.`;
      playAlarm();
      notifyWhenHidden(isFocus ? "Focus finalizado" : "Descanso finalizado", message, timer.id);
      showToast(message);
    }
  } catch (error) {
    console.error("No se pudo finalizar el temporizador", error);
  } finally {
    completingTimers.delete(timer.id);
  }
}

function playAlarm() {
  const volume = Math.min(1, Math.max(0, numeric(settings.volume, DEFAULT_SETTINGS.volume) / 100));
  if (volume === 0) return;
  try {
    const audio = new Audio("alarma.mp3");
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {
    // La notificación visual continúa disponible aunque el navegador restrinja el audio.
  }
}

function notifyWhenHidden(title, body, timerId) {
  if (!document.hidden || !("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: `focus-cloud-${timerId}`, renotify: true, silent: false });
  } catch {
    // Algunos navegadores no permiten crear notificaciones desde ciertas pestañas.
  }
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    elements.notificationStatus.textContent = "Este navegador no admite notificaciones nativas.";
    elements.notificationsButton.hidden = true;
    return;
  }
  const permission = await Notification.requestPermission();
  renderNotificationSettings(permission);
  if (permission === "granted") showToast("Notificaciones activadas.");
}

function renderNotificationSettings(permission = "Notification" in window ? Notification.permission : "unsupported") {
  if (permission === "granted") {
    elements.notificationStatus.textContent = "Recibirás avisos nativos cuando un temporizador finalice en segundo plano.";
    elements.notificationsButton.textContent = "Activadas";
    elements.notificationsButton.disabled = true;
  } else if (permission === "denied") {
    elements.notificationStatus.textContent = "Las notificaciones están bloqueadas en el navegador. Puedes habilitarlas desde sus permisos.";
    elements.notificationsButton.textContent = "Bloqueadas";
    elements.notificationsButton.disabled = true;
  } else if (permission === "unsupported") {
    elements.notificationStatus.textContent = "Este navegador no admite notificaciones nativas.";
    elements.notificationsButton.hidden = true;
  } else {
    elements.notificationStatus.textContent = "Activa las notificaciones para recibir avisos cuando la pestaña esté en segundo plano.";
    elements.notificationsButton.textContent = "Activar";
    elements.notificationsButton.disabled = false;
  }
}

function applySettings(nextSettings) {
  settings = {
    darkMode: Boolean(nextSettings.darkMode),
    volume: Math.min(100, Math.max(0, Math.round(numeric(nextSettings.volume, DEFAULT_SETTINGS.volume))))
  };
  document.body.classList.toggle("dark-mode", settings.darkMode);
  elements.darkModeToggle.checked = settings.darkMode;
  elements.volumeSlider.value = settings.volume;
  elements.volumeLabel.textContent = `${settings.volume}%`;
  if (statsMode === "charts" && selectedTimer()) renderCharts();
}

async function saveSettings(patch) {
  if (!currentUser) return;
  const nextSettings = { ...settings, ...patch };
  applySettings(nextSettings);
  try {
    await setDoc(userReference(), { settings: nextSettings, updatedAt: Date.now() }, { merge: true });
  } catch (error) {
    showToast("No se pudieron guardar los ajustes.", "!");
    console.error(error);
  }
}

function openWeekBreakdown() {
  const timer = selectedTimer();
  if (!timer) return;
  const now = new Date();
  const currentMonday = localDayStart(now);
  currentMonday.setDate(currentMonday.getDate() - ((currentMonday.getDay() + 6) % 7));
  const rows = [];
  for (let index = 0; index < 4; index += 1) {
    const start = new Date(currentMonday);
    start.setDate(start.getDate() - index * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const minutes = sumSessions(timer.sessions, (session) => session.completedAt >= start.getTime() && session.completedAt < end.getTime());
    const label = index === 0
      ? "Esta semana"
      : `${start.toLocaleDateString("es-BO", { day: "numeric", month: "short" })} — ${new Date(end.getTime() - 86_400_000).toLocaleDateString("es-BO", { day: "numeric", month: "short" })}`;
    rows.push({ label, minutes });
  }
  renderBreakdown("ÚLTIMAS 4 SEMANAS", `Semanas de ${timer.title}`, rows);
}

function timeRangeLabel(hour) {
  const formatHour = (value) => {
    const suffix = value >= 12 && value < 24 ? "PM" : "AM";
    const hour12 = value % 12 || 12;
    return `${String(hour12).padStart(2, "0")}:00 ${suffix}`;
  };
  return `${formatHour(hour)} - ${formatHour((hour + 1) % 24)}`;
}

function openDayBreakdown(dayOffset) {
  const timer = selectedTimer();
  if (!timer) return;
  const start = localDayStart(new Date());
  start.setDate(start.getDate() + dayOffset);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const hours = new Map();
  timer.sessions
    .filter((session) => session.completedAt >= start.getTime() && session.completedAt < end.getTime())
    .forEach((session) => {
      const hour = new Date(session.completedAt).getHours();
      hours.set(hour, (hours.get(hour) || 0) + session.minutes);
    });
  const rows = [...hours.entries()]
    .sort(([firstHour], [secondHour]) => firstHour - secondHour)
    .map(([hour, minutes]) => ({ label: timeRangeLabel(hour), minutes }));
  const dayLabel = dayOffset === 0 ? "HOY" : "AYER";
  const dateLabel = start.toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "long" });
  renderBreakdown(dayLabel, `Bloques de ${dateLabel}`, rows);
}

function openMonthBreakdown() {
  const timer = selectedTimer();
  if (!timer) return;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const dayMinutes = new Map();
  timer.sessions.forEach((session) => {
    const date = new Date(session.completedAt);
    if (date.getFullYear() === year && date.getMonth() === month) {
      dayMinutes.set(date.getDate(), (dayMinutes.get(date.getDate()) || 0) + session.minutes);
    }
  });
  elements.breakdownEyebrow.textContent = "CALENDARIO MENSUAL";
  elements.breakdownTitle.textContent = now.toLocaleDateString("es-BO", { month: "long", year: "numeric" });
  elements.breakdownList.className = "breakdown-list calendar-breakdown";
  elements.breakdownList.replaceChildren();
  ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].forEach((label) => {
    const header = document.createElement("span");
    header.className = "calendar-weekday";
    header.textContent = label;
    elements.breakdownList.append(header);
  });
  for (let blank = 0; blank < firstWeekday; blank += 1) {
    const spacer = document.createElement("span");
    spacer.className = "calendar-day is-empty";
    elements.breakdownList.append(spacer);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const cell = document.createElement("div");
    const isToday = now.getDate() === day;
    cell.className = `calendar-day${isToday ? " is-today" : ""}`;
    cell.innerHTML = "<span></span><strong></strong>";
    cell.querySelector("span").textContent = day;
    cell.querySelector("strong").textContent = formatStudyTime(dayMinutes.get(day) || 0);
    elements.breakdownList.append(cell);
  }
  openModal(elements.breakdownModal);
}

function renderBreakdown(eyebrow, title, rows) {
  elements.breakdownEyebrow.textContent = eyebrow;
  elements.breakdownTitle.textContent = title;
  elements.breakdownList.className = "breakdown-list";
  elements.breakdownList.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "breakdown-empty";
    empty.textContent = "No hay sesiones registradas en este período.";
    elements.breakdownList.append(empty);
  }
  rows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "breakdown-row";
    item.innerHTML = "<span></span><strong></strong>";
    item.querySelector("span").textContent = row.label.charAt(0).toUpperCase() + row.label.slice(1);
    item.querySelector("strong").textContent = formatStudyTime(row.minutes);
    elements.breakdownList.append(item);
  });
  openModal(elements.breakdownModal);
}

function tick() {
  if (!currentUser) return;
  timers.forEach((timer) => completeExpiredTimer(timer));
  renderTimerWorkspace();
  renderTimers();
}

function startTicker() {
  if (!tickerId) tickerId = window.setInterval(tick, 1_000);
}

function stopTicker() {
  window.clearInterval(tickerId);
  tickerId = null;
}

function listenToCloudData() {
  unsubscribeProfile?.();
  unsubscribeTimers?.();
  unsubscribeProfile = onSnapshot(userReference(), async (snapshot) => {
    const profile = snapshot.exists() ? snapshot.data() : {};
    applySettings({ ...DEFAULT_SETTINGS, ...(profile.settings || {}) });
  }, (error) => {
    console.error(error);
    showToast("No se pudieron cargar los ajustes de la nube.", "!");
  });
  unsubscribeTimers = onSnapshot(collection(db, "users", currentUser.uid, "timers"), (snapshot) => {
    timers = snapshot.docs
      .map((document) => timerFromData(document.id, document.data()))
      .map((timer) => {
        const pending = pendingTimerUpdates.get(timer.id);
        if (!pending) return timer;
        if (timer.updatedAt >= pending.updatedAt) {
          pendingTimerUpdates.delete(timer.id);
          return timer;
        }
        return { ...timer, ...pending.patch };
      })
      .sort((first, second) => first.createdAt - second.createdAt);
    if (!selectedTimerId || !timers.some((timer) => timer.id === selectedTimerId)) selectedTimerId = timers[0]?.id || null;
    renderAll();
    tick();
  }, (error) => {
    console.error(error);
    showToast("No se pudieron cargar los temporizadores. Revisa las reglas de Firestore.", "!");
  });
}

async function initializeUser(user) {
  currentUser = user;
  const initial = (user.displayName || user.email || "U").trim().charAt(0).toUpperCase();
  elements.userName.textContent = user.displayName || user.email || "Cuenta Google";
  elements.userInitial.textContent = initial;
  elements.userPhoto.hidden = !user.photoURL;
  elements.userInitial.hidden = Boolean(user.photoURL);
  if (user.photoURL) elements.userPhoto.src = user.photoURL;
  elements.authView.hidden = true;
  elements.app.hidden = false;
  renderNotificationSettings();
  await setDoc(userReference(), {
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    updatedAt: Date.now()
  }, { merge: true });
  listenToCloudData();
  startTicker();
}

function resetUserInterface() {
  stopTicker();
  unsubscribeTimers?.();
  unsubscribeProfile?.();
  unsubscribeTimers = null;
  unsubscribeProfile = null;
  currentUser = null;
  timers = [];
  selectedTimerId = null;
  completingTimers.clear();
  elements.app.hidden = true;
  elements.authView.hidden = false;
  elements.authError.hidden = true;
  closeModal(elements.settingsModal);
  closeModal(elements.timerModal);
  closeModal(elements.breakdownModal);
}

async function loginWithGoogle() {
  elements.authError.hidden = true;
  elements.googleLogin.disabled = true;
  elements.googleLogin.textContent = "Abriendo Google…";
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error(error);
    elements.authError.textContent = error.code === "auth/popup-closed-by-user"
      ? "Cerraste la ventana de Google antes de iniciar sesión."
      : "No se pudo iniciar sesión con Google. Inténtalo otra vez.";
    elements.authError.hidden = false;
  } finally {
    elements.googleLogin.disabled = false;
    elements.googleLogin.innerHTML = '<span class="google-g" aria-hidden="true">G</span> Continuar con Google';
  }
}

async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    showToast("No se pudo cerrar sesión.", "!");
    console.error(error);
  }
}

elements.googleLogin.addEventListener("click", loginWithGoogle);
elements.userButton.addEventListener("click", () => openModal(elements.settingsModal));
elements.settingsButton.addEventListener("click", () => openModal(elements.settingsModal));
elements.logoutButton.addEventListener("click", logout);
elements.addTimer.addEventListener("click", () => openTimerEditor());
elements.emptyAddTimer.addEventListener("click", () => openTimerEditor());
elements.editActiveTimer.addEventListener("click", () => { const timer = selectedTimer(); if (timer) openTimerEditor(timer); });
elements.timerForm.addEventListener("submit", saveTimer);
elements.deleteTimer.addEventListener("click", removeTimer);
elements.startButton.addEventListener("click", startTimer);
elements.pauseButton.addEventListener("click", togglePause);
elements.finishButton.addEventListener("click", finishTimer);
elements.weekBreakdown.addEventListener("click", openWeekBreakdown);
elements.monthBreakdown.addEventListener("click", openMonthBreakdown);
elements.notificationsButton.addEventListener("click", requestNotifications);
elements.darkModeToggle.addEventListener("change", () => saveSettings({ darkMode: elements.darkModeToggle.checked }));
elements.volumeSlider.addEventListener("input", () => {
  elements.volumeLabel.textContent = `${elements.volumeSlider.value}%`;
  window.clearTimeout(volumeSaveTimeout);
  volumeSaveTimeout = window.setTimeout(() => saveSettings({ volume: Number(elements.volumeSlider.value) }), 450);
});
elements.toastClose.addEventListener("click", () => { elements.toast.hidden = true; });
elements.navButtons.forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => closeModal(document.querySelector(`#${button.dataset.close}`))));
document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });

onAuthStateChanged(auth, (user) => {
  if (user) initializeUser(user).catch((error) => {
    console.error(error);
    showToast("No se pudo preparar tu espacio en la nube.", "!");
  });
  else resetUserInterface();
});
