const CATEGORIES_IT = {
  antipasti: "Antipasti",
  primi: "Primi",
  secondi: "Secondi",
  contorni: "Contorni",
  dolci: "Dolci",
};

const CATEGORIES_JP = {
  antipasti: "Antipasti",
  noodles: "Noodles",
  riso: "Riso",
  piatti: "Piatti",
  zuppe: "Zuppe",
  sushi: "Sushi",
};

const DIFFICULTY_LABEL = {
  facile: "Facile",
  media: "Media",
  difficile: "Difficile",
};

const BOUNDS = { cx: 50, cy: 50, rx: 44, ry: 40 };
const MAX_SPEED = 0.14;
const MIN_SPEED = 0.04;

const STAGES = {
  japanese: {
    dataFile: "data/recipes-japanese.json",
    floatsId: "broth-floats-japanese",
    sectionId: "section-japanese",
    containerSelector: "#donburi-japanese",
    categories: CATEGORIES_JP,
    backLabel: "← Torna al donburi",
  },
  italian: {
    dataFile: "data/recipes-italian.json",
    floatsId: "plate-floats-italian",
    sectionId: "section-italian",
    containerSelector: "#plate-italian",
    categories: CATEGORIES_IT,
    backLabel: "← Torna al piatto",
  },
};

const stages = {};
let activeStageId = null;
let activeRecipeIndex = null;

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

function createFloaterElement(recipe, index, stage) {
  const img = recipeImage(recipe);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "float-card";
  btn.dataset.index = index;
  btn.setAttribute("aria-label", recipe.title);
  btn.setAttribute("role", "listitem");

  const categories = stage.config.categories;

  btn.innerHTML = `
    <div class="float-card-img-wrap">
      <img class="float-card-img" src="${escapeHtml(img)}" alt="${escapeHtml(recipe.title)}" loading="lazy" decoding="async">
    </div>
    <div class="float-card-overlay">
      <span class="float-card-emoji">${recipe.emoji || "🍽️"}</span>
      <span class="float-card-title">${escapeHtml(recipe.title)}</span>
      <span class="float-card-category">${escapeHtml(categories[recipe.category] || recipe.category)}</span>
    </div>`;

  const imgEl = btn.querySelector(".float-card-img");
  if (recipe.video?.type === "youtube" && recipe.video.id) {
    imgEl.addEventListener("error", () => {
      imgEl.src = `https://img.youtube.com/vi/${recipe.video.id}/hqdefault.jpg`;
    });
  }

  btn.addEventListener("click", () => openRecipe(stage.id, index));
  btn.addEventListener("mouseenter", () => {
    stage.brothPaused = true;
    btn.style.zIndex = "20";
  });
  btn.addEventListener("mouseleave", () => {
    if ($("#recipe-stage").classList.contains("hidden")) stage.brothPaused = false;
    btn.style.zIndex = "";
  });

  return btn;
}

function spawnPosition(index) {
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

function renderFloaters(stage) {
  const container = document.getElementById(stage.config.floatsId);
  container.innerHTML = "";
  stage.floaters = [];

  stage.recipes.forEach((recipe, i) => {
    const el = createFloaterElement(recipe, i, stage);
    container.appendChild(el);
    const pos = spawnPosition(i);
    const vel = randomVelocity();

    stage.floaters.push({
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
}

function updateFloaters(stage) {
  if (stage.brothPaused) return;

  stage.floaters.forEach((f) => {
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

function animateAllFloaters() {
  Object.values(stages).forEach((stage) => updateFloaters(stage));
  requestAnimationFrame(animateAllFloaters);
}

function startFloating() {
  if (!window._floatingStarted) {
    window._floatingStarted = true;
    requestAnimationFrame(animateAllFloaters);
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

function renderDetail(recipe, stage) {
  const thumb = recipeImage(recipe);
  const thumbEl = $("#detail-thumb");
  if (thumb) {
    thumbEl.style.backgroundImage = `url("${thumb}")`;
    thumbEl.classList.remove("hidden");
  } else {
    thumbEl.style.backgroundImage = "";
    thumbEl.classList.add("hidden");
  }

  const categories = stage.config.categories;
  $("#detail-category").textContent = categories[recipe.category] || recipe.category;
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

function openRecipe(stageId, index) {
  const stage = stages[stageId];
  const recipe = stage?.recipes[index];
  if (!recipe) return;

  activeStageId = stageId;
  activeRecipeIndex = index;

  Object.values(stages).forEach((s) => {
    s.brothPaused = true;
  });

  renderVideo(recipe);
  renderDetail(recipe, stage);

  $("#btn-back").textContent = stage.config.backLabel;
  $("#recipe-stage").classList.remove("hidden");

  Object.values(stages).forEach((s) => {
    document.getElementById(s.config.sectionId).classList.add("hidden");
  });

  document.getElementById("recipe-stage").scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeRecipe() {
  $("#recipe-stage").classList.add("hidden");

  Object.values(stages).forEach((s) => {
    document.getElementById(s.config.sectionId).classList.remove("hidden");
    s.brothPaused = false;
  });

  const frame = $("#video-frame");
  frame.innerHTML = `<p class="video-placeholder">Seleziona una ricetta</p>`;
  $("#video-caption").textContent = "";

  activeStageId = null;
  activeRecipeIndex = null;
}

async function loadStage(stageId) {
  const config = STAGES[stageId];
  const stage = {
    id: stageId,
    config,
    recipes: [],
    floaters: [],
    brothPaused: false,
  };

  try {
    const res = await fetch(config.dataFile);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    stage.recipes = data.recipes || [];
    stages[stageId] = stage;
    renderFloaters(stage);
  } catch (err) {
    console.error(`Impossibile caricare le ricette (${stageId}):`, err);
    const container = document.getElementById(config.floatsId);
    container.innerHTML =
      `<p style="color:#c4a8a0;text-align:center;padding:2rem">Errore nel caricamento delle ricette.</p>`;
  }
}

function init() {
  $("#year").textContent = new Date().getFullYear();
  $("#btn-back").addEventListener("click", closeRecipe);

  Object.entries(STAGES).forEach(([id, config]) => {
    const container = document.querySelector(config.containerSelector);
    if (container) {
      container.addEventListener("mouseenter", () => {
        if (stages[id]) stages[id].brothPaused = true;
      });
      container.addEventListener("mouseleave", () => {
        if (stages[id] && $("#recipe-stage").classList.contains("hidden")) {
          stages[id].brothPaused = false;
        }
      });
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!$("#recipe-stage").classList.contains("hidden") && e.key === "Escape") {
      closeRecipe();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && $("#recipe-stage").classList.contains("hidden")) {
      startFloating();
    }
  });

  Promise.all(Object.keys(STAGES).map(loadStage)).then(() => {
    startFloating();
  });
}

init();
