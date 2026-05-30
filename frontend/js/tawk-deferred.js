(function () {
  "use strict";

  var TAWK_SRC = "https://embed.tawk.to/69c64bd90c50e01c367c2f38/1jkn9gj36";
  var loaded = false;
  var idleId = null;
  var fallbackTimer = null;

  function loadTawk() {
    if (loaded) return;
    loaded = true;
    cleanup();

    var Tawk_API = window.Tawk_API || {};
    window.Tawk_API = Tawk_API;
    window.Tawk_LoadStart = new Date();
    Tawk_API.onLoad = function () {
      if (Tawk_API.minimize) Tawk_API.minimize();
    };

    var s1 = document.createElement("script");
    var s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = TAWK_SRC;
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    if (s0 && s0.parentNode) s0.parentNode.insertBefore(s1, s0);
    else document.head.appendChild(s1);
  }

  function cleanup() {
    ["scroll", "pointerdown", "keydown", "touchstart"].forEach(function (ev) {
      window.removeEventListener(ev, loadTawk, interactionOpts);
    });
    if (idleId != null && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(idleId);
    }
    if (fallbackTimer != null) {
      window.clearTimeout(fallbackTimer);
    }
  }

  var interactionOpts = { passive: true, capture: true };

  ["scroll", "pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, loadTawk, interactionOpts);
  });

  if ("requestIdleCallback" in window) {
    idleId = window.requestIdleCallback(loadTawk, { timeout: 10000 });
  } else {
    fallbackTimer = window.setTimeout(loadTawk, 10000);
  }
})();
