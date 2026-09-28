/* ==========================================================================
   APP DE ESTUDIO – TEMPORIZADORES POMODORO CON FIREBASE
   Índice:
   1. Imports de Firebase
   2. Configuración y constantes
   3. Referencias al DOM
   4. Estado global
   5. Utilidades (datos, formato, tiempo)
   6. Sonido y notificaciones
   7. Actualizaciones optimistas
   8. Render (temporizadores, workspace, estadísticas, gráficos)
   9. Modal de desglose
   10. Navegación, toast y modales
   11. CRUD de temporizadores
   12. Acciones del temporizador (iniciar, pausar, terminar, expirar)
   13. Ticker
   14. Ajustes (tema, volumen, notificaciones)
   15. Firestore listeners
   16. Eventos de interfaz
   17. Autenticación e inicialización
   ========================================================================== */

/* ==========================================================================
   1. IMPORTS DE FIREBASE
   ========================================================================== */
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

/* ==========================================================================
   2. CONFIGURACIÓN Y CONSTANTES
   ========================================================================== */
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
const DAY_MS = 86_400_000;
const TAG_COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];
const MAX_TAGS = 3;
const MAX_TAG_LENGTH = 16;

/* ==========================================================================
   3. REFERENCIAS AL DOM
   ========================================================================== */
const elements = {
  // Autenticación
  authView: document.querySelector("#auth-view"),
  app: document.querySelector("#app"),
  googleLogin: document.querySelector("#google-login"),
  authError: document.querySelector("#auth-error"),

  // Usuario / navegación
  userName: document.querySelector("#user-name"),
  userInitial: document.querySelector("#user-initial"),
  userPhoto: document.querySelector("#user-photo"),
  userButton: document.querySelector("#user-button"),
  settingsButton: document.querySelector("#settings-button"),
  logoutButton: document.querySelector("#logout-button"),
  navButtons: [...document.querySelectorAll(".nav-button")],
  timerView: document.querySelector("#timer-view"),
  statsView: document.querySelector("#stats-view"),

  // Lista de temporizadores
  timerList: document.querySelector("#timer-list"),
  timerLimit: document.querySelector("#timer-limit"),
  addTimer: document.querySelector("#add-timer"),
  emptyAddTimer: document.querySelector("#empty-add-timer"),
  editActiveTimer: document.querySelector("#edit-active-timer"),
  emptyState: document.querySelector("#empty-state"),

  // Workspace del temporizador
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

  // Estadísticas
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
  statsChart: document.querySelector("#stats-chart"),
  syncToggle: document.querySelector("#sync-toggle"),
  statsEyebrow: document.querySelector("#stats-eyebrow"),
  chartLegend: document.querySelector("#chart-legend"),
  timerColors: document.querySelector("#timer-colors"),
  tagChips: document.querySelector("#tag-chips"),
  tagInput: document.querySelector("#tag-input"),
  chartTitle: document.querySelector("#chart-title"),
  chartTotal: document.querySelector("#chart-total"),
  chartScope: document.querySelector("#chart-scope"),

  // Modal: editor de temporizador
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

  // Modal: ajustes
  settingsModal: document.querySelector("#settings-modal"),
  darkModeToggle: document.querySelector("#dark-mode-toggle"),
  volumeSlider: document.querySelector("#volume-slider"),
  volumeLabel: document.querySelector("#volume-label"),
  notificationsButton: document.querySelector("#notifications-button"),
  notificationStatus: document.querySelector("#notification-status"),

  // Modal: desglose
  breakdownModal: document.querySelector("#breakdown-modal"),
  breakdownEyebrow: document.querySelector("#breakdown-eyebrow"),
  breakdownTitle: document.querySelector("#breakdown-title"),
  breakdownList: document.querySelector("#breakdown-list"),

  // Toast
  toast: document.querySelector("#toast"),
  toastIcon: document.querySelector("#toast-icon"),
  toastMessage: document.querySelector("#toast-message"),
  toastClose: document.querySelector("#toast-close")
};

/* ==========================================================================
   4. ESTADO GLOBAL
   ========================================================================== */
let currentUser = null;
let timers = [];
let selectedTimerId = null;
let settings = { ...DEFAULT_SETTINGS };
let editingTimerId = null;
let statsMode = "data";

let unsubscribeTimers = null;
let unsubscribeProfile = null;
let tickerId = null;
let toastTimeout = null;
let volumeSaveTimeout = null;

let chartInstance = null;
let chartPeriod = "week";   // day | yesterday | week | month | year
let chartType = "bar";      // bar | line
let syncMode = false;       // Sincronización: suma de todos los cronómetros
const hiddenSeries = new Set();
let editorTags = [];
let editorColor = TAG_COLORS[0];
let chartScope = "year";    // year | total (solo con periodo "year")

const completingTimers = new Set();
const pendingTimerUpdates = new Map();

/* ==========================================================================
   5. UTILIDADES
   ========================================================================== */

/* ---- Validación y saneamiento de datos ---- */
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

function sanitizeTags(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim().slice(0, MAX_TAG_LENGTH)).slice(0, MAX_TAGS);
}

