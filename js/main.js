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

  /* ---- Hours table ---------------------------------------------------
     Consecutive days sharing the same hours (or both closed) collapse into
     one row — e.g. Tue-Fri — so the table stays short regardless of how
     HOURS above is edited. */
  function sameHours(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.open === b.open && a.close === b.close;
  }

  function groupHours(order) {
    var groups = [];
    order.forEach(function (day) {
      var spec = HOURS[day];
      var last = groups[groups.length - 1];
      if (last && sameHours(last.spec, spec)) {
        last.days.push(day);
      } else {
        groups.push({ days: [day], spec: spec });
      }
    });
    return groups;
  }

  function renderHoursTable() {
    var tbody = document.querySelector("#hours-table tbody");
    if (!tbody) return;
    var today = new Date().getDay();
    var order = [1, 2, 3, 4, 5, 6, 0]; // Monday-first display
    var groups = groupHours(order);

    var rows = groups.map(function (group) {
      var days = group.days;
      var label = days.length > 1
        ? DAY_SHORT[days[0]] + "–" + DAY_SHORT[days[days.length - 1]]
        : DAY_NAMES[days[0]];
      var classes = [];
      if (days.indexOf(today) !== -1) classes.push("is-today");
      if (!group.spec) classes.push("is-closed");
      return (
        '<tr class="' + classes.join(" ") + '">' +
        "<td>" + label + "</td>" +
        "<td>" + formatRange(group.spec) + "</td>" +
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
     Gallery carousel
     One slide advances per step; loops at both ends; items-per-view is
     measured from the rendered slide width so it always matches the CSS
     breakpoints in styles.css without duplicating them here.
     ======================================================================== */
  function initGalleryCarousel() {
    var root = document.getElementById("gallery-carousel");
    if (!root) return;

    var viewport = root.querySelector(".carousel__viewport");
    var track = root.querySelector(".carousel__track");
    var slides = Array.prototype.slice.call(track.children);
    var prevBtn = root.querySelector(".carousel__arrow--prev");
    var nextBtn = root.querySelector(".carousel__arrow--next");
    var dotsWrap = root.querySelector(".carousel__dots");
    if (!viewport || !track || !slides.length || !prevBtn || !nextBtn || !dotsWrap) return;

    var currentIndex = 0;
    var maxIndex = 0;

    function getViewportWidth() {
      var cs = window.getComputedStyle(viewport);
      var padL = parseFloat(cs.paddingLeft) || 0;
      var padR = parseFloat(cs.paddingRight) || 0;
      return viewport.clientWidth - padL - padR;
    }

    function getStep() {
      var cs = window.getComputedStyle(track);
      var gap = parseFloat(cs.columnGap || cs.gap) || 0;
      return slides[0].getBoundingClientRect().width + gap;
    }

    function renderDots() {
      dotsWrap.innerHTML = "";
      for (var i = 0; i <= maxIndex; i++) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel__dot";
        dot.setAttribute("aria-label", "Go to photo " + (i + 1));
        dot.setAttribute("aria-current", i === currentIndex ? "true" : "false");
        dot.addEventListener("click", (function (idx) {
          return function () { goTo(idx); };
        })(i));
        dotsWrap.appendChild(dot);
      }
    }

    function syncDots() {
      var dots = dotsWrap.querySelectorAll(".carousel__dot");
      dots.forEach(function (dot, i) {
        dot.setAttribute("aria-current", i === currentIndex ? "true" : "false");
      });
    }

    function render() {
      track.style.transform = "translateX(-" + (currentIndex * getStep()) + "px)";
      syncDots();
    }

    function goTo(index) {
      if (index < 0) index = maxIndex;
      else if (index > maxIndex) index = 0;
      currentIndex = index;
      render();
    }

    function next() { goTo(currentIndex + 1); }
    function prev() { goTo(currentIndex - 1); }

    function layout() {
      var itemsPerView = Math.max(1, Math.round(getViewportWidth() / getStep()));
      maxIndex = Math.max(0, slides.length - itemsPerView);
      if (currentIndex > maxIndex) currentIndex = maxIndex;
      renderDots();
      render();
    }

    prevBtn.addEventListener("click", prev);
    nextBtn.addEventListener("click", next);

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    });

    var touchStartX = null;
    var touchDeltaX = 0;
    track.addEventListener("touchstart", function (e) {
      touchStartX = e.touches[0].clientX;
      touchDeltaX = 0;
    }, { passive: true });
    track.addEventListener("touchmove", function (e) {
      if (touchStartX === null) return;
      touchDeltaX = e.touches[0].clientX - touchStartX;
    }, { passive: true });
    track.addEventListener("touchend", function () {
      if (touchStartX === null) return;
      var threshold = 40;
      if (touchDeltaX > threshold) prev();
      else if (touchDeltaX < -threshold) next();
      touchStartX = null;
      touchDeltaX = 0;
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(layout, 150);
    });

    layout();
  }

  /* ========================================================================
     Services carousel
     Extends initGalleryCarousel()'s approach (measured pixel step, transform-
     only movement, touch/keyboard nav) rather than modifying it — this
     carousel needs autoplay, a real play/pause control and a seamless loop
     that the gallery carousel doesn't, and the gallery must stay untouched.
     Seamless looping is done by cloning the full slide set once on each side
     of the track; "position" always self-corrects back into [0, realCount-1]
     right after each animated move finishes, using a transition-less snap.
     ======================================================================== */
  function initServicesCarousel() {
    var root = document.getElementById("services-carousel");
    if (!root) return;

    var viewport = root.querySelector(".carousel__viewport");
    var track = root.querySelector(".carousel__track");
    var prevBtn = root.querySelector(".carousel__arrow--prev");
    var nextBtn = root.querySelector(".carousel__arrow--next");
    var dotsWrap = root.querySelector(".carousel__dots");
    var playBtn = root.querySelector(".services-carousel__playpause");
    var realSlides = track ? Array.prototype.slice.call(track.children) : [];
    if (!viewport || !track || !prevBtn || !nextBtn || !dotsWrap || !realSlides.length) return;

    var realCount = realSlides.length;
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    realSlides.forEach(function (el, i) { el.setAttribute("data-real-index", String(i)); });

    function cloneSet() {
      return realSlides.map(function (el) {
        var clone = el.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        Array.prototype.forEach.call(clone.querySelectorAll("a, button"), function (focusable) {
          focusable.setAttribute("tabindex", "-1");
        });
        return clone;
      });
    }

    cloneSet().forEach(function (el) { track.appendChild(el); });
    cloneSet().slice().reverse().forEach(function (el) { track.insertBefore(el, track.firstChild); });
    var allSlides = Array.prototype.slice.call(track.children); // [clones][real][clones], 3x realCount

    var position = 0; // normalized real index — always in [0, realCount-1] at rest
    var playing = !reducedMotion;
    var suspended = false;
    var isAnimating = false;
    var timer = null;

    function getStep() {
      var cs = window.getComputedStyle(track);
      var gap = parseFloat(cs.columnGap || cs.gap) || 0;
      return allSlides[0].getBoundingClientRect().width + gap;
    }

    function setActive(realIndex) {
      allSlides.forEach(function (el) {
        var card = el.querySelector(".service-card");
        if (!card) return;
        card.classList.toggle("is-active", el.getAttribute("data-real-index") === String(realIndex));
      });
    }

    function syncDots() {
      var dots = dotsWrap.querySelectorAll(".carousel__dot");
      dots.forEach(function (dot, i) {
        dot.setAttribute("aria-current", i === position ? "true" : "false");
      });
    }

    function renderDots() {
      dotsWrap.innerHTML = "";
      for (var i = 0; i < realCount; i++) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel__dot";
        dot.setAttribute("aria-label", "Go to service " + (i + 1));
        dot.setAttribute("aria-current", i === position ? "true" : "false");
        dot.addEventListener("click", (function (idx) {
          return function () { userNavigate(function () { goToShortest(idx); }); };
        })(i));
        dotsWrap.appendChild(dot);
      }
    }

    function renderAt(virtualPos, animate) {
      var step = getStep();
      if (!animate) track.style.transition = "none";
      track.style.transform = "translateX(-" + ((realCount + virtualPos) * step) + "px)";
      if (!animate) {
        void track.offsetHeight; // force reflow so the instant jump doesn't animate
        track.style.transition = "";
      }
    }

    function normalize() {
      var normalized = ((position % realCount) + realCount) % realCount;
      if (normalized !== position) {
        position = normalized;
        renderAt(position, false);
      }
      setActive(position);
      syncDots();
      isAnimating = false;
    }

    function goTo(virtualPos) {
      if (isAnimating) return;
      isAnimating = true;
      position = virtualPos;
      renderAt(position, true);
      window.setTimeout(normalize, 650);
    }

    function goToShortest(targetRealIndex) {
      var forwardDist = ((targetRealIndex - position) % realCount + realCount) % realCount;
      var backwardDist = realCount - forwardDist;
      if (forwardDist <= backwardDist) goTo(position + forwardDist);
      else goTo(position - backwardDist);
    }

    function next() { goTo(position + 1); }
    function prev() { goTo(position - 1); }

    function updatePlayButton() {
      if (!playBtn) return;
      playBtn.setAttribute("aria-pressed", playing ? "true" : "false");
      playBtn.setAttribute("aria-label", playing ? "Pause automatic slideshow" : "Play automatic slideshow");
      var pauseIcon = playBtn.querySelector(".icon-pause");
      var playIcon = playBtn.querySelector(".icon-play");
      if (pauseIcon) pauseIcon.hidden = !playing;
      if (playIcon) playIcon.hidden = playing;
    }

    function syncTimer() {
      if (playing && !suspended) {
        if (!timer) timer = window.setInterval(next, 8000);
      } else if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    // Any manual navigation stops autoplay for good — it never resumes on
    // its own after this (WCAG 2.2.2's pause mechanism is the toggle below).
    function userNavigate(action) {
      if (playing) {
        playing = false;
        updatePlayButton();
      }
      syncTimer();
      action();
    }

    prevBtn.addEventListener("click", function () { userNavigate(prev); });
    nextBtn.addEventListener("click", function () { userNavigate(next); });

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); userNavigate(next); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); userNavigate(prev); }
    });

    if (playBtn) {
      playBtn.addEventListener("click", function () {
        playing = !playing; // the toggle is independent of userNavigate's permanent stop — it can restart autoplay
        updatePlayButton();
        syncTimer();
      });
    }

    // Hover/focus anywhere in the carousel (viewport, arrows, dots, the
    // play/pause button) suspends autoplay without touching `playing` —
    // it resumes on its own once the pointer/focus leaves, unless a manual
    // navigation already stopped it for good via userNavigate() above.
    root.addEventListener("mouseenter", function () { suspended = true; syncTimer(); });
    root.addEventListener("mouseleave", function () { suspended = false; syncTimer(); });
    root.addEventListener("focusin", function () { suspended = true; syncTimer(); });
    root.addEventListener("focusout", function (e) {
      if (!root.contains(e.relatedTarget)) { suspended = false; syncTimer(); }
    });

    var touchStartX = null;
    var touchDeltaX = 0;
    track.addEventListener("touchstart", function (e) {
      touchStartX = e.touches[0].clientX;
      touchDeltaX = 0;
    }, { passive: true });
    track.addEventListener("touchmove", function (e) {
      if (touchStartX === null) return;
      touchDeltaX = e.touches[0].clientX - touchStartX;
    }, { passive: true });
    track.addEventListener("touchend", function () {
      if (touchStartX === null) return;
      var threshold = 40;
      if (touchDeltaX > threshold) userNavigate(prev);
      else if (touchDeltaX < -threshold) userNavigate(next);
      touchStartX = null;
      touchDeltaX = 0;
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () { renderAt(position, false); }, 150);
    });

    renderAt(position, false);
    renderDots();
    setActive(position);
    updatePlayButton();
    syncTimer();
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
    initGalleryCarousel();
    initServicesCarousel();
    initLightbox();
    initFacebookToast();

    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Keep the open/closed indicator accurate across a long-lived tab.
    window.setInterval(renderStatus, 60000);
  });
})();
