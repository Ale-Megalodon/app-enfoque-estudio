/* ==========================================================================
   APP DE ESTUDIO - FOCUS CLOUD (Versión Offline-First / Lucide Icons Ready)
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {   GoogleAuthProvider,   getAuth,   onAuthStateChanged,   signInWithPopup,   signOut } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { createGame } from "./game/engine.js";
import { attachMultiClick } from "./game/easter-egg.js";
import {   collection,   deleteDoc,   doc,   getFirestore,   enableIndexedDbPersistence,
   increment,   onSnapshot,   runTransaction,   setDoc,   updateDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

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

// Habilitar persistencia offline para almacenamiento local de datos (Modo App Nativa / Sin Conexión)
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("Persistencia falló: Múltiples pestañas abiertas simultáneamente.");
    } else if (err.code == 'unimplemented') {
        console.warn("El entorno actual no soporta persistencia offline.");
    }
});

const googleProvider = new GoogleAuthProvider();
const LANGUAGES = {
  en: { label: "English", locale: "en-US" },
  es: { label: "Español", locale: "es-BO" }
};
const DEFAULT_LANGUAGE = "en";
const LANG_STORAGE_KEY = "focuscloud-language";
const DEFAULT_SETTINGS = { darkMode: false, volume: 70, language: DEFAULT_LANGUAGE };
const DEFAULT_TIMER = { focusMinutes: 25, breakMinutes: 5, priority: "medium" };
const MAX_TIMERS = 5;
const MAX_FOCUS_MINUTES = 240;
const MAX_BREAK_MINUTES = 120;
const DAY_MS = 86_400_000;
const TAG_COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];
const MAX_TAGS = 3;
const MAX_TAG_LENGTH = 16;
const BREAK_MIN_STUDY_MINUTES = 5;

/* ---- Traducciones ---- */
const I18N = {
  en: {
    "meta.description": "Focus timers synced with your account.",
    "auth.title": "Study from<br />anywhere.",
    "auth.copy": "Your timers and statistics sync privately with your account.",
    "auth.google": "Continue with Google",
    "auth.note": "We only use Google to identify you and sync your study space.",
    "auth.error": "Error signing in with Google.",
    "user.default": "User",
    "common.close": "Close",
    "toast.close": "Close notice",
    "nav.brand": "Focus Cloud, go to timers",
    "nav.main": "Main navigation",
    "nav.timers": "Timers",
    "nav.stats": "Statistics",
    "nav.aquarium": "Aquarium",
    "nav.openSettings": "Open settings",
    "nav.userButton": "Settings",
    "side.aria": "Your timers",
    "side.eyebrow": "MY TIMERS",
    "side.title": "Focus spaces",
    "side.add": "Add timer",
    "side.limit": "You can create up to {n} timers.",
    "side.limitReached": "Limit of {n} timers reached.",
    "empty.title": "Your first timer.",
    "empty.copy": "Create a personalized space to start tracking your focus.",
    "empty.create": "Create timer",
    "priority.high": "High",
    "priority.medium": "Medium",
    "priority.low": "Low",
    "priority.chip.high": "High priority",
    "priority.chip.medium": "Medium priority",
    "priority.chip.low": "Low priority",
    "status.running": "RUNNING",
    "status.paused": "PAUSED",
    "status.idle": "READY",
    "badge.paused": "PAUSED",
    "badge.active": "ACTIVE",
    "timer.untitled": "Untitled timer",
    "timer.select": "Select {title}",
    "timer.editAria": "Edit timer",
    "timer.edit": "Edit",
    "timer.remainingAria": "Time remaining",
    "timer.subtitle": "{f} min focus · {b} min break",
    "timer.phaseFocus": "Time to focus",
    "timer.phaseBreak": "Time to rest",
    "timer.captionFocus": "minutes available",
    "timer.captionBreak": "of break (not recorded)",
    "timer.captionRunning": "time remaining",
    "timer.startFocus": "Start Focus",
    "timer.startBreak": "Start break",
    "timer.pause": "Pause",
    "timer.resume": "Resume",
    "timer.finish": "Finish",
    "timer.skipBreak": "Skip break",
    "timer.msgPaused": "The countdown is frozen and synced.",
    "timer.msgRunning": "The session will continue even if you switch devices.",
    "timer.msgIdle": "Progress is saved locally when you start, pause or finish.",
    "sync.synced": "Synced",
    "sync.syncing": "Syncing",
    "sync.saving": "Saving",
    "sync.deleting": "Deleting",
    "sync.recording": "Recording",
    "stats.noneTitle": "No timer selected.",
    "stats.noneCopy": "Select or create a timer to view its statistics.",
    "stats.syncTitle": "Sync",
    "stats.syncDesc": "Sum and comparison of all your timers",
    "stats.eyebrowSync": "SUM OF ALL TIMERS",
    "stats.eyebrowSingle": "INDIVIDUAL STATISTICS",
    "stats.onlyFocus": "Only finished Focus sessions count in this record.",
    "stats.viewAria": "Statistics view",
    "stats.summary": "Summary",
    "stats.charts": "Charts",
    "stats.today": "TODAY",
    "stats.yesterday": "YESTERDAY",
    "stats.week": "WEEK",
    "stats.month": "MONTH",
    "stats.total": "TOTAL",
    "stats.completed": "Focus completed",
    "stats.last7": "Last 7 days",
    "stats.currentMonth": "Current month",
    "stats.sinceCreation": "Since creation",
    "stats.viewDetail": "View details ➔",
    "stats.viewYear": "View by year ➔",
    "stats.recent": "Recent sessions",
    "stats.totalRecorded": "{time} recorded",
    "stats.sessionOne": "session",
    "stats.sessionMany": "sessions",
    "stats.noSessions": "No Focus sessions recorded yet.",
    "time.lessThanMin": "less than 1 minute",
    "time.hour": "hour",
    "time.hours": "hours",
    "time.minute": "minute",
    "time.minutes": "minutes",
    "time.and": "and",
    "chart.periodAria": "Period",
    "chart.today": "Today",
    "chart.yesterday": "Yesterday",
    "chart.week": "Week",
    "chart.month": "Month",
    "chart.year": "Year",
    "chart.typeAria": "Chart type",
    "chart.bars": "Bars",
    "chart.line": "Line",
    "chart.scopeAria": "Year scope",
    "chart.thisYear": "This year",
    "chart.total": "Total",
    "chart.canvasAria": "Study chart",
    "chart.title.day": "Today, by hour",
    "chart.title.yesterday": "Yesterday, by hour",
    "chart.title.week": "Last 7 days",
    "chart.title.month": "This month, by day",
    "chart.title.allTime": "All time",
    "chart.title.year": "Year {y}",
    "breakdown.todayEyebrow": "TODAY'S BREAKDOWN",
    "breakdown.yesterdayEyebrow": "YESTERDAY'S BREAKDOWN",
    "breakdown.todayTitle": "Time blocks studied",
    "breakdown.yesterdayTitle": "Blocks studied yesterday",
    "breakdown.noRecords": "No study records in this period.",
    "breakdown.weekEyebrow": "LAST 7 DAYS",
    "breakdown.weekTitle": "Summary by day",
    "breakdown.monthEyebrow": "MONTHLY CALENDAR",
    "breakdown.historyEyebrow": "HISTORY",
    "breakdown.chooseYear": "Choose a year",
    "breakdown.yearEyebrow": "YEAR",
    "breakdown.backYears": "⬅ Years",
    "breakdown.yearTotal": "Year total",
    "cal.days": ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
    "pet.pantry": "PANTRY",
    "pet.feedOne": "Give 1 chunk",
    "pet.feedAll": "Throw all",
    "pet.requirements": "EVOLUTION REQUIREMENTS",
    "pet.level": "LEVEL {n} OF {total}",
    "pet.progress": "{fed} / {goal} h fed · next: {next}",
    "pet.progressMax": "{fed} h fed · max level!",
    "pet.meatOne": "chunk",
    "pet.meatMany": "chunks",
    "pet.hint": "Next chunk in ~{m} min of Focus.",
    "pet.levelRow": "Level {n} — {name}",
    "pet.noMeat": "You have no meat yet. Every net hour of Focus gives 1 chunk.",
    "pet.feedError": "Could not feed the shark.",
    "level.unlocked": "🎉 EVOLUTION UNLOCKED!",
    "level.hatched": "🐣 Your egg hatched!",
    "level.up": "⭐ You leveled up!",
    "level.desc": "Level {n} of {total}: {name}",
    "level.great": "Great!",
    "editor.new": "NEW TIMER",
    "editor.edit": "EDIT TIMER",
    "editor.createTitle": "Create a space",
    "editor.editTitle": "Adjust your space",
    "editor.name": "Name",
    "editor.namePh": "E.g. Deep study",
    "editor.priority": "Priority",
    "editor.colorTags": "Color and tags",
    "editor.colorHint": "(up to 3, same color)",
    "editor.colorAria": "Timer color",
    "editor.tagPh": "Type a tag and press Enter",
    "editor.removeTag": "Remove {name}",
    "editor.maxTags": "Maximum {n} tags per timer.",
    "editor.invalid": "Enter a name and valid durations.",
    "editor.busyEdit": "Pause or finish the session before changing its settings.",
    "editor.maxTimers": "You can only have {n} timers.",
    "editor.delete": "Delete",
    "editor.cancel": "Cancel",
    "editor.save": "Save",
    "editor.saveError": "Could not save the information.",
    "editor.busyDelete": "Finish the active session before deleting the timer.",
    "editor.confirmDelete": "Delete „{title}“ and its statistics?",
    "editor.deleteError": "Could not delete the timer.",
    "toast.updated": "Timer updated.",
    "toast.created": "Timer created.",
    "toast.deleted": "Timer deleted.",
    "toast.changedElsewhere": "The timer was changed on another device.",
    "toast.recorded": "{time} recorded.",
    "toast.takeBreak": "Time for a break.",
    "toast.sessionEnded": "Session finished.",
    "toast.breakEnded": "Break finished with no time recorded.",
    "toast.focusDone": "Focus finished in {title}. Time for a break.",
    "toast.breakDone": "Break finished in {title}. You can get back to Focus.",
    "notif.focusTitle": "Focus finished",
    "notif.breakTitle": "Break finished",
    "err.start": "Could not start the timer.",
    "err.pause": "Could not update the pause.",
    "err.finish": "Could not finish the session.",
    "err.skipBreak": "Could not skip the break.",
    "settings.eyebrow": "PREFERENCES",
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.languageDesc": "Choose the app language.",
    "settings.dark": "Dark mode",
    "settings.darkDesc": "Use the dark navy style.",
    "settings.volume": "Alarm volume",
    "settings.notifications": "Notifications",
    "settings.enable": "Enable",
    "settings.logout": "Sign out of Google",
    "settings.notifUnsupported": "Not supported",
    "settings.notifOn": "Enabled",
    "settings.notifBlocked": "Blocked",
    "settings.notifOff": "Disabled",
    "settings.notifEnabledToast": "Browser notifications enabled."
  },
  es: {
    "meta.description": "Temporizadores de enfoque sincronizados con tu cuenta.",
    "auth.title": "Estudia desde<br />cualquier lugar.",
    "auth.copy": "Tus temporizadores y estadísticas se sincronizan de forma privada con tu cuenta.",
    "auth.google": "Continuar con Google",
    "auth.note": "Solo usamos Google para identificar y sincronizar tu espacio de estudio.",
    "auth.error": "Error al iniciar sesión con Google.",
    "user.default": "Usuario",
    "common.close": "Cerrar",
    "toast.close": "Cerrar aviso",
    "nav.brand": "Focus Cloud, ir a temporizadores",
    "nav.main": "Navegación principal",
    "nav.timers": "Temporizadores",
    "nav.stats": "Estadísticas",
    "nav.aquarium": "Acuario",
    "nav.openSettings": "Abrir ajustes",
    "nav.userButton": "Ajustes",
    "side.aria": "Tus temporizadores",
    "side.eyebrow": "MIS TEMPORIZADORES",
    "side.title": "Espacios de enfoque",
    "side.add": "Añadir temporizador",
    "side.limit": "Puedes crear hasta {n} temporizadores.",
    "side.limitReached": "Límite de {n} temporizadores alcanzado.",
    "empty.title": "Tu primer temporizador.",
    "empty.copy": "Crea un espacio personalizado para comenzar a registrar tu concentración.",
    "empty.create": "Crear temporizador",
    "priority.high": "Alta",
    "priority.medium": "Media",
    "priority.low": "Baja",
    "priority.chip.high": "Prioridad alta",
    "priority.chip.medium": "Prioridad media",
    "priority.chip.low": "Prioridad baja",
    "status.running": "EN CURSO",
    "status.paused": "PAUSADO",
    "status.idle": "LISTO",
    "badge.paused": "PAUSA",
    "badge.active": "ACTIVO",
    "timer.untitled": "Temporizador sin nombre",
    "timer.select": "Seleccionar {title}",
    "timer.editAria": "Editar temporizador",
    "timer.edit": "Editar",
    "timer.remainingAria": "Tiempo restante",
    "timer.subtitle": "{f} min de enfoque · {b} min de descanso",
    "timer.phaseFocus": "Momento de concentrarte",
    "timer.phaseBreak": "Momento de descansar",
    "timer.captionFocus": "minutos disponibles",
    "timer.captionBreak": "de descanso (no se registra)",
    "timer.captionRunning": "tiempo restante",
    "timer.startFocus": "Iniciar Focus",
    "timer.startBreak": "Iniciar descanso",
    "timer.pause": "Pausar",
    "timer.resume": "Reanudar",
    "timer.finish": "Terminar",
    "timer.skipBreak": "Saltar descanso",
    "timer.msgPaused": "La cuenta está congelada y sincronizada.",
    "timer.msgRunning": "La sesión continuará aunque cambies de dispositivo.",
    "timer.msgIdle": "El avance se guarda localmente al iniciar, pausar o terminar.",
    "sync.synced": "Sincronizado",
    "sync.syncing": "Sincronizando",
    "sync.saving": "Guardando",
    "sync.deleting": "Eliminando",
    "sync.recording": "Registrando",
    "stats.noneTitle": "Sin temporizador seleccionado.",
    "stats.noneCopy": "Selecciona o crea un temporizador para consultar sus estadísticas.",
    "stats.syncTitle": "Sincronización",
    "stats.syncDesc": "Suma y comparación de todos tus cronómetros",
    "stats.eyebrowSync": "SUMA DE TODOS LOS CRONÓMETROS",
    "stats.eyebrowSingle": "ESTADÍSTICAS INDIVIDUALES",
    "stats.onlyFocus": "Solo las sesiones Focus terminadas cuentan en este registro.",
    "stats.viewAria": "Vista de estadísticas",
    "stats.summary": "Resumen",
    "stats.charts": "Gráficos",
    "stats.today": "HOY",
    "stats.yesterday": "AYER",
    "stats.week": "SEMANA",
    "stats.month": "MES",
    "stats.total": "TOTAL",
    "stats.completed": "Focus completado",
    "stats.last7": "Últimos 7 días",
    "stats.currentMonth": "Mes actual",
    "stats.sinceCreation": "Desde la creación",
    "stats.viewDetail": "Ver detalle ➔",
    "stats.viewYear": "Ver por año ➔",
    "stats.recent": "Sesiones recientes",
    "stats.totalRecorded": "{time} registrados",
    "stats.sessionOne": "sesión",
    "stats.sessionMany": "sesiones",
    "stats.noSessions": "Aún no hay sesiones Focus registradas.",
    "time.lessThanMin": "menos de 1 minuto",
    "time.hour": "hora",
    "time.hours": "horas",
    "time.minute": "minuto",
    "time.minutes": "minutos",
    "time.and": "y",
    "chart.periodAria": "Periodo",
    "chart.today": "Hoy",
    "chart.yesterday": "Ayer",
    "chart.week": "Semana",
    "chart.month": "Mes",
    "chart.year": "Año",
    "chart.typeAria": "Tipo de gráfico",
    "chart.bars": "Barras",
    "chart.line": "Línea",
    "chart.scopeAria": "Alcance del año",
    "chart.thisYear": "Este año",
    "chart.total": "Total",
    "chart.canvasAria": "Gráfico de estudio",
    "chart.title.day": "Hoy, por hora",
    "chart.title.yesterday": "Ayer, por hora",
    "chart.title.week": "Últimos 7 días",
    "chart.title.month": "Este mes, por día",
    "chart.title.allTime": "Total desde el inicio",
    "chart.title.year": "Año {y}",
    "breakdown.todayEyebrow": "DESGLOSE DE HOY",
    "breakdown.yesterdayEyebrow": "DESGLOSE DE AYER",
    "breakdown.todayTitle": "Bloques de horario estudiados",
    "breakdown.yesterdayTitle": "Bloques estudiados ayer",
    "breakdown.noRecords": "No hay registros de estudio en este periodo.",
    "breakdown.weekEyebrow": "ÚLTIMOS 7 DÍAS",
    "breakdown.weekTitle": "Resumen por día",
    "breakdown.monthEyebrow": "CALENDARIO MENSUAL",
    "breakdown.historyEyebrow": "HISTORIAL",
    "breakdown.chooseYear": "Elige un año",
    "breakdown.yearEyebrow": "AÑO",
    "breakdown.backYears": "⬅ Años",
    "breakdown.yearTotal": "Total del año",
    "cal.days": ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"],
    "pet.pantry": "DESPENSA",
    "pet.feedOne": "Dar 1 trozo",
    "pet.feedAll": "Lanzar todo",
    "pet.requirements": "REQUISITOS DE EVOLUCIÓN",
    "pet.level": "NIVEL {n} DE {total}",
    "pet.progress": "{fed} / {goal} h alimentadas · siguiente: {next}",
    "pet.progressMax": "{fed} h alimentadas · nivel máximo!",
    "pet.meatOne": "trozo",
    "pet.meatMany": "trozos",
    "pet.hint": "Próximo trozo en ~{m} min de Focus.",
    "pet.levelRow": "Nivel {n} — {name}",
    "pet.noMeat": "Aún no tienes carne. Cada hora neta de Focus da 1 trozo.",
    "pet.feedError": "No se pudo alimentar al tiburón.",
    "level.unlocked": "🎉 ¡EVOLUCIÓN DESBLOQUEADA!",
    "level.hatched": "🐣 ¡Tu huevito eclosionó!",
    "level.up": "⭐ ¡Subiste de nivel!",
    "level.desc": "Nivel {n} de {total}: {name}",
    "level.great": "👍 ¡Genial!",
    "editor.new": "NUEVO TEMPORIZADOR",
    "editor.edit": "EDITAR TEMPORIZADOR",
    "editor.createTitle": "Crea un espacio",
    "editor.editTitle": "Ajusta tu espacio",
    "editor.name": "Nombre",
    "editor.namePh": "Ej. Estudio profundo",
    "editor.priority": "Prioridad",
    "editor.colorTags": "Color y etiquetas",
    "editor.colorHint": "(hasta 3, mismo color)",
    "editor.colorAria": "Color del cronómetro",
    "editor.tagPh": "Escribe una etiqueta y presiona Enter",
    "editor.removeTag": "Quitar {name}",
    "editor.maxTags": "Máximo {n} etiquetas por temporizador.",
    "editor.invalid": "Completa un nombre y duraciones válidas.",
    "editor.busyEdit": "Pausa o termina la sesión antes de cambiar su configuración.",
    "editor.maxTimers": "Solo puedes tener {n} temporizadores.",
    "editor.delete": "Eliminar",
    "editor.cancel": "Cancelar",
    "editor.save": "Guardar",
    "editor.saveError": "No se pudo guardar la información.",
    "editor.busyDelete": "Termina la sesión activa antes de eliminar el temporizador.",
    "editor.confirmDelete": "🗑️ ¿Eliminar „{title}“ y sus estadísticas?",
    "editor.deleteError": "No se pudo eliminar el temporizador.",
    "toast.updated": "Temporizador actualizado.",
    "toast.created": "Temporizador creado.",
    "toast.deleted": "Temporizador eliminado.",
    "toast.changedElsewhere": "El temporizador cambió en otro dispositivo.",
    "toast.recorded": "{time} registrados.",
    "toast.takeBreak": "Toca descansar.",
    "toast.sessionEnded": "Sesión finalizada.",
    "toast.breakEnded": "Descanso finalizado sin registrar tiempo.",
    "toast.focusDone": "Focus terminado en {title}. Es hora de descansar.",
    "toast.breakDone": "Descanso terminado en {title}. Puedes volver a Focus.",
    "notif.focusTitle": "Focus finalizado",
    "notif.breakTitle": "Descanso finalizado",
    "err.start": "No se pudo iniciar el temporizador.",
    "err.pause": "No se pudo actualizar la pausa.",
    "err.finish": "No se pudo terminar la sesión.",
    "err.skipBreak": "No se pudo saltar el descanso.",
    "settings.eyebrow": "PREFERENCIAS",
    "settings.title": "Ajustes",
    "settings.language": "Idioma",
    "settings.languageDesc": "Elige el idioma de la aplicación.",
    "settings.dark": "Modo oscuro",
    "settings.darkDesc": "Usa el estilo azul marino oscuro.",
    "settings.volume": "Volumen de alarma",
    "settings.notifications": "Notificaciones",
    "settings.enable": "Activar",
    "settings.logout": "Cerrar sesión de Google",
    "settings.notifUnsupported": "No soportado",
    "settings.notifOn": "Activadas",
    "settings.notifBlocked": "Bloqueadas",
    "settings.notifOff": "Desactivadas",
    "settings.notifEnabledToast": "Notificaciones del navegador activadas."
  }
};