function timerColor(timer) {
  return timer.color || TAG_COLORS[Math.max(0, timers.findIndex((t) => t.id === timer.id)) % TAG_COLORS.length];
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
    tags: sanitizeTags(raw.tags),
    color: TAG_COLORS.includes(raw.color) ? raw.color : null,
    phase,
    status,
    endTime: Number.isFinite(raw.endTime) ? raw.endTime : null,
    remainingMs,
    activeDurationMs,
    createdAt: numeric(raw.createdAt, Date.now()),
    updatedAt: numeric(raw.updatedAt, Date.now())
  };
}

/* ---- Referencias a Firestore ---- */
function timerReference(timerId) {
  return doc(db, "users", currentUser.uid, "timers", timerId);
}

function userReference() {
  return doc(db, "users", currentUser.uid);
}

function selectedTimer() {
  return timers.find((timer) => timer.id === selectedTimerId) || null;
}

/* ---- Textos ---- */
function priorityText(priority) {
  return { high: "Alta", medium: "Media", low: "Baja" }[priority] || "Media";
}

function statusText(status) {
  return { running: "EN CURSO", paused: "PAUSADO", idle: "LISTO" }[status] || "LISTO";
}

function sessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ---- Formato de tiempo ---- */
function formatClock(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

// Formato en texto: "2 horas y 3 minutos", "45 minutos", "1 hora"
function formatStudyTime(minutes) {
  const total = Math.max(0, numeric(minutes, 0));
  if (total > 0 && total < 0.5) return "menos de 1 minuto";
  const rounded = Math.round(total);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  const hText = `${h} ${h === 1 ? "hora" : "horas"}`;
  const mText = `${m} ${m === 1 ? "minuto" : "minutos"}`;
  if (h && m) return `${hText} y ${mText}`;
  return h ? hText : mText;
}

// Formato visual para tarjetas: número grande + unidad pequeña
function setDuration(element, minutes) {
  if (!element) return;
  const rounded = Math.round(Math.max(0, numeric(minutes, 0)));
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  const part = (n, unit) => `<span class="dur-num">${n}</span><span class="dur-unit">${unit}</span>`;
  element.innerHTML = h ? (m ? `${part(h, "h")}${part(m, "min")}` : part(h, "h")) : part(m, "min");
}

// Formato compacto para el calendario: "2h 3m"
function formatCompact(minutes) {
  const rounded = Math.round(minutes);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

function localDayStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sumSessions(sessions, predicate) {
  return sessions.reduce((total, session) => total + (predicate(session) ? session.minutes : 0), 0);
}

/* ---- Cálculos del temporizador ---- */
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
  if (!elements.syncStatus) return;
  elements.syncStatus.textContent = message;
  elements.syncStatus.classList.toggle("is-saving", saving);
}

/* ==========================================================================
   6. SONIDO Y NOTIFICACIONES
   ========================================================================== */

// Sintetizador con Web Audio API
function playAlarm() {
  if (settings.volume <= 0) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);       // Nota D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);   // Nota A5

    const vol = Math.min(1, Math.max(0, settings.volume / 100));
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch (err) {
    console.error("Error reproduciendo alarma:", err);
  }
}

