/* AICode - shared header loader.
   The markup lives in /header/index.html, translated like any page
   (fr/header/index.html). The fetched language tree is derived from the
   URL path (getLangFromPath in common.js), never from <html lang>. */
(function () {
  var isSandbox = /claudeusercontent\.com$/.test(location.hostname);

  var url;
  if (isSandbox) {
    /* Preview sandbox: derive the site root from the already-rebased
       header.css <link>. Inert in production. */
    var link = document.querySelector('link[href*="header.css"]');
    url = link.href.replace(/assets\/header\.css.*$/, "header/index.html");
  } else {
    var seg = getLangFromPath(); // "fr" on /fr/... pages, null on the default tree
    url = "/" + (seg ? seg + "/" : "") + "header/index.html";
  }

  fetch(url)
    .then(function (r) {
      return r.text();
    })
    .then(function (html) {
      document.body.insertAdjacentHTML("afterbegin", html);
      document.dispatchEvent(new CustomEvent("aicode:header-ready"));
    });
})();
