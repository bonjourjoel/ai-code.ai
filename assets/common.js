/* AICode - shared behaviors for the public marketing pages. */

// ---- Hero cards sequential desktop entrance ----
const HERO_CARD_SEQUENCE_DESKTOP_QUERY = "(min-width: 901px)";
const HERO_CARD_SEQUENCE_ANIMATION_NAME = "heroCardSlideInBounce";
const WORKFLOW_STEP_SEQUENCE_ANIMATION_NAME = "workflowStepSlideInBounce";
const FEATURED_MENTIONS_CONTINUOUS_SCROLL_SPEED_PX_PER_MS = 0.72;

/**
 * Returns whether the hero cards should use the desktop-only sequential entrance.
 */
function isHeroCardSequenceDesktop() {
  return window.matchMedia(HERO_CARD_SEQUENCE_DESKTOP_QUERY).matches;
}

/**
 * Mirrors the current breakpoint into the root element so CSS can switch the
 * hero cards between desktop sequencing and the static mobile layout.
 */
function syncHeroCardSequenceDesktopMode() {
  document.documentElement.classList.toggle(
    "desktop-hero-card-seq",
    isHeroCardSequenceDesktop(),
  );
  document.documentElement.classList.toggle(
    "desktop-roi-card-seq",
    isHeroCardSequenceDesktop(),
  );
}

/**
 * Enables the sequential workflow-step entrance unless the user requested reduced motion.
 */
function syncWorkflowStepSequenceMode() {
  var reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  document.documentElement.classList.toggle(
    "workflow-step-seq-active",
    !reducedMotionQuery.matches,
  );
}

/**
 * Enables per-row scroll reveal for the problem comparison table unless reduced motion is requested.
 */
function syncProblemRowRevealMode() {
  var reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  document.documentElement.classList.toggle(
    "problem-row-scroll-active",
    !reducedMotionQuery.matches,
  );
}

// Apply the breakpoint class as soon as the script runs so desktop cards start hidden
// before the sequential entrance begins.
syncHeroCardSequenceDesktopMode();
syncWorkflowStepSequenceMode();
syncProblemRowRevealMode();
window.addEventListener("resize", syncHeroCardSequenceDesktopMode);

// ---- Scroll reveal ----
(function () {
  var els = document.querySelectorAll(".reveal");
  if (!window.IntersectionObserver) {
    els.forEach(function (el) {
      el.classList.add("visible");
    });
    return;
  }
  var obs = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
  );
  els.forEach(function (el) {
    obs.observe(el);
  });
})();

// ---- Sequential hero cards entrance (desktop only) ----
(function () {
  var container = document.querySelector(".hero-cards");
  if (!container) return;

  var cards = Array.prototype.slice.call(
    container.querySelectorAll(".hero-card-seq"),
  );
  if (!cards.length) return;

  // Mobile keeps the static layout: no staging, no hidden cards, no animation.
  if (!isHeroCardSequenceDesktop()) return;

  var hasStarted = false;

  function startCardAt(index) {
    if (index >= cards.length) return;

    var card = cards[index];

    // Reveal exactly one card now. The next card waits for this animation to finish.
    card.classList.add("hero-card-seq-entered");

    card.addEventListener("animationend", function onAnimationEnd(event) {
      // Ignore unrelated animation events so the chaining remains deterministic.
      if (event.animationName !== HERO_CARD_SEQUENCE_ANIMATION_NAME) return;

      card.removeEventListener("animationend", onAnimationEnd);
      startCardAt(index + 1);
    });
  }

  function startSequenceOnce() {
    if (hasStarted) return;
    hasStarted = true;
    startCardAt(0);
  }

  // Follow the workflow reveal model: start only when the hero card strip is actually in view.
  if (!window.IntersectionObserver) {
    startSequenceOnce();
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        observer.unobserve(container);
        startSequenceOnce();
      });
    },
    { threshold: 0.35 },
  );

  observer.observe(container);
})();

