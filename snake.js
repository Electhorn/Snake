// --- snake.js CORREGIDO ---

// Elementos DOM
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("scoreValue");

// Constantes y variables
let snakeSpeed = 10;
let lastRenderTime = 0;
let score = 0;
let isPaused = false;
let gameOver = false;
let gameStarted = false;
let highScore = 0;
let newHighScore = false;
let foodScale = 1.0;
let foodAnimationDirection = 1;
const FOOD_ANIMATION_SPEED = 0.05; // Controla qué tan rápido late
const FOOD_MAX_SCALE = 1.2; // Qué tanto crece
const FOOD_MIN_SCALE = 1.0; // Su tamaño mínimo
const highScoreKey = "snakeHighScore";
const GRID_SIZE = 25;
let box;
let snake;
let foodX;
let foodY;
let dx;
let dy;
let changingDirection = false;
let isDraggingOnDPad = false;
let lastTouchDirection = null; // 'up', 'down', 'left', 'right'

// --- FUNCIONES DEL JUEGO (SIN CAMBIOS) ---

function getHighScore() {
  const storedScore = localStorage.getItem(highScoreKey);
  return storedScore ? parseInt(storedScore, 10) : 0;
}

function updateHighScoreDisplay() {
  const highScoreElement = document.getElementById("highScoreValue");
  highScoreElement.textContent = highScore;
}

function checkAndSaveHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(highScoreKey, highScore);
    newHighScore = true; // Marcamos que se ha batido el récord
  } else {
    newHighScore = false;
  }
}

function setupAndResizeGame() {
  const canvasWidth = canvas.offsetWidth;
  box = Math.floor(canvasWidth / GRID_SIZE);
  canvas.width = GRID_SIZE * box;
  canvas.height = GRID_SIZE * box;

  highScore = getHighScore();
  updateHighScoreDisplay();

  restartGame();
}

function gameLoop(currentTime) {
  if (gameOver) {
    document.getElementById("restartButton").style.display = "block";
    return;
  }
  window.requestAnimationFrame(gameLoop);
  const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
  if (secondsSinceLastRender < 1 / snakeSpeed) return;
  lastRenderTime = currentTime;
  update();
  draw();
}

function update() {
  if (!gameStarted || isPaused) return;
  if (checkGameOver()) {
    checkAndSaveHighScore();
    gameOver = true;
    return;
  }
  changingDirection = false;
  const hasEatenFood = snake[0].x === foodX && snake[0].y === foodY;
  moveSnake();
  if (hasEatenFood) {
    score++;
    updateScoreDisplay();
    generateFood();
    if (score > 0 && score % 5 === 0) {
      snakeSpeed += 2;
    }
  } else {
    snake.pop();
  }

  foodScale += foodAnimationDirection * FOOD_ANIMATION_SPEED;

  // Invertimos la dirección si alcanza los límites
  if (foodScale > FOOD_MAX_SCALE || foodScale < FOOD_MIN_SCALE) {
    foodAnimationDirection *= -1; // Invierte la dirección (de 1 a -1 y viceversa)
    // Nos aseguramos de que no se pase de los límites
    foodScale = Math.max(FOOD_MIN_SCALE, Math.min(foodScale, FOOD_MAX_SCALE));
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawFood();
  drawSnake();

  if (!gameStarted) {
    drawStartScreen();
  } else if (gameOver) {
    drawGameOverScreen();
  } else if (isPaused) {
    drawPauseScreen();
  }
}

function drawSnake() {
  // Dibujamos cada segmento del cuerpo
  ctx.fillStyle = "green";
  for (let i = 1; i < snake.length; i++) {
    ctx.fillRect(snake[i].x, snake[i].y, box, box);
  }
  // Dibujamos la cabeza
  ctx.fillStyle = "darkgreen";
  ctx.fillRect(snake[0].x, snake[0].y, box, box);
  // Dibujamos los ojos
  ctx.fillStyle = "white";
  const head = snake[0];
  const eyeSize = Math.max(2, Math.floor(box / 5)); // Ojos que escalan con la caja
  let eye1X, eye1Y, eye2X, eye2Y;
  if (dx === box) {
    // Derecha
    eye1X = head.x + box - eyeSize * 2;
    eye1Y = head.y + eyeSize;
    eye2X = head.x + box - eyeSize * 2;
    eye2Y = head.y + box - eyeSize * 2;
  } else if (dx === -box) {
    // Izquierda
    eye1X = head.x + eyeSize;
    eye1Y = head.y + eyeSize;
    eye2X = head.x + eyeSize;
    eye2Y = head.y + box - eyeSize * 2;
  } else if (dy === box) {
    // Abajo
    eye1X = head.x + eyeSize;
    eye1Y = head.y + box - eyeSize * 2;
    eye2X = head.x + box - eyeSize * 2;
    eye2Y = head.y + box - eyeSize * 2;
  } else if (dy === -box) {
    // Arriba
    eye1X = head.x + eyeSize;
    eye1Y = head.y + eyeSize;
    eye2X = head.x + box - eyeSize * 2;
    eye2Y = head.y + eyeSize;
  }
  ctx.fillRect(eye1X, eye1Y, eyeSize, eyeSize);
  ctx.fillRect(eye2X, eye2Y, eyeSize, eyeSize);
}

function moveSnake() {
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };
  snake.unshift(head);
}

