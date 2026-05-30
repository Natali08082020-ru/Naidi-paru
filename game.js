const ITEMS = [
  { id: "apple", name: "Яблоко", img: "images/apple.png" },
  { id: "banana", name: "Банан", img: "images/banana.png" },
  { id: "orange", name: "Апельсин", img: "images/orange.png" },
  { id: "strawberry", name: "Клубника", img: "images/strawberry.png" },
  { id: "cat", name: "Кот", img: "images/cat.png" },
  { id: "dog", name: "Собака", img: "images/dog.png" },
  { id: "car", name: "Автомобиль", img: "images/car.png" },
  { id: "plane", name: "Самолёт", img: "images/plane.png" },
  { id: "pizza", name: "Пицца", img: "images/pizza.png" },
  { id: "coffee", name: "Кофе", img: "images/coffee.png" },
  { id: "cake", name: "Торт", img: "images/cake.png" },
  { id: "flower", name: "Цветы", img: "images/flower.png" },
  { id: "book", name: "Книга", img: "images/book.png" },
  { id: "guitar", name: "Гитара", img: "images/guitar.png" },
  { id: "house", name: "Дом", img: "images/house.png" },
  { id: "balloon", name: "Шарик", img: "images/balloon.png" },
  { id: "camera", name: "Камера", img: "images/camera.png" },
  { id: "watch", name: "Часы", img: "images/watch.png" },
  { id: "lemon", name: "Лимон", img: "images/lemon.png" },
  { id: "bread", name: "Хлеб", img: "images/bread.png" },
  { id: "fish", name: "Рыба", img: "images/fish.png" },
  { id: "cheese", name: "Сыр", img: "images/cheese.png" },
  { id: "bike", name: "Велосипед", img: "images/bike.png" },
  { id: "train", name: "Поезд", img: "images/train.png" },
];

const LEVELS = [
  { pairs: 6, cols: 3, timeLimit: 90 },
  { pairs: 8, cols: 4, timeLimit: 120 },
  { pairs: 10, cols: 4, timeLimit: 150 },
  { pairs: 12, cols: 4, timeLimit: 180 },
  { pairs: 12, cols: 6, timeLimit: 180 },
  { pairs: 15, cols: 5, timeLimit: 210 },
  { pairs: 18, cols: 6, timeLimit: 240 },
  { pairs: 21, cols: 7, timeLimit: 270 },
];

const board = document.getElementById("board");
const movesEl = document.getElementById("moves");
const pairsEl = document.getElementById("pairs");
const timerEl = document.getElementById("timer");
const timerBar = document.getElementById("timer-bar");
const levelEl = document.getElementById("level");
const gridSizeEl = document.getElementById("grid-size");
const restartBtn = document.getElementById("restart");

const winModal = document.getElementById("win-modal");
const winTextEl = document.getElementById("win-text");
const winLevelEl = document.getElementById("win-level");
const winMovesEl = document.getElementById("win-moves");
const winTimeEl = document.getElementById("win-time");
const nextLevelBtn = document.getElementById("next-level");
const playAgainWinBtn = document.getElementById("play-again-win");

const loseModal = document.getElementById("lose-modal");
const loseLevelEl = document.getElementById("lose-level");
const losePairsEl = document.getElementById("lose-pairs");
const retryLevelBtn = document.getElementById("retry-level");
const restartFromLoseBtn = document.getElementById("restart-from-lose");

let currentLevel = 1;
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let lockBoard = false;
let timerInterval = null;
let timeLeft = 0;
let timeLimit = 0;
let totalPairs = 0;
let gameActive = false;
let currentBoardConfig = null;

