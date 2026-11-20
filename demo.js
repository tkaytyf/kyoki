(function () {
  "use strict";
  var note = "Demo, nothing is sent to Discord";

  /* VoiceMaster mock: lock icon, limit number, ghost */
  var channel = document.getElementById("vm-channel");
  if (channel) {
    var state = { locked: false, ghost: false, limit: 5 };
    var icon = document.getElementById("vm-lock-icon");
    var limitEl = document.getElementById("vm-limit");
    var lockImg = "assets/vm/lock.png";
    var unlockImg = "assets/vm/unlock.png";
    function render() {
      channel.classList.toggle("is-ghost", state.ghost);
      if (icon) {
        icon.src = state.locked ? lockImg : unlockImg;
        icon.alt = state.locked ? "Locked" : "Unlocked";
      }
      if (limitEl) limitEl.textContent = state.limit === 0 ? "no limit" : String(state.limit);
    }
    document.querySelectorAll("[data-vm]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = btn.getAttribute("data-vm");
        if (act === "lock") state.locked = true;
        else if (act === "unlock") state.locked = false;
        else if (act === "ghost") state.ghost = true;
        else if (act === "reveal") state.ghost = false;
        else if (act === "inc") state.limit = Math.min(99, state.limit + 1);
        else if (act === "dec") state.limit = Math.max(0, state.limit - 1);
        render();
      });
    });
    render();
  }

  /* Automod tester — default thresholds from the bot, filters off until turned on */
  var input = document.getElementById("am-text");
  var result = document.getElementById("am-result");
  var form = document.getElementById("am-form");
  if (!input || !result) return;

  var INVITE = /(?:discord\.gg|discord(?:app)?\.com\/invite|dsc\.gg)\/[\w-]+/i;
  var URL = /(?:https?:\/\/|www\.)([^\s/<>]+)/i;
  var CUSTOM_EMOJI = /<a?:\w{2,32}:\d{15,20}>/g;
  var UNI_EMOJI = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu;

  function emojiCount(text) {
    var custom = text.match(CUSTOM_EMOJI) || [];
    var rest = text.replace(CUSTOM_EMOJI, "");
    var uni = rest.match(UNI_EMOJI) || [];
    return custom.length + uni.length;
  }
  function capsHit(text, percent, minimum) {
    var letters = [];
    for (var i = 0; i < text.length; i++) if (/[A-Za-z]/.test(text[i])) letters.push(text[i]);
    if (letters.length < minimum) return false;
    var upper = letters.filter(function (c) { return c === c.toUpperCase() && c !== c.toLowerCase(); }).length;
    return upper * 100 >= percent * letters.length;
  }
  function zalgoHit(text) {
    var marks = 0, run = 0, best = 0;
    for (var i = 0; i < text.length; i++) {
      var code = text.charCodeAt(i);
      var comb = (code >= 0x300 && code <= 0x36F) || (code >= 0x1AB0 && code <= 0x1AFF) || (code >= 0x20D0 && code <= 0x20FF);
      if (comb) { marks += 1; run += 1; best = Math.max(best, run); }
      else run = 0;
    }
    return best >= 4 || marks >= 15;
  }
  function mentionCount(text) {
    var roleOrUser = text.match(/<@!?\d+>|<@&\d+>|@\w+/g) || [];
    return roleOrUser.length;
  }

  var history = [];
  function enabled(name) {
    var el = document.querySelector('[data-filter="' + name + '"]');
    return el ? el.checked : false;
  }
  function test(text) {
    var hits = [];
    if (enabled("invites") && INVITE.test(text)) hits.push("invites");
    if (enabled("links") && URL.test(text)) hits.push("links");
    if (enabled("caps") && capsHit(text, 70, 10)) hits.push("caps");
    if (enabled("emoji") && emojiCount(text) >= 10) hits.push("emoji");
    if (enabled("zalgo") && zalgoHit(text)) hits.push("zalgo");
    if (enabled("newlines") && text.split("\n").length > 15) hits.push("newlines");
    if (enabled("massmention") && mentionCount(text) >= 5) hits.push("massmention");
    var now = Date.now();
    var norm = text.replace(/\s+/g, " ").trim().toLowerCase();
    history.push({ t: now, norm: norm });
    history = history.filter(function (h) { return now - h.t < 5000; });
    if (enabled("spam") && history.length >= 5) hits.push("spam");
    if (enabled("repeat")) {
      var same = history.filter(function (h) { return h.norm && h.norm === norm; }).length;
      if (same >= 3) hits.push("repeat");
    }
    return hits;
  }
  function run() {
    var text = input.value || "";
    var anyOn = !!document.querySelector(".am-toggles input:checked");
    if (!anyOn) {
      result.innerHTML = "No filters are on. On a real server, every filter starts off until you turn it on with <code class=\"cmd\">,filter … on</code>. This tester uses the bot’s default thresholds when a filter is on.";
      return;
    }
    var hits = test(text);
    if (!text.trim()) {
      result.textContent = "Type a message to test the filters that are on.";
      return;
    }
    if (hits.length) {
      result.innerHTML = "<strong>Would be flagged:</strong> " + hits.join(", ") + ". A matching message is always deleted; the filter action can also warn, time out, or kick.";
    } else {
      result.textContent = "No default-threshold filters that are on would flag this message.";
    }
  }
  if (form) form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
  input.addEventListener("input", run);
  document.querySelectorAll(".am-toggles input").forEach(function (el) { el.addEventListener("change", run); });
  run();
})();