// ---- Problem comparison rows reveal independently on scroll ----
(function () {
  var rows = document.querySelectorAll(".problem-row-reveal");
  if (!rows.length) return;

  // Reduced-motion mode keeps every row visible with no staging.
  if (
    !document.documentElement.classList.contains("problem-row-scroll-active")
  ) {
    rows.forEach(function (row) {
      row.classList.add("problem-row-visible");
    });
    return;
  }

  if (!window.IntersectionObserver) {
    rows.forEach(function (row) {
      row.classList.add("problem-row-visible");
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("problem-row-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.32, rootMargin: "0px 0px -10% 0px" },
  );

  rows.forEach(function (row) {
    observer.observe(row);
  });
})();

// ---- Featured mentions infinite carousel ----

/**
 * Builds one inert clone for the infinite-loop press strip.
 */
function cloneFeaturedCarouselItem(item) {
  var clone = item.cloneNode(true);
  var cloneImage = clone.querySelector("img");

  // Keep the duplicated cards clickable for pointer users while removing them from
  // sequential keyboard navigation and screen-reader repetition.
  clone.removeAttribute("data-featured-carousel-item");
  clone.setAttribute("data-featured-carousel-clone", "true");
  clone.setAttribute("aria-hidden", "true");
  clone.tabIndex = -1;

  // Only the canonical hero cards need eager loading. The off-screen loop copies can
  // yield to the browser because they reuse the same already-cached assets.
  if (cloneImage !== null) {
    cloneImage.loading = "lazy";
    cloneImage.decoding = "async";
    cloneImage.setAttribute("fetchpriority", "low");
  }

  return clone;
}

/**
 * Measures the width of one canonical press cycle, including the inter-card gap.
 */
function measureFeaturedCarouselCycleWidth(state) {
  if (!state.appendedItems.length || !state.originalItems.length) {
    return 0;
  }

  // The loop resets by jumping from the canonical cycle to the appended duplicate
  // cycle. Measuring start-to-start guarantees the visual content stays identical
  // after each wrap without inventing a synthetic starting offset.
  return (
    state.appendedItems[0].offsetLeft - state.originalItems[0].offsetLeft || 0
  );
}

/**
 * Persists the logical progress inside the canonical cycle.
 */
function updateFeaturedCarouselProgress(state) {
  if (!state.originalItems.length || state.cycleWidth <= 0) {
    state.progressRatio = 0;
    return;
  }

  // The canonical cycle starts at scrollLeft = 0. Using the browser-managed scroll
  // offset directly avoids mixing in absolute DOM coordinates from offsetLeft, which
  // would otherwise reintroduce a fake initial offset after ResizeObserver refreshes.
  var relativeOffset = state.viewport.scrollLeft;
  var normalizedOffset =
    ((relativeOffset % state.cycleWidth) + state.cycleWidth) % state.cycleWidth;

  state.progressRatio = normalizedOffset / state.cycleWidth;
}

/**
 * Restores the last known logical progress after a resize changes card widths.
 */
function restoreFeaturedCarouselProgress(state) {
  if (!state.originalItems.length || state.cycleWidth <= 0) {
    return;
  }

  // The canonical cycle starts at the browser's natural left edge, so restoration
  // only reapplies the logical offset inside that first cycle.
  state.viewport.scrollLeft = state.progressRatio * state.cycleWidth;
}

/**
 * Repositions the scroll head whenever it drifts into the cloned copies.
 */
function normalizeFeaturedCarouselScroll(state) {
  if (state.cycleWidth <= 0) {
    return;
  }

  // The visible cycle always lives in the browser's natural [0, cycleWidth) range.
  // When the viewport drifts into the appended copy, jump back by one exact cycle.
  while (state.viewport.scrollLeft >= state.cycleWidth) {
    state.viewport.scrollLeft -= state.cycleWidth;
  }
}

/**
 * Stops any in-flight analog arrow scroll.
 */
function stopFeaturedCarouselAnalogScroll(state) {
  if (state.animationFrameId !== 0) {
    window.cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = 0;
  }

  // Reset the active arrow styling as soon as the hold interaction ends.
  if (state.activeButton !== null) {
    state.activeButton.classList.remove("is-active");
  }

  state.activeButton = null;
  state.activeDirection = 0;
  state.lastStepTimestamp = 0;
}

/**
 * Starts a hold-to-scroll interaction on one arrow.
 */
function startFeaturedCarouselAnalogScroll(state, direction, button) {
  if (state.cycleWidth <= 0) {
    return;
  }

  // Restarting from a clean state keeps timestamp deltas bounded when users switch
  // directly from one arrow to the opposite arrow.
  stopFeaturedCarouselAnalogScroll(state);
  state.activeButton = button;
  state.activeDirection = direction;
  state.lastStepTimestamp = 0;
  button.classList.add("is-active");

  /**
   * Advances the scroll head proportionally to frame time while the pointer stays held.
   */
  function step(timestamp) {
    if (state.activeDirection === 0) {
      return;
    }

    var deltaMs = 16;

    if (state.lastStepTimestamp !== 0) {
      deltaMs = timestamp - state.lastStepTimestamp;
    }

    state.lastStepTimestamp = timestamp;

    // The carousel must visually start at the very first card. When users press the
    // left arrow from that natural origin, first hop to the duplicated cycle, then
    // continue the analog motion from there so the loop still feels infinite.
    if (state.activeDirection < 0 && state.viewport.scrollLeft <= 1) {
      state.viewport.scrollLeft += state.cycleWidth;
    }

    // The motion stays analog because we add a continuous pixel delta every frame
    // instead of snapping by card-sized jumps.
    state.viewport.scrollLeft +=
      state.activeDirection *
      deltaMs *
      FEATURED_MENTIONS_CONTINUOUS_SCROLL_SPEED_PX_PER_MS;
    normalizeFeaturedCarouselScroll(state);
    updateFeaturedCarouselProgress(state);
    state.animationFrameId = window.requestAnimationFrame(step);
  }

  state.animationFrameId = window.requestAnimationFrame(step);
}

/**
 * Re-measures the loop after layout changes.
 */
function refreshFeaturedCarouselMetrics(state) {
  state.cycleWidth = measureFeaturedCarouselCycleWidth(state);
  restoreFeaturedCarouselProgress(state);
  normalizeFeaturedCarouselScroll(state);
  updateFeaturedCarouselProgress(state);
}

/**
 * Schedules one metric refresh on the next frame to avoid repeated synchronous layout work.
 */
function scheduleFeaturedCarouselRefresh(state) {
  if (state.refreshFrameId !== 0) {
    window.cancelAnimationFrame(state.refreshFrameId);
  }

  state.refreshFrameId = window.requestAnimationFrame(function () {
    state.refreshFrameId = 0;
    refreshFeaturedCarouselMetrics(state);
  });
}

(function () {
  var root = document.querySelector("[data-featured-carousel]");
  if (!root || root.dataset.featuredCarouselReady === "true") return;

  var viewport = root.querySelector("[data-featured-carousel-viewport]");
  var buttons = Array.prototype.slice.call(
    root.querySelectorAll("[data-featured-carousel-direction]"),
  );
  var originalItems = Array.prototype.slice.call(
    viewport ? viewport.querySelectorAll("[data-featured-carousel-item]") : [],
  );

  if (!viewport || originalItems.length === 0 || buttons.length !== 2) {
    return;
  }

  var appendedItems = originalItems.map(cloneFeaturedCarouselItem);

  // Keep the native browser origin on the canonical first card. Only append a second
  // cycle so forward scrolling and left-arrow wraparound can reuse identical content.
  appendedItems.forEach(function (clone) {
    viewport.appendChild(clone);
  });

  var state = {
    viewport: viewport,
    originalItems: originalItems,
    appendedItems: appendedItems,
    cycleWidth: 0,
    progressRatio: 0,
    animationFrameId: 0,
    refreshFrameId: 0,
    activeButton: null,
    activeDirection: 0,
    lastStepTimestamp: 0,
  };

  root.dataset.featuredCarouselReady = "true";
  refreshFeaturedCarouselMetrics(state);

  // The first visible frame must start at the browser's natural left edge so the
  // hero looks like a normal strip before the user touches the arrows.
  viewport.scrollLeft = 0;
  updateFeaturedCarouselProgress(state);

  viewport.addEventListener(
    "scroll",
    function () {
      normalizeFeaturedCarouselScroll(state);
      updateFeaturedCarouselProgress(state);
    },
    { passive: true },
  );

  buttons.forEach(function (button) {
    var direction = Number(button.dataset.featuredCarouselDirection);

    button.addEventListener("pointerdown", function (event) {
      // Ignore secondary mouse buttons so right-click still behaves like a normal button.
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      event.preventDefault();
      startFeaturedCarouselAnalogScroll(state, direction, button);
    });

    button.addEventListener("pointerleave", function (event) {
      // Mouse hover should stop as soon as the pointer leaves the arrow.
      if (event.pointerType === "mouse") {
        stopFeaturedCarouselAnalogScroll(state);
      }
    });

    button.addEventListener("pointerup", function () {
      stopFeaturedCarouselAnalogScroll(state);
    });

    button.addEventListener("pointercancel", function () {
      stopFeaturedCarouselAnalogScroll(state);
    });

    button.addEventListener("blur", function () {
      stopFeaturedCarouselAnalogScroll(state);
    });

    button.addEventListener("keydown", function (event) {
      if (event.key !== " " && event.key !== "Enter") {
        return;
      }

      // Keyboard users get the same hold-to-scroll behavior while the key stays pressed.
      event.preventDefault();
      startFeaturedCarouselAnalogScroll(state, direction, button);
    });

    button.addEventListener("keyup", function (event) {
      if (event.key === " " || event.key === "Enter") {
        stopFeaturedCarouselAnalogScroll(state);
      }
    });
  });

  // Releasing the pointer outside the arrow must still stop the analog motion.
  document.addEventListener("pointerup", function () {
    stopFeaturedCarouselAnalogScroll(state);
  });
  document.addEventListener("pointercancel", function () {
    stopFeaturedCarouselAnalogScroll(state);
  });

  window.addEventListener("resize", function () {
    scheduleFeaturedCarouselRefresh(state);
  });

  if (typeof ResizeObserver === "function") {
    var resizeObserver = new ResizeObserver(function () {
      scheduleFeaturedCarouselRefresh(state);
    });

    resizeObserver.observe(viewport);
  }
})();

// ---- Sequential ROI cards entrance (desktop only) ----
(function () {
  var container = document.querySelector(".roi-cards");
  if (!container) return;

  var cards = Array.prototype.slice.call(
    container.querySelectorAll(".roi-card-seq"),
  );
  if (!cards.length) return;

  // Match the hero behavior exactly: static on mobile, staged one by one on desktop.
  if (!isHeroCardSequenceDesktop()) return;

  var hasStarted = false;

  function startCardAt(index) {
    if (index >= cards.length) return;

    var card = cards[index];

    // Reveal exactly one ROI card now. The next one waits for the full landing animation.
    card.classList.add("roi-card-seq-entered");

    card.addEventListener("animationend", function onAnimationEnd(event) {
      if (event.animationName !== HERO_CARD_SEQUENCE_ANIMATION_NAME) return;

      card.removeEventListener("animationend", onAnimationEnd);
      startCardAt(index + 1);
    });
  }

  function startSequenceOnce() {
    if (hasStarted) return;
    hasStarted = true;
    startCardAt(0);
  }

  // Follow the same viewport trigger as the hero cards so the strip starts only when visible.
  if (!window.IntersectionObserver) {
    startSequenceOnce();
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        observer.unobserve(container);
        startSequenceOnce();
      });
    },
    { threshold: 0.35 },
  );

  observer.observe(container);
})();

