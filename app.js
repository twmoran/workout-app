const STORAGE_KEY = "workoutIntervalCoach.v1";

const libraryView = document.getElementById("libraryView");
const editorView = document.getElementById("editorView");
const playerView = document.getElementById("playerView");
const workoutList = document.getElementById("workoutList");
const workoutName = document.getElementById("workoutName");
const restSeconds = document.getElementById("restSeconds");
const exerciseRows = document.getElementById("exerciseRows");
const editorMessage = document.getElementById("editorMessage");

const phaseLabel = document.getElementById("phaseLabel");
const currentExercise = document.getElementById("currentExercise");
const nextExercise = document.getElementById("nextExercise");
const timer = document.getElementById("timer");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");
const liveRegion = document.getElementById("liveRegion");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const skipBtn = document.getElementById("skipBtn");
const stopBtn = document.getElementById("stopBtn");

let workouts = loadWorkouts();
let editingId = null;
let draftExercises = [];
let activeWorkout = null;

let running = false;
let paused = false;
let phase = "ready";
let exerciseIndex = 0;
let phaseDuration = 0;
let remaining = 0;
let endAt = 0;
let intervalId = null;
let speechToken = 0;
let audioCtx = null;

function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
}

function loadWorkouts() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch (_) {}
  return [{
    id: uid(),
    name: "Morning Circuit",
    restSeconds: 20,
    exercises: [
      { name: "Jumping jacks", seconds: 30 },
      { name: "Squats", seconds: 40 },
      { name: "Push-ups", seconds: 30 },
      { name: "Plank", seconds: 45 }
    ]
  }];
}

function saveAll() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

function show(view) {
  [libraryView, editorView, playerView].forEach(v => v.classList.add("hidden"));
  view.classList.remove("hidden");
}

function renderLibrary() {
  workoutList.innerHTML = "";
  if (!workouts.length) {
    workoutList.innerHTML = '<div class="empty">No workouts yet. Tap “New workout” to create one.</div>';
    return;
  }

  workouts.forEach(w => {
    const card = document.createElement("article");
    card.className = "workout-card";

    const title = document.createElement("h3");
    title.textContent = w.name;

    const meta = document.createElement("p");
    const exerciseTotal = w.exercises.reduce((sum, ex) => sum + ex.seconds, 0);
    const restTotal = Math.max(0, w.exercises.length - 1) * w.restSeconds;
    meta.textContent = `${w.exercises.length} exercises · ${formatTime(exerciseTotal + restTotal)} total · ${w.restSeconds}s rest`;

    const actions = document.createElement("div");
    actions.className = "workout-card-actions";

    const start = button("Start", "primary", () => openPlayer(w.id));
    const edit = button("Edit", "secondary", () => editWorkout(w.id));
    const duplicate = button("Duplicate", "secondary", () => duplicateWorkout(w.id));
    const del = button("Delete", "secondary danger", () => deleteWorkout(w.id));

    actions.append(start, edit, duplicate, del);
    card.append(title, meta, actions);
    workoutList.append(card);
  });
}

function button(text, className, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  b.className = className;
  b.addEventListener("click", onClick);
  return b;
}

function newWorkout() {
  editingId = null;
  workoutName.value = "New Workout";
  restSeconds.value = 20;
  draftExercises = [{ name: "Exercise", seconds: 30 }];
  editorMessage.textContent = "";
  renderExerciseRows();
  show(editorView);
}

function editWorkout(id) {
  const w = workouts.find(x => x.id === id);
  if (!w) return;
  editingId = id;
  workoutName.value = w.name;
  restSeconds.value = w.restSeconds;
  draftExercises = w.exercises.map(ex => ({ ...ex }));
  editorMessage.textContent = "";
  renderExerciseRows();
  show(editorView);
}

function duplicateWorkout(id) {
  const w = workouts.find(x => x.id === id);
  if (!w) return;
  workouts.push({
    id: uid(),
    name: `${w.name} Copy`,
    restSeconds: w.restSeconds,
    exercises: w.exercises.map(ex => ({ ...ex }))
  });
  saveAll();
  renderLibrary();
}

function deleteWorkout(id) {
  if (!confirm("Delete this workout?")) return;
  workouts = workouts.filter(w => w.id !== id);
  saveAll();
  renderLibrary();
}

