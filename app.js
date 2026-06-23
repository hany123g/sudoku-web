const boardEl = document.getElementById("board");
const messageEl = document.getElementById("message");
const timerEl = document.getElementById("timer");
const difficultyEl = document.getElementById("difficulty");
const difficultyLabelEl = document.getElementById("difficultyLabel");
const numberPadEl = document.getElementById("numberPad");
const newGameBtn = document.getElementById("newGameBtn");
const checkBtn = document.getElementById("checkBtn");
const hintBtn = document.getElementById("hintBtn");
const resetBtn = document.getElementById("resetBtn");

const DIFFICULTY = {
  easy: { label: "쉬움", blanks: 36 },
  medium: { label: "보통", blanks: 46 },
  hard: { label: "어려움", blanks: 54 },
};

const STORAGE_KEY = "mobile-sudoku-state-v1";
const COMPLETED_COUNT_KEY = "mobile-sudoku-completed-count-v1";

let state = null;
let timerHandle = null;

function getCompletedCount() {
  return Number(localStorage.getItem(COMPLETED_COUNT_KEY) || "0");
}

function increaseCompletedCount() {
  const nextCount = getCompletedCount() + 1;
  localStorage.setItem(COMPLETED_COUNT_KEY, String(nextCount));
  return nextCount;
}

function updateHeaderLabel() {
  if (!state) return;

  difficultyLabelEl.textContent =
    `${DIFFICULTY[state.difficulty].label} · 완료 ${state.completedCount}회`;
}

function shuffle(items) {
  const array = [...items];

  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

function pattern(row, col) {
  return (row * 3 + Math.floor(row / 3) + col) % 9;
}

function buildSolution() {
  const base = [0, 1, 2];

  const rows = shuffle(base).flatMap(group =>
    shuffle(base).map(row => group * 3 + row)
  );

  const cols = shuffle(base).flatMap(group =>
    shuffle(base).map(col => group * 3 + col)
  );

  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);

  return rows.flatMap(row => cols.map(col => nums[pattern(row, col)]));
}

function createPuzzle(solution, difficulty) {
  const puzzle = [...solution];
  const indexes = shuffle([...Array(81).keys()]);
  const blanks = DIFFICULTY[difficulty].blanks;
  let removed = 0;

  for (const index of indexes) {
    if (removed >= blanks) break;

    const backup = puzzle[index];
    puzzle[index] = 0;

    if (countSolutions([...puzzle], 2) === 1) {
      removed += 1;
    } else {
      puzzle[index] = backup;
    }
  }

  return puzzle;
}

function getCandidates(grid, index) {
  if (grid[index] !== 0) return [];

  const used = new Set();
  const row = Math.floor(index / 9);
  const col = index % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let i = 0; i < 9; i += 1) {
    used.add(grid[row * 9 + i]);
    used.add(grid[i * 9 + col]);
  }

  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      used.add(grid[r * 9 + c]);
    }
  }

  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(num => !used.has(num));
}

function countSolutions(grid, limit = 2) {
  let bestIndex = -1;
  let bestCandidates = null;

  for (let i = 0; i < 81; i += 1) {
    if (grid[i] !== 0) continue;

    const candidates = getCandidates(grid, i);

    if (candidates.length === 0) return 0;

    if (bestCandidates === null || candidates.length < bestCandidates.length) {
      bestCandidates = candidates;
      bestIndex = i;

      if (candidates.length === 1) break;
    }
  }

  if (bestIndex === -1) return 1;

  let total = 0;

  for (const candidate of bestCandidates) {
    grid[bestIndex] = candidate;
    total += countSolutions(grid, limit);
    grid[bestIndex] = 0;

    if (total >= limit) return total;
  }

  return total;
}

function newGame(difficulty = difficultyEl.value) {
  const solution = buildSolution();
  const puzzle = createPuzzle(solution, difficulty);

  state = {
    difficulty,
    completedCount: getCompletedCount(),
    solution,
    puzzle,
    current: [...puzzle],
    selected: -1,
    selectedNumber: 0,
    startedAt: Date.now(),
    elapsedBeforePause: 0,
    completed: false,
    completionRecorded: false,
  };

  difficultyEl.value = difficulty;

  saveState();
  render();
  setMessage("숫자를 먼저 누르거나 빈 칸을 선택한 뒤 입력하세요. 입력한 칸은 자동으로 선택 해제됩니다.");
}