// ---- Sequential workflow steps entrance ----
(function () {
  var container = document.querySelector(".workflow-steps");
  if (!container) return;

  var steps = Array.prototype.slice.call(
    container.querySelectorAll(".workflow-step-seq"),
  );
  if (!steps.length) return;

  // When reduced motion is enabled, leave the workflow visible with no scripted staging.
  if (
    !document.documentElement.classList.contains("workflow-step-seq-active")
  ) {
    return;
  }

  var hasStarted = false;

  function startStepAt(index) {
    if (index >= steps.length) return;

    var step = steps[index];

    // Launch exactly one step now; the next step waits for the full travel + rebound.
    step.classList.add("workflow-step-seq-entered");

    step.addEventListener("animationend", function onAnimationEnd(event) {
      if (event.animationName !== WORKFLOW_STEP_SEQUENCE_ANIMATION_NAME) return;

      step.removeEventListener("animationend", onAnimationEnd);
      startStepAt(index + 1);
    });
  }

  function startSequenceOnce() {
    if (hasStarted) return;
    hasStarted = true;
    startStepAt(0);
  }

  // Keep the same reveal timing philosophy as the hero cards: the sequence starts
  // only when the workflow strip enters the viewport.
  if (!window.IntersectionObserver) {
    startSequenceOnce();
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;

        observer.unobserve(container);
        startSequenceOnce();
      });
    },
    { threshold: 0.2 },
  );

  observer.observe(container);
})();