const SHARK_NAMES = {
  en: ["Little Egg", "Pup", "Sharklet", "Juvenile", "Explorer", "Hunter", "Guardian", "Great White", "Reef King", "Megalodon"],
  es: ["Huevito", "Cría", "Tiburoncito", "Joven", "Explorador", "Cazador", "Guardián", "Gran blanco", "Rey del arrecife", "Megalodón"]
};

function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && LANGUAGES[stored]) return stored;
  } catch (_) {}
  return DEFAULT_LANGUAGE;
}

function t(key, vars = {}) {
  const table = I18N[settings.language] || I18N[DEFAULT_LANGUAGE];
  const value = table[key] ?? I18N[DEFAULT_LANGUAGE][key] ?? key;
  if (typeof value !== "string") return value;
  return value.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : `{${name}}`));
}

function locale() {
  return (LANGUAGES[settings.language] || LANGUAGES[DEFAULT_LANGUAGE]).locale;
}

function sharkName(index) {
  const names = SHARK_NAMES[settings.language] || SHARK_NAMES[DEFAULT_LANGUAGE];
  return names[index] || "";
}

/* ==========================================================================
   3. REFERENCIAS AL DOM
   ========================================================================== */
const elements = {
  authView: document.querySelector("#auth-view"),
  app: document.querySelector("#app"),
  googleLogin: document.querySelector("#google-login"),
  authError: document.querySelector("#auth-error"),
  layout: document.querySelector(".layout"),
  userName: document.querySelector("#user-name"),
  userInitial: document.querySelector("#user-initial"),
  userPhoto: document.querySelector("#user-photo"),
  userButton: document.querySelector("#user-button"),
  settingsButton: document.querySelector("#settings-button"),
  logoutButton: document.querySelector("#logout-button"),
  languageSelect: document.querySelector("#language-select"),
  navButtons: [...document.querySelectorAll(".nav-button")],
  timerView: document.querySelector("#timer-view"),
  statsView: document.querySelector("#stats-view"),
  aquariumView: document.querySelector("#aquarium-view"),
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
  skipBreakButton: document.querySelector("#skip-break-button"),
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
  tank: document.querySelector("#tank"),
  shark: document.querySelector("#shark"),
  sharkFlip: document.querySelector("#shark-flip"),
  petName: document.querySelector("#pet-name"),
  petLevelLabel: document.querySelector("#pet-level-label"),
  petProgressText: document.querySelector("#pet-progress-text"),
  petBar: document.querySelector("#pet-bar"),
  meatCount: document.querySelector("#meat-count"),
  meatHint: document.querySelector("#meat-hint"),
  feedOne: document.querySelector("#feed-one"),
  feedAll: document.querySelector("#feed-all"),
  petLevels: document.querySelector("#pet-levels"),
  levelupModal: document.querySelector("#levelup-modal"),
  levelupTitle: document.querySelector("#levelup-title"),
  levelupImage: document.querySelector("#levelup-image"),
  levelupDesc: document.querySelector("#levelup-desc"),
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

/* ==========================================================================
   4. ESTADO GLOBAL
   ========================================================================== */
let currentUser = null;
let timers = [];
let selectedTimerId = null;
let settings = { ...DEFAULT_SETTINGS, language: readStoredLanguage() };
let editingTimerId = null;
let statsMode = "data";
let unsubscribeTimers = null;
let unsubscribeProfile = null;
let tickerId = null;
let toastTimeout = null;
let volumeSaveTimeout = null;
let chartInstance = null;
let chartPeriod = "week";
let chartType = "bar";
let syncMode = false;
const hiddenSeries = new Set();
let editorTags = [];
let editorColor = TAG_COLORS[0];
let chartScope = "year";
const completingTimers = new Set();
let pendingTimerUpdates = new Map();

/* ==========================================================================
   5. UTILIDADES
   ========================================================================== */
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
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : t("timer.untitled"),
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
  return t(`priority.${["high", "medium", "low"].includes(priority) ? priority : "medium"}`);
}