function renderExerciseRows() {
  exerciseRows.innerHTML = "";
  draftExercises.forEach((ex, index) => {
    const row = document.createElement("div");
    row.className = "exercise-row";

    const grid = document.createElement("div");
    grid.className = "exercise-grid";

    const nameWrap = document.createElement("label");
    const nameLabel = document.createElement("span");
    nameLabel.textContent = "Exercise";
    const nameInput = document.createElement("input");
    nameInput.value = ex.name;
    nameInput.addEventListener("input", () => draftExercises[index].name = nameInput.value);
    nameWrap.append(nameLabel, nameInput);

    const timeWrap = document.createElement("label");
    const timeLabel = document.createElement("span");
    timeLabel.textContent = "Seconds";
    const timeInput = document.createElement("input");
    timeInput.type = "number";
    timeInput.min = "1";
    timeInput.max = "3600";
    timeInput.inputMode = "numeric";
    timeInput.value = ex.seconds;
    timeInput.addEventListener("change", () => {
      ex.seconds = clampInt(timeInput.value, 1, 3600, 30);
      timeInput.value = ex.seconds;
    });
    timeWrap.append(timeLabel, timeInput);
    grid.append(nameWrap, timeWrap);

    const controls = document.createElement("div");
    controls.className = "exercise-controls";
    controls.append(
      button("↑ Up", "secondary", () => moveExercise(index, -1)),
      button("↓ Down", "secondary", () => moveExercise(index, 1)),
      button("Remove", "secondary danger", () => {
        draftExercises.splice(index, 1);
        renderExerciseRows();
      })
    );

    row.append(grid, controls);
    exerciseRows.append(row);
  });
}

function moveExercise(index, delta) {
  const next = index + delta;
  if (next < 0 || next >= draftExercises.length) return;
  [draftExercises[index], draftExercises[next]] = [draftExercises[next], draftExercises[index]];
  renderExerciseRows();
}

function saveWorkout() {
  const name = workoutName.value.trim();
  const rest = clampInt(restSeconds.value, 0, 600, 20);

  if (!name) return setEditorMessage("Give the workout a name.");
  if (!draftExercises.length) return setEditorMessage("Add at least one exercise.");

  const cleaned = draftExercises.map((ex, i) => ({
    name: ex.name.trim(),
    seconds: clampInt(ex.seconds, 1, 3600, 30)
  }));

  const blank = cleaned.findIndex(ex => !ex.name);
  if (blank !== -1) return setEditorMessage(`Give exercise ${blank + 1} a name.`);

  if (editingId) {
    const index = workouts.findIndex(w => w.id === editingId);
    if (index !== -1) workouts[index] = { id: editingId, name, restSeconds: rest, exercises: cleaned };
  } else {
    workouts.push({ id: uid(), name, restSeconds: rest, exercises: cleaned });
  }

  saveAll();
  renderLibrary();
  show(libraryView);
}

function setEditorMessage(msg) {
  editorMessage.textContent = msg;
}

function openPlayer(id) {
  const source = workouts.find(w => w.id === id);
  if (!source) return;
  activeWorkout = JSON.parse(JSON.stringify(source));
  resetPlayer();
  progressText.textContent = `0 / ${activeWorkout.exercises.length}`;
  show(playerView);
}

function resetPlayer() {
  clearInterval(intervalId);
  intervalId = null;
  running = false;
  paused = false;
  phase = "ready";
  exerciseIndex = 0;
  remaining = 0;
  phaseDuration = 0;
  speechToken++;
  if ("speechSynthesis" in window) speechSynthesis.cancel();

  phaseLabel.textContent = "Ready";
  currentExercise.textContent = activeWorkout ? activeWorkout.name : "Press Start when you're ready";
  nextExercise.textContent = "Press Start when you're ready";
  timer.textContent = "0:00";
  progressBar.style.width = "0%";
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  skipBtn.disabled = true;
  stopBtn.disabled = true;
  pauseBtn.textContent = "Pause";
}

function startWorkout() {
  if (!activeWorkout || !activeWorkout.exercises.length) return;
  ensureAudio();
  running = true;
  paused = false;
  exerciseIndex = 0;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  skipBtn.disabled = false;
  stopBtn.disabled = false;
  beginExercise(true);
}

function ensureAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch (_) {}
}

