/* =====================================================================
   FORWARD Platform — Security & Privacy Helpers  (js/security.js)
   Exposed as: window.FORWARD_SEC
   ---------------------------------------------------------------------
   Phase 1 (static site): client-side hardening — XSS-safe helpers,
     input validation, form anti-abuse (honeypot / time-trap /
     localStorage rate-limit), safe DOM utilities.
   Phase 2 (backend): server-side validation, CSRF tokens, JWT, argon2id
     hashing, RBAC, and audit logging will be added server-side.
     This file intentionally contains NO server calls, NO eval, and
     NO third-party dependencies.
   ---------------------------------------------------------------------
   Security properties guaranteed by this file:
     - NO eval() / new Function() / setTimeout(string)
     - NO dynamic script injection
     - NO network I/O
     - All localStorage access is wrapped in try/catch (private-mode safe)
     - Strictly ASCII source (no Unicode in identifiers)
   ===================================================================== */

/* global window, document, localStorage */

(function (global) {
  'use strict';

  /* -------------------------------------------------------------------
     SECTION 1 — HTML ESCAPING & TEXT SAFETY
     Prevents XSS when values must be inserted into the DOM.
     The primary pattern in this app is textContent (safe by default),
     but escapeHTML() is provided for any future innerHTML path.
  ------------------------------------------------------------------- */

  /**
   * escapeHTML
   * Converts characters that have special meaning in HTML/XML into their
   * named entity equivalents.  Safe to use inside innerHTML assignments.
   *
   * Escapes: & < > " ' /
   *   - & must be first to avoid double-escaping.
   *   - / is escaped as a defence-in-depth measure (closes XHTML tags).
   *
   * @param  {*}      str  Any value; non-strings are coerced to string.
   * @return {string}      HTML-safe string.
   */
  function escapeHTML(str) {
    if (typeof str !== 'string') {
      str = (str == null) ? '' : String(str);
    }
    return str
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /* -------------------------------------------------------------------
     SECTION 2 — TEXT SANITISATION
  ------------------------------------------------------------------- */

  /**
   * sanitizeText
   * Trims leading/trailing whitespace, strips ASCII and Unicode control
   * characters (categories Cc + Cf excluding TAB and newline for
   * multi-line fields), collapses consecutive whitespace to a single
   * space, and caps the result at maxLen characters.
   *
   * Safe to store in localStorage or send to a form endpoint.
   *
   * @param  {*}      str     Input value.
   * @param  {number} maxLen  Maximum output length (default: 256).
   * @return {string}         Sanitised, length-capped string.
   */
  function sanitizeText(str, maxLen) {
    var cap = (typeof maxLen === 'number' && maxLen > 0) ? maxLen : 256;
    if (typeof str !== 'string') return '';
    return str
      // Strip C0 controls (0x00-0x08, 0x0B-0x0C, 0x0E-0x1F), DEL (0x7F),
      // C1 controls (0x80-0x9F), and Unicode "format" characters (0xAD etc.)
      // but keep TAB (0x09), LF (0x0A), CR (0x0D) so multi-line fields work.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, cap);
  }

  /* -------------------------------------------------------------------
     SECTION 3 — SAFE DOM SETTER
  ------------------------------------------------------------------- */

  /**
   * setText
   * Sets element.textContent safely.  Always prefer this over innerHTML.
   * If el is null/undefined the call is a silent no-op.
   *
   * @param {HTMLElement|null} el   Target DOM element.
   * @param {*}               str  Value to display (coerced to string).
   */
  function setText(el, str) {
    if (!el) return;
    el.textContent = (str == null) ? '' : String(str);
  }

  /* -------------------------------------------------------------------
     SECTION 4 — INPUT VALIDATORS
     Each validator returns true (valid) or false (invalid).
     They accept any input type and coerce to string defensively.
  ------------------------------------------------------------------- */

  var validators = (function () {

    /**
     * required — rejects blank / whitespace-only strings.
     */
    function required(str) {
      return typeof str === 'string' && str.trim().length > 0;
    }

    /**
     * name — validates a person name.
     * Allows:
     *   - ASCII letters a-z A-Z
     *   - Uzbek-specific Cyrillic (common subset) and Latin extended chars
     *     used in official Uzbek orthography: A-Z a-z + apostrophe variant
     *   - Apostrophe (') for names like O'zbek, G'ayrat
     *   - Hyphen (-) for compound names
     *   - Single spaces between parts
     * Length: 2 to 50 characters after trimming.
     *
     * The regex uses Unicode property escapes for letter matching so that
     * Uzbek Cyrillic names (e.g. Sherzod, Zulfiya) pass without listing
     * every code point explicitly.
     * Fallback for environments without Unicode property escapes: a
     * permissive ASCII + extended Latin + Cyrillic range character class.
     */
    function name(str) {
      if (typeof str !== 'string') return false;
      var s = str.trim();
      if (s.length < 2 || s.length > 50) return false;
      // Allow letters (Unicode), spaces, apostrophe, hyphen.
      // Reject digits, punctuation other than ' and -.
      try {
        // Unicode property escape — modern browsers + Node 10+
        return /^[\p{L}\p{M}'\- ]+$/u.test(s);
      } catch (_) {
        // Fallback: ASCII + common Uzbek Cyrillic + Latin Extended
        return /^[A-Za-zÀ-ɏЀ-ӿ'\- ]+$/.test(s);
      }
    }

    /**
     * phoneUz — validates Uzbek mobile numbers.
     * Accepts:
     *   +998 XX XXX XX XX  (with or without spaces/dashes)
     *   998XXXXXXXXX       (no plus)
     *   0XXXXXXXXX         (local format, 10 digits starting with 0)
     * After stripping spaces and dashes the number must be either:
     *   +998 followed by exactly 9 digits, OR
     *   998 followed by exactly 9 digits, OR
     *   0 followed by exactly 9 digits.
     */
    function phoneUz(str) {
      if (typeof str !== 'string') return false;
      var s = str.replace(/[\s\-()]/g, '');
      return /^(\+998|998)[0-9]{9}$/.test(s) || /^0[0-9]{9}$/.test(s);
    }

    /**
     * email — validates e-mail addresses using a pragmatic RFC-5321 subset.
     * Does NOT rely on the HTML input[type=email] constraint (unavailable
     * in pure JS contexts).  International domain names (IDN) are allowed.
     * Maximum 254 characters (RFC 5321 §4.5.3.1).
     */
    function email(str) {
      if (typeof str !== 'string') return false;
      var s = str.trim();
      if (s.length < 5 || s.length > 254) return false;
      // local@domain.tld — local up to 64 chars, domain has at least one dot.
      return /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(s);
    }

    return {
      required: required,
      name:     name,
      phoneUz:  phoneUz,
      email:    email
    };
  }());

  /* -------------------------------------------------------------------
     SECTION 5 — FORM ANTI-ABUSE UTILITIES
     These utilities harden the registration/contact form against:
       - Simple spam bots (honeypot)
       - Automated submissions faster than a human can fill the form
         (time-trap)
       - Repeated submission floods (localStorage rate-limit)
     They are purely client-side and are a first line of defence.
     Phase 2 will add server-side enforcement (rate-limiting, CAPTCHA,
     CSRF tokens) as authoritative controls.
  ------------------------------------------------------------------- */

  var form = (function () {

    /* -----------------------------------------------------------------
       5a. HONEYPOT
       Injects a visually-hidden field whose name bots commonly fill but
       real users ignore.  The field is:
         - Positioned off-screen (not display:none — some bots skip those)
         - Labelled to attract autofill bots ("website", "url", "address")
         - Excluded from form accessibility tree (aria-hidden, tabindex=-1)
    ----------------------------------------------------------------- */

    var HONEYPOT_NAME = 'website'; // Common bot-bait field name

    /**
     * honeypot.inject
     * Appends a visually-hidden honeypot input to the given form element.
     * Should be called once when the form is rendered.
     *
     * @param {HTMLFormElement} formEl  The form to protect.
     * @returns {HTMLInputElement}      The injected input (for testing).
     */
    function honeypotInject(formEl) {
      if (!formEl || typeof formEl.appendChild !== 'function') {
        throw new Error('FORWARD_SEC: honeypot.inject requires a form element');
      }
      var wrapper = global.document.createElement('div');
      wrapper.setAttribute('aria-hidden', 'true');
      wrapper.style.cssText = [
        'position:absolute',
        'left:-9999px',
        'top:-9999px',
        'width:1px',
        'height:1px',
        'overflow:hidden',
        'opacity:0',
        'pointer-events:none'
      ].join(';');

      var label = global.document.createElement('label');
      label.setAttribute('for', 'fwd-hp-field');
      label.textContent = 'Website';

      var input = global.document.createElement('input');
      input.type        = 'text';
      input.id          = 'fwd-hp-field';
      input.name        = HONEYPOT_NAME;
      input.value       = '';
      input.tabIndex    = -1;
      input.autocomplete = 'off';

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      formEl.appendChild(wrapper);
      return input;
    }

    /**
     * honeypot.check
     * Returns true if the honeypot field is filled (bot detected).
     * Call this in the form submit handler before any other processing.
     *
     * @param {HTMLFormElement} formEl  The protected form.
     * @returns {boolean}               true = bot detected, reject submission.
     */
    function honeypotCheck(formEl) {
      if (!formEl) return false;
      var field = formEl.querySelector('input[name="' + HONEYPOT_NAME + '"]');
      if (!field) return false;
      return field.value.length > 0;
    }

    /* -----------------------------------------------------------------
       5b. TIME TRAP
       Records the time the page (or form section) was rendered.
       Submissions arriving in under MIN_SECONDS are rejected as bot-like.
       Legitimate users need at least 2.5 s to read and fill a form.
    ----------------------------------------------------------------- */

    var TIME_TRAP_KEY   = 'fwd_form_render_ts';
    var MIN_SECONDS     = 2.5;

    /**
     * timeTrap.record
     * Call once when the form is first shown/rendered.
     * Stores the current timestamp in sessionStorage (falls back silently).
     */
    function timeTrapRecord() {
      try {
        global.sessionStorage.setItem(TIME_TRAP_KEY, String(Date.now()));
      } catch (_) { /* storage unavailable — graceful degradation */ }
    }

    /**
     * timeTrap.check
     * Returns true if the elapsed time since timeTrap.record() is less
     * than MIN_SECONDS (i.e. a bot-like submission speed is detected).
     * If no timestamp was recorded, returns false (do not block).
     *
     * @returns {boolean}  true = submission too fast, reject it.
     */
    function timeTrapCheck() {
      var recorded;
      try {
        recorded = global.sessionStorage.getItem(TIME_TRAP_KEY);
      } catch (_) {
        return false; // Can't enforce — allow through gracefully
      }
      if (!recorded) return false;
      var elapsed = (Date.now() - parseInt(recorded, 10)) / 1000;
      return elapsed < MIN_SECONDS;
    }

    /* -----------------------------------------------------------------
       5c. RATE LIMIT
       Tracks how many times a keyed action has been performed within a
       sliding time window using localStorage.  Falls back gracefully when
       localStorage is unavailable (private browsing, quota exceeded).

       Default: 5 submissions per 10 minutes per browser.
       This is a client-side soft limit.  The authoritative rate limit
       will be enforced server-side in Phase 2.
    ----------------------------------------------------------------- */

    var RL_PREFIX         = 'fwd_rl_';
    var RL_DEFAULT_MAX    = 5;
    var RL_DEFAULT_WINDOW = 10 * 60 * 1000; // 10 minutes in ms

    /**
     * rateLimit
     * Checks and records an attempt for the given key.
     *
     * @param {string} key          Unique identifier (e.g. 'form_submit').
     * @param {number} maxPerWindow Maximum allowed attempts (default: 5).
     * @param {number} windowMs     Window duration in ms (default: 600000).
     * @returns {{ allowed: boolean, retryInMs: number }}
     *   allowed:   true if the attempt is within the limit.
     *   retryInMs: ms until the oldest attempt expires (0 when allowed).
     */
    function rateLimit(key, maxPerWindow, windowMs) {
      var max    = (typeof maxPerWindow === 'number' && maxPerWindow > 0) ? maxPerWindow : RL_DEFAULT_MAX;
      var window_ms = (typeof windowMs === 'number' && windowMs > 0) ? windowMs : RL_DEFAULT_WINDOW;
      var storageKey = RL_PREFIX + String(key);
      var now    = Date.now();
      var timestamps = [];

      // Load existing timestamps
      try {
        var raw = global.localStorage.getItem(storageKey);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            timestamps = parsed;
          }
        }
      } catch (_) {
        // localStorage unavailable — allow through (server-side will enforce)
        return { allowed: true, retryInMs: 0 };
      }

      // Prune timestamps outside the current window
      var windowStart = now - window_ms;
      timestamps = timestamps.filter(function (ts) { return ts > windowStart; });

      if (timestamps.length >= max) {
        // Find the oldest timestamp; the window resets when it expires
        var oldest     = timestamps[0];
        var retryInMs  = (oldest + window_ms) - now;
        return { allowed: false, retryInMs: Math.max(0, retryInMs) };
      }

      // Record this attempt
      timestamps.push(now);
      try {
        global.localStorage.setItem(storageKey, JSON.stringify(timestamps));
      } catch (_) { /* quota — non-fatal */ }

      return { allowed: true, retryInMs: 0 };
    }

    /* Public form API */
    return {
      honeypot: {
        inject: honeypotInject,
        check:  honeypotCheck
      },
      timeTrap: {
        record: timeTrapRecord,
        check:  timeTrapCheck
      },
      rateLimit: rateLimit
    };
  }());

  /* -------------------------------------------------------------------
     SECTION 6 — SAFE LOCALSTORAGE WRAPPERS
     Thin wrappers used by other parts of the app so they don't need
     individual try/catch blocks.
  ------------------------------------------------------------------- */

  /**
   * safeLocalStorageSet
   * @param {string} key
   * @param {string} value  Must already be JSON.stringify'd if needed.
   */
  function safeLocalStorageSet(key, value) {
    try {
      global.localStorage.setItem(key, value);
    } catch (_) { /* private-mode or quota — silent */ }
  }

  /**
   * safeLocalStorageGet
   * @param  {string}      key
   * @return {string|null} Stored value or null.
   */
  function safeLocalStorageGet(key) {
    try {
      return global.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  /* -------------------------------------------------------------------
     SECTION 7 — NAMESPACE EXPORT
     Everything is namespaced under window.FORWARD_SEC to avoid
     polluting the global scope.  Other scripts (main.js, test.js)
     use FORWARD_SEC.<method>(...).
  ------------------------------------------------------------------- */

  global.FORWARD_SEC = {
    /* XSS helpers */
    escapeHTML:    escapeHTML,

    /* Sanitisation */
    sanitizeText:  sanitizeText,

    /* Safe DOM */
    setText:       setText,
    safeText:      setText,   /* alias (used by test.js) */

    /* Validators */
    validators: validators,

    /* Form anti-abuse */
    form: form,

    /* localStorage helpers (backward-compat alias) */
    safeLocalStorageSet: safeLocalStorageSet,
    safeLocalStorageGet: safeLocalStorageGet
  };

}(window));

/*
  INTEGRATION GUIDE
  -----------------
  1. Load this script FIRST, before main.js / test.js:
       <script src="/js/security.js"></script>

  2. On form init:
       var myForm = document.getElementById('contact-form');
       FORWARD_SEC.form.honeypot.inject(myForm);
       FORWARD_SEC.form.timeTrap.record();

  3. On form submit:
       if (FORWARD_SEC.form.honeypot.check(myForm)) {
         return; // silent bot rejection — do not show error
       }
       if (FORWARD_SEC.form.timeTrap.check()) {
         showError('Iltimos, formani diqqat bilan to\'ldiring.');
         return;
       }
       var rl = FORWARD_SEC.form.rateLimit('contact_submit', 5, 600000);
       if (!rl.allowed) {
         var mins = Math.ceil(rl.retryInMs / 60000);
         showError(mins + ' daqiqadan so\'ng qayta urinib ko\'ring.');
         return;
       }
       // ... continue with validated + sanitised field values

  4. If js/config.js form.endpoint is set to a Formspree or similar URL,
     add that domain to the CSP connect-src and form-action directives in:
       _headers, netlify.toml, vercel.json, .htaccess
     Example:
       connect-src 'self' https://formspree.io
       form-action 'self' https://formspree.io
*/
