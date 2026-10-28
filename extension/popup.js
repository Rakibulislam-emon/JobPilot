// JobDesk Capture — popup logic

const $ = (id) => document.getElementById(id);

const STATUSES = [
  ["saved", "Saved"],
  ["applied", "Applied"],
  ["oa", "OA / Assessment"],
  ["interview", "Interview"],
  ["offer", "Offer"],
  ["rejected", "Rejected"],
  ["ghosted", "Ghosted"],
  ["withdrawn", "Withdrawn"],
];

const SOURCES = [
  ["", "Not set"],
  ["bdjobs", "BDJobs"],
  ["linkedin", "LinkedIn"],
  ["facebook", "Facebook"],
  ["email", "Email"],
  ["referral", "Referral"],
  ["other", "Other"],
];

const state = {
  serverUrl: "",
  token: "",
  tabId: null,
  info: null,
  shot: null,
  draft: null,
  engine: "",
  warning: "",
  saving: false,
};

function view(name) {
  for (const v of ["loading", "setup", "form", "done", "error"]) {
    const el = $(`view-${v}`);
    if (el) el.hidden = v !== name;
  }
}

function populateSelects() {
  const status = $("f-status");
  status.innerHTML = "";
  for (const [value, label] of STATUSES) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    status.appendChild(opt);
  }
  status.value = "saved";

  const source = $("f-source");
  source.innerHTML = "";
  for (const [value, label] of SOURCES) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    source.appendChild(opt);
  }
}

async function init() {
  populateSelects();

  const cfg = await chrome.storage.sync.get(["serverUrl", "token"]);
  if (!cfg.serverUrl || !cfg.token) {
    view("setup");
    return;
  }

  state.serverUrl = cfg.serverUrl.replace(/\/+$/, "");
  state.token = cfg.token;

  const params = new URLSearchParams(location.search);
  const tabIdParam = params.get("tabId");

  try {
    if (tabIdParam) {
      state.tabId = Number(tabIdParam);
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      state.tabId = tab && tab.id ? tab.id : null;
    }
  } catch {
    state.tabId = null;
  }

  if (!state.tabId) {
    fail("No active tab found. Open a job post first.");
    return;
  }

  $("loading-text").textContent = "Reading this page…";

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: state.tabId },
      func: pageScraper,
    });
    state.info = result && result.result ? result.result : null;
  } catch {
    state.info = null;
  }

  $("loading-text").textContent = "Taking a screenshot…";
  state.shot = await captureTab(state.tabId);

  if (state.shot) {
    $("shot").src = state.shot;
    $("shot").hidden = false;
  }

  // Prefill what we already know before the AI call returns.
  if (state.info) {
    $("f-title").value = cleanTitle(state.info.title || "");
  }
  if (state.info && state.info.url) {
    const guess = guessSource(state.info.url);
    if (guess) $("f-source").value = guess;
  }

  view("form");
  $("engine").textContent = "analyzing";
  await runParse();
}