function saveState() {
  if (!state) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!saved || !Array.isArray(saved.current) || saved.current.length !== 81) {
      return false;
    }

    state = saved;
    state.completedCount = getCompletedCount();

    if (typeof state.completionRecorded !== "boolean") {
      state.completionRecorded = Boolean(state.completed);
    }

    state.elapsedBeforePause =
      typeof state.elapsedBeforePause === "number" ? state.elapsedBeforePause : 0;

    /*
      저장된 게임을 다시 불러올 때는
      닫혀 있던 시간은 제외하고 지금부터 다시 시작합니다.
    */
    state.startedAt = Date.now();
    
    state.selected = -1;
    state.selectedNumber = 0;

    difficultyEl.value = state.difficulty || "medium";

    return true;
  } catch {
    return false;
  }
}

function render() {
  boardEl.innerHTML = "";
  updateHeaderLabel();

  state.current.forEach((value, index) => {
    const input = document.createElement("input");

    input.className = "cell";
    input.type = "text";
    input.inputMode = "numeric";
    input.pattern = "[1-9]";
    input.maxLength = 1;
    input.autocomplete = "off";
    input.readOnly = true;
    input.ariaLabel = `row ${Math.floor(index / 9) + 1}, column ${(index % 9) + 1}`;
    input.dataset.index = index;
    input.value = value ? String(value) : "";

    if (state.puzzle[index] !== 0) {
      input.classList.add("given");
    }

    input.addEventListener("click", () => selectCell(index));
    input.addEventListener("input", event => updateCell(index, event.target.value));
    input.addEventListener("keydown", event => handleKeydown(event, index));

    boardEl.appendChild(input);
  });

  markConflicts();
  updateBoardHighlights();
  updateNumberPad();
  startTimer();
}

function selectCell(index) {
  if (state.completed) {
    setMessage("완료된 게임입니다. 새 게임을 시작하거나 초기화하세요.", "ok");
    return;
  }

  const isSameBlankCell =
    state.selected === index &&
    state.puzzle[index] === 0 &&
    state.current[index] === 0 &&
    state.selectedNumber === 0;

  if (isSameBlankCell) {
    state.selected = -1;
    updateBoardHighlights();
    updateNumberPad();
    saveState();
    setMessage("선택을 해제했습니다. 숫자를 먼저 누르거나 빈 칸을 다시 선택하세요.");
    return;
  }

  state.selected = index;

  if (state.puzzle[index] !== 0) {
    updateBoardHighlights();
    updateNumberPad();
    saveState();

    if (state.selectedNumber === -1) {
      setMessage("처음부터 있던 숫자는 지울 수 없습니다.", "bad");
    } else {
      setMessage("처음부터 있던 숫자는 바꿀 수 없습니다.", "bad");
    }

    return;
  }

  if (state.selectedNumber === -1) {
    updateCell(index, "", { lockAfterInput: true });
    state.selectedNumber = -1;
    updateBoardHighlights();
    updateNumberPad();
    saveState();
    setMessage("선택한 칸을 지웠습니다. 계속 지울 칸을 터치하세요. 지우기를 다시 누르면 종료됩니다.");
    return;
  }

  const hasUserValue = state.current[index] !== 0;

  if (hasUserValue) {
    state.selectedNumber = 0;
    updateBoardHighlights();
    updateNumberPad();
    saveState();
    setMessage("선택한 칸의 값을 바꾸려면 아래 숫자를 누르세요.");
    return;
  }

  if (state.selectedNumber > 0) {
    updateCell(index, state.selectedNumber, { lockAfterInput: true });
    setMessage(`${state.selectedNumber}을/를 입력했습니다. 다시 바꾸려면 그 칸을 다시 누르세요.`);
    return;
  }

  updateBoardHighlights();
  updateNumberPad();
  saveState();
}

function updateCell(index, rawValue, options = {}) {
  if (state.completed) {
    setMessage("완료된 게임입니다. 새 게임을 시작하거나 초기화하세요.", "ok");
    return;
  }

  if (state.puzzle[index] !== 0) return;

  const value = String(rawValue).replace(/[^1-9]/g, "").slice(0, 1);
  state.current[index] = value ? Number(value) : 0;

  if (options.lockAfterInput) {
    state.selected = -1;
  }

  const cell = boardEl.querySelector(`[data-index="${index}"]`);

  if (cell && cell.value !== value) {
    cell.value = value;
  }

  markConflicts();
  updateBoardHighlights();
  updateNumberPad();
  saveState();
  maybeFinishGame();
}

