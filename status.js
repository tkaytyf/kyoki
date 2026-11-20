(function () {
  "use strict";

  var STATUS_URL = "status/status.json";
  var STALE_MS = 3 * 60 * 1000;
  var POLL_MS = 30 * 1000;
  var INVITE =
    "https://discord.com/oauth2/authorize?client_id=1573348245726298224&scope=bot+applications.commands&permissions=9914278866167";

  var lastPayload = null;
  var lastMode = "loading"; // fresh | stale | offline | unavailable
  var lookupTimer = null;

  var els = {
    title: document.getElementById("overview-title"),
    updated: document.getElementById("overview-updated"),
    pills: document.getElementById("pill-row"),
    pillRange: document.getElementById("pill-range"),
    pillStart: document.getElementById("pill-start"),
    pillEnd: document.getElementById("pill-end"),
    servers: document.getElementById("stat-servers"),
    serversSub: document.getElementById("stat-servers-sub"),
    members: document.getElementById("stat-members"),
    membersSub: document.getElementById("stat-members-sub"),
    shards: document.getElementById("stat-shards"),
    restart: document.getElementById("stat-restart"),
    latency: document.getElementById("stat-latency"),
    latencyRange: document.getElementById("stat-latency-range"),
    grid: document.getElementById("shard-grid"),
    empty: document.getElementById("shards-empty"),
    input: document.getElementById("server-id"),
    form: document.getElementById("shard-lookup"),
    result: document.getElementById("lookup-result"),
    tipBtn: document.getElementById("id-help"),
    tip: document.getElementById("server-id-tip"),
  };

  function parseDate(value) {
    if (!value) return null;
    var t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }

  function isStale(iso) {
    var t = parseDate(iso);
    return t == null || Date.now() - t > STALE_MS;
  }

  function formatAgo(iso, now) {
    var t = parseDate(iso);
    if (t == null) return "—";
    var sec = Math.max(0, Math.round(((now || Date.now()) - t) / 1000));
    if (sec < 45) return "just now";
    if (sec < 90) return "1 minute ago";
    if (sec < 3600) return Math.round(sec / 60) + " minutes ago";
    if (sec < 5400) return "1 hour ago";
    if (sec < 86400) return Math.round(sec / 3600) + " hours ago";
    if (sec < 172800) return "1 day ago";
    return Math.round(sec / 86400) + " days ago";
  }

  function compact(n) {
    if (n == null || n === "" || Number.isNaN(Number(n))) return "—";
    var num = Number(n);
    var abs = Math.abs(num);
    var trim = function (x) {
      return String(x).replace(/\.0$/, "");
    };
    if (abs >= 1e6) return trim((num / 1e6).toFixed(1)) + "M";
    if (abs >= 1e3) return trim((num / 1e3).toFixed(1)) + "K";
    return String(Math.round(num));
  }

  function commas(n) {
    if (n == null || n === "" || Number.isNaN(Number(n))) return "—";
    return Number(n).toLocaleString("en-US");
  }

  function ms(n) {
    if (n == null || n === "" || Number.isNaN(Number(n))) return "—";
    return Math.round(Number(n)) + "ms";
  }

  function shardList(data) {
    return data && Array.isArray(data.shards) ? data.shards : [];
  }

  function toneClass(kind) {
    if (kind === "online") return "is-online";
    if (kind === "offline") return "is-offline";
    return "is-unknown";
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function renderPills(shards, forceOffline, unknown) {
    clear(els.pills);
    if (!shards.length || unknown) {
      els.pillRange.hidden = true;
      els.pills.setAttribute("aria-label", "No shard status");
      return;
    }
    shards.forEach(function (shard, i) {
      var pill = document.createElement("span");
      pill.className = "shard-pill";
      var kind = forceOffline ? "offline" : shard.online ? "online" : "offline";
      pill.classList.add(toneClass(kind));
      pill.title = "Shard " + (shard.id != null ? shard.id : i) + " " + kind;
      els.pills.appendChild(pill);
    });
    var first = shards[0].id != null ? shards[0].id : 0;
    var last = shards[shards.length - 1].id != null ? shards[shards.length - 1].id : shards.length - 1;
    els.pillStart.textContent = "Shard " + first;
    els.pillEnd.textContent = "Shard " + last;
    els.pillRange.hidden = false;
    els.pills.setAttribute("aria-label", shards.length + " shards");
  }

  function renderShards(shards, forceOffline, unknown) {
    clear(els.grid);
    if (!shards.length || unknown) {
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;
    shards.forEach(function (shard, i) {
      var id = shard.id != null ? shard.id : i;
      var kind = forceOffline ? "offline" : shard.online ? "online" : "offline";
      var card = document.createElement("article");
      card.className = "shard-card";
      card.innerHTML =
        '<div class="shard-card-top">' +
        '<p class="shard-name">Shard ' +
        escapeHtml(String(id)) +
        "</p>" +
        '<span class="status-dot ' +
        toneClass(kind) +
        '" title="' +
        kind +
        '"></span>' +
        "</div>" +
        '<div class="shard-meta">' +
        '<span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M2 12h2V8H2v4zm5 0h2V4H7v8zm5 0h2V6h-2v6z"/></svg>' +
        (forceOffline && shard.latency_ms == null ? "—" : ms(shard.latency_ms)) +
        "</span>" +
        '<span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="3" y="3" width="10" height="10" rx="1.5"/><path d="M3 7h10"/></svg>' +
        (shard.servers == null ? "—" : commas(shard.servers)) +
        "</span>" +
        '<span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="8" cy="6" r="2"/><path d="M3.5 13c.6-2 2.3-3 4.5-3s3.9 1 4.5 3"/></svg>' +
        (shard.members == null ? "—" : compact(shard.members)) +
        "</span>" +
        "</div>";
      els.grid.appendChild(card);
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function dashes() {
    els.servers.textContent = "—";
    els.serversSub.textContent = "—";
    els.members.textContent = "—";
    if (els.membersSub) els.membersSub.textContent = "—";
    els.shards.textContent = "—";
    els.restart.textContent = "Last restart —";
    els.latency.textContent = "—";
    els.latencyRange.textContent = "—";
  }

  function fillStats(data, forceOffline) {
    if (!data) {
      dashes();
      return;
    }
    var shards = shardList(data);
    els.servers.textContent = commas(data.servers);
    var n = shards.length;
    els.serversSub.textContent = n ? "across " + n + " shard" + (n === 1 ? "" : "s") : "—";
    els.members.textContent = compact(data.members);
    if (els.membersSub) els.membersSub.textContent = "across all servers";
    if (n) {
      var onlineCount = forceOffline ? 0 : shards.filter(function (s) { return s.online; }).length;
      els.shards.textContent = onlineCount + " / " + n;
    } else {
      els.shards.textContent = "—";
    }
    els.restart.textContent = "Last restart " + formatAgo(data.started);
    var lats = shards
      .map(function (s) { return Number(s.latency_ms); })
      .filter(function (n) { return !Number.isNaN(n); });
    if (data.latency_ms != null && !Number.isNaN(Number(data.latency_ms))) {
      els.latency.textContent = ms(data.latency_ms);
    } else if (lats.length) {
      var avg = lats.reduce(function (a, b) { return a + b; }, 0) / lats.length;
      els.latency.textContent = ms(avg);
    } else {
      els.latency.textContent = "—";
    }
    if (lats.length) {
      els.latencyRange.textContent = ms(Math.min.apply(null, lats)) + " fastest, " + ms(Math.max.apply(null, lats)) + " slowest";
    } else {
      els.latencyRange.textContent = "—";
    }
  }

  function render(mode, data) {
    lastMode = mode;
    var unknown = mode === "unavailable" || (mode === "offline" && !data);
    var forceOffline = mode === "stale" || mode === "offline" || (data && data.online === false);
    if (mode === "unavailable") {
      els.title.textContent = "Status unavailable";
      els.updated.textContent = "Updated —";
      dashes();
      renderPills([], false, true);
      renderShards([], false, true);
      return;
    }
    if (mode === "offline" && !data) {
      els.title.textContent = "kyōki is offline";
      els.updated.textContent = "Updated —";
      dashes();
      renderPills([], true, true);
      renderShards([], true, true);
      return;
    }
    if (mode === "stale" || (data && data.online === false) || mode === "offline") {
      els.title.textContent = "kyōki is offline";
    } else {
      els.title.textContent = "kyōki is fully operational";
    }
    var now = Date.now();
    var ago = formatAgo(data && data.updated, now);
    els.updated.textContent = ago === "—" ? "Updated —" : ago === "just now" ? "Updated just now" : "Updated " + ago;
    fillStats(data, forceOffline && mode !== "fresh");
    // When fresh but online:false, don't invent, show real shard flags (forceOffline already true)
    var shards = shardList(data);
    renderPills(shards, forceOffline, false);
    renderShards(shards, forceOffline, false);
  }

  function refreshTimes() {
    if (!lastPayload || lastMode === "unavailable") return;
    var ago = formatAgo(lastPayload.updated);
    els.updated.textContent = ago === "—" ? "Updated —" : ago === "just now" ? "Updated just now" : "Updated " + ago;
    if (lastPayload.started) {
      els.restart.textContent = "Last restart " + formatAgo(lastPayload.started);
    }
  }

  async function load() {
    try {
      var res = await fetch(STATUS_URL + "?t=" + Date.now(), { cache: "no-store" });
      if (res.status === 404) {
        lastPayload = null;
        render("unavailable", null);
        return;
      }
      if (!res.ok) {
        render(lastPayload ? "stale" : "offline", lastPayload);
        return;
      }
      var data = await res.json();
      lastPayload = data;
      if (isStale(data.updated)) render("stale", data);
      else render("fresh", data);
      maybeLookup();
    } catch (err) {
      if (!lastPayload) render("offline", null);
      else render("stale", lastPayload);
    }
  }

  function hex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(function (b) { return b.toString(16).padStart(2, "0"); })
      .join("");
  }

  async function sha256Hex(text) {
    var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return hex(buf);
  }

  function setResult(html, show) {
    els.result.hidden = !show;
    els.result.innerHTML = html || "";
  }

  async function maybeLookup() {
    var raw = (els.input.value || "").trim();
    if (!raw) {
      setResult("", false);
      return;
    }
    if (!/^\d{17,20}$/.test(raw)) {
      setResult("Enter a 17–20 digit server ID.", true);
      return;
    }
    var data = lastPayload;
    var shards = shardList(data);
    if (!data || lastMode === "unavailable") {
      setResult("Status isn’t available, so the server can’t be checked right now.", true);
      return;
    }
    try {
      var hash = await sha256Hex(raw);
      var hashes = Array.isArray(data.guild_hashes) ? data.guild_hashes.map(function (h) { return String(h).toLowerCase(); }) : [];
      var found = hashes.indexOf(hash.toLowerCase()) !== -1;
      if (found) {
        var msg = "kyōki is in this server";
        if (shards.length) {
          var shard = Number((BigInt(raw) >> 22n) % BigInt(shards.length));
          msg += " — shard " + shard + ".";
        } else {
          msg += ".";
        }
        setResult(msg, true);
      } else {
        setResult(
          "kyōki isn’t in this server yet. <a href=\"" +
            INVITE +
            "\" target=\"_blank\" rel=\"noopener\">Add kyōki</a>",
          true
        );
      }
    } catch (err) {
      setResult("This browser couldn’t check the ID. Try again in a current browser, over http://localhost or https.", true);
    }
  }

  if (els.form) {
    els.form.addEventListener("submit", function (event) {
      event.preventDefault();
      maybeLookup();
    });
  }
  if (els.input) {
    els.input.addEventListener("input", function () {
      clearTimeout(lookupTimer);
      lookupTimer = setTimeout(maybeLookup, 200);
    });
  }

  function setTip(open) {
    if (!els.tip || !els.tipBtn) return;
    els.tip.hidden = !open;
    els.tipBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (els.tipBtn) {
    els.tipBtn.addEventListener("click", function (event) {
      event.preventDefault();
      setTip(els.tip.hidden);
    });
    document.addEventListener("click", function (event) {
      if (!els.tip.hidden && !els.tip.contains(event.target) && !els.tipBtn.contains(event.target)) {
        setTip(false);
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setTip(false);
    });
  }

  dashes();
  load();
  setInterval(load, POLL_MS);
  setInterval(refreshTimes, 1000);
})();