async function runParse() {
  const body = {
    url: state.info ? state.info.url : "",
    title: state.info ? state.info.title : "",
    text: state.info ? state.info.text : "",
  };
  if (state.shot) body.image = state.shot;

  if (!body.text && !body.image && !body.url) {
    $("engine").textContent = "manual";
    setNotice("Nothing could be read from this page. Fill the fields manually.", "warn");
    return;
  }

  try {
    const res = await fetch(`${state.serverUrl}/api/parse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

    state.draft = json.draft;
    state.engine = json.engine;
    state.warning = json.warning || "";

    applyDraft(json.draft);
    $("engine").textContent = engineLabel(json.engine);

    if (json.warning) {
      setNotice(json.warning, "warn");
    } else {
      const low = countLow(json.draft.confidence);
      if (low > 0) {
        setNotice(
          `${low} field${low > 1 ? "s" : ""} may be inaccurate (amber). Double-check before saving.`,
          "warn"
        );
      }
    }
  } catch (err) {
    $("engine").textContent = "manual";
    setNotice(
      `AI parsing failed: ${err.message}. You can still fill the fields manually.`,
      "err"
    );
  }
}

function applyDraft(draft) {
  setVal("f-title", draft.title);
  setVal("f-company", draft.company);
  setVal("f-location", draft.location);
  setVal("f-salary", draft.salary);
  setVal("f-deadline", draft.deadline);
  if (draft.source) $("f-source").value = draft.source;

  const conf = draft.confidence || {};
  mark("f-title", conf.title);
  mark("f-company", conf.company);
  mark("f-location", conf.location);
  mark("f-salary", conf.salary);
  mark("f-deadline", conf.deadline);
}

function setVal(id, value) {
  const el = $(id);
  if (!el || !value) return;
  if (el.value && el.value.trim()) return;
  el.value = value;
}

function mark(id, confidence) {
  const el = $(id);
  if (!el || typeof confidence !== "number") return;
  el.classList.toggle("low", confidence < 0.5);
}

function countLow(conf) {
  if (!conf) return 0;
  return Object.values(conf).filter((v) => typeof v === "number" && v < 0.5).length;
}

function setNotice(text, kind) {
  const el = $("notice");
  el.textContent = text;
  el.className = `notice ${kind || ""}`.trim();
  el.hidden = false;
}

async function save() {
  if (state.saving) return;
  state.saving = true;
  $("btn-save").disabled = true;
  $("btn-save").textContent = "Saving…";

  const payload = {
    title: $("f-title").value.trim(),
    company: $("f-company").value.trim(),
    location: $("f-location").value.trim(),
    salary: $("f-salary").value.trim(),
    deadline: $("f-deadline").value || "",
    status: $("f-status").value,
    source: $("f-source").value,
    url: state.info ? state.info.url : "",
    description: state.draft ? state.draft.description : "",
    contacts: state.draft && Array.isArray(state.draft.contacts) ? state.draft.contacts : [],
    image: state.shot || undefined,
    ai_meta: {
      engine: state.engine,
      confidence: state.draft ? state.draft.confidence : {},
      via: "extension",
    },
  };

  if (!payload.title && !payload.company) {
    state.saving = false;
    $("btn-save").disabled = false;
    $("btn-save").textContent = "Save to JobDesk";
    setNotice("A role title or a company name is required.", "err");
    return;
  }

  try {
    const res = await fetch(`${state.serverUrl}/api/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

    if (json.duplicate) {
      showDone(
        "Already tracked",
        "This URL is already in your JobDesk — opening the existing entry.",
        `${state.serverUrl}/jobs/${json.job.id}`
      );
      return;
    }

    showDone(
      "Saved to JobDesk",
      `${payload.company || payload.title} was added to your pipeline.`,
      `${state.serverUrl}${json.url}`
    );
  } catch (err) {
    state.saving = false;
    $("btn-save").disabled = false;
    $("btn-save").textContent = "Save to JobDesk";
    setNotice(`Save failed: ${err.message}`, "err");
  }
}

function showDone(title, body, url) {
  $("done-title").textContent = title;
  $("done-body").textContent = body;
  $("done-link").href = url;
  view("done");
  setTimeout(() => window.close(), 4200);
}

function fail(message) {
  $("error-text").textContent = message;
  view("error");
}

// ── page helpers ────────────────────────────────────────────

function pageScraper() {
  const meta = (name) => {
    const el = document.querySelector(
      `meta[property="${name}"], meta[name="${name}"]`
    );
    return el ? el.getAttribute("content") || "" : "";
  };
  const body = document.body ? document.body.innerText || "" : "";
  return {
    url: location.href,
    title: meta("og:title") || document.title || "",
    description: meta("og:description") || meta("description") || "",
    image: meta("og:image") || meta("og:image:secure_url") || "",
    text: body.replace(/\n{3,}/g, "\n\n").slice(0, 12000),
  };
}

async function captureTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png",
    });
    return await shrink(dataUrl, 1400, 0.72);
  } catch {
    return null;
  }
}

function shrink(dataUrl, maxWidth, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const webp = canvas.toDataURL("image/webp", quality);
      resolve(webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function cleanTitle(title) {
  return (title || "")
    .replace(/\s*[|\-–—]\s*(bdjobs\.com|linkedin|facebook|job circular)\s*$/i, "")
    .trim()
    .slice(0, 160);
}

function guessSource(url) {
  const u = url.toLowerCase();
  if (u.includes("bdjobs")) return "bdjobs";
  if (u.includes("linkedin")) return "linkedin";
  if (u.includes("facebook") || u.includes("fb.com")) return "facebook";
  return "";
}

function engineLabel(engine) {
  const [provider, mode] = String(engine || "").split(":");
  if (provider === "heuristic") return "offline";
  const names = { gemini: "gemini", openrouter: "openrouter", groq: "groq" };
  const name = names[provider] || provider;
  return mode === "vision" ? `${name} vision` : `${name} text`;
}

// ── wiring ──────────────────────────────────────────────────

$("open-options").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("btn-save").addEventListener("click", save);
$("btn-open").addEventListener("click", () =>
  chrome.tabs.create({ url: `${state.serverUrl}/jobs` })
);
$("btn-open2").addEventListener("click", () =>
  chrome.tabs.create({ url: `${state.serverUrl}/jobs` })
);
$("btn-retry").addEventListener("click", () => location.reload());
$("btn-again").addEventListener("click", () => location.reload());

init();