// Notificaciones nativas (solo si la pestaña está oculta)
function notifyWhenHidden(title, body) {
  if (document.hidden && "Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}

/* ==========================================================================
   7. ACTUALIZACIONES OPTIMISTAS
   ========================================================================== */
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

function syncTimerInBackground(timerId, previous, task, failureMessage) {
  task
    .then((committed) => {
      if (committed === false) {
        rollbackOptimisticTimerUpdate(timerId, previous);
        showToast("El temporizador cambió en otro dispositivo.", "!");
      }
    })
    .catch((error) => {
      rollbackOptimisticTimerUpdate(timerId, previous);
      showToast(failureMessage, "!");
      console.error(error);
    })
    .finally(() => {
      setSyncStatus("Sincronizado");
    });
}

/* ==========================================================================
   8. RENDER
   ========================================================================== */
function renderAll() {
  if (!currentUser) return;
  renderTimers();
  renderTimerWorkspace();
  renderStatistics();
}

/* ---- Lista de temporizadores ---- */
function renderTimers() {
  if (!elements.timerList) return;
  elements.timerList.replaceChildren();
  if (elements.addTimer) elements.addTimer.disabled = timers.length >= MAX_TIMERS;
  if (elements.timerLimit) {
    elements.timerLimit.textContent = timers.length >= MAX_TIMERS
      ? "Límite de 5 temporizadores alcanzado."
      : `Puedes crear hasta ${MAX_TIMERS} temporizadores.`;
  }

  timers.forEach((timer) => {
    const card = document.createElement("div");
    card.className = `timer-card${timer.id === selectedTimerId ? " is-selected" : ""}`;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Seleccionar ${timer.title}`);
    card.innerHTML = `
      <strong class="timer-card-title"></strong>
      <span class="timer-card-info"></span>
      <button type="button" class="timer-card-edit" aria-label="Editar temporizador">✎</button>`;

    card.querySelector(".timer-card-title").textContent = timer.title;
    const info = card.querySelector(".timer-card-info");
    info.textContent = `${timer.focusMinutes} / ${timer.breakMinutes} min · ${priorityText(timer.priority)}`;

    if (timer.status !== "idle") {
      const badge = document.createElement("span");
      badge.className = "timer-card-status";
      badge.textContent = timer.status === "paused" ? "PAUSA" : "ACTIVO";
      info.append(badge);
    }

    card.style.setProperty("--tag", timerColor(timer));
    if (timer.tags.length) {
      const row = document.createElement("div");
      row.className = "timer-card-tags";
      timer.tags.forEach((name) => {
        const chip = document.createElement("span");
        chip.className = "tag-chip";
        chip.textContent = name;
        row.append(chip);
      });
      card.insertBefore(row, card.querySelector(".timer-card-edit"));
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

/* ---- Workspace del temporizador ---- */
function renderTimerWorkspace() {
  const timer = selectedTimer();
  const hasTimer = Boolean(timer);
  if (elements.emptyState) elements.emptyState.hidden = hasTimer;
  if (elements.timerWorkspace) elements.timerWorkspace.hidden = !hasTimer;
  if (!timer) return;

  const isFocus = timer.phase === "focus";
  const remaining = timerRemaining(timer);
  const progress = timerProgress(timer, remaining);
  const progressColor = isFocus ? "var(--accent)" : "var(--success)";
  const remainderColor = isFocus ? "rgba(14, 165, 233, 0.15)" : "rgba(16, 185, 129, 0.15)";
  const degrees = progress * 360;

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
  elements.progressRing.style.background = `conic-gradient(${progressColor} ${degrees}deg, ${remainderColor} ${degrees}deg)`;
  elements.progressRing.classList.toggle("is-break", !isFocus);

  elements.startButton.hidden = timer.status !== "idle";
  elements.pauseButton.hidden = timer.status === "idle";
  elements.finishButton.hidden = timer.status === "idle";
  elements.startButton.textContent = isFocus ? "Iniciar Focus →" : "Iniciar Break →";
  elements.pauseButton.textContent = timer.status === "paused" ? "Reanudar" : "Pausar";
  elements.timerMessage.textContent = timer.status === "paused"
    ? "La cuenta está congelada y sincronizada."
    : timer.status === "running"
      ? "La sesión continuará aunque cambies de dispositivo."
      : "El avance se guarda en la nube al iniciar, pausar o terminar.";
}

/* ---- Estadísticas ---- */
// Origen de datos: un cronómetro o, con Sincronización, la suma de todos
function statsSource() {
  if (syncMode) {
    return timers.length ? { title: "Sincronización", sessions: timers.flatMap((t) => t.sessions) } : null;
  }
  const timer = selectedTimer();
  return timer ? { title: timer.title, sessions: timer.sessions } : null;
}

function syncUi() {
  elements.syncToggle?.classList.toggle("is-on", syncMode);
  elements.syncToggle?.setAttribute("aria-pressed", String(syncMode));
  if (elements.statsEyebrow) {
    elements.statsEyebrow.textContent = syncMode ? "SUMA DE TODOS LOS CRONÓMETROS" : "ESTADÍSTICAS INDIVIDUALES";
  }
}

function renderStatistics() {
  const source = statsSource();
  const hasTimer = Boolean(source);
  if (elements.statsEmpty) elements.statsEmpty.hidden = hasTimer;
  if (elements.statsWorkspace) elements.statsWorkspace.hidden = !hasTimer;
  if (!source) return;
  syncUi();

  const now = new Date();
  const todayStart = localDayStart(now).getTime();
  const tomorrowStart = todayStart + DAY_MS;
  const yesterdayStart = todayStart - DAY_MS;
  const sevenDaysStart = todayStart - 6 * DAY_MS;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const sessions = source.sessions;

  const day = sumSessions(sessions, (s) => s.completedAt >= todayStart && s.completedAt < tomorrowStart);
  const yesterday = sumSessions(sessions, (s) => s.completedAt >= yesterdayStart && s.completedAt < todayStart);
  const week = sumSessions(sessions, (s) => s.completedAt >= sevenDaysStart && s.completedAt < tomorrowStart);
  const month = sumSessions(sessions, (s) => s.completedAt >= monthStart && s.completedAt < tomorrowStart);
  const total = sumSessions(sessions, () => true);

  elements.statsHeading.textContent = source.title;
  elements.statsTotalLabel.textContent = `${formatStudyTime(total)} registrados`;
  setDuration(elements.statDay, day);
  setDuration(elements.statYesterday, yesterday);
  setDuration(elements.statWeek, week);
  setDuration(elements.statMonth, month);
  setDuration(elements.statTotal, total);
  elements.recentSummary.textContent = `${sessions.length} ${sessions.length === 1 ? "sesión" : "sesiones"}`;

  renderRecentSessions(sessions);
  renderStatisticsMode();
}

function renderRecentSessions(sessions) {
  if (!elements.recentList) return;
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
    row.innerHTML = "<span></span><strong></strong>";
    row.querySelector("strong").textContent = formatStudyTime(session.minutes);
    row.querySelector("span").textContent = dateText.charAt(0).toUpperCase() + dateText.slice(1);
    elements.recentList.append(row);
  });
}

function renderStatisticsMode() {
  const showCharts = statsMode === "charts";
  if (elements.statsDataView) elements.statsDataView.hidden = showCharts;
  if (elements.statsChartsView) elements.statsChartsView.hidden = !showCharts;
  elements.statsModeButtons.forEach((button) => {
    const active = button.dataset.statsMode === statsMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (showCharts) renderCharts();
}

function setStatisticsMode(nextMode) {
  statsMode = nextMode === "charts" ? "charts" : "data";
  renderStatisticsMode();
}

/* ---- Gráficos (Chart.js) ---- */
function chartColors() {
  const isDark = document.body.classList.contains("dark-mode");
  return {
    grid: isDark ? "rgba(165, 201, 238, 0.14)" : "rgba(226, 232, 240, 0.8)",
    text: isDark ? "#bfd0e5" : "#64748b",
    accent: isDark ? "#7de2ff" : "#0ea5e9",
    area: isDark ? "rgba(125, 226, 255, 0.18)" : "rgba(14, 165, 233, 0.15)"
  };
}

function destroyCharts() {
  chartInstance?.destroy();
  chartInstance = null;
}

const CHART_TITLES = { day: "Hoy, por hora", yesterday: "Ayer, por hora", week: "Últimos 7 días", month: "Este mes, por día" };

function withAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// Rangos de tiempo (bloques) del periodo elegido
function chartRanges(allSessions) {
  const now = new Date();
  const todayStart = localDayStart(now).getTime();
  const ranges = [];
  const push = (label, start, end) => ranges.push({ label, start, end });
  let title = CHART_TITLES[chartPeriod] || "";

  if (chartPeriod === "day" || chartPeriod === "yesterday") {
    const start = chartPeriod === "day" ? todayStart : todayStart - DAY_MS;
    for (let h = 0; h < 24; h += 1) push(String(h).padStart(2, "0"), start + h * 3_600_000, start + (h + 1) * 3_600_000);
  } else if (chartPeriod === "week") {
    for (let o = 6; o >= 0; o -= 1) {
      const d = new Date(todayStart - o * DAY_MS);
      push(d.toLocaleDateString("es-BO", { weekday: "short", day: "numeric" }), d.getTime(), new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime());
    }
  } else if (chartPeriod === "month") {
    const y = now.getFullYear();
    const m = now.getMonth();
    for (let day = 1; day <= new Date(y, m + 1, 0).getDate(); day += 1) push(String(day), new Date(y, m, day).getTime(), new Date(y, m, day + 1).getTime());
  } else {
    let first = new Date(now.getFullYear(), 0, 1);
    let count = 12;
    if (chartScope === "total") {
      const earliest = allSessions.length ? Math.min(...allSessions.map((x) => x.completedAt)) : now.getTime();
      const e = new Date(earliest);
      first = new Date(e.getFullYear(), e.getMonth(), 1);
      count = (now.getFullYear() - first.getFullYear()) * 12 + now.getMonth() - first.getMonth() + 1;
    }
    title = chartScope === "total" ? "Total desde el inicio" : `Año ${now.getFullYear()}`;
    for (let i = 0; i < count; i += 1) {
      const st = new Date(first.getFullYear(), first.getMonth() + i, 1);
      const name = st.toLocaleDateString("es-BO", { month: "short" });
      push(chartScope === "total" ? `${name} ${String(st.getFullYear()).slice(2)}` : name, st.getTime(), new Date(st.getFullYear(), st.getMonth() + 1, 1).getTime());
    }
  }
  return { ranges, title };
}

function syncChartControls() {
  document.querySelectorAll("[data-chart-period]").forEach((b) => b.classList.toggle("is-active", b.dataset.chartPeriod === chartPeriod));
  document.querySelectorAll("[data-chart-type]").forEach((b) => b.classList.toggle("is-active", b.dataset.chartType === chartType));
  document.querySelectorAll("[data-chart-scope]").forEach((b) => b.classList.toggle("is-active", b.dataset.chartScope === chartScope));
  if (elements.chartScope) elements.chartScope.hidden = chartPeriod !== "year";
}

function renderLegend(defs) {
  const box = elements.chartLegend;
  if (!box) return;
  box.replaceChildren();
  box.hidden = !syncMode;
  if (!syncMode) return;
  defs.forEach((d) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `legend-chip${hiddenSeries.has(d.id) ? " is-off" : ""}`;
    chip.dataset.series = d.id;
    chip.style.setProperty("--tag", d.color);
    chip.setAttribute("aria-pressed", String(!hiddenSeries.has(d.id)));
    const dot = document.createElement("i");
    const name = document.createElement("span");
    name.textContent = d.name;
    chip.append(dot, name);
    box.append(chip);
  });
}

function renderCharts() {
  const source = statsSource();
  if (!source || !window.Chart || !elements.statsChart) return;
  destroyCharts();
  syncChartControls();

  const colors = chartColors();
  const { ranges, title } = chartRanges(source.sessions);
  const valuesOf = (sessions) => ranges.map((r) => sumSessions(sessions, (x) => x.completedAt >= r.start && x.completedAt < r.end));

  const defs = syncMode
    ? [...timers.map((t) => ({ id: t.id, name: t.title, color: timerColor(t), sessions: t.sessions, total: false })),
       { id: "total", name: "Total", color: colors.accent, sessions: source.sessions, total: true }]
    : [{ id: "single", name: source.title, color: colors.accent, sessions: source.sessions, total: true }];
  renderLegend(defs);

  const series = defs.filter((d) => !hiddenSeries.has(d.id)).map((d) => ({ ...d, values: valuesOf(d.sessions) }));
  elements.chartTitle.textContent = title;
  elements.chartTotal.textContent = formatStudyTime(valuesOf(source.sessions).reduce((a, b) => a + b, 0));

  const asHours = Math.max(0, ...series.flatMap((d) => d.values)) >= 120;
  const isLine = chartType === "line";
  const labels = ranges.map((r) => r.label);

  const datasets = series.map((d) => {
    const ghost = syncMode && !d.total;
    const base = { label: d.name, data: d.values.map((v) => Number((asHours ? v / 60 : v).toFixed(2))) };
    return isLine
      ? { ...base, borderColor: d.color, backgroundColor: ghost ? "transparent" : withAlpha(d.color, 0.15), fill: !ghost, tension: 0.35,
          borderWidth: ghost ? 2 : 3, borderDash: ghost ? [6, 4] : [], pointRadius: labels.length > 16 ? 0 : ghost ? 2 : 3, pointBackgroundColor: d.color }
      : { ...base, backgroundColor: ghost ? withAlpha(d.color, 0.3) : d.color, borderColor: d.color, borderWidth: ghost ? 1.5 : 0, borderRadius: 6, maxBarThickness: 28 };
  });

  chartInstance = new window.Chart(elements.statsChart, {
    type: isLine ? "line" : "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => `${syncMode ? `${c.dataset.label}: ` : ""}${formatStudyTime(c.parsed.y * (asHours ? 60 : 1))}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: colors.text, font: { size: 11 }, maxRotation: 0 }, border: { display: false } },
        y: { beginAtZero: true, grid: { color: colors.grid }, ticks: { color: colors.text, callback: (v) => `${v}${asHours ? "h" : "m"}`, font: { size: 11 } }, border: { display: false } }
      }
    }
  });
}