function generateFood() {
  foodX = Math.floor(Math.random() * GRID_SIZE) * box;
  foodY = Math.floor(Math.random() * GRID_SIZE) * box;

  foodScale = 1.0;
  foodAnimationDirection = 1;

  snake.forEach(function isFoodOnSnake(segment) {
    if (segment.x === foodX && segment.y === foodY) generateFood();
  });
}

function drawFood() {
  const scaledBox = box * foodScale;
  // Calculamos el desfase para mantener el cuadrado centrado mientras escala
  const offsetX = (box - scaledBox) / 2;
  const offsetY = (box - scaledBox) / 2;

  ctx.fillStyle = "#ffcc00";
  ctx.fillRect(foodX + offsetX, foodY + offsetY, scaledBox, scaledBox);
}

function updateDirectionFromTouch(event) {
  const touch = event.touches[0];
  if (!touch) return;

  const elementUnderFinger = document.elementFromPoint(
    touch.clientX,
    touch.clientY
  );
  let currentDirection = null;

  if (elementUnderFinger) {
    switch (elementUnderFinger.id) {
      case "upBtn":
        currentDirection = "up";
        break;
      case "downBtn":
        currentDirection = "down";
        break;
      case "leftBtn":
        currentDirection = "left";
        break;
      case "rightBtn":
        currentDirection = "right";
        break;
    }
  }

  if (currentDirection && currentDirection !== lastTouchDirection) {
    lastTouchDirection = currentDirection;
    switch (currentDirection) {
      case "up":
        setDirection(0, -box);
        break;
      case "down":
        setDirection(0, box);
        break;
      case "left":
        setDirection(-box, 0);
        break;
      case "right":
        setDirection(box, 0);
        break;
    }
  }
}

function setupTouchControls() {
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
    const controls = document.getElementById("touchControls");
    controls.classList.add("visible");

    controls.addEventListener(
      "touchstart",
      (event) => {
        event.preventDefault();
        isDraggingOnDPad = true;
        updateDirectionFromTouch(event);
      },
      { passive: false }
    );

    controls.addEventListener(
      "touchmove",
      (event) => {
        event.preventDefault();
        if (isDraggingOnDPad) {
          updateDirectionFromTouch(event);
        }
      },
      { passive: false }
    );

    window.addEventListener("touchend", (event) => {
      if (isDraggingOnDPad) {
        isDraggingOnDPad = false;
        lastTouchDirection = null;
      }
    });
  }
}

function setDirection(newDx, newDy) {
  const isGameActive = gameStarted && !isPaused && !gameOver;
  if (!isGameActive || changingDirection) return;

  const goingUp = dy === -box;
  const goingDown = dy === box;
  const goingRight = dx === box;
  const goingLeft = dx === -box;

  // Evita el giro de 180 grados
  if (
    (newDy === -box && goingDown) ||
    (newDy === box && goingUp) ||
    (newDx === -box && goingRight) ||
    (newDx === box && goingLeft)
  ) {
    return; // Movimiento inválido
  }

  changingDirection = true;
  dx = newDx;
  dy = newDy;
}

