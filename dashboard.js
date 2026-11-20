(function () {
  "use strict";

  // TODO: set the hosted URL once the dashboard API is public.
  var API = "http://localhost:8080";

  var INVITE = "https://discord.com/oauth2/authorize?client_id=1573348245726298224&scope=bot+applications.commands&permissions=1099798015063";

  var root = document.getElementById("dash-root");
  if (!root) return;

  var state = {
    user: null,
    guilds: [],
    guild: null,
    config: null,
    channels: [],
    roles: [],
    tab: "prefix",
    welcomeMode: "plain",
    goodbyeMode: "plain",
    saving: false,
    status: "",
    error: ""
  };

  function api(path, opts) {
    opts = opts || {};
    var headers = opts.headers ? Object.assign({}, opts.headers) : {};
    if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    return fetch(API + path, {
      method: opts.method || "GET",
      credentials: "include",
      headers: headers,
      body: opts.body || undefined
    });
  }

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function text(tag, className, value) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (value != null) node.textContent = value;
    return node;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function userAvatar(user) {
    if (user && user.avatar) {
      return "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar + ".png?size=128";
    }
    var idx = 0;
    try { idx = Number(BigInt(user.id) % 5n); } catch (e) { idx = 0; }
    return "https://cdn.discordapp.com/embed/avatars/" + idx + ".png";
  }

  function guildIcon(guild) {
    if (guild && guild.icon) {
      return "https://cdn.discordapp.com/icons/" + guild.id + "/" + guild.icon + ".png?size=128";
    }
    return "";
  }

  function displayName(user) {
    return (user && (user.global_name || user.username)) || "Discord user";
  }

  function formatTime(iso) {
    if (!iso) return "";
    var date = new Date(iso);
    if (isNaN(date.getTime())) return String(iso);
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short"
    }).format(date);
    return parts + " (America/Los_Angeles)";
  }

  function channelById(id) {
    if (!id) return null;
    for (var i = 0; i < state.channels.length; i++) {
      if (state.channels[i].id === String(id)) return state.channels[i];
    }
    return null;
  }

  function channelLabel(id) {
    if (!id) return "Off";
    var ch = channelById(id);
    if (!ch) return String(id);
    var hash = ch.text ? "#" : "";
    return (ch.category ? ch.category + " / " : "") + hash + ch.name;
  }

  function textChannels() {
    return state.channels.filter(function (ch) { return ch.text; });
  }

  function messageMode(message) {
    if (message == null) return "plain";
    if (typeof message === "string") return "plain";
    return "embed";
  }

  function renderComingSoon() {
    root.replaceChildren();
    var box = el("div", "dash-state");
    box.appendChild(text("h2", "", "Dashboard coming soon"));
    box.appendChild(text("p", "", "Sign-in isn’t available yet. The dashboard will open here once login is set up — nothing on this page is placeholder data."));
    root.appendChild(box);
  }

  function renderLogin() {
    root.replaceChildren();
    var box = el("div", "dash-state");
    box.appendChild(text("h2", "", "Log in to manage kyōki"));
    box.appendChild(text("p", "", "Use Discord to see the servers you can manage. kyōki only lists servers where you have the Manage Server permission."));
    var btn = el("a", "btn btn-discord");
    btn.href = API + "/login?next=" + encodeURIComponent(location.href);
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.11.11 0 0 0-.12.06c-.17.3-.37.7-.5 1.01a14.7 14.7 0 0 0-4.76 0c-.14-.32-.34-.71-.51-1.01A.12.12 0 0 0 9 4c-1.5.26-2.94.71-4.27 1.33A.1.1 0 0 0 4.64 5.4C1.87 9.54 1.1 13.56 1.48 17.53a.12.12 0 0 0 .05.08c1.8 1.32 3.54 2.12 5.25 2.65a.12.12 0 0 0 .13-.04c.4-.55.76-1.13 1.07-1.74a.11.11 0 0 0-.06-.16 10.1 10.1 0 0 1-1.45-.7.11.11 0 0 1-.01-.18c.1-.07.19-.15.28-.23a.11.11 0 0 1 .11-.02c3.05 1.39 6.36 1.39 9.37 0a.11.11 0 0 1 .12.02c.09.08.18.16.28.23a.11.11 0 0 1 0 .18 9.5 9.5 0 0 1-1.45.7.11.11 0 0 0-.06.16c.32.61.68 1.19 1.07 1.74a.12.12 0 0 0 .13.04c1.72-.53 3.46-1.33 5.26-2.65a.12.12 0 0 0 .05-.08c.44-4.58-.74-8.57-3.13-12.13a.1.1 0 0 0-.05-.07ZM8.52 14.85c-.92 0-1.67-.85-1.67-1.89s.74-1.89 1.67-1.89 1.69.85 1.67 1.89-.74 1.89-1.67 1.89Zm6.97 0c-.92 0-1.67-.85-1.67-1.89s.74-1.89 1.67-1.89 1.69.85 1.67 1.89-.75 1.89-1.67 1.89Z"/></svg>Log in with Discord';
    box.appendChild(btn);
    root.appendChild(box);
  }

  function renderError(title, message) {
    root.replaceChildren();
    var box = el("div", "dash-state");
    box.appendChild(text("h2", "", title));
    box.appendChild(text("p", "", message));
    root.appendChild(box);
  }

  function channelSelect(id, selected) {
    var select = document.createElement("select");
    select.className = "field-select";
    select.id = id;
    var off = document.createElement("option");
    off.value = "";
    off.textContent = "Off";
    select.appendChild(off);
    textChannels().forEach(function (ch) {
      var opt = document.createElement("option");
      opt.value = ch.id;
      opt.textContent = "#" + ch.name + (ch.category ? " — " + ch.category : "");
      if (String(selected || "") === ch.id) opt.selected = true;
      select.appendChild(opt);
    });
    if (selected && !channelById(selected)) {
      var missing = document.createElement("option");
      missing.value = String(selected);
      missing.textContent = "Unknown channel " + selected;
      missing.selected = true;
      select.appendChild(missing);
    }
    return select;
  }

  function bindMessageEditor(panel, key, previewId, formId) {
    var cfg = state.config[key] || {};
    var mode = state[key + "Mode"];
    var switcher = el("div", "mode-switch");
    ["plain", "embed"].forEach(function (m) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = m === "plain" ? "Plain text" : "Embed";
      btn.setAttribute("aria-pressed", mode === m ? "true" : "false");
      btn.addEventListener("click", function () {
        state[key + "Mode"] = m;
        renderApp();
      });
      switcher.appendChild(btn);
    });
    panel.appendChild(switcher);

    if (mode === "plain") {
      var label = el("label", "field");
      label.innerHTML = '<span class="field-label">Message</span>';
      var area = document.createElement("textarea");
      area.className = "field-textarea js-" + key + "-plain";
      area.maxLength = 2000;
      area.value = typeof cfg.message === "string" ? cfg.message : (cfg.message && cfg.message.content) || "";
      area.placeholder = "hey {user} — {count} in {server}";
      label.appendChild(area);
      var hint = text("p", "field-hint", "Placeholders: {user} {name} {server} {count}");
      label.appendChild(hint);
      panel.appendChild(label);
    } else {
      var form = el("div", "js-" + key + "-form");
      form.id = formId;
      form.setAttribute("data-content", "1");
      form.innerHTML = KyokiEmbed.formHTML({ showContent: true });
      panel.appendChild(form);
      var preview = el("div", "");
      preview.id = previewId;
      preview.style.marginTop = "1rem";
      panel.appendChild(preview);
      KyokiEmbed.bindForm(form, function (parsed) {
        KyokiEmbed.renderPreview(preview, parsed);
      });
      var initial = cfg.message;
      if (typeof initial === "string") initial = { content: initial, embed: null };
      KyokiEmbed.fillForm(form, initial);
      KyokiEmbed.renderPreview(preview, KyokiEmbed.readForm(form));
    }
  }

  function readMessage(key) {
    if (state[key + "Mode"] === "plain") {
      var area = document.querySelector(".js-" + key + "-plain");
      return area ? area.value : "";
    }
    var form = document.querySelector(".js-" + key + "-form");
    if (!form || !window.KyokiEmbed) return "";
    return KyokiEmbed.messagePayload(KyokiEmbed.readForm(form));
  }

  function pendingList(box) {
    var pending = (state.config && state.config.pending) || [];
    if (!pending.length && !state.saving) return;
    box.appendChild(text("h2", "", "Pending changes"));
    box.appendChild(text("p", "field-hint", "Patches return 202 and wait for the bot to apply them. This list comes from the API — it is not invented."));
    var list = el("ul", "pending-list");
    pending.forEach(function (item) {
      var keys = item.set ? Object.keys(item.set).join(", ") : "";
      var line = text("li", "", (item.id || "patch") + " · " + formatTime(item.created) + (keys ? " · " + keys : ""));
      list.appendChild(line);
    });
    if (!pending.length && state.saving) {
      list.appendChild(text("li", "", "Saving… waiting for the bot to pick this up."));
    }
    box.appendChild(list);
  }

  function renderApp() {
    root.replaceChildren();
    var bar = el("div", "dash-user");
    var ident = el("div", "dash-user-id");
    var avatar = document.createElement("img");
    avatar.className = "dash-avatar";
    avatar.alt = "";
    avatar.src = userAvatar(state.user);
    ident.appendChild(avatar);
    var who = document.createElement("div");
    who.appendChild(text("strong", "", displayName(state.user)));
    who.appendChild(text("span", "", "@" + (state.user.username || "")));
    ident.appendChild(who);
    bar.appendChild(ident);
    var logout = document.createElement("button");
    logout.type = "button";
    logout.className = "btn btn-secondary";
    logout.textContent = "Log out";
    logout.addEventListener("click", function () {
      api("/logout", { method: "POST" }).finally(function () { location.reload(); });
    });
    bar.appendChild(logout);
    root.appendChild(bar);

    root.appendChild(text("h2", "", "Servers"));
    var grid = el("div", "dash-guilds");
    if (!state.guilds.length) {
      grid.appendChild(text("p", "page-note", "No servers where you have Manage Server showed up."));
    }
    state.guilds.forEach(function (guild) {
      if (guild.bot_in) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "dash-guild" + (state.guild && state.guild.id === guild.id ? " is-active" : "");
        btn.appendChild(iconFor(guild));
        var meta = document.createElement("div");
        meta.appendChild(text("strong", "", guild.name));
        meta.appendChild(text("small", "", "kyōki is in this server"));
        btn.appendChild(meta);
        btn.addEventListener("click", function () { openGuild(guild); });
        grid.appendChild(btn);
      } else {
        var card = el("div", "dash-guild");
        card.appendChild(iconFor(guild));
        var meta2 = document.createElement("div");
        meta2.style.flex = "1";
        meta2.appendChild(text("strong", "", guild.name));
        meta2.appendChild(text("small", "", "kyōki is not in this server yet"));
        card.appendChild(meta2);
        var add = document.createElement("a");
        add.className = "btn btn-discord";
        add.href = guild.invite_url || INVITE;
        add.target = "_blank";
        add.rel = "noopener";
        add.textContent = "Add kyōki";
        card.appendChild(add);
        grid.appendChild(card);
      }
    });
    root.appendChild(grid);

    if (!state.guild) return;

    var panel = el("div", "dash-panel");
    panel.appendChild(text("h2", "", state.guild.name));

    var tabs = [
      ["prefix", "Prefix"],
      ["welcome", "Welcome"],
      ["goodbye", "Goodbye"],
      ["logging", "Logging"],
      ["voicemaster", "VoiceMaster"]
    ];
    var tablist = el("div", "dash-tabs");
    tablist.setAttribute("role", "tablist");
    tabs.forEach(function (pair) {
      var tab = document.createElement("button");
      tab.type = "button";
      tab.className = "dash-tab";
      tab.id = "dash-tab-" + pair[0];
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", state.tab === pair[0] ? "true" : "false");
      tab.textContent = pair[1];
      tab.addEventListener("click", function () {
        state.tab = pair[0];
        renderApp();
      });
      tablist.appendChild(tab);
    });
    panel.appendChild(tablist);

    if (state.config) {
      if (state.tab === "prefix") renderPrefix(panel);
      if (state.tab === "welcome") renderWelcome(panel);
      if (state.tab === "goodbye") renderGoodbye(panel);
      if (state.tab === "logging") renderLogging(panel);
      if (state.tab === "voicemaster") renderVoice(panel);
      pendingList(panel);
    } else {
      panel.appendChild(text("p", "page-note", "Loading this server…"));
    }

    var status = text("p", "dash-status" + (state.error ? " is-error" : ""), state.error || state.status);
    panel.appendChild(status);
    root.appendChild(panel);
  }

  function iconFor(guild) {
    var wrap = el("div", "dash-guild-icon");
    var src = guildIcon(guild);
    if (src) {
      var img = document.createElement("img");
      img.alt = "";
      img.src = src;
      wrap.appendChild(img);
    } else {
      wrap.textContent = (guild.name || "?").charAt(0).toUpperCase();
    }
    return wrap;
  }

  function saveButton(panel, handler) {
    var actions = el("div", "field-actions");
    actions.style.marginTop = "1rem";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-discord";
    btn.textContent = state.saving ? "Saving…" : "Save";
    btn.disabled = !!state.saving;
    btn.addEventListener("click", handler);
    actions.appendChild(btn);
    panel.appendChild(actions);
  }

  function renderPrefix(panel) {
    var field = el("label", "field");
    field.innerHTML = '<span class="field-label">Command prefix</span>';
    var input = document.createElement("input");
    input.className = "field-input";
    input.id = "dash-prefix";
    input.maxLength = 5;
    input.value = (state.config && state.config.prefix) || ",";
    field.appendChild(input);
    field.appendChild(text("p", "field-hint", "1–5 characters, no spaces. The site examples still show a comma unless you change this."));
    panel.appendChild(field);
    saveButton(panel, function () {
      var value = input.value;
      if (!value || value.length > 5 || /\s/.test(value)) {
        state.error = "Prefix must be 1–5 characters with no spaces.";
        renderApp();
        return;
      }
      patch({ prefix: value });
    });
  }

  function renderWelcome(panel) {
    var cfg = state.config.welcome || {};
    var field = el("div", "field");
    field.appendChild(text("span", "field-label", "Welcome channel"));
    field.appendChild(channelSelect("dash-welcome-channel", cfg.channel_id));
    panel.appendChild(field);
    bindMessageEditor(panel, "welcome", "dash-welcome-preview", "dash-welcome-form");
    saveButton(panel, function () {
      var select = document.getElementById("dash-welcome-channel");
      var body = { welcome: { channel_id: select.value || null, message: readMessage("welcome") } };
      patch(body);
    });
  }

  function renderGoodbye(panel) {
    var cfg = state.config.goodbye || {};
    var field = el("div", "field");
    field.appendChild(text("span", "field-label", "Goodbye channel"));
    field.appendChild(channelSelect("dash-goodbye-channel", cfg.channel_id));
    panel.appendChild(field);
    bindMessageEditor(panel, "goodbye", "dash-goodbye-preview", "dash-goodbye-form");
    saveButton(panel, function () {
      var select = document.getElementById("dash-goodbye-channel");
      var body = { goodbye: { channel_id: select.value || null, message: readMessage("goodbye") } };
      patch(body);
    });
  }

  function renderLogging(panel) {
    var field = el("div", "field");
    field.appendChild(text("span", "field-label", "Log channel"));
    field.appendChild(channelSelect("dash-log-channel", state.config.log_channel_id));
    field.appendChild(text("p", "field-hint", "Choose Off to turn logging off. Channel IDs are sent as strings."));
    panel.appendChild(field);
    saveButton(panel, function () {
      var select = document.getElementById("dash-log-channel");
      patch({ log_channel_id: select.value || null });
    });
  }

  function renderVoice(panel) {
    var vm = state.config.voicemaster || {};
    var dl = el("dl", "dash-readonly");
    function row(k, v) {
      var wrap = el("div", "dash-kv");
      wrap.appendChild(text("dt", "", k));
      var dd = text("dd", "", "");
      if (v instanceof Node) dd.appendChild(v);
      else dd.textContent = v;
      wrap.appendChild(dd);
      dl.appendChild(wrap);
    }
    var pill = text("span", vm.enabled ? "pill-on" : "pill-off", vm.enabled ? "On" : "Off");
    row("Status", pill);
    row("Join to Create", channelLabel(vm.join_channel_id));
    row("Interface", channelLabel(vm.interface_channel_id));
    row("Category", channelLabel(vm.category_id));
    row("Active channels", String(vm.active_channels != null ? vm.active_channels : 0));
    panel.appendChild(dl);
    panel.appendChild(text("p", "field-hint", "VoiceMaster is read-only here. Use ,voicemaster setup or ,voicemaster reset in Discord."));
  }

  function patch(body) {
    if (!state.guild || state.saving) return;
    state.saving = true;
    state.status = "Saving…";
    state.error = "";
    renderApp();
    api("/api/guilds/" + state.guild.id + "/config", {
      method: "PATCH",
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().then(function (data) {
        return { res: res, data: data };
      }).catch(function () { return { res: res, data: {} }; });
    }).then(function (result) {
      if (result.res.status === 202) {
        state.status = "Saving… the bot should apply this in a few seconds.";
        window.setTimeout(function () {
          refreshConfig().finally(function () {
            state.saving = false;
            if (!state.error) state.status = "Refreshed after the wait.";
            renderApp();
          });
        }, 5000);
        refreshConfig();
      } else {
        state.saving = false;
        state.status = "";
        state.error = (result.data && (result.data.detail || result.data.error)) || ("Could not save (" + result.res.status + ").");
        if (typeof state.error !== "string") state.error = JSON.stringify(state.error);
        renderApp();
      }
    }).catch(function () {
      state.saving = false;
      state.status = "";
      state.error = "Could not reach the dashboard API.";
      renderApp();
    });
  }

  function refreshConfig() {
    if (!state.guild) return Promise.resolve();
    return api("/api/guilds/" + state.guild.id + "/config").then(function (res) {
      if (!res.ok) throw new Error("config " + res.status);
      return res.json();
    }).then(function (data) {
      state.config = data;
      if (data.welcome) state.welcomeMode = messageMode(data.welcome.message);
      if (data.goodbye) state.goodbyeMode = messageMode(data.goodbye.message);
    });
  }

  function openGuild(guild) {
    state.guild = guild;
    state.config = null;
    state.channels = [];
    state.roles = [];
    state.status = "";
    state.error = "";
    state.tab = "prefix";
    renderApp();
    Promise.all([
      api("/api/guilds/" + guild.id + "/config"),
      api("/api/guilds/" + guild.id + "/channels"),
      api("/api/guilds/" + guild.id + "/roles")
    ]).then(function (responses) {
      var failed = responses.find(function (r) { return !r.ok; });
      if (failed) {
        if (failed.status === 401) return renderLogin();
        if (failed.status === 503) return renderComingSoon();
        state.error = "Could not load this server (" + failed.status + ").";
        renderApp();
        return;
      }
      return Promise.all(responses.map(function (r) { return r.json(); })).then(function (payloads) {
        state.config = payloads[0];
        state.channels = payloads[1] || [];
        state.roles = payloads[2] || [];
        if (state.config.welcome) state.welcomeMode = messageMode(state.config.welcome.message);
        if (state.config.goodbye) state.goodbyeMode = messageMode(state.config.goodbye.message);
        renderApp();
      });
    }).catch(function () {
      renderComingSoon();
    });
  }

  function boot() {
    root.replaceChildren();
    root.appendChild(text("p", "page-note", "Loading…"));
    api("/api/me").then(function (res) {
      if (res.status === 401) {
        renderLogin();
        return null;
      }
      if (res.status === 503) {
        renderComingSoon();
        return null;
      }
      if (!res.ok) {
        renderComingSoon();
        return null;
      }
      return res.json();
    }).then(function (data) {
      if (!data) return;
      state.user = data.user;
      state.guilds = data.guilds || [];
      renderApp();
      var first = state.guilds.find(function (g) { return g.bot_in; });
      if (first) openGuild(first);
    }).catch(function () {
      renderComingSoon();
    });
  }

  boot();
})();