/* ==========================================================================
   9. MODAL DE DESGLOSE (HOY, AYER, SEMANA, MES)
   ========================================================================== */
function createBreakdownRow(label, value) {
  const row = document.createElement("div");
  row.className = "breakdown-row";
  const span = document.createElement("span");
  const strong = document.createElement("strong");
  span.textContent = label;
  strong.textContent = value;
  row.append(span, strong);
  return row;
}

function renderDayBreakdown(period, sessions, todayStart) {
  const isToday = period === "day";
  const startTime = isToday ? todayStart : todayStart - DAY_MS;
  const endTime = startTime + DAY_MS;

  elements.breakdownEyebrow.textContent = isToday ? "DESGLOSE DE HOY" : "DESGLOSE DE AYER";
  elements.breakdownTitle.textContent = isToday ? "Bloques de horario estudiados" : "Bloques estudiados ayer";

  const filtered = sessions.filter((s) => s.completedAt >= startTime && s.completedAt < endTime);

  if (!filtered.length) {
    elements.breakdownList.innerHTML = `<p class="session-empty">No hay registros de estudio en este periodo.</p>`;
    return;
  }

  const hourly = Array(24).fill(0);
  filtered.forEach((s) => {
    hourly[new Date(s.completedAt).getHours()] += s.minutes;
  });

  hourly.forEach((mins, h) => {
    if (mins <= 0) return;
    const startLabel = `${String(h).padStart(2, "0")}:00`;
    const endLabel = `${String((h + 1) % 24).padStart(2, "0")}:00`;
    elements.breakdownList.append(createBreakdownRow(`${startLabel} - ${endLabel}`, formatStudyTime(mins)));
  });
}