function fillSelectedCell(value) {
  if (!state) return;

  if (state.completed) {
    setMessage("완료된 게임입니다. 새 게임을 시작하거나 초기화하세요.", "ok");
    return;
  }

  if (value === 0) {
    if (state.selectedNumber === -1) {
      state.selectedNumber = 0;
      state.selected = -1;
      updateBoardHighlights();
      updateNumberPad();
      saveState();
      setMessage("지우기 모드를 종료했습니다.");
      return;
    }

    state.selectedNumber = -1;
    state.selected = -1;
    updateBoardHighlights();
    updateNumberPad();
    saveState();
    setMessage("지우기 모드입니다. 지울 칸을 계속 터치하세요. 지우기를 다시 누르면 종료됩니다.");
    return;
  }

  state.selectedNumber = value;
  updateBoardHighlights();
  updateNumberPad();

  if (state.selected < 0) {
    setMessage(`${value} 입력 모드입니다. 빈 칸을 터치하세요.`);
    saveState();
    return;
  }

  if (state.puzzle[state.selected] !== 0) {
    setMessage("처음부터 있던 숫자는 바꿀 수 없습니다. 다른 빈 칸을 터치하세요.", "bad");
    saveState();
    return;
  }

  updateCell(state.selected, String(value), { lockAfterInput: true });
  setMessage(`${value}을/를 입력했습니다. 다시 바꾸려면 그 칸을 다시 누르세요.`);
}

function getHighlightNumber() {
  if (!state) return 0;

  if (state.selectedNumber > 0) return state.selectedNumber;
  if (state.selected >= 0) return state.current[state.selected] || 0;

  return 0;
}

function updateBoardHighlights() {
  const highlightNumber = getHighlightNumber();

  document.querySelectorAll(".cell").forEach(cell => {
    const index = Number(cell.dataset.index);
    const cellValue = state.current[index];

    cell.classList.toggle("selected", state.selected === index);
    cell.classList.toggle("same-number", highlightNumber > 0 && cellValue === highlightNumber);
  });
}

function updateNumberPad() {
  const selectedValue = state && state.selected >= 0 ? state.current[state.selected] : 0;
  const selectedNumber = state ? state.selectedNumber || 0 : 0;

  document.querySelectorAll(".number-btn[data-number]").forEach(button => {
    const buttonNumber = Number(button.dataset.number);

    const usedCount = state
      ? state.current.filter(value => value === buttonNumber).length
      : 0;

    const isActive =
      buttonNumber === selectedNumber ||
      (!selectedNumber && buttonNumber === selectedValue);

    const isDone = usedCount >= 9;

    button.classList.toggle("active", isActive);
    button.classList.toggle("done", isDone);

    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.setAttribute(
      "aria-label",
      isDone ? `${buttonNumber}, 9개 모두 사용됨` : `${buttonNumber}`
    );
  });

  const eraseButton = document.querySelector(".number-btn.erase");

  if (eraseButton) {
    eraseButton.classList.toggle("active", selectedNumber === -1);
    eraseButton.setAttribute("aria-pressed", selectedNumber === -1 ? "true" : "false");
  }
}

function handleKeydown(event, index) {
  const row = Math.floor(index / 9);
  const col = index % 9;

  const moves = {
    ArrowUp: [Math.max(row - 1, 0), col],
    ArrowDown: [Math.min(row + 1, 8), col],
    ArrowLeft: [row, Math.max(col - 1, 0)],
    ArrowRight: [row, Math.min(col + 1, 8)],
  };

  if (/^[1-9]$/.test(event.key)) {
    event.preventDefault();
    updateCell(index, event.key);
    return;
  }

  if (event.key === "Backspace" || event.key === "Delete") {
    event.preventDefault();
    updateCell(index, "");
    return;
  }

  if (moves[event.key]) {
    event.preventDefault();

    const [nextRow, nextCol] = moves[event.key];
    const nextIndex = nextRow * 9 + nextCol;
    const next = boardEl.querySelector(`[data-index="${nextIndex}"]`);

    if (next) {
      next.focus();
      selectCell(nextIndex);
    }
  }
}

function getConflicts() {
  const conflicts = new Set();
  const groups = [];

  for (let i = 0; i < 9; i += 1) {
    groups.push([...Array(9)].map((_, col) => i * 9 + col));
    groups.push([...Array(9)].map((_, row) => row * 9 + i));
  }

  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      groups.push([...Array(9)].map((_, offset) => {
        const row = boxRow * 3 + Math.floor(offset / 3);
        const col = boxCol * 3 + (offset % 3);
        return row * 9 + col;
      }));
    }
  }

  groups.forEach(group => {
    const seen = new Map();

    group.forEach(index => {
      const value = state.current[index];

      if (!value) return;

      if (!seen.has(value)) {
        seen.set(value, []);
      }

      seen.get(value).push(index);
    });

    seen.forEach(indexes => {
      if (indexes.length > 1) {
        indexes.forEach(index => conflicts.add(index));
      }
    });
  });

  return conflicts;
}

function markConflicts() {
  const conflicts = getConflicts();

  document.querySelectorAll(".cell").forEach(cell => {
    const index = Number(cell.dataset.index);
    cell.classList.toggle("conflict", conflicts.has(index));
  });
}

