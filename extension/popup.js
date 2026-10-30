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
  captureMode: "manual",
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
  const captureMode = params.get("capture");
  let areaCaptureError = "";

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

  if (captureMode === "area") {
    const { pendingAreaCapture } = await chrome.storage.local.get("pendingAreaCapture");
    await chrome.storage.local.remove("pendingAreaCapture");
    if (pendingAreaCapture && pendingAreaCapture.tabId === state.tabId) {
      state.info = pendingAreaCapture.info;
      try {
        state.shot = await cropSelectedArea(
          pendingAreaCapture.screenshot,
          pendingAreaCapture.selection,
          pendingAreaCapture.viewport
        );
      } catch (error) {
        areaCaptureError = `Could not crop the selected area: ${error.message}`;
      }
    } else {
      areaCaptureError = "The selected area image was not found. Please select the area again.";
    }
  } else {
    $("loading-text").textContent = "Preparing capture options…";
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: state.tabId },
        func: pageScraper,
      });
      state.info = result && result.result ? result.result : null;
    } catch {
      state.info = null;
    }
  }

  // Only prefill source metadata; post text is always entered by the user.
  if (state.info && state.info.url) {
    const guess = guessSource(state.info.url);
    if (guess) $("f-source").value = guess;
  }

  $("f-post-text").value = "";
  view("form");
  $("engine").textContent = state.shot ? "area selected" : "choose input";
  if (state.shot) {
    $("shot").src = state.shot;
    $("shot").hidden = false;
    setNotice("Selected image ready. Click Extract fields, paste text, or use both together.", "");
  } else if (areaCaptureError) {
    setNotice(areaCaptureError, "err");
  } else if (!state.info?.text) {
    setNotice("Select an area on the page or paste the job post text to continue.", "warn");
  }
}

async function runParse() {
  const postText = $("f-post-text").value.trim();
  const body = {
    url: state.info ? state.info.url : "",
    title: state.info ? state.info.title : "",
    text: postText,
  };
  if (state.shot) body.image = state.shot;

  if (!body.text && !body.image) {
    $("engine").textContent = "manual";
    setNotice("Select an area or paste the job post text before extracting.", "warn");
    return;
  }

  $("engine").textContent = "analyzing";
  setNotice("Extracting job details…", "");
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
    if (json.warning) setNotice(json.warning, "warn");
    else if (countLow(json.draft.confidence) > 0) {
      const low = countLow(json.draft.confidence);
      setNotice(`${low} field${low > 1 ? "s" : ""} may be inaccurate (amber). Double-check before saving.`, "warn");
    } else setNotice("Fields extracted. Review them before saving.", "");
  } catch (error) {
    $("engine").textContent = "manual";
    setNotice(`AI parsing failed: ${error.message}. You can still fill the fields manually.`, "err");
  }
}

async function startAreaCapture() {
  if (!state.tabId || !state.info) {
    setNotice("Area selection is unavailable on this page. Paste the post text instead.", "warn");
    return;
  }
  $("btn-select-area").disabled = true;
  $("btn-select-area").textContent = "Starting…";
  try {
    const tab = await chrome.tabs.get(state.tabId);
    const rawScreenshot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    const screenshot = await shrink(rawScreenshot, 2000, 0.9);
    await chrome.storage.local.set({
      pendingAreaCapture: { tabId: state.tabId, info: state.info, screenshot, createdAt: Date.now() },
    });
    await chrome.scripting.executeScript({
      target: { tabId: state.tabId },
      func: startPageAreaSelection,
      args: [state.tabId],
    });
    window.close();
  } catch (error) {
    await chrome.storage.local.remove("pendingAreaCapture");
    $("btn-select-area").disabled = false;
    $("btn-select-area").textContent = "Select area on page";
    setNotice(`Could not start area selection: ${error.message}. Paste the post text instead.`, "err");
  }
}