function renderWeekBreakdown(sessions, todayStart) {
  elements.breakdownEyebrow.textContent = "ÚLTIMOS 7 DÍAS";
  elements.breakdownTitle.textContent = "Resumen por día";

  for (let offset = 0; offset < 7; offset += 1) {
    const d = new Date(todayStart - offset * DAY_MS);
    const dayStart = d.getTime();
    const dayEnd = dayStart + DAY_MS;
    const mins = sumSessions(sessions, (s) => s.completedAt >= dayStart && s.completedAt < dayEnd);
    const dateLabel = d.toLocaleDateString("es-BO", { weekday: "long", day: "numeric", month: "short" });
    elements.breakdownList.append(
      createBreakdownRow(dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1), formatStudyTime(mins))
    );
  }
}

function renderMonthBreakdown(sessions, now) {
  elements.breakdownEyebrow.textContent = "CALENDARIO MENSUAL";
  elements.breakdownTitle.textContent = now
    .toLocaleDateString("es-BO", { month: "long", year: "numeric" })
    .toUpperCase();

  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Lunes = 0 ... Domingo = 6
  let startDayIdx = firstDay.getDay() - 1;
  if (startDayIdx === -1) startDayIdx = 6;

  const grid = document.createElement("div");
  grid.className = "calendar-grid";

  ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].forEach((d) => {
    const header = document.createElement("div");
    header.className = "calendar-day-header";
    header.textContent = d;
    grid.append(header);
  });

  for (let i = 0; i < startDayIdx; i += 1) {
    const empty = document.createElement("div");
    empty.className = "calendar-day-cell is-empty";
    grid.append(empty);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const dayStart = new Date(year, month, day).getTime();
    const dayEnd = new Date(year, month, day + 1).getTime();
    const mins = sumSessions(sessions, (s) => s.completedAt >= dayStart && s.completedAt < dayEnd);

    const cell = document.createElement("div");
    cell.className = `calendar-day-cell${mins > 0 ? " has-data" : ""}`;
    cell.innerHTML = `<span class="day-num">${day}</span>${mins > 0 ? `<span class="day-hrs">${formatCompact(mins)}</span>` : ""}`;
    grid.append(cell);
  }

  elements.breakdownList.append(grid);
}

