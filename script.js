/* ============================================================
   ALLEN GROUP — Next-Gen Institutional Telephony Design System
   Modern Interactive Controller (Tailwind & Web Audio API)
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Utility Selectors ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Web Audio Synthesizer (Realistic Phone Keypad DTMF & Chimes) ---------- */
  const AudioEngine = (() => {
    let audioCtx = null;

    function getContext() {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audioCtx = new AudioContext();
        }
      }
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      return audioCtx;
    }

    function playTone(freq1 = 440, freq2 = 880, duration = 0.08) {
      try {
        const ctx = getContext();
        if (!ctx) return;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.value = freq1;
        osc2.frequency.value = freq2;

        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + duration);
        osc2.stop(ctx.currentTime + duration);
      } catch (e) {}
    }

    function playBuzzer() {
      try {
        const ctx = getContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        gain.gain.setValueAtTime(0.07, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) {}
    }

    function playConnectChime() {
      try {
        playTone(523.25, 659.25, 0.12);
        setTimeout(() => playTone(659.25, 783.99, 0.2), 140);
      } catch (e) {}
    }

    return { playTone, playBuzzer, playConnectChime };
  })();

  /* ============================================================
     1. THEME TOGGLE (DEFAULT LIGHT THEME, USER PERSISTED)
     ============================================================ */
  const ThemeManager = (() => {
    const STORAGE_KEY = "allen-site-theme-v2";
    const root = document.documentElement;
    const toggleBtn = $("#themeToggle");

    function apply(theme) {
      root.setAttribute("data-theme", theme);
      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      if (toggleBtn) {
        toggleBtn.setAttribute(
          "aria-label",
          theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
        );
      }
    }

    function init() {
      const saved = localStorage.getItem(STORAGE_KEY);
      // User specified requirement: Default MUST be light theme first!
      // Only switch to dark if the user explicitly clicked the toggle.
      const theme = saved === "dark" ? "dark" : "light";
      apply(theme);

      if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
          const isDark = root.classList.contains("dark");
          const next = isDark ? "light" : "dark";
          apply(next);
          localStorage.setItem(STORAGE_KEY, next);
        });
      }
    }

    return { init };
  })();

  /* ============================================================
     2. CUSTOM LANGUAGE SELECTOR (GOOGLE TRANSLATE BACKGROUND CONTROLLER)
     Google Translate UI is kept 100% hidden offscreen.
     This module drives the hidden .goog-te-combo and syncs cookies.
     ============================================================ */
  const LanguageManager = (() => {
    const STORAGE_KEY = "allen-site-lang";
    const langBtn = $("#customLangBtn");
    const langDropdown = $("#customLangDropdown");
    const activeLabel = $("#activeLangLabel");
    const langChevron = $("#langChevron");
    const mobileSelect = $("#mobileLangSelect");
    const langOptions = $$(".lang-opt");

    const LANG_MAP = {
      en: "English",
      hi: "हिन्दी",
      ta: "தமிழ்",
      te: "తెలుగు",
      kn: "ಕನ್ನಡ",
      ml: "മലയാളം",
      mr: "मराठी",
      gu: "ગુજરાતી",
      bn: "বাংলা",
      pa: "ਪੰਜਾਬੀ",
      ur: "اردو"
    };

    function setCookie(name, value, days = 30) {
      const d = new Date();
      d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
      const expires = "expires=" + d.toUTCString();
      const domain = window.location.hostname;
      
      document.cookie = `${name}=${value}; ${expires}; path=/;`;
      if (domain && domain !== "localhost") {
        document.cookie = `${name}=${value}; ${expires}; domain=.${domain}; path=/;`;
        document.cookie = `${name}=${value}; ${expires}; domain=${domain}; path=/;`;
      }
    }

    function clearCookie(name) {
      const domain = window.location.hostname;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      if (domain && domain !== "localhost") {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.${domain}; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${domain}; path=/;`;
      }
    }

    function getCookie(name) {
      const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
      return match ? match[2] : null;
    }

    function updateUI(langCode) {
      const displayName = LANG_MAP[langCode] || "English";
      if (activeLabel) {
        activeLabel.textContent = displayName;
      }
      if (langBtn) {
        langBtn.setAttribute("title", `Language: ${displayName}`);
        langBtn.setAttribute("aria-label", `Select Language, currently ${displayName}`);
      }
      if (mobileSelect) {
        mobileSelect.value = langCode;
      }

      langOptions.forEach((btn) => {
        const isMatch = btn.getAttribute("data-lang") === langCode;
        if (isMatch) {
          btn.classList.add("bg-sky-50", "text-sky-600", "dark:bg-slate-800", "dark:text-sky-400", "font-bold");
        } else {
          btn.classList.remove("bg-sky-50", "text-sky-600", "dark:bg-slate-800", "dark:text-sky-400", "font-bold");
        }
      });
    }

    function triggerGoogleTranslate(langCode) {
      const targetVal = (langCode === "en") ? "" : langCode;

      // Update cookie
      if (langCode === "en") {
        clearCookie("googtrans");
      } else {
        setCookie("googtrans", `/en/${langCode}`);
      }

      function applyToCombo() {
        const combo = document.querySelector(".goog-te-combo");
        if (!combo) return false;

        // Try finding matching option
        let matched = false;
        if (combo.options && combo.options.length > 0) {
          for (let i = 0; i < combo.options.length; i++) {
            if (combo.options[i].value.toLowerCase() === targetVal.toLowerCase()) {
              combo.selectedIndex = i;
              matched = true;
              break;
            }
          }
        }
        combo.value = targetVal;

        // Fire both input and change events with bubbles: true
        combo.dispatchEvent(new Event("input", { bubbles: true }));
        combo.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }

      if (!applyToCombo()) {
        let attempts = 0;
        const timer = setInterval(() => {
          attempts++;
          if (applyToCombo() || attempts > 35) {
            clearInterval(timer);
          }
        }, 100);
      }
    }

    function setLanguage(langCode, reloadIfEn = false) {
      const current = localStorage.getItem(STORAGE_KEY) || "en";
      localStorage.setItem(STORAGE_KEY, langCode);
      updateUI(langCode);
      triggerGoogleTranslate(langCode);

      // Inform user if they are on local file:// protocol where browser blocks Google scripts
      if (window.location.protocol === "file:") {
        const toast = $("#toast");
        if (toast) {
          toast.textContent = "Tip: For Google Translate to fetch live translations, open with VS Code Live Server or http://localhost.";
          toast.classList.add("show");
          setTimeout(() => toast.classList.remove("show"), 5000);
        }
      }

      // If switching back to English from another language and page was already translated,
      // reload cleanly restores the original English layout
      if (reloadIfEn && langCode === "en" && current !== "en") {
        clearCookie("googtrans");
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    }

    function toggleDropdown(show) {
      if (!langDropdown) return;
      const isCurrentlyOpen = !langDropdown.classList.contains("hidden");
      const nextState = (typeof show === "boolean") ? show : !isCurrentlyOpen;

      if (nextState) {
        langDropdown.classList.remove("hidden");
        langChevron?.classList.add("rotate-180");
        langBtn?.setAttribute("aria-expanded", "true");
      } else {
        langDropdown.classList.add("hidden");
        langChevron?.classList.remove("rotate-180");
        langBtn?.setAttribute("aria-expanded", "false");
      }
    }

    function init() {
      // 1. Read initial language (from localStorage or cookie)
      let initialLang = localStorage.getItem(STORAGE_KEY);
      if (!initialLang) {
        const cookieVal = getCookie("googtrans");
        if (cookieVal) {
          const parts = cookieVal.split("/");
          initialLang = parts[parts.length - 1];
        }
      }
      if (!initialLang || !LANG_MAP[initialLang]) {
        initialLang = "en";
      }

      updateUI(initialLang);

      // If not English, trigger translate on page load
      if (initialLang !== "en") {
        triggerGoogleTranslate(initialLang);
      }

      // 2. Dropdown trigger
      if (langBtn) {
        langBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleDropdown();
        });
      }

      // 3. Dropdown items
      langOptions.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const lang = btn.getAttribute("data-lang");
          if (lang) {
            setLanguage(lang, true);
          }
          toggleDropdown(false);
        });
      });

      // 4. Close dropdown on outside click
      document.addEventListener("click", (e) => {
        if (!langDropdown || langDropdown.classList.contains("hidden")) return;
        const wrapper = $("#customLangWrapper");
        if (wrapper && !wrapper.contains(e.target)) {
          toggleDropdown(false);
        }
      });

      // 5. Mobile selector change
      if (mobileSelect) {
        mobileSelect.addEventListener("change", (e) => {
          const lang = e.target.value;
          if (lang) {
            setLanguage(lang, true);
          }
        });
      }
    }

    return { init, setLanguage };
  })();

  /* ============================================================
     3. NAVBAR SCROLL EFFECT & MOBILE DRAWER
     ============================================================ */
  const Navigation = (() => {
    const navbar = $("#navbar");
    const menuToggle = $("#hamburgerBtn");
    const mobileDrawer = $("#mobileDrawer");
    const navLinks = $$(".nav-item");
    const mobileLinks = $$(".drawer-link");
    const sections = $$("section[id]");

    function onScroll() {
      if (!navbar) return;
      if (window.scrollY > 30) {
        navbar.classList.add("shadow-md");
      } else {
        navbar.classList.remove("shadow-md");
      }

      // Active section highlight
      let currentSection = "";
      const scrollPos = window.scrollY + 120;
      sections.forEach((sec) => {
        if (sec.offsetTop <= scrollPos) {
          currentSection = sec.getAttribute("id");
        }
      });
      navLinks.forEach((link) => {
        const href = link.getAttribute("href");
        if (href === "#" + currentSection) {
          link.classList.add("text-sky-600", "dark:text-sky-400");
          link.classList.remove("text-slate-600", "dark:text-slate-300");
        } else {
          link.classList.remove("text-sky-600", "dark:text-sky-400");
          link.classList.add("text-slate-600", "dark:text-slate-300");
        }
      });
    }

    function toggleMenu(force) {
      if (!menuToggle || !mobileDrawer) return;
      const isHidden = mobileDrawer.classList.contains("hidden");
      const willOpen = force !== undefined ? force : isHidden;

      mobileDrawer.classList.toggle("hidden", !willOpen);
      menuToggle.setAttribute("aria-expanded", String(willOpen));
      mobileDrawer.setAttribute("aria-hidden", String(!willOpen));
      document.body.style.overflow = willOpen ? "hidden" : "";
    }

    function init() {
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });

      if (menuToggle) {
        menuToggle.addEventListener("click", () => toggleMenu());
      }

      mobileLinks.forEach((link) => {
        link.addEventListener("click", () => toggleMenu(false));
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && mobileDrawer && !mobileDrawer.classList.contains("hidden")) {
          toggleMenu(false);
        }
      });

      window.addEventListener("resize", () => {
        if (window.innerWidth >= 1024 && mobileDrawer && !mobileDrawer.classList.contains("hidden")) {
          toggleMenu(false);
        }
      });
    }

    return { init };
  })();

  /* ============================================================
     3. SMOOTH SCROLLING
     ============================================================ */
  function initSmoothScroll() {
    $$('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        const targetId = this.getAttribute("href");
        if (!targetId || targetId === "#" || targetId.length < 2) return;
        const target = document.querySelector(targetId);
        if (!target) return;
        e.preventDefault();
        const offset = 85;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
      });
    });
  }

  /* ============================================================
     4. SCROLL PROGRESS & REVEALS
     ============================================================ */
  function initScrollEffects() {
    const bar = $("#scrollProgress");
    const backToTop = $("#backToTop");

    function update() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) {
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = progress + "%";
      }
      if (backToTop) {
        if (scrollTop > 450) {
          backToTop.classList.remove("opacity-0", "invisible");
          backToTop.classList.add("opacity-100", "visible");
        } else {
          backToTop.classList.add("opacity-0", "invisible");
          backToTop.classList.remove("opacity-100", "visible");
        }
      }
    }

    window.addEventListener("scroll", update, { passive: true });

    if (backToTop) {
      backToTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
      });
    }

    // Scroll reveal observer
    const revealEls = $$(".reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-stagger");
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.classList.add("revealed"));
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("revealed");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.05, rootMargin: "60px 0px 60px 0px" }
      );
      revealEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 60) {
          el.classList.add("revealed");
        } else {
          observer.observe(el);
        }
      });
    }
  }



  /* ============================================================
     7. CAMPUS CAPACITY CALCULATOR
     ============================================================ */
  function initCalculator() {
    const studentSlider = $("#calcStudents");
    const blockSlider = $("#calcBlocks");
    const studentVal = $("#calcStudentsVal");
    const blockVal = $("#calcBlocksVal");

    const outTerminals = $("#outTerminals");
    const outCapacity = $("#outCapacity");
    const outWindow = $("#outWindow");
    const outHours = $("#outHours");

    function calc() {
      if (!studentSlider || !blockSlider) return;
      const students = parseInt(studentSlider.value, 10) || 600;
      const blocks = parseInt(blockSlider.value, 10) || 4;

      if (studentVal) studentVal.textContent = `${students.toLocaleString()} Students`;
      if (blockVal) blockVal.textContent = `${blocks} Block${blocks > 1 ? "s" : ""}`;

      const terminals = Math.max(blocks, Math.ceil(students / 70));
      const capacity = terminals * 18;
      const windowHours = Math.max(1.5, (students * 0.35) / capacity).toFixed(1);
      const hoursSaved = Math.round(students * 0.16);

      if (outTerminals) outTerminals.textContent = `${terminals} Units`;
      if (outCapacity) outCapacity.textContent = `${capacity} Calls/Hr`;
      if (outWindow) outWindow.textContent = `${windowHours} Hours`;
      if (outHours) outHours.textContent = `${hoursSaved}+ Hrs/Mo`;
    }

    if (studentSlider && blockSlider) {
      calc();
      studentSlider.addEventListener("input", calc);
      blockSlider.addEventListener("input", calc);
    }
  }

  /* ============================================================
     8. GALLERY LIGHTBOX & BROCHURE FULLSCREEN VIEWER
     ============================================================ */
  function initGalleryLightbox() {
    const lightbox = $("#lightbox");
    const closeBtn = $("#lightboxClose");
    const prevBtn = $("#lightboxPrev");
    const nextBtn = $("#lightboxNext");
    const imgEl = $("#lightboxImg");
    const titleEl = $("#lightboxCaptionTitle");
    const counterEl = $("#lightboxCaptionCounter");
    const cards = $$(".gallery-item-card");

    if (!lightbox) return;

    let items = cards.map((c) => {
      const img = c.querySelector("img");
      return {
        src: c.getAttribute("data-img-src") || (img ? img.getAttribute("src") : ""),
        caption: c.getAttribute("data-caption") || "Allen Group Official Literature",
      };
    });

    let activeIdx = 0;

    function render(idx) {
      if (!items.length) return;
      activeIdx = (idx + items.length) % items.length;
      const item = items[activeIdx];
      if (imgEl) {
        imgEl.src = item.src;
        imgEl.alt = item.caption;
      }
      if (titleEl) titleEl.textContent = item.caption;
      if (counterEl) counterEl.textContent = `${activeIdx + 1} / ${items.length}`;
    }

    function open(idx) {
      render(idx);
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    cards.forEach((c, i) => {
      c.addEventListener("click", () => open(i));
    });

    // Support external triggers such as "Inspect Full-Size Brochure" buttons
    $$("[data-open-brochure]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const targetSrc = btn.getAttribute("data-open-brochure");
        const idx = items.findIndex((it) => it.src && it.src.includes(targetSrc));
        if (idx !== -1) {
          open(idx);
        } else if (items.length > 0) {
          open(0);
        }
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", close);
    if (prevBtn) prevBtn.addEventListener("click", () => render(activeIdx - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => render(activeIdx + 1));

    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) close();
    });

    document.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") render(activeIdx - 1);
      if (e.key === "ArrowRight") render(activeIdx + 1);
    });
  }

  /* ============================================================
     9. FAQ ACCORDION
     ============================================================ */
  function initFaq() {
    const entries = $$(".faq-item-box");
    entries.forEach((entry) => {
      const trigger = entry.querySelector(".faq-btn");
      const drawer = entry.querySelector(".faq-drawer");
      const icon = trigger ? trigger.querySelector("span:last-child") : null;
      if (!trigger || !drawer) return;

      trigger.addEventListener("click", () => {
        const isClosed = drawer.classList.contains("hidden");

        // Close all others
        entries.forEach((e) => {
          const d = e.querySelector(".faq-drawer");
          const t = e.querySelector(".faq-btn");
          const ic = t ? t.querySelector("span:last-child") : null;
          if (d) d.classList.add("hidden");
          if (t) t.setAttribute("aria-expanded", "false");
          if (ic) ic.innerHTML = "+";
        });

        if (isClosed) {
          drawer.classList.remove("hidden");
          trigger.setAttribute("aria-expanded", "true");
          if (icon) icon.innerHTML = "&minus;";
        }
      });
    });
  }

  /* ============================================================
     10. CONTACT FORM VALIDATION & TOAST
     ============================================================ */
  function initContactForm() {
    const form = $("#contactForm");
    const toast = $("#toast");

    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add("show");
      clearTimeout(showToast._t);
      showToast._t = setTimeout(() => toast.classList.remove("show"), 4500);
    }

    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#name", form);
      const email = $("#email", form);
      const institution = $("#institution", form);
      const phone = $("#phone", form);

      let isValid = true;

      [name, email, institution, phone].forEach((input) => {
        if (input) {
          const group = input.closest(".bf-field");
          const err = group ? group.querySelector(".bf-error") : null;
          input.classList.remove("border-rose-500");
          if (err) err.textContent = "";

          if (!input.value.trim()) {
            input.classList.add("border-rose-500");
            if (err) err.textContent = "This field is required.";
            isValid = false;
          }
        }
      });

      if (!isValid) {
        showToast("Please fill in the required institutional fields.");
        return;
      }

      showToast("Thank you! Your survey request has been received. Allen Group will contact you shortly.");
      form.reset();
    });
  }

  /* ============================================================
     11. DYNAMIC FOOTER YEAR
     ============================================================ */
  function initYear() {
    const el = $("#currentYear");
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ============================================================
     12. BROCHURE CHECKLIST EQUAL HEIGHT SYNC
     ============================================================ */
  function syncBrochureHeights() {
    const boxes = $$(".brochure-checklist-box");
    if (boxes.length < 2) return;

    // Reset inline minHeight to accurately measure natural heights
    boxes.forEach((b) => (b.style.minHeight = ""));

    // When displayed side-by-side on desktop/laptop (>= 1024px)
    if (window.innerWidth >= 1024) {
      let maxH = 0;
      boxes.forEach((b) => {
        const h = b.getBoundingClientRect().height;
        if (h > maxH) maxH = h;
      });
      if (maxH > 0) {
        boxes.forEach((b) => {
          b.style.minHeight = Math.ceil(maxH) + "px";
        });
      }
    }
  }

  /* ============================================================
     INITIALIZATION
     ============================================================ */
  function start() {
    ThemeManager.init();
    LanguageManager.init();
    Navigation.init();
    initSmoothScroll();
    initScrollEffects();
    initCalculator();
    initGalleryLightbox();
    initFaq();
    initContactForm();
    initYear();
    syncBrochureHeights();

    window.addEventListener("resize", syncBrochureHeights, { passive: true });
    window.addEventListener("load", syncBrochureHeights);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();