(function () {
  "use strict";
  var boxes = document.querySelectorAll(".setup-options input[type=checkbox]");
  var out = document.getElementById("setup-out");
  var copyBtn = document.getElementById("setup-copy");
  if (!boxes.length || !out) return;

  var BLOCKS = {
    prefix: [",prefix"],
    logs: [",log <channel>"],
    welcome: [",welcome <channel>", ",welcome message welcome {user} to **{server}**, you're member #{count}", ",goodbye <channel>"],
    moderation: [",muterole create"],
    automod: [",filter invites on", ",filter links on", ",filter spam on", ",filter log <channel>"],
    tickets: [",ticket setup <channel>", ",ticket support <role>", ",ticket log <channel>"],
    voice: [",voicemaster setup"],
    starboard: [",starboard <channel>"],
    sticky: [",sticky add <channel> <text or embed JSON>"],
    roles: [",buttonrole post <channel> <text>"],
    reactionroles: [",reactionrole add <message> <emoji> <role>"],
    security: [",antinuke on", ",antiraid on"]
  };
  var ORDER = ["prefix", "logs", "welcome", "moderation", "automod", "tickets", "voice", "starboard", "sticky", "roles", "reactionroles", "security"];

  function render() {
    var lines = [];
    ORDER.forEach(function (id) {
      var box = document.querySelector('input[name="setup"][value="' + id + '"]');
      if (box && box.checked && BLOCKS[id]) lines = lines.concat(BLOCKS[id]);
    });
    out.value = lines.join("\n");
    if (copyBtn) copyBtn.disabled = lines.length === 0;
  }
  boxes.forEach(function (b) { b.addEventListener("change", render); });
  render();
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var text = out.value;
      if (!text) return;
      function done() { copyBtn.textContent = "Copied"; setTimeout(function () { copyBtn.textContent = "Copy all"; }, 1200); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          out.select(); try { document.execCommand("copy"); } catch (e) {}
          done();
        });
      } else { out.select(); try { document.execCommand("copy"); } catch (e) {} done(); }
    });
  }
})();