function startPageAreaSelection(tabId) {
  const previousOverflow = document.documentElement.style.overflow;
  const overlay = document.createElement("div");
  overlay.id = "jobdesk-area-selector";
  overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;cursor:crosshair;touch-action:none;user-select:none;background:rgba(0,0,0,.18);";
  const hint = document.createElement("div");
  hint.textContent = "Drag to select the job post · Esc to cancel";
  hint.style.cssText = "position:fixed;top:16px;left:50%;transform:translateX(-50%);padding:10px 14px;border:1px solid #14b8a6;border-radius:8px;background:#07110f;color:#e8edf2;font:600 13px/1.3 system-ui,sans-serif;box-shadow:0 4px 24px #0008;white-space:nowrap;pointer-events:none;";
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;border:2px solid #14b8a6;background:rgba(20,184,166,.12);display:none;pointer-events:none;";
  overlay.append(hint, box);
  document.documentElement.appendChild(overlay);
  document.documentElement.style.overflow = "hidden";

  let start = null;
  const cleanup = () => {
    document.documentElement.style.overflow = previousOverflow;
    overlay.remove();
    document.removeEventListener("keydown", onKey, true);
  };
  const onKey = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    cleanup();
    chrome.runtime.sendMessage({ type: "jobdesk-area-cancelled", tabId }).catch(() => {});
  };
  document.addEventListener("keydown", onKey, true);
  overlay.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    start = { x: event.clientX, y: event.clientY };
    box.style.display = "block";
    box.style.left = `${start.x}px`;
    box.style.top = `${start.y}px`;
    box.style.width = "0";
    box.style.height = "0";
    overlay.setPointerCapture(event.pointerId);
  });
  overlay.addEventListener("pointermove", (event) => {
    if (!start) return;
    box.style.left = `${Math.min(start.x, event.clientX)}px`;
    box.style.top = `${Math.min(start.y, event.clientY)}px`;
    box.style.width = `${Math.abs(event.clientX - start.x)}px`;
    box.style.height = `${Math.abs(event.clientY - start.y)}px`;
  });
  overlay.addEventListener("pointerup", (event) => {
    if (!start) return;
    const selection = {
      x: Math.min(start.x, event.clientX),
      y: Math.min(start.y, event.clientY),
      width: Math.abs(event.clientX - start.x),
      height: Math.abs(event.clientY - start.y),
    };
    start = null;
    if (selection.width < 24 || selection.height < 24) return;
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    cleanup();
    chrome.runtime.sendMessage({
      type: "jobdesk-area-selected",
      tabId,
      selection,
      viewport,
    }).then((response) => {
      if (!response?.ok) console.error("JobDesk could not reopen after area selection");
    }).catch((error) => console.error("JobDesk area selection failed", error));
  });
}

async function cropSelectedArea(dataUrl, selection, viewport) {
  if (!dataUrl || !selection || !viewport?.width || !viewport?.height) throw new Error("Selection data is missing");
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Screenshot could not be loaded"));
    img.src = dataUrl;
  });
  const scaleX = image.width / viewport.width;
  const scaleY = image.height / viewport.height;
  const sx = Math.max(0, Math.round(selection.x * scaleX));
  const sy = Math.max(0, Math.round(selection.y * scaleY));
  const sw = Math.min(image.width - sx, Math.round(selection.width * scaleX));
  const sh = Math.min(image.height - sy, Math.round(selection.height * scaleY));
  if (sw < 1 || sh < 1) throw new Error("Selected area is empty");
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  context.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  return shrink(canvas.toDataURL("image/png"), 1800, 0.88);
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
  return {
    url: location.href,
    title: meta("og:title") || document.title || "",
    description: meta("og:description") || meta("description") || "",
    image: meta("og:image") || meta("og:image:secure_url") || "",
  };
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

function guessSource(url) {
  const u = url.toLowerCase();
  if (u.includes("bdjobs")) return "bdjobs";
  if (u.includes("linkedin")) return "linkedin";
  if (u.includes("facebook") || u.includes("fb.com")) return "facebook";
  return "";
}

function engineLabel(engine) {
  const [provider, mode] = String(engine || "").split(":");
  if (engine === "offline:rules") return "offline rules";
  if (provider === "heuristic") return "offline";
  const names = { gemini: "gemini", openrouter: "openrouter", groq: "groq" };
  const name = names[provider] || provider;
  return mode === "vision" ? `${name} vision` : `${name} text`;
}

// ── wiring ──────────────────────────────────────────────────

$("open-options").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("btn-save").addEventListener("click", save);
$("btn-select-area").addEventListener("click", startAreaCapture);
$("btn-parse-text").addEventListener("click", runParse);
$("f-post-text").addEventListener("input", () => {
  if ($("f-post-text").value.trim()) {
    state.captureMode = "text";
  }
});
$("btn-open").addEventListener("click", () =>
  chrome.tabs.create({ url: `${state.serverUrl}/jobs` })
);
$("btn-open2").addEventListener("click", () =>
  chrome.tabs.create({ url: `${state.serverUrl}/jobs` })
);
$("btn-retry").addEventListener("click", () => location.reload());
$("btn-again").addEventListener("click", () => location.reload());

init();