const BOARD_GAP = 8;
const BOARD_MAX_WIDTH = 1100;
const BOARD_MIN_CELL = 42;
const BOARD_MAX_CELL = 130;

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(value) {
  const mins = Math.floor(value / 60);
  const secs = value % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function getLevelConfig(level) {
  const index = Math.min(level - 1, LEVELS.length - 1);
  return { ...LEVELS[index], level };
}

function getGridRows(pairs, cols) {
  return Math.ceil((pairs * 2) / cols);
}

function updateTimerDisplay() {
  timerEl.textContent = formatTime(timeLeft);

  const ratio = timeLimit > 0 ? timeLeft / timeLimit : 0;
  timerBar.style.width = `${Math.max(0, ratio * 100)}%`;

  timerEl.classList.remove("timer-warning", "timer-danger");
  timerBar.classList.remove("warning", "danger");

  if (ratio <= 0.15) {
    timerEl.classList.add("timer-danger");
    timerBar.classList.add("danger");
  } else if (ratio <= 0.35) {
    timerEl.classList.add("timer-warning");
    timerBar.classList.add("warning");
  }
}

function startTimer() {
  stopTimer();
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    timeLeft -= 1;
    updateTimerDisplay();

    if (timeLeft <= 0) {
      stopTimer();
      finishGame(false);
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function hideModals() {
  winModal.classList.add("hidden");
  loseModal.classList.add("hidden");
}

function getNeighbors(index, cols, total) {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const neighbors = [];

  if (col > 0) neighbors.push(index - 1);
  if (col < cols - 1 && index + 1 < total) neighbors.push(index + 1);
  if (row > 0) neighbors.push(index - cols);
  if (index + cols < total) neighbors.push(index + cols);

  return neighbors;
}

function manhattanDistance(a, b, cols) {
  const rowA = Math.floor(a / cols);
  const colA = a % cols;
  const rowB = Math.floor(b / cols);
  const colB = b % cols;
  return Math.abs(rowA - rowB) + Math.abs(colA - colB);
}

function hasAdjacentPairs(deck, cols) {
  for (let i = 0; i < deck.length; i += 1) {
    for (const neighbor of getNeighbors(i, cols, deck.length)) {
      if (deck[i].id === deck[neighbor].id) {
        return true;
      }
    }
  }
  return false;
}

function buildSpreadDeck(chosen, cols) {
  const total = chosen.length * 2;
  const deck = new Array(total);
  const free = [...Array(total).keys()];

  for (const item of shuffle(chosen)) {
    const shuffledFree = shuffle(free);
    let bestPair = null;
    let bestScore = -1;

    for (const first of shuffledFree) {
      for (const second of shuffledFree) {
        if (second === first) continue;
        if (getNeighbors(first, cols, total).includes(second)) continue;

        const score = manhattanDistance(first, second, cols);
        if (score > bestScore) {
          bestScore = score;
          bestPair = [first, second];
        }
      }
    }

    if (!bestPair) {
      bestPair = [free[0], free[1]];
    }

    const [firstIndex, secondIndex] = bestPair;
    deck[firstIndex] = item;
    deck[secondIndex] = item;

    const removeIndex = (value) => {
      const index = free.indexOf(value);
      if (index !== -1) free.splice(index, 1);
    };
    removeIndex(firstIndex);
    removeIndex(secondIndex);
  }

  return deck;
}

function repairDeck(deck, cols) {
  const layout = [...deck];

  for (let attempt = 0; attempt < 600; attempt += 1) {
    if (!hasAdjacentPairs(layout, cols)) {
      return layout;
    }

    let improved = false;

    for (let i = 0; i < layout.length && !improved; i += 1) {
      for (const neighbor of getNeighbors(i, cols, layout.length)) {
        if (layout[i].id !== layout[neighbor].id) continue;

        const swapCandidates = shuffle(
          [...Array(layout.length).keys()].filter(
            (index) => index !== i && index !== neighbor
          )
        );

        for (const swapIndex of swapCandidates) {
          if (layout[swapIndex].id === layout[neighbor].id) continue;

          [layout[i], layout[swapIndex]] = [layout[swapIndex], layout[i]];

          if (!hasAdjacentPairs(layout, cols)) {
            return layout;
          }

          improved = true;
          break;
        }
      }
    }

    if (!improved) {
      break;
    }
  }

  return layout;
}

function createDeck(pairCount, cols) {
  const chosen = shuffle(ITEMS).slice(0, pairCount);
  const spreadDeck = buildSpreadDeck(chosen, cols);
  return repairDeck(spreadDeck, cols);
}

function createCard(item, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "card";
  button.dataset.itemId = item.id;
  button.dataset.index = String(index);
  button.setAttribute("aria-label", "Закрытая карточка");

  const front = document.createElement("div");
  front.className = "card-face card-front";
  front.setAttribute("role", "img");
  front.setAttribute("aria-label", item.name);

  const img = document.createElement("img");
  img.src = item.img;
  img.alt = item.name;
  img.loading = "eager";
  img.decoding = "async";
  img.draggable = false;
  front.appendChild(img);

  button.innerHTML = `
    <div class="card-inner">
      <div class="card-face card-back">?</div>
    </div>
  `;
  button.querySelector(".card-inner").appendChild(front);

  button.addEventListener("click", () => flipCard(button));
  return button;
}

function resetRoundStats(config) {
  moves = 0;
  matchedPairs = 0;
  totalPairs = config.pairs;
  flippedCards = [];
  lockBoard = false;
  timeLimit = config.timeLimit;
  timeLeft = config.timeLimit;
  gameActive = true;

  movesEl.textContent = "0";
  pairsEl.textContent = `0 / ${config.pairs}`;
  levelEl.textContent = String(currentLevel);

  const rows = getGridRows(config.pairs, config.cols);
  gridSizeEl.textContent = `${config.cols}×${rows}`;

  hideModals();
}

function layoutBoard(config) {
  const rows = getGridRows(config.pairs, config.cols);
  const cols = config.cols;

  const header = document.querySelector(".header");
  const controls = document.querySelector(".controls");
  const stats = document.querySelector(".stats");
  const timerBar = document.querySelector(".timer-bar-wrap");

  const verticalUsed =
    (header?.offsetHeight ?? 0) +
    (controls?.offsetHeight ?? 0) +
    (stats?.offsetHeight ?? 0) +
    (timerBar?.offsetHeight ?? 0) +
    56;

  const horizontalPadding = 24;
  const availableWidth = Math.min(
    window.innerWidth - horizontalPadding,
    BOARD_MAX_WIDTH
  );
  const availableHeight = Math.max(200, window.innerHeight - verticalUsed);

  const cellByWidth = (availableWidth - BOARD_GAP * (cols - 1)) / cols;
  const cellByHeight = (availableHeight - BOARD_GAP * (rows - 1)) / rows;
  const cellSize = Math.floor(
    Math.max(
      BOARD_MIN_CELL,
      Math.min(BOARD_MAX_CELL, cellByWidth, cellByHeight)
    )
  );

  board.style.setProperty("--cols", String(cols));
  board.style.setProperty("--rows", String(rows));
  board.style.setProperty("--cell-size", `${cellSize}px`);
  board.style.setProperty("--board-gap", `${BOARD_GAP}px`);
  document.documentElement.style.setProperty("--cell-size", `${cellSize}px`);
}

function startLevel(level = currentLevel) {
  stopTimer();
  currentLevel = level;

  const config = getLevelConfig(currentLevel);
  currentBoardConfig = config;
  resetRoundStats(config);

  board.innerHTML = "";

  const deck = createDeck(config.pairs, config.cols);
  deck.forEach((item, index) => {
    board.appendChild(createCard(item, index));
  });

  layoutBoard(config);
  startTimer();
}

function startFromBeginning() {
  startLevel(1);
}

function flipCard(card) {
  if (
    !gameActive ||
    lockBoard ||
    card.classList.contains("flipped") ||
    card.classList.contains("matched")
  ) {
    return;
  }

  card.classList.add("flipped");
  card.setAttribute("aria-label", `Открыта карточка: ${card.dataset.itemId}`);
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    moves += 1;
    movesEl.textContent = String(moves);
    checkMatch();
  }
}

function checkMatch() {
  lockBoard = true;
  const [first, second] = flippedCards;
  const isMatch = first.dataset.itemId === second.dataset.itemId;

  if (isMatch) {
    first.classList.add("matched");
    second.classList.add("matched");
    first.disabled = true;
    second.disabled = true;
    matchedPairs += 1;
    pairsEl.textContent = `${matchedPairs} / ${totalPairs}`;
    flippedCards = [];
    lockBoard = false;

    if (matchedPairs === totalPairs) {
      finishGame(true);
    }
    return;
  }

  setTimeout(() => {
    first.classList.remove("flipped");
    second.classList.remove("flipped");
    first.setAttribute("aria-label", "Закрытая карточка");
    second.setAttribute("aria-label", "Закрытая карточка");
    flippedCards = [];
    lockBoard = false;
  }, 800);
}

function finishGame(won) {
  gameActive = false;
  stopTimer();

  if (won) {
    const isLastLevel = currentLevel >= LEVELS.length;
    winLevelEl.textContent = String(currentLevel);
    winMovesEl.textContent = String(moves);
    winTimeEl.textContent = formatTime(timeLeft);
    winTextEl.textContent = isLastLevel
      ? "Ты прошёл все уровни! Невероятно 🏆"
      : "Отлично! Готов к следующему уровню?";
    nextLevelBtn.textContent = isLastLevel ? "Играть снова" : "Следующий уровень";
    winModal.classList.remove("hidden");
    return;
  }

  loseLevelEl.textContent = String(currentLevel);
  losePairsEl.textContent = `${matchedPairs} / ${totalPairs}`;
  loseModal.classList.remove("hidden");
}

function goToNextLevel() {
  if (currentLevel >= LEVELS.length) {
    startFromBeginning();
    return;
  }
  startLevel(currentLevel + 1);
}

restartBtn.addEventListener("click", startFromBeginning);
nextLevelBtn.addEventListener("click", goToNextLevel);
playAgainWinBtn.addEventListener("click", startFromBeginning);
retryLevelBtn.addEventListener("click", () => startLevel(currentLevel));
restartFromLoseBtn.addEventListener("click", startFromBeginning);

window.addEventListener("resize", () => {
  if (currentBoardConfig) {
    layoutBoard(currentBoardConfig);
  }
});

startFromBeginning();
