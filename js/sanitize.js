/* ============ HTML escaping helper ============
   Anything that came from outside the page's own source code (AI output, the
   OpenTriviaDB / RemoteOK / Adzuna / Nominatim APIs, a user's resume, compiler
   output, error messages) must go through Sanitize.html() before it is placed
   inside an innerHTML template. Loaded before every other app script. */
const Sanitize = {
  html(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};
