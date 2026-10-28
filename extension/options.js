const serverEl = document.getElementById("serverUrl");
const tokenEl = document.getElementById("token");
const statusEl = document.getElementById("status");

chrome.storage.sync.get(["serverUrl", "token"]).then((cfg) => {
  serverEl.value = cfg.serverUrl || "http://localhost:3000";
  tokenEl.value = cfg.token || "";
});

document.getElementById("save").addEventListener("click", async () => {
  const serverUrl = serverEl.value.trim().replace(/\/+$/, "");
  const token = tokenEl.value.trim();

  if (!/^https?:\/\//.test(serverUrl)) {
    statusEl.textContent = "URL must start with http:// or https://";
    statusEl.style.color = "#fda4af";
    return;
  }

  await chrome.storage.sync.set({ serverUrl, token });
  statusEl.textContent = "Saved. Testing…";
  statusEl.style.color = "var(--muted)";

  try {
    const res = await fetch(`${serverUrl}/api/health`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const problems = [];
    if (!json.supabase) problems.push("Supabase not configured");
    if (!json.serviceRole) problems.push("service role key missing");
    if (!json.extensionToken) problems.push("EXTENSION_TOKEN not set on server");

    if (problems.length) {
      statusEl.textContent = `Connected, but: ${problems.join(", ")}`;
      statusEl.style.color = "#fcd34d";
    } else {
      statusEl.textContent = `Connected ✓  AI: ${json.ai}`;
      statusEl.style.color = "var(--brand)";
    }
  } catch (err) {
    statusEl.textContent = `Could not reach the server (${err.message}). Is it running?`;
    statusEl.style.color = "#fda4af";
  }
});