// ---- Typing effect for hero antidote line ----
(function () {
  var container = document.getElementById("hero-antidote");
  var cursor = document.getElementById("typing-cursor");
  if (!container || !cursor) return;
  var text = container.dataset.text;
  var i = 0;
  var delay = 680; // ms before starting
  var speed = 42; // ms per character - full text in ~1.05s
  function type() {
    if (i < text.length) {
      // Insert character before cursor
      cursor.insertAdjacentText("beforebegin", text[i]);
      i++;
      setTimeout(type, speed);
    } else {
      // Done - fade cursor out
      cursor.classList.add("done");
    }
  }
  setTimeout(type, delay);
})();

// ---- Sticky nav background on scroll ----
// The nav is statically precomposed into every deployable page by the sites build.
(function () {
  window.addEventListener(
    "scroll",
    function () {
      var nav = document.querySelector("nav");
      if (!nav) return;
      nav.style.background =
        window.scrollY > 40 ? "rgba(11,11,11,0.97)" : "rgba(11,11,11,0.88)";
    },
    { passive: true },
  );
})();

// ---- Hero screenshot lightbox ----
const HERO_IMAGE_LIGHTBOX_ANIMATION_MS = 260;
const HERO_IMAGE_LIGHTBOX_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/**
 * Returns the UI labels for the shared lightbox (accessibility only, English).
 */
