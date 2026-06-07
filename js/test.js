/* =====================================================================
   FORWARD — Daraja aniqlash testi (js/test.js)
   Vanilla JS, no eval(), no Function(), no innerHTML with user data.
   DOM manipulation via createElement + textContent / FORWARD_SEC.safeText.
   -----------------------------------------------------------------------
   PHASE 1 NOTE: Correct answers live in the client bundle. This is
   acceptable for a soft placement test where gaming the result only
   harms the student. A real anti-cheat layer (signed question tokens,
   server-side scoring) is planned for Phase 2 backend.
   ===================================================================== */

/* global window, document, FORWARD_CONFIG, FORWARD_SEC */

(function () {
  'use strict';

  /* ---- Utilities ---- */
  const sec = (typeof window.FORWARD_SEC === 'object' && window.FORWARD_SEC)
    ? window.FORWARD_SEC
    : {
        safeText:          function (el, t) { el.textContent = t == null ? '' : String(t); },
        escapeHTML:        function (s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },
        safeLocalStorageSet: function (k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
        safeLocalStorageGet: function (k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
      };

  /* ---- Config + backend submit (Phase 2) ---- */
  var CFG = window.FORWARD_CONFIG || {};
  function apiUrl(path) {
    var base = (CFG.api && typeof CFG.api.base === 'string') ? CFG.api.base : '';
    return base.replace(/\/+$/, '') + path;
  }
  function readStudent() {
    try {
      var raw = sec.safeLocalStorageGet('forward_student');
      if (!raw) return {};
      var o = JSON.parse(raw);
      return o && typeof o === 'object' ? o : {};
    } catch (e) { return {}; }
  }
  /* Natijani admin panelga yuboradi (fire-and-forget; UI'ni bloklamaydi) */
  function postResult(tierKey, pct, group) {
    var s = readStudent();
    var body = { tier: tierKey, percent: pct, group: group, name: s.name || '', phone: s.phone || '' };
    try {
      if (typeof fetch === 'function') {
        fetch(apiUrl('/api/test-results'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(body),
          keepalive: true
        }).catch(function () {});
      }
    } catch (e) {}
  }

  /* Fisher-Yates shuffle — returns a new shuffled array */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /* ---- Tier configuration (mirrors config.js tiers) ---- */
  var TIERS = {
    nexus:    { key: 'nexus',    name: 'Nexus',    min: 0,  max: 70  },
    dominion: { key: 'dominion', name: 'Dominion', min: 71, max: 85  },
    imperial: { key: 'imperial', name: 'Imperial', min: 86, max: 100 }
  };

  /* Override from config if available */
  if (window.FORWARD_CONFIG && window.FORWARD_CONFIG.tiers) {
    var cfgTiers = window.FORWARD_CONFIG.tiers;
    if (cfgTiers.nexus)    { TIERS.nexus.min    = 0; TIERS.nexus.max    = cfgTiers.nexus.max;    }
    if (cfgTiers.dominion) { TIERS.dominion.min = cfgTiers.dominion.min; TIERS.dominion.max = cfgTiers.dominion.max; }
    if (cfgTiers.imperial) { TIERS.imperial.min = cfgTiers.imperial.min; TIERS.imperial.max = 100; }
  }

  /* Score → tier mapping */
  function getTier(pct) {
    if (pct >= TIERS.imperial.min) return TIERS.imperial;
    if (pct >= TIERS.dominion.min) return TIERS.dominion;
    return TIERS.nexus; /* 0–70, includes <55 encouragement path */
  }

  /* ---- Question bank ---- */
  /*
   * Each question object:
   *   { id, subject: 'math'|'english', q: string, opts: [string×4], correct: 0-based index }
   *
   * 'correct' references the position in the ORIGINAL opts array before shuffle.
   * After shuffle we track which option object carries the correctness flag.
   */

  var QUESTIONS = {

    /* ====== 1–4 SINF ====== */
    '1-4': [
      /* Matematika */
      {
        id: 'g1_m1', subject: 'math',
        q: '24 + 37 = ?',
        opts: ['51', '61', '71', '60'],
        correct: 1
      },
      {
        id: 'g1_m2', subject: 'math',
        q: '56 − 18 = ?',
        opts: ['38', '48', '36', '42'],
        correct: 0
      },
      {
        id: 'g1_m3', subject: 'math',
        q: '7 × 8 = ?',
        opts: ['54', '63', '56', '48'],
        correct: 2
      },
      {
        id: 'g1_m4', subject: 'math',
        q: 'Uchburchakning tomonlari 3 sm, 4 sm va 5 sm. Uning perimetri qancha?',
        opts: ['10 sm', '12 sm', '15 sm', '7 sm'],
        correct: 1
      },
      {
        id: 'g1_m5', subject: 'math',
        q: '100 ga qancha qo\'shish kerak, natija 153 bo\'lishi uchun?',
        opts: ['43', '53', '63', '73'],
        correct: 1
      },
      /* Ingliz tili */
      {
        id: 'g1_e1', subject: 'english',
        q: 'What colour is the sky on a sunny day?',
        opts: ['Green', 'Blue', 'Red', 'Yellow'],
        correct: 1
      },
      {
        id: 'g1_e2', subject: 'english',
        q: 'Complete: "I ___ a student."',
        opts: ['is', 'are', 'am', 'be'],
        correct: 2
      },
      {
        id: 'g1_e3', subject: 'english',
        q: 'Which word means the opposite of "big"?',
        opts: ['Large', 'Tall', 'Small', 'Heavy'],
        correct: 2
      },
      {
        id: 'g1_e4', subject: 'english',
        q: 'How many days are there in a week?',
        opts: ['Five', 'Six', 'Eight', 'Seven'],
        correct: 3
      },
      {
        id: 'g1_e5', subject: 'english',
        q: 'Choose the correct plural: "one cat, two ___"',
        opts: ['cat', 'cates', 'cats', 'cat\'s'],
        correct: 2
      }
    ],

    /* ====== 5–8 SINF ====== */
    '5-8': [
      /* Matematika */
      {
        id: 'g2_m1', subject: 'math',
        q: '3/4 + 1/2 = ?',
        opts: ['4/6', '5/4', '1 1/4', '7/8'],
        correct: 2
      },
      {
        id: 'g2_m2', subject: 'math',
        q: 'x + 7 = 15 bo\'lsa, x = ?',
        opts: ['6', '7', '8', '9'],
        correct: 2
      },
      {
        id: 'g2_m3', subject: 'math',
        q: 'To\'g\'ri burchakli uchburchakning katetlari 3 va 4. Gipotenuza necha?',
        opts: ['5', '6', '7', '8'],
        correct: 0
      },
      {
        id: 'g2_m4', subject: 'math',
        q: '12% of 200 = ?',
        opts: ['12', '20', '24', '30'],
        correct: 2
      },
      {
        id: 'g2_m5', subject: 'math',
        q: 'Qaysi sonning kvadrati 144 ga teng?',
        opts: ['10', '11', '12', '13'],
        correct: 2
      },
      /* Ingliz tili */
      {
        id: 'g2_e1', subject: 'english',
        q: 'She ___ to school every day. (correct form of "go")',
        opts: ['go', 'goes', 'going', 'gone'],
        correct: 1
      },
      {
        id: 'g2_e2', subject: 'english',
        q: 'Choose the correct sentence:',
        opts: [
          'He don\'t like pizza.',
          'She doesn\'t likes pizza.',
          'They doesn\'t like pizza.',
          'He doesn\'t like pizza.'
        ],
        correct: 3
      },
      {
        id: 'g2_e3', subject: 'english',
        q: 'What is the past tense of "write"?',
        opts: ['writed', 'wrote', 'written', 'writ'],
        correct: 1
      },
      {
        id: 'g2_e4', subject: 'english',
        q: '"She is ___ than her sister." (tall)',
        opts: ['more tall', 'tallest', 'taller', 'tall'],
        correct: 2
      },
      {
        id: 'g2_e5', subject: 'english',
        q: 'Choose the word that means "very happy":',
        opts: ['miserable', 'delighted', 'bored', 'confused'],
        correct: 1
      }
    ],

    /* ====== 9–11 SINF ====== */
    '9-11': [
      /* Matematika */
      {
        id: 'g3_m1', subject: 'math',
        q: 'log₂(8) = ?',
        opts: ['2', '3', '4', '8'],
        correct: 1
      },
      {
        id: 'g3_m2', subject: 'math',
        q: 'x² − 5x + 6 = 0 tenglamaning yechimlari?',
        opts: ['x=1 va x=6', 'x=2 va x=3', 'x=−2 va x=−3', 'x=3 va x=4'],
        correct: 1
      },
      {
        id: 'g3_m3', subject: 'math',
        q: 'sin(30°) = ?',
        opts: ['√3/2', '1/2', '√2/2', '1'],
        correct: 1
      },
      {
        id: 'g3_m4', subject: 'math',
        q: 'Progressiya: 2, 6, 18, 54, … Keyingi had?',
        opts: ['108', '162', '72', '96'],
        correct: 1
      },
      {
        id: 'g3_m5', subject: 'math',
        q: 'Vektorlar a⃗=(2,1) va b⃗=(3,4) skalyar ko\'paytmasi?',
        opts: ['10', '7', '14', '11'],
        correct: 0
      },
      /* Ingliz tili */
      {
        id: 'g3_e1', subject: 'english',
        q: 'Choose the correct conditional: "If I ___ harder, I would pass."',
        opts: ['study', 'studied', 'had studied', 'will study'],
        correct: 1
      },
      {
        id: 'g3_e2', subject: 'english',
        q: 'Identify the passive voice sentence:',
        opts: [
          'The chef cooked the meal.',
          'The meal was cooked by the chef.',
          'The chef has cooked the meal.',
          'The chef is cooking the meal.'
        ],
        correct: 1
      },
      {
        id: 'g3_e3', subject: 'english',
        q: '"Despite ___ tired, she finished the project." (correct form)',
        opts: ['be', 'been', 'being', 'is'],
        correct: 2
      },
      {
        id: 'g3_e4', subject: 'english',
        q: 'Which word is a synonym of "ubiquitous"?',
        opts: ['rare', 'omnipresent', 'ancient', 'fragile'],
        correct: 1
      },
      {
        id: 'g3_e5', subject: 'english',
        q: '"The book ___ I borrowed was fascinating." (correct relative pronoun)',
        opts: ['who', 'whom', 'that', 'what'],
        correct: 2
      }
    ]
  };

  /* Tailored Uzbek messages per tier */
  var TIER_MESSAGES = {
    nexus: {
      low: {
        /* below ~55% */
        heading: 'Nexus — Rivojlanish Yo\'li',
        message: 'Juda yaxshi boshlanish! Har bir ustoz ham bir vaqtlar shogird bo\'lgan. Nexus darajasi sizga poydevorni mustahkamlash va haqiqiy salohiyatni ochish imkonini beradi.',
        next: 'Nexus bo\'limida asosiy fanlar bo\'yicha tuzilgan darslar va mashqlar sizni kutmoqda. Muntazam tayyorlanish orqali tez orada Dominion darajasiga ko\'tarilasiz.'
      },
      high: {
        /* 55–70 */
        heading: 'Nexus — Ilmning Boshi',
        message: 'Yaxshi natija! Bilimingiz mustahkam poydevorda qurilmoqda. Nexus darajasi eng faol o\'quvchilarni yuqoriga olib chiqadi.',
        next: 'Nexus kurslari sizning bilimlaringizni tizimlashtiradi va keyingi darajaga o\'tish uchun tayyorlaydi.'
      }
    },
    dominion: {
      heading: 'Dominion — Bilim Saltanati',
      message: 'Ajoyib! Siz o\'rtacha darajadan ancha yuqoridasiz. Dominion o\'quvchilari kuchli tahliliy fikrlash va mustaqil o\'rganish qobiliyatiga ega bo\'ladi.',
      next: 'Dominion dasturi chuqurlashtirilgan fanlar, loyiha ishlari va olimpiada tayyorgarligini o\'z ichiga oladi.'
    },
    imperial: {
      heading: 'Imperial — Imperiyaning Eng Yaxshisi',
      message: 'Bravo! Siz eng yuqori darajaga loyiqsiz. Imperial o\'quvchilari platformaning elitasini tashkil etadi va xalqaro imtihonlarga tayyor bo\'lib chiqadi.',
      next: 'Imperial dasturida IELTS/SAT tayyorgarligi, ilmiy loyihalar va mentor bilan individual ishlash imkoniyati mavjud.'
    }
  };

  /* Next-step icon per tier */
  /* Tier "next step" markers — no emoji (brand uses the heraldic crests instead) */
  var TIER_ICONS = { nexus: '', dominion: '', imperial: '' };

  /* ---- App state ---- */
  var state = {
    screen:     'intro',      /* 'intro' | 'quiz' | 'result' */
    group:      null,         /* '1-4' | '5-8' | '9-11' */
    questions:  [],           /* shuffled list of 10 question objects */
    current:    0,            /* 0-based index */
    score:      0,            /* correct answers count */
    answered:   false,        /* has user answered current question */
    selectedOpt: null         /* index of clicked option */
  };

  /* ---- DOM references (populated after DOMContentLoaded) ---- */
  var dom = {};

  /* ---- Screen management ---- */
  function showScreen(name) {
    var screens = document.querySelectorAll('.test-screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.remove('is-active');
      screens[i].setAttribute('aria-hidden', 'true');
    }
    var target = document.getElementById('screen-' + name);
    if (target) {
      target.classList.add('is-active');
      target.setAttribute('aria-hidden', 'false');
      /* Announce to screen readers */
      target.focus({ preventScroll: true });
    }
    state.screen = name;
  }

  /* ---- Grade group selection ---- */
  function selectGroup(group) {
    state.group = group;
    var btns = document.querySelectorAll('.grade-btn');
    for (var i = 0; i < btns.length; i++) {
      var isThis = (btns[i].dataset.group === group);
      btns[i].setAttribute('aria-pressed', isThis ? 'true' : 'false');
      btns[i].classList.toggle('is-selected', isThis);
    }
    dom.btnStart.disabled = false;
  }

  /* ---- Build question set for a group ---- */
  function buildQuestions(group) {
    var bank = QUESTIONS[group];
    if (!bank) return [];

    /* Shuffle bank, take first 10 (bank already has exactly 10) */
    var pool = shuffle(bank).slice(0, 10);

    /* For each question, shuffle options but track which one is correct */
    return pool.map(function (q) {
      var indexed = q.opts.map(function (text, i) {
        return { text: text, isCorrect: (i === q.correct) };
      });
      var shuffledOpts = shuffle(indexed);
      return {
        id:         q.id,
        subject:    q.subject,
        q:          q.q,
        opts:       shuffledOpts  /* [{text, isCorrect}, …] */
      };
    });
  }

  /* ---- Start test ---- */
  function startTest() {
    if (!state.group) return;
    state.questions   = buildQuestions(state.group);
    state.current     = 0;
    state.score       = 0;
    state.answered    = false;
    state.selectedOpt = null;

    showScreen('quiz');
    renderQuestion();
  }

  /* ---- Render current question ---- */
  function renderQuestion() {
    var qData  = state.questions[state.current];
    var total  = state.questions.length;
    var num    = state.current + 1;
    var pct    = Math.round((state.current / total) * 100);

    /* Progress */
    sec.safeText(dom.quizCounter, 'Savol ' + num + ' / ' + total);
    dom.progressFill.style.width = pct + '%';
    dom.progressFill.setAttribute('aria-valuenow', pct);

    /* Subject tag */
    var tag = dom.quizSubjectTag;
    tag.className = 'quiz-subject-tag';
    if (qData.subject === 'math') {
      tag.classList.add('tag-math');
      sec.safeText(tag, 'Matematika');
    } else {
      tag.classList.add('tag-english');
      sec.safeText(tag, 'Ingliz tili');
    }

    /* Question text */
    sec.safeText(dom.questionText, qData.q);

    /* Clear & build options */
    var list = dom.optionsList;
    /* Remove existing children without innerHTML */
    while (list.firstChild) list.removeChild(list.firstChild);

    var letters = ['A', 'B', 'C', 'D'];

    qData.opts.forEach(function (opt, idx) {
      var li = document.createElement('li');
      li.className = 'option-item';

      var btn = document.createElement('button');
      btn.className    = 'option-btn';
      btn.type         = 'button';
      btn.dataset.idx  = String(idx);

      var letterSpan = document.createElement('span');
      letterSpan.className = 'option-letter';
      sec.safeText(letterSpan, letters[idx] || String(idx + 1));

      var textSpan = document.createElement('span');
      textSpan.className = 'option-text';
      sec.safeText(textSpan, opt.text);

      btn.appendChild(letterSpan);
      btn.appendChild(textSpan);

      btn.addEventListener('click', function () {
        handleOptionClick(idx);
      });

      /* Keyboard: already handled by click via Enter/Space on button */

      li.appendChild(btn);
      list.appendChild(li);
    });

    /* Hide next button */
    dom.btnNext.classList.remove('is-visible');
    dom.btnNext.setAttribute('aria-hidden', 'true');

    /* Reset answered state */
    state.answered    = false;
    state.selectedOpt = null;

    /* ARIA live announce */
    dom.quizLive.textContent = '';
    /* tiny delay so screen reader picks up change */
    setTimeout(function () {
      sec.safeText(dom.quizLive, 'Savol ' + num + ': ' + qData.q);
    }, 80);
  }

  /* ---- Handle option selection ---- */
  function handleOptionClick(idx) {
    if (state.answered) return;
    state.answered    = true;
    state.selectedOpt = idx;

    var qData   = state.questions[state.current];
    var correct = qData.opts[idx].isCorrect;

    if (correct) state.score++;

    /* Reveal all options */
    var btns = dom.optionsList.querySelectorAll('.option-btn');
    btns.forEach(function (btn, i) {
      btn.disabled = true;
      if (qData.opts[i].isCorrect) {
        btn.classList.add('is-correct');
      } else if (i === idx && !correct) {
        btn.classList.add('is-wrong');
      }
    });

    /* Announce result */
    var announcement = correct
      ? 'To\'g\'ri javob!'
      : 'Noto\'g\'ri. To\'g\'ri javob: ' + qData.opts.filter(function(o){return o.isCorrect;})[0].text;
    sec.safeText(dom.quizLive, announcement);

    /* Show next button */
    dom.btnNext.classList.add('is-visible');
    dom.btnNext.removeAttribute('aria-hidden');

    /* Update label for last question */
    if (state.current >= state.questions.length - 1) {
      sec.safeText(dom.btnNext, 'Natijani ko\'rish →');
    } else {
      sec.safeText(dom.btnNext, 'Keyingi savol →');
    }

    /* Auto-focus next button for keyboard users */
    setTimeout(function () { dom.btnNext.focus(); }, 180);
  }

  /* ---- Advance to next question or result ---- */
  function nextStep() {
    if (state.current < state.questions.length - 1) {
      state.current++;
      renderQuestion();
    } else {
      showResult();
    }
  }

  /* ---- Compute and show result ---- */
  function showResult() {
    var total  = state.questions.length;
    var pct    = Math.round((state.score / total) * 100);
    var tier   = getTier(pct);

    /* Persist to localStorage */
    var resultData = {
      tier:    tier.key,
      percent: pct,
      group:   state.group,
      ts:      Date.now()
    };
    sec.safeLocalStorageSet('forward_test_result', JSON.stringify(resultData));

    /* Backend'ga yuborish — admin panelda ko'rinadi, telefon orqali arizaga bog'lanadi */
    postResult(tier.key, pct, state.group);

    /* Build result screen */
    buildResultScreen(tier, pct, state.group);
    showScreen('result');

    /* Animate score ring & count-up */
    animateResult(tier, pct);
  }

  /* ---- Build result screen DOM ---- */
  function buildResultScreen(tier, pct, group) {
    var rs = dom.resultScreen;

    /* Set tier attribute for CSS targeting */
    rs.setAttribute('data-tier', tier.key);

    /* Crest image */
    dom.resultCrestImg.src = 'assets/logos/' + tier.key + '.svg';
    dom.resultCrestImg.alt = tier.name + ' daraja belgisi';

    /* Tier badge */
    dom.tierDot.className = 'tier-dot';
    sec.safeText(dom.tierBadgeText, tier.name + ' Daraja');

    /* Score display (will be animated from 0) */
    sec.safeText(dom.scoreNumber, '0');

    /* Score ring initial state */
    var radius      = 50;
    var circumference = 2 * Math.PI * radius;
    dom.scoreRingFill.style.strokeDasharray  = circumference;
    dom.scoreRingFill.style.strokeDashoffset = circumference; /* start full offset = empty */

    /* Title & message */
    var msgObj = getTierMessage(tier, pct);
    sec.safeText(dom.resultTitle, msgObj.heading);
    sec.safeText(dom.resultMessage, msgObj.message);

    /* Next step */
    var icon = TIER_ICONS[tier.key] || '';
    sec.safeText(dom.stepIcon, icon);
    sec.safeText(dom.stepTitle, 'Keyingi qadam');
    sec.safeText(dom.stepText, msgObj.next);

    /* ARIA live announce (brief delay for transition) */
    setTimeout(function () {
      sec.safeText(dom.resultLive,
        tier.name + ' darajasiga erishdingiz! Natija: ' + pct + ' foiz.');
    }, 600);
  }

  /* Pick the right message object for tier + score */
  function getTierMessage(tier, pct) {
    if (tier.key === 'nexus') {
      return (pct < 55)
        ? TIER_MESSAGES.nexus.low
        : TIER_MESSAGES.nexus.high;
    }
    return TIER_MESSAGES[tier.key];
  }

  /* ---- Animate score ring and count-up number ---- */
  function animateResult(tier, pct) {
    /* Respect prefers-reduced-motion */
    var motionOK = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var radius       = 50;
    var circumference = 2 * Math.PI * radius;
    var targetOffset  = circumference * (1 - pct / 100);

    if (motionOK) {
      /* Trigger ring transition (needs 1 frame delay after DOM update) */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          dom.scoreRingFill.style.strokeDashoffset = targetOffset;
        });
      });

      /* Count-up number */
      var start    = 0;
      var duration = 1200; /* ms */
      var startTs  = null;

      function step(ts) {
        if (!startTs) startTs = ts;
        var progress = Math.min((ts - startTs) / duration, 1);
        /* Ease-out curve */
        var eased   = 1 - Math.pow(1 - progress, 3);
        var current = Math.round(eased * pct);
        sec.safeText(dom.scoreNumber, current);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          sec.safeText(dom.scoreNumber, pct);
        }
      }

      /* Start after brief delay for crest animation */
      setTimeout(function () {
        requestAnimationFrame(step);
      }, 300);

    } else {
      /* No animation — just set final values */
      dom.scoreRingFill.style.strokeDashoffset = targetOffset;
      sec.safeText(dom.scoreNumber, pct);
    }
  }

  /* ---- Reset / retry ---- */
  function resetTest() {
    state.screen     = 'intro';
    state.group      = null;
    state.questions  = [];
    state.current    = 0;
    state.score      = 0;
    state.answered   = false;
    state.selectedOpt = null;

    /* Reset grade buttons */
    var btns = document.querySelectorAll('.grade-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', 'false');
      btns[i].classList.remove('is-selected');
    }
    dom.btnStart.disabled = true;

    /* Clear result screen tier attr */
    if (dom.resultScreen) dom.resultScreen.removeAttribute('data-tier');

    showScreen('intro');
  }

  /* ---- Keyboard navigation for option buttons (arrow keys) ---- */
  function handleOptionsKeydown(e) {
    if (state.answered) return;
    var btns  = Array.from(dom.optionsList.querySelectorAll('.option-btn:not(:disabled)'));
    var focus = document.activeElement;
    var idx   = btns.indexOf(focus);
    if (idx === -1) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      btns[(idx + 1) % btns.length].focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      btns[(idx - 1 + btns.length) % btns.length].focus();
    }
  }

  /* ---- Initialise DOM refs and event listeners ---- */
  function init() {
    /* Grade buttons */
    var gradeBtns = document.querySelectorAll('.grade-btn');
    for (var i = 0; i < gradeBtns.length; i++) {
      gradeBtns[i].addEventListener('click', function () {
        selectGroup(this.dataset.group);
      });
    }

    /* Start button */
    dom.btnStart = document.getElementById('btn-start');
    if (dom.btnStart) {
      dom.btnStart.addEventListener('click', startTest);
      dom.btnStart.disabled = true; /* requires grade selection first */
    }

    /* Quiz elements */
    dom.quizCounter    = document.getElementById('quiz-counter');
    dom.quizSubjectTag = document.getElementById('quiz-subject-tag');
    dom.progressFill   = document.getElementById('progress-fill');
    dom.questionText   = document.getElementById('question-text');
    dom.optionsList    = document.getElementById('options-list');
    dom.btnNext        = document.getElementById('btn-next');
    dom.quizLive       = document.getElementById('quiz-live');

    if (dom.btnNext) {
      dom.btnNext.addEventListener('click', nextStep);
    }

    /* Arrow key navigation inside options */
    if (dom.optionsList) {
      dom.optionsList.addEventListener('keydown', handleOptionsKeydown);
    }

    /* Result elements */
    dom.resultScreen   = document.getElementById('screen-result');
    dom.resultCrestImg = document.getElementById('result-crest-img');
    dom.tierBadgeText  = document.getElementById('tier-badge-text');
    dom.tierDot        = document.getElementById('tier-dot');
    dom.scoreNumber    = document.getElementById('score-number');
    dom.scoreRingFill  = document.getElementById('score-ring-fill');
    dom.resultTitle    = document.getElementById('result-title');
    dom.resultMessage  = document.getElementById('result-message');
    dom.stepIcon       = document.getElementById('step-icon');
    dom.stepTitle      = document.getElementById('step-title');
    dom.stepText       = document.getElementById('step-text');
    dom.resultLive     = document.getElementById('result-live');

    /* Retry button */
    var btnRetry = document.getElementById('btn-retry');
    if (btnRetry) {
      btnRetry.addEventListener('click', resetTest);
    }

    /* Show intro screen */
    showScreen('intro');
  }

  /* ---- Boot ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