function tone(freq, duration, volume) {
  try {
    ensureAudio();
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.setValueAtTime(volume, now + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  } catch (_) {}
}

function startBeep() { tone(1100, 0.38, 0.24); }
function endBeep() { tone(520, 0.48, 0.26); }

function speak(text, done = () => {}) {
  const token = ++speechToken;
  liveRegion.textContent = text;

  if (!("speechSynthesis" in window)) {
    setTimeout(() => token === speechToken && done(), 500);
    return;
  }

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  let finished = false;

  const finish = () => {
    if (finished || token !== speechToken) return;
    finished = true;
    done();
  };

  utterance.onend = finish;
  utterance.onerror = finish;
  speechSynthesis.speak(utterance);
  setTimeout(finish, 3500);
}

function beginExercise(announce) {
  if (!running) return;
  if (exerciseIndex >= activeWorkout.exercises.length) return finishWorkout();

  const ex = activeWorkout.exercises[exerciseIndex];
  phase = "work";
  phaseDuration = ex.seconds;
  phaseLabel.textContent = "Exercise";
  currentExercise.textContent = ex.name;
  nextExercise.textContent = exerciseIndex + 1 < activeWorkout.exercises.length
    ? `Next: ${activeWorkout.exercises[exerciseIndex + 1].name}`
    : "Final exercise";
  progressText.textContent = `${exerciseIndex + 1} / ${activeWorkout.exercises.length}`;

  const go = () => {
    if (!running || paused) return;
    startBeep();
    startCountdown(ex.seconds);
  };

  if (announce) speak(ex.name, go);
  else go();
}

function finishExercise() {
  endBeep();

  if (exerciseIndex >= activeWorkout.exercises.length - 1) {
    setTimeout(finishWorkout, 520);
    return;
  }

  exerciseIndex++;
  const rest = clampInt(activeWorkout.restSeconds, 0, 600, 20);

  if (rest === 0) {
    setTimeout(() => beginExercise(true), 520);
    return;
  }

  phase = "rest";
  phaseDuration = rest;
  phaseLabel.textContent = "Rest";
  currentExercise.textContent = "Rest";
  nextExercise.textContent = `Next: ${activeWorkout.exercises[exerciseIndex].name}`;
  progressText.textContent = `${exerciseIndex} / ${activeWorkout.exercises.length}`;

  speak(`Next, ${activeWorkout.exercises[exerciseIndex].name}`);
  startCountdown(rest);
}

function startCountdown(seconds) {
  remaining = seconds;
  endAt = performance.now() + seconds * 1000;
  updateTimer();
  clearInterval(intervalId);
  intervalId = setInterval(tick, 100);
}

function tick() {
  if (!running || paused) return;
  remaining = Math.max(0, (endAt - performance.now()) / 1000);
  updateTimer();

  if (remaining <= 0) {
    clearInterval(intervalId);
    intervalId = null;
    if (phase === "work") finishExercise();
    else beginExercise(false);
  }
}

function updateTimer() {
  timer.textContent = formatTime(Math.ceil(remaining));
  const pct = phaseDuration > 0
    ? Math.min(100, Math.max(0, ((phaseDuration - remaining) / phaseDuration) * 100))
    : 0;
  progressBar.style.width = `${pct}%`;
}

function togglePause() {
  if (!running) return;

  if (!paused) {
    paused = true;
    remaining = Math.max(0, (endAt - performance.now()) / 1000);
    clearInterval(intervalId);
    intervalId = null;
    if ("speechSynthesis" in window) speechSynthesis.pause();
    pauseBtn.textContent = "Resume";
    phaseLabel.textContent += " · Paused";
  } else {
    paused = false;
    if ("speechSynthesis" in window) speechSynthesis.resume();
    pauseBtn.textContent = "Pause";
    phaseLabel.textContent = phase === "work" ? "Exercise" : "Rest";
    endAt = performance.now() + remaining * 1000;
    intervalId = setInterval(tick, 100);
  }
}

function skipPhase() {
  if (!running) return;
  clearInterval(intervalId);
  intervalId = null;
  speechToken++;
  if ("speechSynthesis" in window) speechSynthesis.cancel();

  if (phase === "work") finishExercise();
  else beginExercise(false);
}

function finishWorkout() {
  running = false;
  paused = false;
  clearInterval(intervalId);
  intervalId = null;
  speechToken++;
  if ("speechSynthesis" in window) speechSynthesis.cancel();

  phaseLabel.textContent = "Complete";
  currentExercise.textContent = "Workout complete";
  nextExercise.textContent = "Nice work.";
  timer.textContent = "0:00";
  progressBar.style.width = "100%";
  progressText.textContent = `${activeWorkout.exercises.length} / ${activeWorkout.exercises.length}`;
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  skipBtn.disabled = true;
  stopBtn.disabled = true;
  pauseBtn.textContent = "Pause";
  speak("Workout complete");
}

function stopWorkout() {
  resetPlayer();
  show(libraryView);
}

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function formatTime(seconds) {
  seconds = Math.max(0, Math.round(seconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

document.getElementById("newWorkoutBtn").addEventListener("click", newWorkout);
document.getElementById("addExerciseBtn").addEventListener("click", () => {
  if (draftExercises.length >= 50) return setEditorMessage("Maximum 50 exercises per workout.");
  draftExercises.push({ name: "New exercise", seconds: 30 });
  renderExerciseRows();
});
document.getElementById("saveWorkoutBtn").addEventListener("click", saveWorkout);
document.getElementById("cancelEditBtn").addEventListener("click", () => show(libraryView));
startBtn.addEventListener("click", startWorkout);
pauseBtn.addEventListener("click", togglePause);
skipBtn.addEventListener("click", skipPhase);
stopBtn.addEventListener("click", stopWorkout);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

renderLibrary();
show(libraryView);
