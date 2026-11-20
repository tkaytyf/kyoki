(function () {
  "use strict";

  var form = document.getElementById("embed-form");
  var preview = document.getElementById("embed-preview");
  var channel = document.getElementById("embed-channel");
  var copyCmd = document.getElementById("copy-command");
  var copyJson = document.getElementById("copy-json");
  var status = document.getElementById("copy-status");
  if (!form || !window.KyokiEmbed) return;

  form.innerHTML = KyokiEmbed.formHTML({ showContent: true });
  KyokiEmbed.bindForm(form, function (parsed) {
    KyokiEmbed.renderPreview(preview, parsed);
  });
  KyokiEmbed.renderPreview(preview, KyokiEmbed.readForm(form));

  function normalizeChannel(value) {
    var raw = (value || "").trim();
    if (!raw) return "#channel";
    raw = raw.replace(/\s+/g, "");
    if (raw.charAt(0) !== "#") raw = "#" + raw;
    return raw;
  }

  function currentPayload() {
    return KyokiEmbed.toDocJson(KyokiEmbed.readForm(form));
  }

  function currentJson() {
    return JSON.stringify(currentPayload());
  }

  function currentCommand() {
    return ",embed send " + normalizeChannel(channel && channel.value) + " " + currentJson();
  }

  if (channel) {
    channel.addEventListener("blur", function () {
      channel.value = normalizeChannel(channel.value);
    });
  }

  function copied(label) {
    if (!status) return;
    status.textContent = label;
    window.setTimeout(function () {
      if (status.textContent === label) status.textContent = "";
    }, 2000);
  }

  function copyText(value, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () { copied(label); }).catch(fallback);
    } else {
      fallback();
    }
    function fallback() {
      var area = document.createElement("textarea");
      area.value = value;
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy"); copied(label); } catch (e) { copied("Could not copy"); }
      area.remove();
    }
  }

  if (copyCmd) {
    copyCmd.addEventListener("click", function () {
      copyText(currentCommand(), "Command copied");
    });
  }
  if (copyJson) {
    copyJson.addEventListener("click", function () {
      copyText(currentJson(), "JSON copied");
    });
  }
})();