function statusText(status) {
  return t(`status.${["running", "paused", "idle"].includes(status) ? status : "idle"}`);
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
  const total = Math.max(0, numeric(minutes, 0));
  if (total > 0 && total < 0.5) return t("time.lessThanMin");
  const rounded = Math.round(total);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  const hText = `${h} ${h === 1 ? t("time.hour") : t("time.hours")}`;
  const mText = `${m} ${m === 1 ? t("time.minute") : t("time.minutes")}`;
  if (h && m) return `${hText} ${t("time.and")} ${mText}`;
  return h ? hText : mText;
}

function setDuration(element, minutes) {
  if (!element) return;
  const rounded = Math.round(Math.max(0, numeric(minutes, 0)));
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  const part = (n, unit) => `<span class="dur-num">${n}</span><span class="dur-unit">${unit}</span>`;
  element.innerHTML = h ? (m ? `${part(h, "h")}${part(m, "min")}` : part(h, "h")) : part(m, "min");
}

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
function playAlarm() {
  if (settings.volume <= 0) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
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
        showToast(t("toast.changedElsewhere"), "!");
      }
    })
    .catch((error) => {
      rollbackOptimisticTimerUpdate(timerId, previous);
      showToast(failureMessage, "!");
      console.error(error);
    })
    .finally(() => {
      setSyncStatus(t("sync.synced"));
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

function renderTimers() {
  if (!elements.timerList) return;
  elements.timerList.replaceChildren();
  if (elements.addTimer) elements.addTimer.disabled = timers.length >= MAX_TIMERS;
  if (elements.timerLimit) {
    elements.timerLimit.textContent = timers.length >= MAX_TIMERS
      ? t("side.limitReached", { n: MAX_TIMERS })
      : t("side.limit", { n: MAX_TIMERS });
  }
  timers.forEach((timer) => {
    const card = document.createElement("div");
    card.className = `timer-card${timer.id === selectedTimerId ? " is-selected" : ""}${timer.status === "running" ? " is-running" : ""}`;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", t("timer.select", { title: timer.title }));
    card.innerHTML = `
      <strong class="timer-card-title"></strong>
      <span class="timer-card-info"></span>
      <button type="button" class="timer-card-edit" aria-label="${t("timer.editAria")}"><i data-lucide="pencil" width="14" height="14"></i></button>`;
    card.querySelector(".timer-card-title").textContent = timer.title;
    const info = card.querySelector(".timer-card-info");
    info.textContent = `${timer.focusMinutes} / ${timer.breakMinutes} min · ${priorityText(timer.priority)}`;
    if (timer.status !== "idle") {
      const badge = document.createElement("span");
      badge.className = "timer-card-status";
      badge.textContent = timer.status === "paused" ? t("badge.paused") : t("badge.active");
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
  if (window.lucide) window.lucide.createIcons();
}

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
  elements.timerSubtitle.textContent = t("timer.subtitle", { f: timer.focusMinutes, b: timer.breakMinutes });
  elements.priorityChip.textContent = t(`priority.chip.${timer.priority}`);
  elements.priorityChip.className = `priority-chip priority-${timer.priority}`;
  elements.phaseLabel.textContent = isFocus ? "FOCUS" : "BREAK";
  elements.phaseTitle.textContent = isFocus ? t("timer.phaseFocus") : t("timer.phaseBreak");
  elements.timerState.textContent = statusText(timer.status);
  elements.timerState.className = `state-pill${timer.status === "running" ? " is-running" : timer.status === "paused" ? " is-paused" : ""}`;
  elements.timeDisplay.textContent = formatClock(remaining);
  elements.timeCaption.textContent = timer.status === "idle"
    ? (isFocus ? t("timer.captionFocus") : t("timer.captionBreak"))
    : t("timer.captionRunning");
  elements.focusDuration.textContent = `${timer.focusMinutes} min`;
  elements.breakDuration.textContent = `${timer.breakMinutes} min`;
  elements.progressRing.style.background = `conic-gradient(${progressColor} ${degrees}deg, ${remainderColor} ${degrees}deg)`;
  elements.progressRing.classList.toggle("is-break", !isFocus);
  elements.startButton.hidden = timer.status !== "idle";
  elements.pauseButton.hidden = timer.status === "idle";
  elements.finishButton.hidden = timer.status === "idle";
  if (elements.skipBreakButton) elements.skipBreakButton.hidden = !(timer.status === "idle" && !isFocus);
  elements.startButton.textContent = isFocus ? t("timer.startFocus") : t("timer.startBreak");
  elements.pauseButton.textContent = timer.status === "paused" ? t("timer.resume") : t("timer.pause");
  elements.timerMessage.textContent = timer.status === "paused"
    ? t("timer.msgPaused")
    : timer.status === "running"
      ? t("timer.msgRunning")
      : t("timer.msgIdle");
}

function statsSource() {
  if (syncMode) {
    return timers.length ? { title: t("stats.syncTitle"), sessions: timers.flatMap((t) => t.sessions) } : null;
  }
  const timer = selectedTimer();
  return timer ? { title: timer.title, sessions: timer.sessions } : null;
}

function syncUi() {
  elements.syncToggle?.classList.toggle("is-on", syncMode);
  elements.syncToggle?.setAttribute("aria-pressed", String(syncMode));
  if (elements.statsEyebrow) {
    elements.statsEyebrow.textContent = syncMode ? t("stats.eyebrowSync") : t("stats.eyebrowSingle");
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
  elements.statsTotalLabel.textContent = t("stats.totalRecorded", { time: formatStudyTime(total) });
  setDuration(elements.statDay, day);
  setDuration(elements.statYesterday, yesterday);
  setDuration(elements.statWeek, week);
  setDuration(elements.statMonth, month);
  setDuration(elements.statTotal, total);
  elements.recentSummary.textContent = `${sessions.length} ${sessions.length === 1 ? t("stats.sessionOne") : t("stats.sessionMany")}`;
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
    empty.textContent = t("stats.noSessions");
    elements.recentList.append(empty);
    return;
  }
  latest.forEach((session) => {
    const row = document.createElement("div");
    row.className = "session-row";
    const date = new Date(session.completedAt);
    const dateText = date.toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" });
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

const chartTitles = () => ({ day: t("chart.title.day"), yesterday: t("chart.title.yesterday"), week: t("chart.title.week"), month: t("chart.title.month") });

function withAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function chartRanges(allSessions) {
  const now = new Date();
  const todayStart = localDayStart(now).getTime();
  const ranges = [];
  const push = (label, start, end) => ranges.push({ label, start, end });
  let title = chartTitles()[chartPeriod] || "";
  if (chartPeriod === "day" || chartPeriod === "yesterday") {
    const start = chartPeriod === "day" ? todayStart : todayStart - DAY_MS;
    for (let h = 0; h < 24; h += 1) push(String(h).padStart(2, "0"), start + h * 3_600_000, start + (h + 1) * 3_600_000);
  } else if (chartPeriod === "week") {
    for (let o = 6; o >= 0; o -= 1) {
      const d = new Date(todayStart - o * DAY_MS);
      push(d.toLocaleDateString(locale(), { weekday: "short", day: "numeric" }), d.getTime(), new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime());
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
    title = chartScope === "total" ? t("chart.title.allTime") : t("chart.title.year", { y: now.getFullYear() });
    for (let i = 0; i < count; i += 1) {
      const st = new Date(first.getFullYear(), first.getMonth() + i, 1);
      const name = st.toLocaleDateString(locale(), { month: "short" });
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
   9. MODAL DE DESGLOSE
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
  elements.breakdownEyebrow.textContent = isToday ? t("breakdown.todayEyebrow") : t("breakdown.yesterdayEyebrow");
  elements.breakdownTitle.textContent = isToday ? t("breakdown.todayTitle") : t("breakdown.yesterdayTitle");
  const filtered = sessions.filter((s) => s.completedAt >= startTime && s.completedAt < endTime);
  if (!filtered.length) {
    elements.breakdownList.innerHTML = `<p class="session-empty">${t("breakdown.noRecords")}</p>`;
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
  elements.breakdownEyebrow.textContent = t("breakdown.weekEyebrow");
  elements.breakdownTitle.textContent = t("breakdown.weekTitle");
  for (let offset = 0; offset < 7; offset += 1) {
    const d = new Date(todayStart - offset * DAY_MS);
    const dayStart = d.getTime();
    const dayEnd = dayStart + DAY_MS;
    const mins = sumSessions(sessions, (s) => s.completedAt >= dayStart && s.completedAt < dayEnd);
    const dateLabel = d.toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "short" });
    elements.breakdownList.append(
      createBreakdownRow(dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1), formatStudyTime(mins))
    );
  }
}

function renderMonthBreakdown(sessions, now) {
  elements.breakdownEyebrow.textContent = t("breakdown.monthEyebrow");
  elements.breakdownTitle.textContent = now
    .toLocaleDateString(locale(), { month: "long", year: "numeric" })
    .toUpperCase();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDayIdx = firstDay.getDay() - 1;
  if (startDayIdx === -1) startDayIdx = 6;
  const grid = document.createElement("div");
  grid.className = "calendar-grid";
  t("cal.days").forEach((d) => {
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
  elements.breakdownEyebrow.textContent = t("breakdown.historyEyebrow");
  elements.breakdownTitle.textContent = t("breakdown.chooseYear");
  elements.breakdownList.replaceChildren();
  const years = new Set([new Date().getFullYear()]);
  sessions.forEach((s) => years.add(new Date(s.completedAt).getFullYear()));
  [...years].sort((a, b) => b - a).forEach((year) => {
    const mins = sumSessions(sessions, (s) => new Date(s.completedAt).getFullYear() === year);
    const row = createBreakdownRow(String(year), `${formatStudyTime(mins)} ➔`);
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
  elements.breakdownEyebrow.textContent = t("breakdown.yearEyebrow");
  elements.breakdownTitle.textContent = String(year);
  elements.breakdownList.replaceChildren();
  const back = document.createElement("button");
  back.type = "button";
  back.className = "button button-quiet back-button";
  back.textContent = t("breakdown.backYears");
  back.addEventListener("click", () => renderYearsBreakdown(sessions));
  const yearTotal = sumSessions(sessions, (s) => new Date(s.completedAt).getFullYear() === year);
  const summary = document.createElement("div");
  summary.className = "year-summary";
  summary.innerHTML = `<span>${t("breakdown.yearTotal")}</span><strong></strong>`;
  summary.querySelector("strong").textContent = formatStudyTime(yearTotal);
  const grid = document.createElement("div");
  grid.className = "month-grid";
  for (let month = 0; month < 12; month += 1) {
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 1).getTime();
    const mins = sumSessions(sessions, (s) => s.completedAt >= start && s.completedAt < end);
    const cell = document.createElement("div");
    cell.className = `month-cell${mins > 0 ? " has-data" : ""}`;
    const name = new Date(year, month, 1).toLocaleDateString(locale(), { month: "short" });
    cell.innerHTML = "<span></span><strong></strong>";
    cell.querySelector("span").textContent = name.charAt(0).toUpperCase() + name.slice(1);
    cell.querySelector("strong").textContent = mins > 0 ? formatCompact(mins) : "—";
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
  elements.timerView.hidden = view !== "timer";
  elements.statsView.hidden = view !== "stats";
  elements.aquariumView.hidden = view !== "aquarium";
  elements.layout.classList.toggle("is-aquarium", view === "aquarium");
  elements.navButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.view === view));
  if (view === "stats") renderStatistics();
  if (view === "aquarium") { renderAquarium(true); startRoaming(); } else stopRoaming();
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
  elements.editorEyebrow.textContent = timer ? t("editor.edit") : t("editor.new");
  elements.editorTitle.textContent = timer ? t("editor.editTitle") : t("editor.createTitle");
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
    x.textContent = "✕";
    x.setAttribute("aria-label", t("editor.removeTag", { name }));
    x.addEventListener("click", () => { editorTags.splice(i, 1); renderEditorTags(); });
    chip.append(x);
    elements.tagChips.append(chip);
  });
}

function addTagFromInput() {
  const raw = elements.tagInput.value.replace(/,/g, "").trim().slice(0, MAX_TAG_LENGTH);
  elements.tagInput.value = "";
  if (!raw || editorTags.some((t) => t.toLowerCase() === raw.toLowerCase())) return;
  if (editorTags.length >= MAX_TAGS) { editorMessage(t("editor.maxTags", { n: MAX_TAGS })); return; }
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
    editorMessage(t("editor.invalid"));
    return;
  }
  const existing = editingTimerId ? timers.find((timer) => timer.id === editingTimerId) : null;
  if (existing && existing.status !== "idle") {
    editorMessage(t("editor.busyEdit"));
    return;
  }
  if (!existing && timers.length >= MAX_TIMERS) {
    editorMessage(t("editor.maxTimers", { n: MAX_TIMERS }));
    return;
  }
  setSyncStatus(t("sync.saving"), true);
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
    showToast(existing ? t("toast.updated") : t("toast.created"));
  } catch (error) {
    editorMessage(t("editor.saveError"));
    console.error(error);
  } finally {
    setSyncStatus(t("sync.synced"));
  }
}

async function removeTimer() {
  const timer = timers.find((item) => item.id === editingTimerId);
  if (!timer) return;
  if (timer.status !== "idle") {
    editorMessage(t("editor.busyDelete"));
    return;
  }
  if (!window.confirm(t("editor.confirmDelete", { title: timer.title }))) return;
  setSyncStatus(t("sync.deleting"), true);
  try {
    await deleteDoc(timerReference(timer.id));
    if (selectedTimerId === timer.id) selectedTimerId = null;
    closeModal(elements.timerModal);
    showToast(t("toast.deleted"));
  } catch (error) {
    editorMessage(t("editor.deleteError"));
    console.error(error);
  } finally {
    setSyncStatus(t("sync.synced"));
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
  setSyncStatus(t("sync.syncing"), true);
  const task = runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(timerReference(timer.id));
    if (!snapshot.exists()) return false;
    const current = timerFromData(timer.id, snapshot.data());
    if (current.status !== "idle") return false;
    transaction.update(snapshot.ref, patch);
    return true;
  });
  syncTimerInBackground(timer.id, previous, task, t("err.start"));
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
  setSyncStatus(t("sync.syncing"), true);
  const task = runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(timerReference(timer.id));
    if (!snapshot.exists()) return false;
    const current = timerFromData(timer.id, snapshot.data());
    if (isPausing && current.status !== "running") return false;
    if (!isPausing && current.status !== "paused") return false;
    transaction.update(snapshot.ref, patch);
    return true;
  });
  syncTimerInBackground(timer.id, previous, task, t("err.pause"));
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
  const offerBreak = registeredMinutes > BREAK_MIN_STUDY_MINUTES;
  const patch = {
    sessions: session ? [...timer.sessions, session] : timer.sessions,
    phase: offerBreak ? "break" : "focus",
    status: "idle",
    endTime: null,
    remainingMs: null,
    activeDurationMs: null,
    updatedAt: finishedAt
  };
  const previous = applyOptimisticTimerUpdate(timer.id, patch);
  showToast(
    timer.phase === "focus"
      ? (registeredMinutes > 0
          ? `${t("toast.recorded", { time: formatStudyTime(registeredMinutes) })}${offerBreak ? ` ${t("toast.takeBreak")}` : ""}`
          : t("toast.sessionEnded"))
      : t("toast.breakEnded")
  );
  setSyncStatus(t("sync.recording"), true);
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
      phase: cloudRegisteredMinutes > BREAK_MIN_STUDY_MINUTES ? "break" : "focus",
      status: "idle",
      endTime: null,
      remainingMs: null,
      activeDurationMs: null,
      updatedAt: finishedAt
    });
    if (cloudRegisteredMinutes > 0) {
      transaction.set(petReference(), { earnedMinutes: increment(cloudRegisteredMinutes) }, { merge: true });
    }
    return true;
  });
  syncTimerInBackground(timer.id, previous, task, t("err.finish"));
}