function completeGame() {
  if (state.completionRecorded) {
    state.completed = true;
    saveState();
    updateHeaderLabel();
    setMessage(`이미 완료된 게임입니다. 완료 ${state.completedCount}회입니다.`, "ok");
    return;
  }

  state.completed = true;
  state.completionRecorded = true;
  state.completedCount = increaseCompletedCount();
  state.elapsedBeforePause = getElapsedMilliseconds();

  saveState();
  updateHeaderLabel();

  setMessage(`성공! 스도쿠를 완성했습니다. 완료 ${state.completedCount}회입니다.`, "ok");

  document.querySelectorAll(".cell").forEach(cell => {
    cell.classList.add("correct-flash");
  });
}

function maybeFinishGame() {
  if (state.completed) return;
  if (state.current.some(value => value === 0)) return;
  if (getConflicts().size > 0) return;
  if (!state.current.every((value, index) => value === state.solution[index])) return;

  completeGame();
}

function checkBoard() {
  const conflicts = getConflicts();
  const hasBlank = state.current.some(value => value === 0);
  const solved = state.current.every((value, index) => value === state.solution[index]);

  if (conflicts.size > 0) {
    setMessage("중복된 숫자가 있습니다.", "bad");
    return;
  }

  if (hasBlank) {
    setMessage("아직 빈 칸이 남아 있습니다.", "bad");
    return;
  }

  if (!solved) {
    setMessage("규칙은 맞지만 정답과 다른 칸이 있습니다.", "bad");
    return;
  }

  completeGame();
}

function giveHint() {
  if (state.completed) {
    setMessage("완료된 게임입니다. 새 게임을 시작하세요.", "ok");
    return;
  }

  const blanks = state.current
    .map((value, index) => ({ value, index }))
    .filter(item => item.value === 0 && state.puzzle[item.index] === 0);

  if (blanks.length === 0) {
    setMessage("힌트를 줄 빈 칸이 없습니다.");
    return;
  }

  const pick = blanks[Math.floor(Math.random() * blanks.length)].index;
  state.current[pick] = state.solution[pick];

  saveState();
  render();

  const cell = boardEl.querySelector(`[data-index="${pick}"]`);

  if (cell) {
    cell.focus();
    cell.classList.add("correct-flash");
  }

  setMessage("힌트 하나를 채웠습니다.");
  maybeFinishGame();
}

function resetBoard() {
  state.current = [...state.puzzle];
  state.selected = -1;
  state.selectedNumber = 0;
  state.startedAt = Date.now();
  state.elapsedBeforePause = 0;

  /*
    이미 완료 기록된 게임을 초기화해도
    완료 횟수는 다시 증가하지 않도록 completionRecorded는 유지합니다.
  */
  state.completed = false;

  saveState();
  render();
  setMessage("처음 상태로 되돌렸습니다.");
}

function setMessage(text, type = "") {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`.trim();
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function getElapsedMilliseconds() {
  if (!state) return 0;

  if (state.completed) {
    return state.elapsedBeforePause || 0;
  }

  return Date.now() - state.startedAt + (state.elapsedBeforePause || 0);
}

function updateTimerDisplay() {
  const seconds = Math.floor(getElapsedMilliseconds() / 1000);
  timerEl.textContent = formatTime(seconds);
}

function pauseTimer() {
  if (!state || state.completed) return;

  state.elapsedBeforePause = getElapsedMilliseconds();
  state.startedAt = Date.now();

  clearInterval(timerHandle);
  saveState();
  updateTimerDisplay();
}

function resumeTimer() {
  if (!state || state.completed) return;

  state.startedAt = Date.now();
  saveState();
  startTimer();
}

function startTimer() {
  clearInterval(timerHandle);

  updateTimerDisplay();

  timerHandle = setInterval(() => {
    if (!state) return;

    if (state.completed) {
      clearInterval(timerHandle);
      updateTimerDisplay();
      return;
    }

    updateTimerDisplay();
  }, 1000);
}

numberPadEl.addEventListener("click", event => {
  const button = event.target.closest("button");

  if (!button) return;

  if (button.dataset.erase === "true") {
    fillSelectedCell(0);
    return;
  }

  if (button.dataset.number) {
    fillSelectedCell(Number(button.dataset.number));
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseTimer();
  } else {
    resumeTimer();
  }
});

window.addEventListener("pagehide", () => {
  pauseTimer();
});

window.addEventListener("beforeunload", () => {
  pauseTimer();
});

newGameBtn.addEventListener("click", () => newGame(difficultyEl.value));
checkBtn.addEventListener("click", checkBoard);
hintBtn.addEventListener("click", giveHint);
resetBtn.addEventListener("click", resetBoard);
difficultyEl.addEventListener("change", () => newGame(difficultyEl.value));

if (!loadState()) {
  newGame("medium");
} else {
  render();
  setMessage("저장된 게임을 불러왔습니다. 입력 모드와 지우기 모드는 해제되었습니다.");
}