function renderYearsBreakdown(sessions) {
  elements.breakdownEyebrow.textContent = "HISTORIAL";
  elements.breakdownTitle.textContent = "Elige un año";
  elements.breakdownList.replaceChildren();

  const years = new Set([new Date().getFullYear()]);
  sessions.forEach((s) => years.add(new Date(s.completedAt).getFullYear()));

  [...years].sort((a, b) => b - a).forEach((year) => {
    const mins = sumSessions(sessions, (s) => new Date(s.completedAt).getFullYear() === year);
    const row = createBreakdownRow(String(year), `${formatStudyTime(mins)}  ›`);
    row.classList.add("is-clickable");
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.addEventListener("click", () => renderYearMonths(sessions, year));
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); renderYearMonths(sessions, year); }
    });
    elements.breakdownList.append(row);
  });
}

function renderYearMonths(sessions, year) {
  elements.breakdownEyebrow.textContent = "AÑO";
  elements.breakdownTitle.textContent = String(year);
  elements.breakdownList.replaceChildren();

  const back = document.createElement("button");
  back.type = "button";
  back.className = "button button-quiet back-button";
  back.textContent = "← Años";
  back.addEventListener("click", () => renderYearsBreakdown(sessions));

  const yearTotal = sumSessions(sessions, (s) => new Date(s.completedAt).getFullYear() === year);
  const summary = document.createElement("div");
  summary.className = "year-summary";
  summary.innerHTML = "<span>Total del año</span><strong></strong>";
  summary.querySelector("strong").textContent = formatStudyTime(yearTotal);

  const grid = document.createElement("div");
  grid.className = "month-grid";
  for (let month = 0; month < 12; month += 1) {
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 1).getTime();
    const mins = sumSessions(sessions, (s) => s.completedAt >= start && s.completedAt < end);
    const cell = document.createElement("div");
    cell.className = `month-cell${mins > 0 ? " has-data" : ""}`;
    const name = new Date(year, month, 1).toLocaleDateString("es-BO", { month: "short" });
    cell.innerHTML = "<span></span><strong></strong>";
    cell.querySelector("span").textContent = name.charAt(0).toUpperCase() + name.slice(1);
    cell.querySelector("strong").textContent = mins > 0 ? formatCompact(mins) : "–";
    grid.append(cell);
  }

  elements.breakdownList.append(back, summary, grid);
}

function openBreakdownModal(period) {
  const source = statsSource();
  if (!source) return;

  const now = new Date();
  const todayStart = localDayStart(now).getTime();
  const sessions = source.sessions;

  elements.breakdownList.replaceChildren();

  if (period === "day" || period === "yesterday") {
    renderDayBreakdown(period, sessions, todayStart);
  } else if (period === "week") {
    renderWeekBreakdown(sessions, todayStart);
  } else if (period === "month") {
    renderMonthBreakdown(sessions, now);
  } else if (period === "total") {
    renderYearsBreakdown(sessions);
  }

  openModal(elements.breakdownModal);
}

/* ==========================================================================
   10. NAVEGACIÓN, TOAST Y MODALES
   ========================================================================== */
function selectTimer(timerId) {
  selectedTimerId = timerId;
  renderAll();
}

function showView(view) {
  const isTimer = view === "timer";
  if (elements.timerView) elements.timerView.hidden = !isTimer;
  if (elements.statsView) elements.statsView.hidden = isTimer;
  elements.navButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  if (!isTimer) renderStatistics();
}

function showToast(message, icon = "✓") {
  window.clearTimeout(toastTimeout);
  if (!elements.toast) return;
  elements.toastMessage.textContent = message;
  elements.toastIcon.textContent = icon;
  elements.toast.hidden = false;
  toastTimeout = window.setTimeout(() => { elements.toast.hidden = true; }, 5000);
}

function openModal(modal) {
  if (modal && !modal.open) modal.showModal();
}

function closeModal(modal) {
  if (modal && modal.open) modal.close();
}

/* ==========================================================================
   11. CRUD DE TEMPORIZADORES
   ========================================================================== */
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
  editorTags = [...(timer?.tags || [])];
  const used = timers.filter((t) => t.id !== timer?.id).map(timerColor);
  editorColor = timer?.color || TAG_COLORS.find((c) => !used.includes(c)) || TAG_COLORS[0];
  elements.tagInput.value = "";
  renderColorPicker();
  renderEditorTags();
  openModal(elements.timerModal);
  window.setTimeout(() => elements.timerName.focus(), 50);
}

function renderColorPicker() {
  if (!elements.timerColors) return;
  elements.timerColors.replaceChildren();
  TAG_COLORS.forEach((color) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `color-swatch${color === editorColor ? " is-active" : ""}`;
    b.style.background = color;
    b.setAttribute("aria-label", `Color ${color}`);
    b.setAttribute("aria-pressed", String(color === editorColor));
    b.addEventListener("click", () => { editorColor = color; renderColorPicker(); renderEditorTags(); });
    elements.timerColors.append(b);
  });
}

function renderEditorTags() {
  if (!elements.tagChips) return;
  elements.tagChips.replaceChildren();
  editorTags.forEach((name, i) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.style.setProperty("--tag", editorColor);
    chip.textContent = name;
    const x = document.createElement("button");
    x.type = "button";
    x.textContent = "×";
    x.setAttribute("aria-label", `Quitar ${name}`);
    x.addEventListener("click", () => { editorTags.splice(i, 1); renderEditorTags(); });
    chip.append(x);
    elements.tagChips.append(chip);
  });
}