function getHeroImageLightboxLabels() {
  return {
    close: "Close screenshot preview",
    dialog: "Expanded screenshot preview",
  };
}

/**
 * Builds the single overlay reused by every hero screenshot.
 */
function createHeroImageLightbox() {
  var labels = getHeroImageLightboxLabels();
  var overlay = document.createElement("div");
  var frame = document.createElement("div");
  var closeButton = document.createElement("button");
  var image = document.createElement("img");

  // Keep the overlay inert while closed so it does not intercept page interactions.
  overlay.className = "image-lightbox";
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");

  // The dialog frame hosts the final fullscreen screenshot once the zoom animation completes.
  frame.className = "image-lightbox-frame";
  frame.setAttribute("role", "dialog");
  frame.setAttribute("aria-modal", "true");
  frame.setAttribute("aria-label", labels.dialog);

  // The close control remains explicit even though clicking anywhere on the overlay closes it too.
  closeButton.className = "image-lightbox-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", labels.close);
  closeButton.setAttribute("title", labels.close);
  closeButton.textContent = "×";

  // The real fullscreen image stays hidden while the moving ghost animates into place.
  image.className = "image-lightbox-image";
  image.alt = "";

  frame.appendChild(closeButton);
  frame.appendChild(image);
  overlay.appendChild(frame);
  document.body.appendChild(overlay);

  return {
    overlay: overlay,
    frame: frame,
    image: image,
    activeSourceImage: null,
    animationTimer: null,
    animationSessionId: 0,
    ghost: null,
  };
}

/**
 * Resolves on the next animation frame so layout-dependent measurements can be taken after DOM updates.
 */
function waitForNextAnimationFrame() {
  return new Promise(function (resolve) {
    window.requestAnimationFrame(function () {
      resolve();
    });
  });
}

/**
 * Waits until an image element has a decoded bitmap before relying on its final rendered geometry.
 */
function waitForImageReady(image) {
  if (!image) {
    return Promise.resolve();
  }

  // If the browser already has a decoded bitmap, geometry is stable enough to measure immediately.
  if (image.complete && image.naturalWidth > 0) {
    return Promise.resolve();
  }

  if (typeof image.decode === "function") {
    return image.decode().catch(function () {
      return undefined;
    });
  }

  return new Promise(function (resolve) {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  });
}

/**
 * Removes the temporary animated ghost if one is currently attached.
 */
function removeHeroImageLightboxGhost(lightbox) {
  if (!lightbox || !lightbox.ghost) return;

  lightbox.ghost.remove();
  lightbox.ghost = null;
}

/**
 * Cancels any in-flight zoom animation so a new open/close sequence can start cleanly.
 */
function cancelHeroImageLightboxAnimation(lightbox) {
  if (!lightbox) return;

  if (lightbox.animationTimer !== null) {
    window.clearTimeout(lightbox.animationTimer);
    lightbox.animationTimer = null;
  }

  removeHeroImageLightboxGhost(lightbox);
}

/**
 * Applies an absolute viewport rectangle to the animated ghost frame.
 */
function applyHeroImageLightboxGhostRect(ghost, rect) {
  ghost.style.top = rect.top + "px";
  ghost.style.left = rect.left + "px";
  ghost.style.width = rect.width + "px";
  ghost.style.height = rect.height + "px";
}

/**
 * Reads the current frame metrics so the animated border/padding match the real fullscreen shell.
 */
function getHeroImageLightboxFrameMetrics(lightbox) {
  var computedStyle = window.getComputedStyle(lightbox.frame);

  return {
    insetTop:
      parseFloat(computedStyle.paddingTop) +
      parseFloat(computedStyle.borderTopWidth),
    insetRight:
      parseFloat(computedStyle.paddingRight) +
      parseFloat(computedStyle.borderRightWidth),
    insetBottom:
      parseFloat(computedStyle.paddingBottom) +
      parseFloat(computedStyle.borderBottomWidth),
    insetLeft:
      parseFloat(computedStyle.paddingLeft) +
      parseFloat(computedStyle.borderLeftWidth),
  };
}

