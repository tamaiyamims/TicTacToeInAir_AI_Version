const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const cells = document.querySelectorAll(".cell");
const statusText = document.getElementById("status");
const restartButton = document.getElementById("restart");

let board = ["", "", "", "", "", "", "", "",];
let gameOver = false;
let stableCell = -1;
let stableFrames = 0;
let moveLocked = false;

const wins = [
  [0,1,2], [3,4,5], [6,7,8],
  [0,3,6], [1,4,7], [2,5,8],
  [0,4,8], [2,4,6]
];

function updateBoard() {
  cells.forEach((cell, i) => {
    cell.textContent = board[i];
    cell.classList.remove("active");
  });
}

function winner(b) {
  for (const [a, c, d] of wins) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  if (b.every(x => x !== "")) return "draw";
  return null;
}

function showResult(result) {
  if (result === "X") {
    statusText.textContent = "You win! Tap Restart Game to play again.";
    gameOver = true;
  } else if (result === "O") {
    statusText.textContent = "AI wins! Tap Restart Game to play again.";
    gameOver = true;
  } else if (result === "draw") {
    statusText.textContent = "Draw! Tap Restart Game to play again.";
    gameOver = true;
  }
}

function minimax(b, maximizing) {
  const result = winner(b);
  if (result === "O") return 10;
  if (result === "X") return -10;
  if (result === "draw") return 0;

  const scores = [];
  for (let i = 0; i < 9; i++) {
    if (b[i] === "") {
      b[i] = maximizing ? "O" : "X";
      const score = minimax(b, !maximizing);
      b[i] = "";
      scores.push({i, score});
    }
  }

  if (maximizing) {
    return Math.max(...scores.map(x => x.score));
  }
  return Math.min(...scores.map(x => x.score));
}

function aiMove() {
  let bestScore = -Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (board[i] === "") {
      board[i] = "O";
      const score = minimax(board, false);
      board[i] = "";
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }

  if (bestMove >= 0) {
    board[bestMove] = "O";
  }

  updateBoard();
  const result = winner(board);
  if (result) {
    showResult(result);
  } else {
    statusText.textContent = "Your turn. Point at an empty square.";
  }
}

function playerMove(index) {
  if (gameOver || moveLocked || board[index] !== "") return;

  moveLocked = true;
  board[index] = "X";
  updateBoard();

  const result = winner(board);
  if (result) {
    showResult(result);
    moveLocked = false;
    return;
  }

  statusText.textContent = "AI is thinking...";
  setTimeout(() => {
    aiMove();
    moveLocked = false;
  }, 400);
}

function getCellFromFinger(x, y) {
  // The video is mirrored. Reverse x for the board.
  x = 1 - x;

  const left = 0.25;
  const top = 0.20;
  const width = 0.50;
  const height = 0.60;

  if (x < left || x > left + width || y < top || y > top + height) {
    return -1;
  }

  const col = Math.min(2, Math.floor((x - left) / (width / 3)));
  const row = Math.min(2, Math.floor((y - top) / (height / 3)));
  return row * 3 + col;
}

function onResults(results) {
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    stableCell = -1;
    stableFrames = 0;
    return;
  }

  const hand = results.multiHandLandmarks[0];
  const tip = hand[8];

  const index = getCellFromFinger(tip.x, tip.y);

  cells.forEach(c => c.classList.remove("active"));
  if (index >= 0 && board[index] === "" && !gameOver && !moveLocked) {
    cells[index].classList.add("active");

    if (index === stableCell) {
      stableFrames++;
    } else {
      stableCell = index;
      stableFrames = 1;
    }

    // Keep the finger over a square briefly to make a move.
    if (stableFrames >= 15) {
      playerMove(index);
      stableFrames = 0;
      stableCell = -1;
    }
  } else {
    stableCell = -1;
    stableFrames = 0;
  }
}

const hands = new Hands({
  locateFile: file =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

hands.onResults(onResults);

const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({image: video});
  },
  width: 640,
  height: 480
});

restartButton.addEventListener("click", () => {
  board = ["", "", "", "", "", "", "", ""];
  gameOver = false;
  stableCell = -1;
  stableFrames = 0;
  moveLocked = false;
  updateBoard();
  statusText.textContent = "Your turn. Point at an empty square.";
});

updateBoard();
camera.start();
