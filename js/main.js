(function () {
  "use strict";

  /* ========================================================================
     Store hours — edit this object only. Day keys follow Date.getDay():
     0 = Sunday ... 6 = Saturday. Set a day to null to mark it closed.
     ======================================================================== */
  var HOURS = {
    0: null,                  // Sunday — closed
    1: null,                  // Monday — closed
    2: { open: 9, close: 17 }, // Tuesday
    3: { open: 9, close: 17 }, // Wednesday
    4: { open: 9, close: 17 }, // Thursday
    5: { open: 9, close: 17 }, // Friday
    6: { open: 9, close: 15 }  // Saturday
  };

  var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function formatHour(h) {
    var period = h >= 12 ? "PM" : "AM";
    var hour12 = h % 12 === 0 ? 12 : h % 12;
    return hour12 + " " + period;
  }

  function formatRange(day) {
    return day ? formatHour(day.open) + " – " + formatHour(day.close) : "Closed";
  }

  /* ---- Open/closed status ---------------------------------------------- */
  function getStatus(now) {
    var day = now.getDay();
    var hour = now.getHours() + now.getMinutes() / 60;
    var today = HOURS[day];

    if (today && hour >= today.open && hour < today.close) {
      return { open: true, text: "Open now — closes at " + formatHour(today.close) };
    }

    // Find the next open day (starting today if it hasn't opened yet).
    for (var i = 0; i <= 7; i++) {
      var checkDay = (day + i) % 7;
      var spec = HOURS[checkDay];
      if (!spec) continue;
      if (i === 0 && hour >= spec.close) continue; // today already closed for the day
      var label = i === 0 ? "today" : (i === 1 ? "tomorrow" : DAY_NAMES[checkDay]);
      return { open: false, text: "Closed — opens " + label + " at " + formatHour(spec.open) };
    }
    return { open: false, text: "Closed" };
  }

  function renderStatus() {
    var wrap = document.getElementById("hours-status");
    var text = document.getElementById("hours-status-text");
    if (!wrap || !text) return;
    var status = getStatus(new Date());
    wrap.setAttribute("data-open", String(status.open));
    text.textContent = status.text;
  }

  /* ---- Hours table -------------------------------------------------------*/
  function renderHoursTable() {
    var tbody = document.querySelector("#hours-table tbody");
    if (!tbody) return;
    var today = new Date().getDay();
    var order = [1, 2, 3, 4, 5, 6, 0]; // Monday-first display
    var rows = order.map(function (day) {
      var spec = HOURS[day];
      var classes = [];
      if (day === today) classes.push("is-today");
      if (!spec) classes.push("is-closed");
      return (
        '<tr class="' + classes.join(" ") + '">' +
        "<td>" + DAY_NAMES[day] + "</td>" +
        "<td>" + formatRange(spec) + "</td>" +
        "</tr>"
      );
    });
    tbody.innerHTML = rows.join("");
  }

  /* ========================================================================
     Sticky header shrink
     ======================================================================== */
  function initHeaderShrink() {
    var header = document.getElementById("site-header");
    if (!header) return;
    var threshold = 40;
    var ticking = false;

    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > threshold);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  /* ========================================================================
     Mobile nav toggle
     ======================================================================== */
  function initNavToggle() {
    var toggle = document.getElementById("nav-toggle");
    var list = document.getElementById("site-nav-list");
    if (!toggle || !list) return;

    function close() {
      toggle.setAttribute("aria-expanded", "false");
      list.classList.remove("is-open");
    }
    toggle.addEventListener("click", function () {
      var expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      list.classList.toggle("is-open", !expanded);
    });
    list.addEventListener("click", function (e) {
      if (e.target.tagName === "A") close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  /* ========================================================================
     Scroll reveal
     ======================================================================== */
  function initScrollReveal() {
    var targets = document.querySelectorAll("[data-reveal]");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ========================================================================
     Gallery lightbox
     ======================================================================== */
  function initLightbox() {
    var lightbox = document.getElementById("lightbox");
    var backdrop = document.getElementById("lightbox-backdrop");
    var closeBtn = document.getElementById("lightbox-close");
    var caption = document.getElementById("lightbox-caption");
    var items = document.querySelectorAll(".gallery-item");
    if (!lightbox || !items.length) return;

    var lastTrigger = null;

    function open(trigger) {
      lastTrigger = trigger;
      caption.textContent = trigger.getAttribute("data-caption") || "Photo needed";
      lightbox.hidden = false;
      requestAnimationFrame(function () { lightbox.classList.add("is-visible"); });
      document.addEventListener("keydown", onKeydown);
      closeBtn.focus();
    }

    function close() {
      lightbox.classList.remove("is-visible");
      document.removeEventListener("keydown", onKeydown);
      window.setTimeout(function () { lightbox.hidden = true; }, 320);
      if (lastTrigger) lastTrigger.focus();
    }

    function onKeydown(e) {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        // Single focusable control inside the panel — keep focus there.
        e.preventDefault();
        closeBtn.focus();
      }
    }

    items.forEach(function (item) {
      item.addEventListener("click", function () { open(item); });
    });
    closeBtn.addEventListener("click", close);
    backdrop.addEventListener("click", close);
  }

  /* ========================================================================
     Facebook toast
     Complementary landmark — no backdrop, no focus trap, no scroll lock.
     ======================================================================== */
  function initFacebookToast() {
    var toast = document.getElementById("fb-toast");
    var closeBtn = document.getElementById("fb-toast-close");
    if (!toast || !closeBtn) return;

    var STORAGE_KEY = "clothbarn-fb-toast-dismissed";
    if (localStorage.getItem(STORAGE_KEY) === "1") return;

    function dismiss() {
      toast.classList.remove("is-visible");
      window.setTimeout(function () { toast.hidden = true; }, 400);
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch (err) { /* storage unavailable */ }
      document.removeEventListener("keydown", onKeydown);
    }

    function onKeydown(e) {
      if (e.key === "Escape") dismiss();
    }

    window.setTimeout(function () {
      toast.hidden = false;
      requestAnimationFrame(function () { toast.classList.add("is-visible"); });
      document.addEventListener("keydown", onKeydown);
    }, 3500);

    closeBtn.addEventListener("click", dismiss);
  }

  /* ========================================================================
     Init
     ======================================================================== */
  document.addEventListener("DOMContentLoaded", function () {
    renderStatus();
    renderHoursTable();
    initHeaderShrink();
    initNavToggle();
    initScrollReveal();
    initLightbox();
    initFacebookToast();

    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Keep the open/closed indicator accurate across a long-lived tab.
    window.setInterval(renderStatus, 60000);
  });
})();
