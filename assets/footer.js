/* AICode - shared footer loader.
   The markup lives in /footer/index.html, translated like any page
   (fr/footer/index.html). The fetched language tree is derived from the
   URL path (getLangFromPath in common.js), never from <html lang>.
   Topic-page links inside footer/index.html are verbatim absolute https
   URLs: do not touch. */
(function () {
  var isSandbox = /claudeusercontent\.com$/.test(location.hostname);

  var url;
  if (isSandbox) {
    var link = document.querySelector('link[href*="footer.css"]');
    url = link.href.replace(/assets\/footer\.css.*$/, "footer/index.html");
  } else {
    var seg = getLangFromPath();
    url = "/" + (seg ? seg + "/" : "") + "footer/index.html";
  }

  fetch(url)
    .then(function (r) {
      return r.text();
    })
    .then(function (html) {
      document.body.insertAdjacentHTML("beforeend", html);
      document.dispatchEvent(new CustomEvent("aicode:footer-ready"));
    });
})();