function addTagFromInput() {
  const raw = elements.tagInput.value.replace(/,/g, "").trim().slice(0, MAX_TAG_LENGTH);
  elements.tagInput.value = "";
  if (!raw || editorTags.some((t) => t.toLowerCase() === raw.toLowerCase())) return;
  if (editorTags.length >= MAX_TAGS) { editorMessage(`Máximo ${MAX_TAGS} etiquetas por temporizador.`); return; }
  editorTags.push(raw);
  renderEditorTags();
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
      await updateDoc(timerReference(existing.id), { title, focusMinutes, breakMinutes, priority, tags: editorTags, color: editorColor, updatedAt: now });
    } else {
      const reference = doc(collection(db, "users", currentUser.uid, "timers"));
      await setDoc(reference, {
        title,
        focusMinutes,
        breakMinutes,
        priority,
        tags: editorTags,
        color: editorColor,
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
    editorMessage("No se pudo guardar la información.");
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

/* ==========================================================================
   12. ACCIONES DEL TEMPORIZADOR
   ========================================================================== */
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
  showToast(
    timer.phase === "focus"
      ? (registeredMinutes > 0 ? `${formatStudyTime(registeredMinutes)} registrados.` : "Sesión finalizada.")
      : "Descanso finalizado sin registrar tiempo."
  );
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
  if (
    completingTimers.has(timer.id) ||
    timer.status !== "running" ||
    !timer.endTime ||
    timer.endTime > Date.now()
  ) return;

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
      const message = isFocus
        ? `Focus terminado en ${result.title}. Es hora de descansar.`
        : `Descanso terminado en ${result.title}. Puedes volver a Focus.`;
      playAlarm();
      notifyWhenHidden(isFocus ? "Focus finalizado" : "Descanso finalizado", message);
      showToast(message);
    }
  } catch (error) {
    console.error("No se pudo finalizar el temporizador automáticamente", error);
  } finally {
    completingTimers.delete(timer.id);
  }
}

/* ==========================================================================
   13. TICKER (actualiza cada segundo)
   ========================================================================== */
function startTicker() {
  if (tickerId) return;
  tickerId = window.setInterval(() => {
    let activeRunning = false;

    timers.forEach((timer) => {
      if (timer.status === "running") {
        activeRunning = true;
        if (timer.endTime && timer.endTime <= Date.now()) {
          completeExpiredTimer(timer);
        }
      }
    });

    renderTimerWorkspace();

    if (!activeRunning) {
      window.clearInterval(tickerId);
      tickerId = null;
    }
  }, 1000);
}

/* ==========================================================================
   14. AJUSTES (TEMA, VOLUMEN, NOTIFICACIONES)
   ========================================================================== */
function applySettings(nextSettings) {
  settings = { ...settings, ...nextSettings };
  document.body.classList.toggle("dark-mode", settings.darkMode);
  if (elements.darkModeToggle) elements.darkModeToggle.checked = settings.darkMode;
  if (elements.volumeSlider) elements.volumeSlider.value = settings.volume;
  if (elements.volumeLabel) elements.volumeLabel.textContent = `${settings.volume}%`;
  if (statsMode === "charts") renderCharts();
}

async function persistSettings(patch) {
  if (!currentUser) return;
  applySettings(patch);
  try {
    await setDoc(userReference(), patch, { merge: true });
  } catch (err) {
    console.error("Error al guardar preferencia:", err);
  }
}

function setupNotifications() {
  if (!("Notification" in window)) {
    if (elements.notificationStatus) elements.notificationStatus.textContent = "No soportado";
    return;
  }

  if (Notification.permission === "granted") {
    if (elements.notificationStatus) elements.notificationStatus.textContent = "Activadas";
    if (elements.notificationsButton) elements.notificationsButton.disabled = true;
  } else if (Notification.permission === "denied") {
    if (elements.notificationStatus) elements.notificationStatus.textContent = "Bloqueadas";
    if (elements.notificationsButton) elements.notificationsButton.disabled = true;
  } else if (elements.notificationStatus) {
    elements.notificationStatus.textContent = "Desactivadas";
  }
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  const permission = await Notification.requestPermission();
  setupNotifications();
  if (permission === "granted") showToast("Notificaciones del navegador activadas.");
}

/* ==========================================================================
   15. FIRESTORE LISTENERS
   ========================================================================== */
function listenToUserData(user) {
  if (unsubscribeTimers) unsubscribeTimers();
  if (unsubscribeProfile) unsubscribeProfile();

  // Perfil / preferencias
  unsubscribeProfile = onSnapshot(userReference(), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      applySettings({
        darkMode: Boolean(data.darkMode),
        volume: numeric(data.volume, DEFAULT_SETTINGS.volume)
      });
    } else {
      setDoc(userReference(), DEFAULT_SETTINGS, { merge: true });
    }
  });

  // Temporizadores
  unsubscribeTimers = onSnapshot(collection(db, "users", user.uid, "timers"), (snapshot) => {
    const list = [];

    snapshot.forEach((docSnap) => {
      const timerId = docSnap.id;
      const cloudTimer = timerFromData(timerId, docSnap.data());
      const pending = pendingTimerUpdates.get(timerId);

      if (pending && pending.updatedAt >= cloudTimer.updatedAt) {
        list.push({ ...cloudTimer, ...pending.patch });
      } else {
        pendingTimerUpdates.delete(timerId);
        list.push(cloudTimer);
      }
    });

    timers = list.sort((a, b) => a.createdAt - b.createdAt);
    if (!selectedTimerId || !timers.some((t) => t.id === selectedTimerId)) {
      selectedTimerId = timers[0]?.id || null;
    }

    renderAll();
    startTicker();
  });
}

