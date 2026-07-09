const CATEGORIES = {
  antipasti: "Antipasti",
  primi: "Primi",
  secondi: "Secondi",
  contorni: "Contorni",
  dolci: "Dolci",
};

const DIFFICULTY_LABEL = {
  facile: "Facile",
  media: "Media",
  difficile: "Difficile",
};

const BOUNDS = { cx: 50, cy: 50, rx: 44, ry: 40 };
const MAX_SPEED = 0.14;
const MIN_SPEED = 0.04;

let recipes = [];
let floaters = [];
let animationId = null;
let brothPaused = false;

const $ = (sel) => document.querySelector(sel);

function recipeImage(recipe) {
  if (recipe.image) return recipe.image;
  if (recipe.video?.type === "youtube" && recipe.video.id) {
    return `https://img.youtube.com/vi/${recipe.video.id}/hqdefault.jpg`;
  }
  return "";
}

function totalMinutes(recipe) {
  return (recipe.prepMinutes || 0) + (recipe.cookMinutes || 0);
}

function formatTime(minutes) {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function randomVelocity() {
  const angle = Math.random() * Math.PI * 2;
  const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

function createFloaterElement(recipe, index) {
  const img = recipeImage(recipe);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "float-card";
  btn.dataset.index = index;
  btn.setAttribute("aria-label", recipe.title);
  btn.setAttribute("role", "listitem");

  btn.innerHTML = `
    <div class="float-card-img-wrap">
      <img class="float-card-img" src="${escapeHtml(img)}" alt="${escapeHtml(recipe.title)}" loading="lazy" decoding="async">
    </div>
    <div class="float-card-overlay">
      <span class="float-card-emoji">${recipe.emoji || "🍽️"}</span>
      <span class="float-card-title">${escapeHtml(recipe.title)}</span>
      <span class="float-card-category">${escapeHtml(CATEGORIES[recipe.category] || recipe.category)}</span>
    </div>`;

  const imgEl = btn.querySelector(".float-card-img");
  if (recipe.video?.type === "youtube" && recipe.video.id) {
    imgEl.addEventListener("error", () => {
      imgEl.src = `https://img.youtube.com/vi/${recipe.video.id}/hqdefault.jpg`;
    });
  }

  btn.addEventListener("click", () => openRecipe(index));
  btn.addEventListener("mouseenter", () => {
    brothPaused = true;
    btn.style.zIndex = "20";
  });
  btn.addEventListener("mouseleave", () => {
    if ($("#recipe-stage").classList.contains("hidden")) brothPaused = false;
    btn.style.zIndex = "";
  });

  return btn;
}

function spawnPosition(index, total) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const angle = index * golden + (Math.random() - 0.5) * 0.5;
  const dist = 0.3 + ((index % 4) + 1) * 0.14 + Math.random() * 0.1;
  return {
    x: BOUNDS.cx + Math.cos(angle) * BOUNDS.rx * dist,
    y: BOUNDS.cy + Math.sin(angle) * BOUNDS.ry * dist,
  };
}

function isInsideBounds(x, y) {
  const dx = (x - BOUNDS.cx) / BOUNDS.rx;
  const dy = (y - BOUNDS.cy) / BOUNDS.ry;
  return dx * dx + dy * dy <= 1;
}

function bounceOffEdge(floater) {
  const dx = (floater.x - BOUNDS.cx) / BOUNDS.rx;
  const dy = (floater.y - BOUNDS.cy) / BOUNDS.ry;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  const dot = floater.vx * nx + floater.vy * ny;

  floater.vx = (floater.vx - 2 * dot * nx) * 0.85;
  floater.vy = (floater.vy - 2 * dot * ny) * 0.85;

  floater.x = BOUNDS.cx + nx * BOUNDS.rx * 0.92;
  floater.y = BOUNDS.cy + ny * BOUNDS.ry * 0.92;
}

function clampSpeed(floater) {
  const speed = Math.hypot(floater.vx, floater.vy);
  if (speed < MIN_SPEED) {
    const boost = randomVelocity();
    floater.vx = boost.vx;
    floater.vy = boost.vy;
  } else if (speed > MAX_SPEED) {
    floater.vx = (floater.vx / speed) * MAX_SPEED;
    floater.vy = (floater.vy / speed) * MAX_SPEED;
  }
}

function renderFloaters() {
  const container = $("#broth-floats");
  container.innerHTML = "";
  floaters = [];

  recipes.forEach((recipe, i) => {
    const el = createFloaterElement(recipe, i);
    container.appendChild(el);
    const pos = spawnPosition(i, recipes.length);
    const vel = randomVelocity();

    floaters.push({
      el,
      x: pos.x,
      y: pos.y,
      vx: vel.vx,
      vy: vel.vy,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.03,
      index: i,
    });
  });

  startFloating();
}

function updateFloaters() {
  if (brothPaused) return;

  floaters.forEach((f) => {
    f.x += f.vx;
    f.y += f.vy;

    if (!isInsideBounds(f.x, f.y)) {
      bounceOffEdge(f);
    }

    if (Math.random() < 0.018) {
      f.vx += (Math.random() - 0.5) * 0.06;
      f.vy += (Math.random() - 0.5) * 0.06;
    }

    clampSpeed(f);

    f.wobble += f.wobbleSpeed;
    const wobbleX = Math.sin(f.wobble) * 0.15;
    const wobbleY = Math.cos(f.wobble * 0.7) * 0.12;
    const tilt = Math.sin(f.wobble * 0.5) * 4;

    f.el.style.left = `${f.x + wobbleX}%`;
    f.el.style.top = `${f.y + wobbleY}%`;
    f.el.style.transform = `translate(-50%, -50%) rotate(${tilt}deg)`;
  });
}

function animateFloaters() {
  updateFloaters();
  animationId = requestAnimationFrame(animateFloaters);
}

function startFloating() {
  if (animationId) cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(animateFloaters);
}

function stopFloating() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function buildVideoElement(recipe) {
  const video = recipe.video;
  if (!video) return null;

  if (video.type === "youtube" && video.id) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1`;
    iframe.title = `Video: ${recipe.title}`;
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    return iframe;
  }

  if (video.type === "mp4" && video.src) {
    const el = document.createElement("video");
    el.src = video.src;
    el.controls = true;
    el.playsInline = true;
    el.poster = video.poster || recipeImage(recipe);
    el.setAttribute("aria-label", `Video: ${recipe.title}`);
    return el;
  }

  return null;
}

function renderVideo(recipe) {
  const frame = $("#video-frame");
  const caption = $("#video-caption");
  frame.innerHTML = "";

  const media = buildVideoElement(recipe);
  if (media) {
    frame.appendChild(media);
    caption.textContent = recipe.video.caption || `Video tutorial — ${recipe.title}`;
  } else {
    frame.innerHTML = `<p class="video-placeholder">Video in arrivo per questa ricetta</p>`;
    caption.textContent = "";
  }
}

function renderDetail(recipe) {
  const thumb = recipeImage(recipe);
  const thumbEl = $("#detail-thumb");
  if (thumb) {
    thumbEl.style.backgroundImage = `url("${thumb}")`;
    thumbEl.classList.remove("hidden");
  } else {
    thumbEl.style.backgroundImage = "";
    thumbEl.classList.add("hidden");
  }

  $("#detail-category").textContent = CATEGORIES[recipe.category] || recipe.category;
  $("#detail-title").textContent = recipe.title;
  $("#detail-description").textContent = recipe.description || "";

  $("#detail-meta").innerHTML = `
    <span>⏱ Totale: ${formatTime(totalMinutes(recipe))}</span>
    <span>🔪 Prep: ${formatTime(recipe.prepMinutes)}</span>
    <span>🔥 Cottura: ${formatTime(recipe.cookMinutes)}</span>
    <span>👥 ${recipe.servings} porzioni</span>
    <span>📊 ${DIFFICULTY_LABEL[recipe.difficulty] || recipe.difficulty}</span>
  `;

  $("#detail-tags").innerHTML = (recipe.tags || [])
    .map((t) => `<span>#${escapeHtml(t)}</span>`)
    .join("");

  $("#detail-ingredients").innerHTML = (recipe.ingredients || [])
    .map((i) => `<li>${escapeHtml(i)}</li>`)
    .join("");

  $("#detail-steps").innerHTML = (recipe.steps || [])
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("");
}

function openRecipe(index) {
  const recipe = recipes[index];
  if (!recipe) return;

  brothPaused = true;
  renderVideo(recipe);
  renderDetail(recipe);

  $("#recipe-stage").classList.remove("hidden");
  $("#donburi").closest(".donburi-wrap").classList.add("hidden");

  document.getElementById("recipe-stage").scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeRecipe() {
  $("#recipe-stage").classList.add("hidden");
  $("#donburi").closest(".donburi-wrap").classList.remove("hidden");

  const frame = $("#video-frame");
  frame.innerHTML = `<p class="video-placeholder">Seleziona una ricetta dalla bowl</p>`;
  $("#video-caption").textContent = "";

  brothPaused = false;
}

async function loadRecipes() {
  try {
    const res = await fetch("data/recipes.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recipes = data.recipes || [];
    renderFloaters();
  } catch (err) {
    console.error("Impossibile caricare le ricette:", err);
    $("#broth-floats").innerHTML =
      `<p style="color:#c4a8a0;text-align:center;padding:2rem">Errore nel caricamento delle ricette.</p>`;
  }
}

function init() {
  $("#year").textContent = new Date().getFullYear();
  $("#btn-back").addEventListener("click", closeRecipe);

  $("#donburi").addEventListener("mouseenter", () => {
    brothPaused = true;
  });

  $("#donburi").addEventListener("mouseleave", () => {
    if ($("#recipe-stage").classList.contains("hidden")) brothPaused = false;
  });

  document.addEventListener("keydown", (e) => {
    if (!$("#recipe-stage").classList.contains("hidden") && e.key === "Escape") {
      closeRecipe();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopFloating();
    } else if (recipes.length && $("#recipe-stage").classList.contains("hidden")) {
      startFloating();
    }
  });

  loadRecipes();
}

init();