function skipBreak() {
  const timer = selectedTimer();
  if (!timer || timer.status !== "idle" || timer.phase !== "break") return;
  const patch = { phase: "focus", updatedAt: Date.now() };
  const previous = applyOptimisticTimerUpdate(timer.id, patch);
  setSyncStatus(t("sync.syncing"), true);
  const task = runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(timerReference(timer.id));
    if (!snapshot.exists()) return false;
    const current = timerFromData(timer.id, snapshot.data());
    if (current.status !== "idle" || current.phase !== "break") return false;
    transaction.update(snapshot.ref, patch);
    return true;
  });
  syncTimerInBackground(timer.id, previous, task, t("err.skipBreak"));
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
      if (completedPhase === "focus") {
        transaction.set(petReference(), { earnedMinutes: increment(current.activeDurationMs / 60_000) }, { merge: true });
      }
      return { title: current.title, phase: completedPhase };
    });
    if (result) {
      const isFocus = result.phase === "focus";
      const message = isFocus
        ? t("toast.focusDone", { title: result.title })
        : t("toast.breakDone", { title: result.title });
      playAlarm();
      notifyWhenHidden(isFocus ? t("notif.focusTitle") : t("notif.breakTitle"), message);
      showToast(message);
    }
  } catch (error) {
    console.error("No se pudo finalizar el temporizador automáticamente", error);
  } finally {
    completingTimers.delete(timer.id);
  }
}