/**
 * Expands the thumbnail image rectangle so the ghost frame wraps it from the very first frame.
 */
function buildHeroImageLightboxSourceFrameRect(sourceRect, metrics) {
  return {
    top: sourceRect.top - metrics.insetTop,
    left: sourceRect.left - metrics.insetLeft,
    width: sourceRect.width + metrics.insetLeft + metrics.insetRight,
    height: sourceRect.height + metrics.insetTop + metrics.insetBottom,
  };
}

/**
 * Creates the animated ghost frame that visually travels between the card screenshot and the fullscreen slot.
 */
function createHeroImageLightboxGhost(sourceImage, fromRect) {
  var ghost = document.createElement("div");
  var ghostImage = sourceImage.cloneNode(false);
  var ghostClose = document.createElement("span");

  // The ghost reproduces the fullscreen frame shell so the border and close control
  // are already visible while the zoom is travelling from the card.
  ghost.className = "image-lightbox-ghost";

  // Clone an already loaded image node so the travelling shell reuses a ready bitmap instead
  // of racing a fresh network/decode path during the zoom animation.
  ghostImage.className = "image-lightbox-ghost-image";
  ghostImage.alt = sourceImage.alt || "";

  // The close glyph is visual only on the ghost: the overlay still handles every click.
  ghostClose.className = "image-lightbox-ghost-close";
  ghostClose.setAttribute("aria-hidden", "true");
  ghostClose.textContent = "×";

  ghost.appendChild(ghostImage);
  ghost.appendChild(ghostClose);
  applyHeroImageLightboxGhostRect(ghost, fromRect);

  return ghost;
}

/**
 * Hides the overlay and resets the fullscreen image once the zoom sequence is fully done.
 */
function resetHeroImageLightbox(lightbox) {
  if (!lightbox) return;

  lightbox.overlay.hidden = true;
  lightbox.overlay.classList.remove("is-open", "is-measuring", "is-closing");
  lightbox.overlay.setAttribute("aria-hidden", "true");
  lightbox.image.classList.remove("is-visible");
  lightbox.image.removeAttribute("src");
  lightbox.image.alt = "";
  lightbox.activeSourceImage = null;
  document.body.classList.remove("has-image-lightbox");
  cancelHeroImageLightboxAnimation(lightbox);
}

/**
 * Opens the shared overlay by animating a ghost from the clicked card image to the fullscreen slot.
 */
async function openHeroImageLightbox(lightbox, sourceImage) {
  if (!lightbox || !sourceImage) return;

  var sourceRect = sourceImage.getBoundingClientRect();
  var imageUrl = sourceImage.currentSrc || sourceImage.src;
  var sessionId = lightbox.animationSessionId + 1;

  // Reset any previous animation state before starting a fresh zoom from the clicked thumbnail.
  cancelHeroImageLightboxAnimation(lightbox);
  lightbox.animationSessionId = sessionId;
  lightbox.activeSourceImage = sourceImage;
  lightbox.image.src = imageUrl;
  lightbox.image.alt = sourceImage.alt || "";
  lightbox.image.classList.remove("is-visible");

  // Make the overlay participate in layout immediately so the fullscreen target rectangle is measurable.
  lightbox.overlay.hidden = false;
  lightbox.overlay.classList.add("is-open", "is-measuring");
  lightbox.overlay.classList.remove("is-closing");
  lightbox.overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("has-image-lightbox");

  // Wait until the fullscreen image is decoded and the overlay layout has settled before
  // measuring the target frame. This removes the intermittent zero-height / no-image race.
  await waitForImageReady(lightbox.image);
  await waitForNextAnimationFrame();
  await waitForNextAnimationFrame();

  if (sessionId !== lightbox.animationSessionId || lightbox.overlay.hidden) {
    return;
  }

  var frameMetrics = getHeroImageLightboxFrameMetrics(lightbox);
  var sourceFrameRect = buildHeroImageLightboxSourceFrameRect(
    sourceRect,
    frameMetrics,
  );
  var targetRect = lightbox.frame.getBoundingClientRect();
  var ghost = createHeroImageLightboxGhost(sourceImage, sourceFrameRect);

  lightbox.ghost = ghost;
  document.body.appendChild(ghost);

  // Fade in the shell immediately and start the real zoom on the next frame so the browser
  // captures the thumbnail-aligned geometry before we move the whole framed preview.
  await waitForNextAnimationFrame();

  if (sessionId !== lightbox.animationSessionId || lightbox.overlay.hidden) {
    removeHeroImageLightboxGhost(lightbox);
    return;
  }

  ghost.style.transition =
    "top " +
    HERO_IMAGE_LIGHTBOX_ANIMATION_MS +
    "ms " +
    HERO_IMAGE_LIGHTBOX_EASING +
    ", left " +
    HERO_IMAGE_LIGHTBOX_ANIMATION_MS +
    "ms " +
    HERO_IMAGE_LIGHTBOX_EASING +
    ", width " +
    HERO_IMAGE_LIGHTBOX_ANIMATION_MS +
    "ms " +
    HERO_IMAGE_LIGHTBOX_EASING +
    ", height " +
    HERO_IMAGE_LIGHTBOX_ANIMATION_MS +
    "ms " +
    HERO_IMAGE_LIGHTBOX_EASING +
    ", opacity 0.18s ease";
  ghost.classList.add("is-visible");
  ghost.classList.remove("is-chrome-hidden");
  applyHeroImageLightboxGhostRect(ghost, targetRect);

  lightbox.animationTimer = window.setTimeout(function () {
    // Ignore stale completion callbacks if a newer open/close cycle started meanwhile.
    if (sessionId !== lightbox.animationSessionId) {
      return;
    }

    // Reveal the real fullscreen frame only after the ghost arrives so the zoom remains continuous.
    lightbox.image.classList.add("is-visible");
    lightbox.overlay.classList.remove("is-measuring");
    lightbox.animationTimer = null;
    removeHeroImageLightboxGhost(lightbox);
  }, HERO_IMAGE_LIGHTBOX_ANIMATION_MS);
}

