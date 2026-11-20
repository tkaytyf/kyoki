(function () {
  document.querySelectorAll(".cmd-copy[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy") || "";
      function done() {
        btn.textContent = "Copied";
        btn.classList.add("is-copied");
        setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("is-copied"); }, 1200);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); } catch (e) {}
          document.body.removeChild(ta); done();
        });
      } else { done(); }
    });
  });
})();
