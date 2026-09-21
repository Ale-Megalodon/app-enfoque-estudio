(() => {
  "use strict";

  const KEYS = {
    session: "focus-study.session.v1",
    timer: "focus-study.timer.v1",
    records: "focus-study.records.v1",
    preferences: "focus-study.preferences.v1"
  };

  const DEFAULTS = { focusMinutes: 25, breakMinutes: 5 };
  const MAX_MINUTES = 240;

  const elements = {
    loginScreen: document.querySelector("#login-screen"),
    appShell: document.querySelector("#app-shell"),
    loginForm: document.querySelector("#login-form"),
    username: document.querySelector("#username"),
    password: document.querySelector("#password"),
    loginError: document.querySelector("#login-error"),
    userName: document.querySelector("#user-name"),
    logoutButton: document.querySelector("#logout-button"),
    tabs: [...document.querySelectorAll(".tab")],
    timerView: document.querySelector("#timer-view"),
    statisticsView: document.querySelector("#statistics-view"),
    phaseLabel: document.querySelector("#phase-label"),
    phaseTitle: document.querySelector("#phase-title"),
    timerStatus: document.querySelector("#timer-status"),
    timerRing: document.querySelector("#timer-ring"),
    timerDisplay: document.querySelector("#timer-display"),
    timerCaption: document.querySelector("#timer-caption"),
    durationLabel: document.querySelector("#duration-label"),
    durationInput: document.querySelector("#duration-input"),
    startButton: document.querySelector("#start-button"),
    cancelButton: document.querySelector("#cancel-button"),
    timerMessage: document.querySelector("#timer-message"),
    statsUpdated: document.querySelector("#stats-updated"),
    notice: document.querySelector("#completion-notice"),
    noticeIcon: document.querySelector("#notice-icon"),
    noticeTitle: document.querySelector("#notice-title"),
    noticeText: document.querySelector("#notice-text"),
    noticeClose: document.querySelector("#notice-close")
  };

  const statElements = {
    today: { value: document.querySelector("#stat-today"), detail: document.querySelector("#stat-today-detail") },
    yesterday: { value: document.querySelector("#stat-yesterday"), detail: document.querySelector("#stat-yesterday-detail") },
    week: { value: document.querySelector("#stat-week"), detail: document.querySelector("#stat-week-detail") },
    month: { value: document.querySelector("#stat-month"), detail: document.querySelector("#stat-month-detail") },
    year: { value: document.querySelector("#stat-year"), detail: document.querySelector("#stat-year-detail") }
  };

  let currentUser = null;
  let tickerId = null;
  let alarmContext = null;

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getSession() {
    const session = readJson(KEYS.session, null);
    return session && session.authenticated && typeof session.username === "string" ? session : null;
  }

  function storageKey(baseKey) {
    return `${baseKey}.${encodeURIComponent(currentUser || "guest")}`;
  }

  function getPreferences() {
    const saved = readJson(storageKey(KEYS.preferences), {});
    return {
      focusMinutes: validMinutes(saved.focusMinutes) || DEFAULTS.focusMinutes,
      breakMinutes: validMinutes(saved.breakMinutes) || DEFAULTS.breakMinutes
    };
  }

  function savePreferences(preferences) {
    writeJson(storageKey(KEYS.preferences), preferences);
  }

  function validMinutes(value) {
    const minutes = Number(value);
    return Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_MINUTES ? minutes : null;
  }

  function getTimer() {
    const timer = readJson(storageKey(KEYS.timer), null);
    if (!timer || !["focus", "break"].includes(timer.mode)) {
      return { mode: "focus", running: false };
    }
    return timer;
  }

  function saveTimer(timer) {
    writeJson(storageKey(KEYS.timer), timer);
  }

  function getRecords() {
    const records = readJson(storageKey(KEYS.records), []);
    return Array.isArray(records) ? records.filter(isValidRecord) : [];
  }

  function isValidRecord(record) {
    return record && typeof record.id === "string" && Number.isFinite(record.completedAt) && validMinutes(record.minutes);
  }

  function saveRecords(records) {
    writeJson(storageKey(KEYS.records), records);
  }

  function localDayStart(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function weekStart(date = new Date()) {
    const start = localDayStart(date);
    const weekday = start.getDay();
    const daysSinceMonday = (weekday + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
    return start;
  }

  function formatTimer(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function formatHours(minutes) {
    const hours = minutes / 60;
    if (hours === 0) return "0 h";
    return `${hours.toLocaleString("es", { maximumFractionDigits: 2 })} h`;
  }

  function minutesDetail(minutes) {
    return `${minutes} ${minutes === 1 ? "minuto" : "minutos"} completados`;
  }

  function sessionId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function updateTimerView() {
    if (!currentUser) return;

    const timer = getTimer();
    const preferences = getPreferences();
    const isFocus = timer.mode === "focus";
    const configuredMinutes = isFocus ? preferences.focusMinutes : preferences.breakMinutes;
    const totalMilliseconds = (timer.durationMinutes || configuredMinutes) * 60_000;
    let remainingMilliseconds = totalMilliseconds;

    if (timer.running && Number.isFinite(timer.endTime)) {
      remainingMilliseconds = timer.endTime - Date.now();
      if (remainingMilliseconds <= 0) {
        completeTimer(timer);
        return;
      }
    }

    const progress = timer.running ? Math.min(1, Math.max(0, 1 - remainingMilliseconds / totalMilliseconds)) : 0;
    const progressDegrees = progress * 360;
    const completedColor = isFocus ? "#9fc2ff" : "#76e0bc";
    const remainderColor = isFocus ? "rgba(159, 194, 255, 0.12)" : "rgba(118, 224, 188, 0.12)";

    elements.phaseLabel.textContent = isFocus ? "FOCUS" : "BREAK";
    elements.phaseTitle.textContent = isFocus ? "Tiempo de estudio" : "Tiempo de descanso";
    elements.durationLabel.textContent = isFocus ? "Duración de estudio" : "Duración de descanso";
    elements.timerDisplay.textContent = formatTimer(remainingMilliseconds);
    elements.timerRing.style.background = `conic-gradient(${completedColor} ${progressDegrees}deg, ${remainderColor} ${progressDegrees}deg)`;
    elements.timerRing.classList.toggle("is-break", !isFocus);
    elements.timerStatus.textContent = timer.running ? "EN CURSO" : "LISTO";
    elements.timerStatus.classList.toggle("is-running", Boolean(timer.running));
    elements.timerCaption.textContent = timer.running ? "tiempo restante" : "minutos configurados";
    elements.durationInput.disabled = Boolean(timer.running);
    elements.durationInput.value = timer.running ? timer.durationMinutes : configuredMinutes;
    elements.startButton.hidden = Boolean(timer.running);
    elements.cancelButton.hidden = !timer.running;
    elements.startButton.innerHTML = isFocus ? 'Iniciar estudio <span aria-hidden="true">→</span>' : 'Iniciar descanso <span aria-hidden="true">→</span>';
    elements.timerMessage.textContent = timer.running
      ? isFocus
        ? "La sesión se registrará automáticamente al completarse."
        : "Este descanso no se contabiliza en tus estadísticas."
      : isFocus
        ? "El tiempo de descanso nunca se incluye en tus estadísticas."
        : "Al terminar, podrás iniciar una nueva sesión de estudio.";
  }

  function startTimer() {
    const timer = getTimer();
    if (timer.running) return;

    const minutes = validMinutes(elements.durationInput.value);
    if (!minutes) {
      elements.durationInput.focus();
      showNotice("Revisa la duración", `Introduce un número entero entre 1 y ${MAX_MINUTES} minutos.`, "!");
      return;
    }

    const preferences = getPreferences();
    if (timer.mode === "focus") preferences.focusMinutes = minutes;
    else preferences.breakMinutes = minutes;
    savePreferences(preferences);

    const activeTimer = {
      mode: timer.mode,
      running: true,
      durationMinutes: minutes,
      endTime: Date.now() + minutes * 60_000,
      id: sessionId()
    };

    saveTimer(activeTimer);
    prepareAudio();
    ensureTicker();
    updateTimerView();
  }

  function cancelTimer() {
    const timer = getTimer();
    if (!timer.running) return;

    saveTimer({ mode: timer.mode, running: false });
    stopTickerIfIdle();
    updateTimerView();
  }

  function completeTimer(timer = getTimer()) {
    if (!timer.running || !Number.isFinite(timer.endTime)) return;

    // Se guarda primero el nuevo estado: evita duplicar el registro si la vista se actualiza dos veces.
    if (timer.mode === "focus") {
      recordCompletedFocus(timer);
      saveTimer({ mode: "break", running: false });
      showNotice("Sesión de estudio completada", `${timer.durationMinutes} minutos añadidos a tus estadísticas.`, "✓");
    } else {
      saveTimer({ mode: "focus", running: false });
      showNotice("Descanso finalizado", "Puedes comenzar una nueva sesión de estudio cuando quieras.", "✓");
    }

    playAlarm();
    stopTickerIfIdle();
    updateTimerView();
    updateStatistics();
  }

  function recordCompletedFocus(timer) {
    const records = getRecords();
    if (records.some((record) => record.id === timer.id)) return;

    records.push({
      id: timer.id,
      minutes: timer.durationMinutes,
      // La fecha real de finalización se conserva incluso si la pestaña se abrió después.
      completedAt: timer.endTime
    });
    saveRecords(records);
  }

  function updateStatistics() {
    if (!currentUser) return;
    const now = new Date();
    const startToday = localDayStart(now).getTime();
    const startTomorrow = startToday + 86_400_000;
    const startYesterday = startToday - 86_400_000;
    const startWeek = weekStart(now).getTime();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startYear = new Date(now.getFullYear(), 0, 1).getTime();
    const records = getRecords();

    const totalFrom = (start, end = Infinity) => records.reduce(
      (total, record) => total + (record.completedAt >= start && record.completedAt < end ? record.minutes : 0),
      0
    );

    setStat("today", totalFrom(startToday, startTomorrow));
    setStat("yesterday", totalFrom(startYesterday, startToday));
    setStat("week", totalFrom(startWeek, startTomorrow));
    setStat("month", totalFrom(startMonth, startTomorrow));
    setStat("year", totalFrom(startYear, startTomorrow));
    elements.statsUpdated.textContent = `Actualizado ${now.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`;
  }

  function setStat(name, minutes) {
    statElements[name].value.textContent = formatHours(minutes);
    statElements[name].detail.textContent = minutesDetail(minutes);
  }

  function ensureTicker() {
    if (!tickerId) tickerId = window.setInterval(updateTimerView, 250);
  }

  function stopTickerIfIdle() {
    if (!getTimer().running && tickerId) {
      window.clearInterval(tickerId);
      tickerId = null;
    }
  }

  function showView(viewName) {
    const isTimer = viewName === "timer";
    elements.timerView.hidden = !isTimer;
    elements.statisticsView.hidden = isTimer;
    elements.timerView.classList.toggle("is-active", isTimer);
    elements.statisticsView.classList.toggle("is-active", !isTimer);

    elements.tabs.forEach((tab) => {
      const active = tab.dataset.view === viewName;
      tab.classList.toggle("is-active", active);
      tab.toggleAttribute("aria-current", active);
    });
    if (!isTimer) updateStatistics();
  }

  function showNotice(title, text, icon = "✓") {
    elements.noticeTitle.textContent = title;
    elements.noticeText.textContent = text;
    elements.noticeIcon.textContent = icon;
    elements.notice.hidden = false;
  }

  function prepareAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      alarmContext = alarmContext || new AudioContext();
      if (alarmContext.state === "suspended") alarmContext.resume();
    } catch {
      // Si el navegador restringe el audio, el aviso visual sigue notificando el final.
    }
  }

  function playFourSecondAlarm() {
    try {
      prepareAudio();
      if (!alarmContext || alarmContext.state !== "running") return;

      const start = alarmContext.currentTime;
      const oscillator = alarmContext.createOscillator();
      const gain = alarmContext.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(880, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.03);
      gain.gain.setValueAtTime(0.16, start + 3.85);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 4);
      oscillator.connect(gain).connect(alarmContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 4);
    } catch {
      // No afecta el registro ni el cambio de fase si el audio no está disponible.
    }
  }

  function playAlarm() {
    playFourSecondAlarm();
  }

  function openApp(username) {
    currentUser = username;
    elements.userName.textContent = username;
    elements.loginScreen.hidden = true;
    elements.appShell.hidden = false;
    processExpiredTimer();
    updateTimerView();
    updateStatistics();
    if (getTimer().running) ensureTicker();
  }

  function processExpiredTimer() {
    const timer = getTimer();
    if (timer.running && Number.isFinite(timer.endTime) && timer.endTime <= Date.now()) {
      completeTimer(timer);
    }
  }

  function login(event) {
    event.preventDefault();
    const username = elements.username.value.trim();
    const password = elements.password.value;

    if (!username || !password) {
      elements.loginError.textContent = "Completa usuario y contraseña para continuar.";
      elements.loginError.hidden = false;
      return;
    }

    // Es una aplicación sin servidor: se conserva la sesión local, no la contraseña.
    writeJson(KEYS.session, { authenticated: true, username });
    elements.loginError.hidden = true;
    elements.password.value = "";
    prepareAudio();
    openApp(username);
  }

  function logout() {
    localStorage.removeItem(KEYS.session);
    currentUser = null;
    if (tickerId) window.clearInterval(tickerId);
    tickerId = null;
    elements.appShell.hidden = true;
    elements.loginScreen.hidden = false;
    elements.loginForm.reset();
    elements.username.focus();
    elements.notice.hidden = true;
  }

  elements.loginForm.addEventListener("submit", login);
  elements.logoutButton.addEventListener("click", logout);
  elements.startButton.addEventListener("click", startTimer);
  elements.cancelButton.addEventListener("click", cancelTimer);
  elements.noticeClose.addEventListener("click", () => { elements.notice.hidden = true; });
  elements.tabs.forEach((tab) => tab.addEventListener("click", () => showView(tab.dataset.view)));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && currentUser) {
      processExpiredTimer();
      updateTimerView();
      updateStatistics();
    }
  });
  window.addEventListener("focus", () => {
    if (currentUser) processExpiredTimer();
  });

  const session = getSession();
  if (session) openApp(session.username);
})();