/* ==========================================================================
   13. TICKER
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
   14. AJUSTES
   ========================================================================== */
function applySettings(nextSettings) {
  const languageChanged = Boolean(LANGUAGES[nextSettings.language]) && nextSettings.language !== settings.language;
  settings = { ...settings, ...nextSettings };
  document.body.classList.toggle("dark-mode", settings.darkMode);
  if (elements.darkModeToggle) elements.darkModeToggle.checked = settings.darkMode;
  if (elements.volumeSlider) elements.volumeSlider.value = settings.volume;
  if (elements.volumeLabel) elements.volumeLabel.textContent = `${settings.volume}%`;
  if (languageChanged) applyLanguage();
  else if (statsMode === "charts") renderCharts();
}

function applyLanguage() {
  const lang = LANGUAGES[settings.language] ? settings.language : DEFAULT_LANGUAGE;
  document.documentElement.lang = lang;
  try { window.localStorage.setItem(LANG_STORAGE_KEY, lang); } catch (_) {}
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.dataset.i18nAttr.split(";").forEach((pair) => {
      const [attr, key] = pair.split(":").map((part) => part.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
  document.querySelector('meta[name="description"]')?.setAttribute("content", t("meta.description"));
  if (elements.languageSelect) elements.languageSelect.value = lang;
  setSyncStatus(t("sync.synced"));
  if (currentUser) {
    if (elements.userName && !currentUser.displayName) elements.userName.textContent = t("user.default");
    setupNotifications();
    renderAll();
    renderAquarium();
  }
  if (window.lucide) window.lucide.createIcons();
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
    if (elements.notificationStatus) elements.notificationStatus.textContent = t("settings.notifUnsupported");
    return;
  }
  if (Notification.permission === "granted") {
    if (elements.notificationStatus) elements.notificationStatus.textContent = t("settings.notifOn");
    if (elements.notificationsButton) elements.notificationsButton.disabled = true;
  } else if (Notification.permission === "denied") {
    if (elements.notificationStatus) elements.notificationStatus.textContent = t("settings.notifBlocked");
    if (elements.notificationsButton) elements.notificationsButton.disabled = true;
  } else if (elements.notificationStatus) {
    elements.notificationStatus.textContent = t("settings.notifOff");
  }
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  const permission = await Notification.requestPermission();
  setupNotifications();
  if (permission === "granted") showToast(t("settings.notifEnabledToast"));
}

/* ==========================================================================
   14b. MASCOTA: TIBURÓN
   ========================================================================== */
const SHARK_LEVELS = [
  { hours: 0 }, { hours: 1 }, { hours: 5 }, { hours: 15 }, { hours: 35 },
  { hours: 70 }, { hours: 120 }, { hours: 200 }, { hours: 320 }, { hours: 500 }
];
const SHARK_COLORS = ["#f5e6c8", "#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#2563eb", "#4f46e5", "#64748b", "#7c3aed", "#1e293b"];
let pet = { earnedMinutes: 0, meatFed: 0, game: null };
let petReady = false, timersReady = false, petExists = false, petInitStarted = false;
let unsubscribePet = null, lastPetLevel = null, renderedPetLevel = -1, roamId = null;
let followUntil = 0;

function petReference() { return doc(db, "users", currentUser.uid, "pet", "main"); }

function petStats() {
  const earned = Math.max(0, numeric(pet.earnedMinutes, 0));
  const fed = Math.max(0, Math.floor(numeric(pet.meatFed, 0)));
  const available = Math.max(0, Math.floor(earned / 60) - fed);
  let idx = 0;
  SHARK_LEVELS.forEach((l, i) => { if (fed >= l.hours) idx = i; });
  return { earned, fed, available, idx, level: SHARK_LEVELS[idx], next: SHARK_LEVELS[idx + 1] || null, hourFraction: (earned % 60) / 60 };
}

function maybeInitPet() {
  if (!petReady || !timersReady || petExists || petInitStarted || !currentUser) return;
  petInitStarted = true;
  const total = timers.reduce((sum, t) => sum + sumSessions(t.sessions, () => true), 0);
  setDoc(petReference(), { earnedMinutes: total, meatFed: 0, createdAt: Date.now() }, { merge: true })
    .catch((e) => { petInitStarted = false; console.error(e); });
}

function sharkSvg(idx) {
  if (idx === 0) {
    return `<svg viewBox="0 0 100 130" class="shark-svg egg-svg" role="img" aria-label="${sharkName(0)}"><ellipse cx="50" cy="70" rx="38" ry="52" fill="#f5e6c8"/><circle cx="36" cy="55" r="6" fill="#e2c99a"/><circle cx="62" cy="82" r="8" fill="#e2c99a"/><circle cx="58" cy="44" r="4" fill="#e2c99a"/></svg>`;
  }
  const c = SHARK_COLORS[idx];
  return `<svg viewBox="0 0 220 110" class="shark-svg" role="img" aria-label="${sharkName(idx)}">
    <g class="shark-tail"><path d="M40 55 L4 18 Q20 55 4 92 Z" fill="${c}"/></g>
    <path d="M30 55 Q80 8 150 30 Q200 45 214 58 Q190 84 140 88 Q70 98 30 55Z" fill="${c}"/>
    <path d="M60 78 Q120 94 196 66 Q150 88 100 88Z" fill="#eaf6ff"/>
    <path d="M95 30 L116 0 L136 32Z" fill="${c}"/>
    <path d="M120 82 L98 106 L146 86Z" fill="${c}" style="filter:brightness(.8)"/>
    <path d="M140 56 q4 8 0 16 M148 55 q4 8 0 16" stroke="#0b1b33" stroke-opacity=".25" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="180" cy="52" r="4.5" fill="#0b1b33"/><circle cx="181.5" cy="50.5" r="1.4" fill="#fff"/>
  </svg>`;
}

function renderAquarium(force = false) {
  if (!elements.aquariumView || !currentUser) return;
  const s = petStats();
  if (force || renderedPetLevel !== s.idx) {
    renderedPetLevel = s.idx;
    elements.sharkFlip.innerHTML = sharkSvg(s.idx);
    elements.shark.style.width = `${s.idx === 0 ? 70 : 60 + s.idx * 22}px`;
    roamShark();
  }
  elements.petName.textContent = sharkName(s.idx);
  elements.petLevelLabel.textContent = t("pet.level", { n: s.idx + 1, total: SHARK_LEVELS.length });
  if (s.next) {
    const pct = ((s.fed - s.level.hours) / (s.next.hours - s.level.hours)) * 100;
    elements.petBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    elements.petProgressText.textContent = t("pet.progress", { fed: s.fed, goal: s.next.hours, next: sharkName(s.idx + 1) });
  } else {
    elements.petBar.style.width = "100%";
    elements.petProgressText.textContent = t("pet.progressMax", { fed: s.fed });
  }
  elements.meatCount.textContent = `${s.available} ${s.available === 1 ? t("pet.meatOne") : t("pet.meatMany")} 🍖`;
  const minsLeft = Math.max(1, Math.ceil((1 - s.hourFraction) * 60));
  elements.meatHint.textContent = t("pet.hint", { m: minsLeft });
  elements.feedOne.disabled = s.available < 1;
  elements.feedAll.disabled = s.available < 1;
  elements.petLevels.replaceChildren();
  SHARK_LEVELS.forEach((l, i) => {
    const row = document.createElement("div");
    row.className = `pet-level${i < s.idx ? " is-done" : i === s.idx ? " is-current" : " is-locked"}`;
    const name = document.createElement("strong");
    name.textContent = t("pet.levelRow", { n: i + 1, name: sharkName(i) });
    const hours = document.createElement("span");
    hours.textContent = i < s.idx ? `${l.hours} h ✓` : `${l.hours} h`;
    row.append(name, hours);
    elements.petLevels.append(row);
  });
}

function showLevelUp(idx) {
  const level = SHARK_LEVELS[idx];
  if (!level || !elements.levelupModal) return;
  elements.levelupTitle.textContent = idx === 1 ? t("level.hatched") : t("level.up");
  elements.levelupImage.innerHTML = sharkSvg(idx);
  elements.levelupDesc.textContent = t("level.desc", { n: idx + 1, total: SHARK_LEVELS.length, name: sharkName(idx) });
  openModal(elements.levelupModal);
}

function roamShark(targetX, targetY) {
  const tank = elements.tank, shark = elements.shark;
  if (!tank || !shark || !tank.clientWidth) return;
  const maxX = Math.max(0, tank.clientWidth - shark.offsetWidth);
  const maxY = Math.max(0, tank.clientHeight - shark.offsetHeight - 30);
  const curX = parseFloat(shark.style.left) || 0;
  const curY = parseFloat(shark.style.top) || 0;
  let x, y;
  if (renderedPetLevel === 0) { x = maxX / 2; y = maxY; }
  else if (targetX !== undefined) {
    x = Math.min(maxX, Math.max(0, targetX - shark.offsetWidth / 2));
    y = Math.min(maxY, Math.max(0, targetY - shark.offsetHeight / 2));
  } else { x = Math.random() * maxX; y = Math.random() * maxY * 0.85; }
  shark.classList.toggle("face-left", x < curX - 4 ? true : x > curX + 4 ? false : shark.classList.contains("face-left"));
  const dist = Math.hypot(x - curX, y - curY);
  shark.style.transitionDuration = `${Math.min(4, Math.max(0.8, dist / 160))}s`;
  shark.style.left = `${x}px`;
  shark.style.top = `${y}px`;
}

function followClick(event) {
  if (renderedPetLevel === 0) return;
  const rect = elements.tank.getBoundingClientRect();
  followUntil = Date.now() + 8000;
  roamShark(event.clientX - rect.left, event.clientY - rect.top);
}

function startRoaming() {
  stopRoaming();
  window.setTimeout(() => { if (Date.now() >= followUntil) roamShark(); }, 100);
  roamId = window.setInterval(() => { if (Date.now() >= followUntil) roamShark(); }, 5000);
}

function stopRoaming() { if (roamId) window.clearInterval(roamId); roamId = null; }

function dropMeat() {
  const tank = elements.tank;
  if (!tank || !tank.clientWidth) return;
  const meat = document.createElement("span");
  meat.className = "meat-drop";
  meat.textContent = "🍖";
  const x = 30 + Math.random() * Math.max(1, tank.clientWidth - 60);
  meat.style.left = `${x}px`;
  tank.append(meat);
  followUntil = Date.now() + 3000;
  window.setTimeout(() => roamShark(x, tank.clientHeight * 0.6), 500);
  window.setTimeout(() => meat.remove(), 1700);
}

async function feedShark(all) {
  const s = petStats();
  if (s.available < 1) { showToast(t("pet.noMeat"), "!"); return; }
  const amount = all ? s.available : 1;
  for (let i = 0; i < Math.min(amount, 10); i += 1) window.setTimeout(dropMeat, i * 250);
  try {
    await setDoc(petReference(), { meatFed: increment(amount) }, { merge: true });
  } catch (error) {
    showToast(t("pet.feedError"), "!");
    console.error(error);
  }
}

function listenToPet(user) {
  if (unsubscribePet) unsubscribePet();
  unsubscribePet = onSnapshot(doc(db, "users", user.uid, "pet", "main"), (snap) => {
    petReady = true;
    petExists = snap.exists();
    const d = snap.exists() ? snap.data() : {};
    pet = { earnedMinutes: numeric(d.earnedMinutes, 0), meatFed: numeric(d.meatFed, 0), game: d.game || null };
    maybeInitPet();
    const idx = petStats().idx;
    if (lastPetLevel !== null && idx > lastPetLevel) {
      playAlarm();
      showLevelUp(idx);
    }
    lastPetLevel = idx;
    renderAquarium();
  });
}

const eggCount = document.querySelector("#egg-count");
const underwaterGame = createGame({
  el: {
    view: document.querySelector("#game-view"), canvas: document.querySelector("#game-canvas"), back: document.querySelector("#game-back"),
    joy: document.querySelector("#game-joy"), biteBtn: document.querySelector("#game-bite"), banner: document.querySelector("#game-banner"),
    hud: { lvl: document.querySelector("#gh-lvl"), bp: document.querySelector("#gh-bp"), zone: document.querySelector("#gh-zone"), hp: document.querySelector("#gh-hp"), en: document.querySelector("#gh-en") }
  },
  getLevel: () => petStats().idx,
  name: (i) => sharkName(i),
  lang: () => settings.language,
  volume: () => settings.volume,
  load: () => pet.game,
  save: (game) => { if (currentUser) setDoc(petReference(), { game }, { merge: true }).catch((e) => console.error(e)); }
});

attachMultiClick(elements.shark, {
  count: 5, gapMs: 1200,
  onTick: (n) => { eggCount.hidden = n === 0; eggCount.textContent = `${n}/5`; },
  onTrigger: () => underwaterGame.open()
});

/* ==========================================================================
   15. FIRESTORE LISTENERS
   ========================================================================== */
function listenToUserData(user) {
  if (unsubscribeTimers) unsubscribeTimers();
  if (unsubscribeProfile) unsubscribeProfile();
  timersReady = false;
  listenToPet(user);
  unsubscribeProfile = onSnapshot(userReference(), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      applySettings({
        darkMode: Boolean(data.darkMode),
        volume: numeric(data.volume, DEFAULT_SETTINGS.volume),
        language: LANGUAGES[data.language] ? data.language : settings.language
      });
    } else {
      setDoc(userReference(), { ...DEFAULT_SETTINGS, language: settings.language }, { merge: true });
    }
  });
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
    timersReady = true;
    maybeInitPet();
    renderAll();
    startTicker();
  });
}

