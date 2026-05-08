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
