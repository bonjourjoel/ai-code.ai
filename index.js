// ---- Email ----
function getFullEmail() {
  var user = "joel";
  var domain = "aisovereignlabs";
  var tld = "ai";
  return user + "@" + domain + "." + tld;
}

function handleContactClick(event) {
  var fullAddress = getFullEmail();
  var el = event.currentTarget;

  if (el.dataset.revealed !== "1") {
    if (event) event.preventDefault();
    var anchors = ["#nav-contact", "#footer-contact", "#footer-legal-contact"];
    anchors.forEach(function (sel) {
      var target = document.querySelector(sel);
      if (target) {
        target.href = "mailto:" + fullAddress;
        target.textContent = fullAddress;
        target.dataset.revealed = "1";
      }
    });
  }
}

function handlePricingClick(event, plan) {
  var fullAddress = getFullEmail();
  var btn = document.getElementById("pricing-" + plan + "-btn");

  if (btn && btn.dataset.revealed !== "1") {
    if (event) event.preventDefault();
    btn.textContent = fullAddress;
    btn.href = "mailto:" + fullAddress;
    btn.dataset.revealed = "1";
  }
}

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

// ---- Typing effect for hero antidote line ----
(function () {
  var container = document.getElementById("hero-antidote");
  var cursor = document.getElementById("typing-cursor");
  if (!container || !cursor) return;
  var text = container.dataset.text;
  var i = 0;
  var delay = 680; // ms before starting
  var speed = 42; // ms per character — full text in ~1.05s
  function type() {
    if (i < text.length) {
      // Insert character before cursor
      cursor.insertAdjacentText("beforebegin", text[i]);
      i++;
      setTimeout(type, speed);
    } else {
      // Done — fade cursor out
      cursor.classList.add("done");
    }
  }
  setTimeout(type, delay);
})();

// ---- Sticky nav background on scroll ----
(function () {
  var nav = document.querySelector("nav");
  window.addEventListener(
    "scroll",
    function () {
      nav.style.background =
        window.scrollY > 40 ? "rgba(11,11,11,0.97)" : "rgba(11,11,11,0.88)";
    },
    { passive: true },
  );
})();

// ---- Hero screenshot lightbox ----
const HERO_IMAGE_LIGHTBOX_ANIMATION_MS = 180;

/**
 * Returns the UI labels for the shared lightbox based on the current document language.
 */
function getHeroImageLightboxLabels() {
  var isFrench = document.documentElement.lang === "fr";

  return {
    close: isFrench
      ? "Fermer l'aperçu du screenshot"
      : "Close screenshot preview",
    dialog: isFrench
      ? "Aperçu agrandi du screenshot"
      : "Expanded screenshot preview",
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

  // Keep the overlay inert while closed so it does not interfere with page clicks.
  overlay.className = "image-lightbox";
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");

  // The dialog frame only carries layout and semantics. Clicks still bubble to the overlay
  // so the whole screen, including the enlarged screenshot area, closes the preview.
  frame.className = "image-lightbox-frame";
  frame.setAttribute("role", "dialog");
  frame.setAttribute("aria-modal", "true");
  frame.setAttribute("aria-label", labels.dialog);

  // The close control remains visible and explicit, even though every overlay click closes too.
  closeButton.className = "image-lightbox-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", labels.close);
  closeButton.setAttribute("title", labels.close);
  closeButton.textContent = "×";

  // The preview image is updated on demand from the clicked hero card.
  image.className = "image-lightbox-image";
  image.alt = "";

  frame.appendChild(closeButton);
  frame.appendChild(image);
  overlay.appendChild(frame);
  document.body.appendChild(overlay);

  return {
    overlay: overlay,
    image: image,
    closeTimer: null,
  };
}

/**
 * Opens the shared overlay with the currently clicked hero screenshot.
 */
function openHeroImageLightbox(lightbox, sourceImage) {
  if (!lightbox || !sourceImage) return;

  // Cancel any pending close animation before swapping content.
  if (lightbox.closeTimer !== null) {
    window.clearTimeout(lightbox.closeTimer);
    lightbox.closeTimer = null;
  }

  // Mirror the visible hero asset so the fullscreen preview always matches the card.
  lightbox.image.src = sourceImage.currentSrc || sourceImage.src;
  lightbox.image.alt = sourceImage.alt || "";

  // Reveal the overlay first, then trigger the CSS transition on the next frame.
  lightbox.overlay.hidden = false;
  lightbox.overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("has-image-lightbox");
  window.requestAnimationFrame(function () {
    lightbox.overlay.classList.add("is-open");
  });
}

/**
 * Starts the close transition, then hides the overlay when the animation is finished.
 */
function closeHeroImageLightbox(lightbox) {
  if (!lightbox || lightbox.overlay.hidden) return;

  // Drop the open state immediately so CSS can animate the fade-out/scale-out sequence.
  lightbox.overlay.classList.remove("is-open");
  lightbox.overlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("has-image-lightbox");

  lightbox.closeTimer = window.setTimeout(function () {
    // Hide and reset the image only after the animation so reopening stays flicker-free.
    lightbox.overlay.hidden = true;
    lightbox.image.removeAttribute("src");
    lightbox.image.alt = "";
    lightbox.closeTimer = null;
  }, HERO_IMAGE_LIGHTBOX_ANIMATION_MS);
}

// Bind the hero card screenshots to the shared fullscreen overlay.
(function () {
  var triggers = document.querySelectorAll(".hero-eco-card .eco-img-button");
  if (!triggers.length) return;

  var lightbox = createHeroImageLightbox();

  triggers.forEach(function (trigger) {
    trigger.addEventListener("click", function () {
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

function switchLang(select) {
  localStorage.setItem("lang-override", select.value);
  const parts = window.location.pathname.split("/").filter(Boolean);
  const hasLang = parts.length > 0 && SUPPORTED_LANGS.includes(parts[0]);
  const pathWithoutLang = hasLang ? parts.slice(1) : parts;
  const suffix =
    pathWithoutLang.length > 0 ? "/" + pathWithoutLang.join("/") : "/";
  const newPath =
    select.value === DEFAULT_LANG ? suffix : "/" + select.value + suffix;
  window.location.href = newPath;
}

// ---- Auto lang redirect ----
(function () {
  if (getLangFromPath() !== null) return;
  if (localStorage.getItem("lang-override") === DEFAULT_LANG) return;
  const browserLang = (navigator.language || "").slice(0, 2).toLowerCase();
  if (browserLang === DEFAULT_LANG || !SUPPORTED_LANGS.includes(browserLang))
    return;
  window.location.replace("/" + browserLang + "/");
})();

// ---- Lang switcher init ----
document.addEventListener("DOMContentLoaded", function () {
  const sel = document.querySelector(".lang-switcher select");
  if (sel) sel.value = getLangFromPath() || DEFAULT_LANG;
});