/* ==========================================================================
   16. EVENTOS DE INTERFAZ
   ========================================================================== */
function initEvents() {
  elements.googleLogin?.addEventListener("click", async () => {
    try {
      elements.authError.hidden = true;
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      elements.authError.textContent = t("auth.error");
      elements.authError.hidden = false;
      console.error(err);
    }
  });
  elements.logoutButton?.addEventListener("click", () => signOut(auth));
  elements.navButtons.forEach((b) => {
    b.addEventListener("click", () => showView(b.dataset.view));
  });
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
  elements.startButton?.addEventListener("click", startTimer);
  elements.pauseButton?.addEventListener("click", togglePause);
  elements.finishButton?.addEventListener("click", finishTimer);
  elements.skipBreakButton?.addEventListener("click", skipBreak);
  elements.feedOne?.addEventListener("click", () => feedShark(false));
  elements.feedAll?.addEventListener("click", () => feedShark(true));
  elements.tank?.addEventListener("click", followClick);
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
  elements.languageSelect?.addEventListener("change", (e) => {
    if (LANGUAGES[e.target.value]) persistSettings({ language: e.target.value });
  });
  elements.statsModeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setStatisticsMode(btn.dataset.statsMode));
  });
  elements.statDay?.closest(".metric-card")?.addEventListener("click", () => openBreakdownModal("day"));
  elements.statYesterday?.closest(".metric-card")?.addEventListener("click", () => openBreakdownModal("yesterday"));
  elements.statWeek?.closest(".metric-card")?.addEventListener("click", () => openBreakdownModal("week"));
  elements.statMonth?.closest(".metric-card")?.addEventListener("click", () => openBreakdownModal("month"));
  elements.statTotal?.closest(".metric-card")?.addEventListener("click", () => openBreakdownModal("total"));
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

  // Manejador global para cerrar modales (Botón Cancelar y atributos [data-close])
  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const modalId = btn.getAttribute("data-close");
      const modal = modalId ? document.getElementById(modalId) : btn.closest("dialog");
      if (modal) closeModal(modal);
    });
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
    if (elements.userName) elements.userName.textContent = user.displayName || t("user.default");
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
    if (window.lucide) window.lucide.createIcons();
  } else {
    if (unsubscribeTimers) unsubscribeTimers();
    if (unsubscribeProfile) unsubscribeProfile();
    if (unsubscribePet) unsubscribePet();
    if (tickerId) window.clearInterval(tickerId);
    tickerId = null;
    stopRoaming();
    timers = [];
    selectedTimerId = null;
    pet = { earnedMinutes: 0, meatFed: 0, game: null };
    petReady = timersReady = petExists = petInitStarted = false;
    lastPetLevel = null;
    renderedPetLevel = -1;
    followUntil = 0;
    destroyCharts();
    if (elements.authView) elements.authView.hidden = false;
    if (elements.app) elements.app.hidden = true;
  }
});

applyLanguage();
initEvents();
if (window.lucide) window.lucide.createIcons();