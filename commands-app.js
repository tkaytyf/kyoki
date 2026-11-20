(function () {
  "use strict";

  var list = document.getElementById("command-list");
  if (!list) return;

  var search = document.getElementById("command-search");
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".cmd-filters [data-filter]"));
  var empty = document.querySelector(".commands-empty");
  var countEl = document.getElementById("command-count");
  var items = [];
  var category = "all";
  var total = 722;
  var rafPending = 0;
  var moduleIds = {};

  function field(label, value) {
    var p = document.createElement("p");
    p.className = "command-field";
    var lab = document.createElement("span");
    lab.className = "field-label";
    lab.textContent = label;
    p.appendChild(lab);
    var code = document.createElement("code");
    code.textContent = value;
    p.appendChild(code);
    return p;
  }

  function buildItem(cmd) {
    var li = document.createElement("li");
    li.className = "command";
    li.id = "cmd-" + cmd.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");

    var name = document.createElement("p");
    name.className = "command-name";
    var code = document.createElement("code");
    code.textContent = cmd.name;
    var slug = cmd.name.replace(/^[\/,]+/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    var link = document.createElement("a");
    link.href = "commands/" + slug + ".html";
    link.appendChild(code);
    name.appendChild(link);
    if (cmd.slash) {
      var badge = document.createElement("span");
      badge.className = "slash-badge";
      badge.textContent = cmd.slash;
      if (cmd.slash_note) badge.title = cmd.slash_note;
      name.appendChild(badge);
    }
    var copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "cmd-copy";
    copyBtn.textContent = "Copy";
    copyBtn.setAttribute("aria-label", "Copy " + (cmd.syntax || cmd.name));
    copyBtn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var text = cmd.syntax || cmd.name;
      function done() {
        copyBtn.textContent = "Copied";
        copyBtn.classList.add("is-copied");
        setTimeout(function () {
          copyBtn.textContent = "Copy";
          copyBtn.classList.remove("is-copied");
        }, 1200);
      }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta);
        done();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
      } else {
        fallback();
      }
    });
    name.appendChild(copyBtn);
    li.appendChild(name);

    var desc = document.createElement("p");
    desc.className = "command-desc";
    desc.textContent = cmd.description;
    li.appendChild(desc);

    var fields = document.createElement("div");
    fields.className = "command-fields";
    fields.appendChild(field("Syntax", cmd.syntax));
    fields.appendChild(field("Permission", cmd.permission));
    if (cmd.aliases && cmd.aliases.length) {
      fields.appendChild(field("Aliases", cmd.aliases.join(", ")));
    }
    li.appendChild(fields);
    return li;
  }

  function apply() {
    var raw = (search && search.value ? search.value : "").trim().toLowerCase();
    var tokens = raw ? raw.split(/\s+/).filter(Boolean) : [];
    var visible = 0;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var inCat = category === "all" || it.module === category;
      var match = true;
      for (var t = 0; t < tokens.length; t++) {
        if (it.search.indexOf(tokens[t]) === -1) {
          match = false;
          break;
        }
      }
      var show = inCat && match;
      if (it.el.hidden === show) it.el.hidden = !show;
      if (show) visible += 1;
    }
    if (empty) empty.hidden = visible !== 0;
    if (countEl) {
      if (category === "all" && !tokens.length) {
        countEl.textContent = total + " commands";
      } else {
        countEl.textContent = "Showing " + visible + " of " + total;
      }
    }
  }

  function scheduleApply() {
    if (rafPending) return;
    rafPending = requestAnimationFrame(function () {
      rafPending = 0;
      apply();
    });
  }

  function setCategory(id, skipHash) {
    category = id || "all";
    tabs.forEach(function (other) {
      var active = other.getAttribute("data-filter") === category;
      other.classList.toggle("is-active", active);
      other.setAttribute("aria-selected", active ? "true" : "false");
      other.setAttribute("tabindex", active ? "0" : "-1");
    });
    list.setAttribute("aria-labelledby", "tab-" + category);
    if (!skipHash && category !== "all" && history.replaceState) {
      history.replaceState(null, "", "#" + category);
    }
    apply();
  }

  if (search) search.addEventListener("input", scheduleApply);

  document.addEventListener("keydown", function (event) {
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
    var tag = (event.target && event.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (event.target && event.target.isContentEditable)) return;
    if (!search) return;
    event.preventDefault();
    search.focus();
  });

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      setCategory(tab.getAttribute("data-filter") || "all");
    });
  });

  var tablist = document.querySelector(".cmd-filters[role='tablist']");
  if (tablist && tabs.length) {
    tablist.addEventListener("keydown", function (event) {
      var current = tabs.indexOf(document.activeElement);
      if (current === -1) return;
      var next = current;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current + 1) % tabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    });
  }

  fetch("commands.json")
    .then(function (res) {
      if (!res.ok) throw new Error("commands.json " + res.status);
      return res.json();
    })
    .then(function (data) {
      total = data.total || (data.commands && data.commands.length) || total;
      (data.modules || []).forEach(function (m) {
        moduleIds[m.id] = true;
      });
      var frag = document.createDocumentFragment();
      (data.commands || []).forEach(function (cmd) {
        var el = buildItem(cmd);
        items.push({ el: el, module: cmd.module, search: cmd.search || "" });
        frag.appendChild(el);
      });
      list.appendChild(frag);

      var hash = (location.hash || "").replace(/^#/, "");
      if (hash && moduleIds[hash]) {
        setCategory(hash, true);
      } else if (hash) {
        var needle = hash.charAt(0) === "," || hash.charAt(0) === "/" ? hash : "," + decodeURIComponent(hash).replace(/-/g, " ");
        if (search) search.value = needle;
        apply();
      } else {
        apply();
      }
    })
    .catch(function () {
      if (countEl) countEl.textContent = "Couldn’t load the command list.";
    });
})();