/* ==========================================================================
   16. EVENTOS DE INTERFAZ
   ========================================================================== */
function initEvents() {
  // Autenticación
  elements.googleLogin?.addEventListener("click", async () => {
    try {
      elements.authError.hidden = true;
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      elements.authError.textContent = "Error al iniciar sesión con Google.";
      elements.authError.hidden = false;
      console.error(err);
    }
  });
  elements.logoutButton?.addEventListener("click", () => signOut(auth));

  // Navegación
  elements.navButtons.forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });

  // Temporizadores (CRUD)
  elements.addTimer?.addEventListener("click", () => openTimerEditor());
  elements.emptyAddTimer?.addEventListener("click", () => openTimerEditor());
  elements.editActiveTimer?.addEventListener("click", () => openTimerEditor(selectedTimer()));
  elements.timerForm?.addEventListener("submit", saveTimer);
  elements.tagInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTagFromInput(); }
    else if (e.key === "Backspace" && !elements.tagInput.value && editorTags.length) { editorTags.pop(); renderEditorTags(); }
  });
  elements.tagInput?.addEventListener("blur", addTagFromInput);
  elements.syncToggle?.addEventListener("click", () => { syncMode = !syncMode; renderStatistics(); });
  elements.deleteTimer?.addEventListener("click", removeTimer);

  // Controles del temporizador
  elements.startButton?.addEventListener("click", startTimer);
  elements.pauseButton?.addEventListener("click", togglePause);
  elements.finishButton?.addEventListener("click", finishTimer);

  // Ajustes
  elements.userButton?.addEventListener("click", () => openModal(elements.settingsModal));
  elements.settingsButton?.addEventListener("click", () => openModal(elements.settingsModal));
  elements.darkModeToggle?.addEventListener("change", (e) => {
    persistSettings({ darkMode: e.target.checked });
  });
  elements.volumeSlider?.addEventListener("input", (e) => {
    const val = Number(e.target.value);
    applySettings({ volume: val });
    window.clearTimeout(volumeSaveTimeout);
    volumeSaveTimeout = window.setTimeout(() => persistSettings({ volume: val }), 400);
  });
  elements.notificationsButton?.addEventListener("click", requestNotificationPermission);

  // Estadísticas
  elements.statsModeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setStatisticsMode(btn.dataset.statsMode));
  });
  elements.statDay?.closest(".metric-card")?.addEventListener("click", () => openBreakdownModal("day"));
  elements.statYesterday?.closest(".metric-card")?.addEventListener("click", () => openBreakdownModal("yesterday"));
  elements.statWeek?.closest(".metric-card")?.addEventListener("click", () => openBreakdownModal("week"));
  elements.statMonth?.closest(".metric-card")?.addEventListener("click", () => openBreakdownModal("month"));

  elements.statTotal?.closest(".metric-card")?.addEventListener("click", () => openBreakdownModal("total"));

  // Controles de gráficos (periodo, tipo y alcance)
  elements.statsChartsView?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-chart-period], [data-chart-type], [data-chart-scope], [data-series]");
    if (!btn) return;
    if (btn.dataset.chartPeriod) chartPeriod = btn.dataset.chartPeriod;
    if (btn.dataset.chartType) chartType = btn.dataset.chartType;
    if (btn.dataset.chartScope) chartScope = btn.dataset.chartScope;
    if (btn.dataset.series) {
      const id = btn.dataset.series;
      if (hiddenSeries.has(id)) hiddenSeries.delete(id); else hiddenSeries.add(id);
    }
    renderCharts();
  });

  // Cierre de modales y toast
  document.querySelectorAll(".modal-close").forEach((btn) => {
    btn.addEventListener("click", (e) => closeModal(e.target.closest("dialog")));
  });
  elements.toastClose?.addEventListener("click", () => {
    if (elements.toast) elements.toast.hidden = true;
  });
}

/* ==========================================================================
   17. AUTENTICACIÓN E INICIALIZACIÓN
   ========================================================================== */
onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (user) {
    if (elements.authView) elements.authView.hidden = true;
    if (elements.app) elements.app.hidden = false;

    if (elements.userName) elements.userName.textContent = user.displayName || "Usuario";
    if (elements.userInitial) elements.userInitial.textContent = (user.displayName || "U").charAt(0).toUpperCase();
    if (elements.userPhoto) {
      if (user.photoURL) {
        elements.userPhoto.src = user.photoURL;
        elements.userPhoto.hidden = false;
        if (elements.userInitial) elements.userInitial.hidden = true;
      } else {
        elements.userPhoto.hidden = true;
        if (elements.userInitial) elements.userInitial.hidden = false;
      }
    }

    setupNotifications();
    listenToUserData(user);
  } else {
    if (unsubscribeTimers) unsubscribeTimers();
    if (unsubscribeProfile) unsubscribeProfile();
    if (tickerId) window.clearInterval(tickerId);
    tickerId = null;
    timers = [];
    selectedTimerId = null;
    destroyCharts();

    if (elements.authView) elements.authView.hidden = false;
    if (elements.app) elements.app.hidden = true;
  }
});

initEvents();