/**
 * Closes the overlay by sending a ghost from the fullscreen slot back to the originating card image.
 */
function closeHeroImageLightbox(lightbox) {
  if (!lightbox || lightbox.overlay.hidden) return;

  var sourceImage = lightbox.activeSourceImage;
  var sessionId = lightbox.animationSessionId + 1;
  var canAnimateBack =
    sourceImage &&
    sourceImage.isConnected &&
    sourceImage.getBoundingClientRect().width > 0 &&
    sourceImage.getBoundingClientRect().height > 0;

  // Stop any pending open animation so the closing zoom uses the current visible geometry.
  cancelHeroImageLightboxAnimation(lightbox);
  lightbox.animationSessionId = sessionId;

  // If the source thumbnail is no longer measurable, fall back to an immediate teardown.
  if (!canAnimateBack) {
    resetHeroImageLightbox(lightbox);
    return;
  }

  var frameMetrics = getHeroImageLightboxFrameMetrics(lightbox);
  var fromRect = lightbox.frame.getBoundingClientRect();
  var targetRect = buildHeroImageLightboxSourceFrameRect(
    sourceImage.getBoundingClientRect(),
    frameMetrics,
  );
  var ghost = createHeroImageLightboxGhost(lightbox.image, fromRect);

  // Hide the real fullscreen content instantly so only the framed ghost remains visible during zoom-out.
  lightbox.overlay.classList.add("is-closing");
  lightbox.image.classList.remove("is-visible");
  lightbox.ghost = ghost;
  ghost.classList.add("is-visible");
  document.body.appendChild(ghost);

  // Fade the backdrop away while the framed ghost returns to the thumbnail location.
  lightbox.overlay.classList.remove("is-open");

  // Trigger the reverse zoom on the next frame so the browser keeps the fullscreen frame geometry.
  window.requestAnimationFrame(function () {
    ghost.style.transition =
      "top " +
      HERO_IMAGE_LIGHTBOX_ANIMATION_MS +
      "ms " +
      HERO_IMAGE_LIGHTBOX_EASING +
      ", left " +
      HERO_IMAGE_LIGHTBOX_ANIMATION_MS +
      "ms " +
      HERO_IMAGE_LIGHTBOX_EASING +
      ", width " +
      HERO_IMAGE_LIGHTBOX_ANIMATION_MS +
      "ms " +
      HERO_IMAGE_LIGHTBOX_EASING +
      ", height " +
      HERO_IMAGE_LIGHTBOX_ANIMATION_MS +
      "ms " +
      HERO_IMAGE_LIGHTBOX_EASING +
      ", opacity 0.18s ease";
    ghost.classList.add("is-chrome-hidden");
    applyHeroImageLightboxGhostRect(ghost, targetRect);
  });

  lightbox.animationTimer = window.setTimeout(function () {
    if (sessionId !== lightbox.animationSessionId) {
      return;
    }

    // Tear everything down only after the ghost lands back on the card screenshot.
    lightbox.animationTimer = null;
    resetHeroImageLightbox(lightbox);
  }, HERO_IMAGE_LIGHTBOX_ANIMATION_MS);
}

