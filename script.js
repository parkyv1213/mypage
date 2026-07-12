(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const startBtn = document.getElementById("start-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const soundBtn = document.getElementById("sound-btn");
  const installBtn = document.getElementById("install-btn");
  const speedLabel = document.getElementById("speed-label");

  const GRID = 20;
  const CELL = canvas.width / GRID;
  const BEST_KEY = "neon-snake-best";
  const SOUND_KEY = "neon-snake-sound";

  const State = { READY: "ready", PLAYING: "playing", PAUSED: "paused", OVER: "over" };

  let snake, dir, nextDir, food, score, best, tickInterval, tickTimer, state, lastTickAt;
  let soundOn = localStorage.getItem(SOUND_KEY) !== "0";
  let audioCtx = null;

  function reset() {
    snake = [
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    tickInterval = 140;
    placeFood();
    updateScore();
    updateSpeed();
  }

  function placeFood() {
    while (true) {
      const f = {
        x: Math.floor(Math.random() * GRID),
        y: Math.floor(Math.random() * GRID),
      };
      if (!snake.some((s) => s.x === f.x && s.y === f.y)) {
        food = f;
        return;
      }
    }
  }

  function updateScore() {
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
    }
    bestEl.textContent = best;
  }

  function updateSpeed() {
    const level = Math.max(1, Math.min(9, Math.floor((140 - tickInterval) / 10) + 1));
    speedLabel.textContent = `SPEED ${level}`;
  }

  function setState(next) {
    state = next;
    if (state === State.READY) {
      overlay.classList.remove("hidden");
      overlayTitle.textContent = "PRESS START";
      overlayText.textContent = "화면을 스와이프하거나 D-Pad를 사용하세요";
      startBtn.textContent = "START";
      pauseBtn.disabled = true;
      pauseBtn.textContent = "PAUSE";
    } else if (state === State.PLAYING) {
      overlay.classList.add("hidden");
      pauseBtn.disabled = false;
      pauseBtn.textContent = "PAUSE";
    } else if (state === State.PAUSED) {
      overlay.classList.remove("hidden");
      overlayTitle.textContent = "PAUSED";
      overlayText.textContent = "계속하려면 RESUME";
      startBtn.textContent = "RESUME";
      pauseBtn.textContent = "RESUME";
    } else if (state === State.OVER) {
      overlay.classList.remove("hidden");
      overlayTitle.textContent = "GAME OVER";
      overlayText.textContent = `SCORE ${score}  ·  BEST ${best}`;
      startBtn.textContent = "RESTART";
      pauseBtn.disabled = true;
      pauseBtn.textContent = "PAUSE";
    }
  }

  function start() {
    if (state === State.PLAYING) return;
    if (state === State.OVER || state === State.READY) reset();
    setState(State.PLAYING);
    lastTickAt = performance.now();
    loop();
  }

  function pause() {
    if (state !== State.PLAYING) return;
    cancelAnimationFrame(tickTimer);
    setState(State.PAUSED);
  }

  function resume() {
    if (state !== State.PAUSED) return;
    setState(State.PLAYING);
    lastTickAt = performance.now();
    loop();
  }

  function gameOver() {
    cancelAnimationFrame(tickTimer);
    setState(State.OVER);
    vibrate([60, 40, 120]);
    beep(120, 0.18, "sawtooth");
    flash();
  }

  function loop() {
    tickTimer = requestAnimationFrame(loop);
    const now = performance.now();
    if (now - lastTickAt >= tickInterval) {
      lastTickAt = now;
      step();
    }
    draw();
  }

  function step() {
    if (nextDir.x !== -dir.x || nextDir.y !== -dir.y) dir = nextDir;

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
      return gameOver();
    }
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      return gameOver();
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 1;
      if (score % 5 === 0 && tickInterval > 60) tickInterval -= 8;
      updateScore();
      updateSpeed();
      placeFood();
      vibrate(20);
      beep(880 + Math.min(score, 20) * 12, 0.06, "triangle");
    } else {
      snake.pop();
    }
  }

  function draw() {
    ctx.fillStyle = "#0c0c20";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(canvas.width, i * CELL);
      ctx.stroke();
    }

    drawFood();
    drawSnake();
  }

  function drawFood() {
    const cx = food.x * CELL + CELL / 2;
    const cy = food.y * CELL + CELL / 2;
    const pulse = (Math.sin(performance.now() / 200) + 1) / 2;
    const r = CELL / 2.6 + pulse * 1.6;

    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, CELL);
    grad.addColorStop(0, "#ffd400");
    grad.addColorStop(0.5, "#ff2bd6");
    grad.addColorStop(1, "rgba(255, 43, 214, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd400";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSnake() {
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const x = seg.x * CELL;
      const y = seg.y * CELL;
      const t = i / Math.max(1, snake.length - 1);
      const isHead = i === 0;

      ctx.fillStyle = isHead ? "#00ffd5" : `rgba(0, 255, 213, ${0.85 - t * 0.5})`;
      ctx.shadowColor = "rgba(0, 255, 213, 0.6)";
      ctx.shadowBlur = isHead ? 16 : 8;
      roundRect(x + 1, y + 1, CELL - 2, CELL - 2, 4);
      ctx.fill();

      if (isHead) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#0a0a14";
        const eyeOffset = CELL / 4;
        const ex = x + CELL / 2 + dir.x * eyeOffset;
        const ey = y + CELL / 2 + dir.y * eyeOffset;
        ctx.beginPath();
        ctx.arc(ex - 3, ey - 3, 1.6, 0, Math.PI * 2);
        ctx.arc(ex + 3, ey + 3, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function flash() {
    canvas.animate(
      [
        { filter: "brightness(2.4) hue-rotate(-30deg)" },
        { filter: "brightness(1) hue-rotate(0)" },
      ],
      { duration: 280, easing: "ease-out" }
    );
  }

  function vibrate(pattern) {
    if (!navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (_) {}
  }

  function ensureAudio() {
    if (audioCtx) return audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  }

  function beep(freq, dur, type = "sine") {
    if (!soundOn) return;
    const ac = ensureAudio();
    if (!ac) return;
    if (ac.state === "suspended") ac.resume();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ac.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur + 0.02);
  }

  function setSound(on) {
    soundOn = on;
    localStorage.setItem(SOUND_KEY, on ? "1" : "0");
    soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
    soundBtn.textContent = on ? "🔊" : "🔇";
  }

  const KEY_DIRS = {
    ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
    a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
  };

  function setDir(d) {
    if (!d) return;
    if (state !== State.PLAYING) return;
    if (d.x === -dir.x && d.y === -dir.y) return;
    nextDir = d;
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === " ") {
      e.preventDefault();
      if (state === State.PLAYING) pause();
      else if (state === State.PAUSED) resume();
      else if (state === State.READY || state === State.OVER) start();
      return;
    }
    const d = KEY_DIRS[e.key];
    if (d) { e.preventDefault(); setDir(d); }
  });

  const DIR_MAP = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
  };

  document.querySelectorAll(".pad").forEach((btn) => {
    const trigger = (e) => {
      e.preventDefault();
      ensureAudio();
      setDir(DIR_MAP[btn.dataset.dir]);
      btn.classList.add("pressed");
      vibrate(10);
      setTimeout(() => btn.classList.remove("pressed"), 90);
    };
    btn.addEventListener("touchstart", trigger, { passive: false });
    btn.addEventListener("mousedown", trigger);
  });

  let touchStart = null;
  const swipeTarget = document.querySelector(".stage");
  swipeTarget.addEventListener(
    "touchstart",
    (e) => {
      ensureAudio();
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY, t: performance.now() };
    },
    { passive: true }
  );
  swipeTarget.addEventListener(
    "touchmove",
    (e) => {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (ax < 18 && ay < 18) return;
      if (ax > ay) setDir({ x: Math.sign(dx), y: 0 });
      else setDir({ x: 0, y: Math.sign(dy) });
      touchStart = { x: t.clientX, y: t.clientY, t: performance.now() };
    },
    { passive: true }
  );
  swipeTarget.addEventListener(
    "touchend",
    () => { touchStart = null; },
    { passive: true }
  );

  swipeTarget.addEventListener("dblclick", (e) => {
    e.preventDefault();
    if (state === State.PLAYING) pause();
    else if (state === State.PAUSED) resume();
  });

  startBtn.addEventListener("click", () => {
    ensureAudio();
    if (state === State.PAUSED) resume();
    else start();
  });

  pauseBtn.addEventListener("click", () => {
    if (state === State.PLAYING) pause();
    else if (state === State.PAUSED) resume();
  });

  soundBtn.addEventListener("click", () => {
    setSound(!soundOn);
    if (soundOn) beep(660, 0.08, "triangle");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === State.PLAYING) pause();
  });

  let deferredInstall = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstall = e;
    installBtn.hidden = false;
  });
  installBtn.addEventListener("click", async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    installBtn.hidden = true;
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  best = Number(localStorage.getItem(BEST_KEY) || 0);
  setSound(soundOn);
  reset();
  setState(State.READY);
  draw();
})();