function changeDirection(event) {
  if (!gameStarted) {
    gameStarted = true;
    lastRenderTime = 0;
    window.requestAnimationFrame(gameLoop);
    return;
  }

  const keyPressed = event.key.toLowerCase();

  if (keyPressed === "escape") {
    if (!gameOver) isPaused = !isPaused;
    return;
  }

  // Traduce la tecla a una llamada a la función central
  if (keyPressed === "arrowup" || keyPressed === "w") setDirection(0, -box);
  else if (keyPressed === "arrowdown" || keyPressed === "s")
    setDirection(0, box);
  else if (keyPressed === "arrowleft" || keyPressed === "a")
    setDirection(-box, 0);
  else if (keyPressed === "arrowright" || keyPressed === "d")
    setDirection(box, 0);
}

function checkGameOver() {
  for (let i = 1; i < snake.length; i++) {
    if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) return true;
  }
  const hitLeftWall = snake[0].x < 0;
  const hitRightWall = snake[0].x >= canvas.width;
  const hitTopWall = snake[0].y < 0;
  const hitBottomWall = snake[0].y >= canvas.height;
  return hitLeftWall || hitRightWall || hitTopWall || hitBottomWall;
}

function updateScoreDisplay() {
  scoreElement.textContent = score;
}

function restartGame() {
  document.getElementById("restartButton").style.display = "none";
  gameOver = false;
  isPaused = false;
  const startPos = Math.floor(GRID_SIZE / 2);
  snake = [
    { x: startPos * box, y: startPos * box },
    { x: (startPos - 1) * box, y: startPos * box },
    { x: (startPos - 2) * box, y: startPos * box },
  ];
  dx = box;
  dy = 0;
  score = 0;
  updateScoreDisplay();
  snakeSpeed = 10;
  changingDirection = false;
  generateFood();
  updateHighScoreDisplay();

  lastRenderTime = 0;
  window.requestAnimationFrame(gameLoop);
}

function drawStartScreen() {
  // Fondo semitransparente
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Texto principal
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.font = `${Math.floor(box * 2.5)}px Arial`;
  ctx.fillText("SNAKE", canvas.width / 2, canvas.height / 2 - box);

  // Instrucción para el jugador
  ctx.font = `${Math.floor(box * 0.8)}px Arial`;
  ctx.fillText(
    "Presiona cualquier tecla para empezar",
    canvas.width / 2,
    canvas.height / 2 + box
  );

  // Reseteamos la alineación
  ctx.textAlign = "start";
}

function drawPauseScreen() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = `${Math.floor(box * 2)}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText("PAUSA", canvas.width / 2, canvas.height / 2);
  ctx.textAlign = "start";
}

function drawGameOverScreen() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.textAlign = "center";

  // --- LÓGICA DEL MENSAJE ESPECIAL ---
  if (newHighScore) {
    ctx.fillStyle = "#ffcc00"; // Color dorado para el nuevo récord
    ctx.font = `${Math.floor(box * 2)}px Arial`;
    ctx.fillText(
      "¡NUEVO RÉCORD!",
      canvas.width / 2,
      canvas.height / 2 - box * 3
    );
  } else {
    ctx.font = `${Math.floor(box * 2)}px Arial`;
    ctx.fillText(
      "¡Has perdido!",
      canvas.width / 2,
      canvas.height / 2 - box * 2
    );
  }

  // Mostramos la puntuación final
  ctx.fillStyle = "white";
  ctx.font = `${Math.floor(box)}px Arial`;
  ctx.fillText(
    `Puntuación final: ${score}`,
    canvas.width / 2,
    canvas.height / 2
  );

  ctx.textAlign = "start";
}

// --- INICIALIZACIÓN Y EVENT LISTENERS ---

document.addEventListener("keydown", changeDirection);
document
  .getElementById("restartButton")
  .addEventListener("click", setupAndResizeGame);
window.addEventListener("resize", setupAndResizeGame);

// Llamamos a la configuración de controles táctiles
setupTouchControls();

// Llamamos a la función de configuración principal
setupAndResizeGame();