// Bind the hero card screenshots to the shared fullscreen overlay.
(function () {
  var triggers = document.querySelectorAll(".eco-img-button");
  if (!triggers.length) return;

  var lightbox = createHeroImageLightbox();

  triggers.forEach(function (trigger) {
    trigger.addEventListener("click", function (event) {
      // Mobile uses the anchor target directly because the geometric zoom animation
      // is tuned for desktop layout coordinates and is intentionally disabled there.
      if (!isHeroCardSequenceDesktop()) {
        return;
      }

      event.preventDefault();

      var sourceImage = trigger.querySelector("img");
      openHeroImageLightbox(lightbox, sourceImage);
    });
  });

  lightbox.overlay.addEventListener("click", function () {
    closeHeroImageLightbox(lightbox);
  });
})();

// ---- Lang utils ----
const SUPPORTED_LANGS = ["en", "fr"];
const DEFAULT_LANG = "en";

function getLangFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts.length > 0 && SUPPORTED_LANGS.includes(parts[0])
    ? parts[0]
    : null;
}

function getStoredLangOverride() {
  var storedLang = localStorage.getItem("lang-override");

  // Ignore stale or unexpected values so future manual storage edits cannot
  // send the public site into an unsupported routing state.
  return SUPPORTED_LANGS.includes(storedLang) ? storedLang : null;
}

function getPathWithoutLangSuffix() {
  var pathname = window.location.pathname || "/";
  var currentLang = getLangFromPath();

  // Preserve the raw suffix exactly as served by the site (`/services/`,
  // `/services/index.html`, `/#hero`, etc.) so later redirects compare and
  // rebuild the same canonical shape instead of oscillating between aliases.
  if (currentLang === null) {
    return pathname;
  }

  var prefix = "/" + currentLang;
  var suffix = pathname.slice(prefix.length);

  return suffix.length > 0 ? suffix : "/";
}

function buildLocalizedPath(lang, pathWithoutLangSuffix) {
  var suffix = pathWithoutLangSuffix || "/";
  var localizedPath =
    lang === DEFAULT_LANG
      ? suffix
      : "/" + lang + (suffix === "/" ? "/" : suffix);

  // Preserve the current query string and anchor so a manual language choice
  // remains stable even when the user returns via section links or shared URLs.
  return localizedPath + window.location.search + window.location.hash;
}

function switchLang(select) {
  localStorage.setItem("lang-override", select.value);
  const pathWithoutLangSuffix = getPathWithoutLangSuffix();
  const newPath = buildLocalizedPath(select.value, pathWithoutLangSuffix);
  window.location.href = newPath;
}

// ---- Auto lang redirect ----
(function () {
  if (/claudeusercontent\.com$/.test(location.hostname)) return; // preview sandbox
  const currentLang = getLangFromPath();
  const pathWithoutLangSuffix = getPathWithoutLangSuffix();
  const storedLang = getStoredLangOverride();

  // A manual language selection is the strongest signal: once the user picked
  // a language from the switcher, keep that language pinned on every later visit.
  if (storedLang !== null) {
    var desiredStoredPath = buildLocalizedPath(
      storedLang,
      pathWithoutLangSuffix,
    );
    var currentFullPath =
      window.location.pathname + window.location.search + window.location.hash;

    // The English locale is represented by the root path with no language prefix,
    // so equality must be checked against the fully rebuilt target URL instead of
    // comparing the raw `currentLang` marker only.
    if (desiredStoredPath === currentFullPath) return;

    // English lives at the root while French uses the `/fr/` prefix, so the
    // redirect target must always be rebuilt from the path without its language.
    window.location.replace(desiredStoredPath);
    return;
  }

  if (currentLang !== null) return;

  const browserLang = (navigator.language || "").slice(0, 2).toLowerCase();
  if (browserLang === DEFAULT_LANG || !SUPPORTED_LANGS.includes(browserLang))
    return;

  // When no explicit user choice exists yet, fall back to browser detection
  // while keeping the same page path and anchor.
  window.location.replace(
    buildLocalizedPath(browserLang, pathWithoutLangSuffix),
  );
})();

// ---- Lang switcher init ----
// The header is present in the initial HTML, so DOM readiness is the only
// initialization barrier required for the shared language selector.
function initLangSelect() {
  const sel = document.querySelector(".lang-switcher select");
  if (sel)
    sel.value = getStoredLangOverride() || getLangFromPath() || DEFAULT_LANG;
}
document.addEventListener("DOMContentLoaded", initLangSelect);
