/* =====================================================================
   Goutam Soni — Portfolio Scripts
   Vanilla JS only. Handles: theme toggle (persisted), mobile nav,
   scroll-reveal animation, hero terminal typing effect, client-side
   contact form validation, and a cursor-tracking spotlight on cards.
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* -------------------------------------------------------------
     1. THEME TOGGLE (dark / light, persisted in localStorage)
     ------------------------------------------------------------- */
  const root = document.documentElement;
  const themeToggle = document.querySelector('.theme-toggle');
  const THEME_KEY = 'gs-portfolio-theme';

  const applyTheme = (theme) => {
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    if (themeToggle) {
      const isLight = theme === 'light';
      themeToggle.setAttribute('aria-pressed', String(isLight));
      themeToggle.querySelector('.icon').textContent = isLight ? '☀️' : '🌙';
      themeToggle.querySelector('.label').textContent = isLight ? 'Light' : 'Dark';
    }
  };

  const saved = localStorage.getItem(THEME_KEY);
  const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(saved || (systemPrefersLight ? 'light' : 'dark'));

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isLight = root.getAttribute('data-theme') === 'light';
      const next = isLight ? 'dark' : 'light';
      applyTheme(next);
      localStorage.setItem(THEME_KEY, next);
    });
  }

  /* -------------------------------------------------------------
     2. MOBILE NAVIGATION TOGGLE
     ------------------------------------------------------------- */
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* -------------------------------------------------------------
     3. SCROLL-REVEAL ANIMATION
     ------------------------------------------------------------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* -------------------------------------------------------------
     4. HERO TERMINAL TYPING EFFECT
     ------------------------------------------------------------- */
  const typingTarget = document.querySelector('[data-typing]');
  if (typingTarget) {
    const fullText = typingTarget.getAttribute('data-typing');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      typingTarget.textContent = fullText;
    } else {
      let i = 0;
      typingTarget.textContent = '';
      const typeNext = () => {
        if (i <= fullText.length) {
          typingTarget.textContent = fullText.slice(0, i);
          i += 1;
          setTimeout(typeNext, 35);
        }
      };
      typeNext();
    }
  }

  /* -------------------------------------------------------------
     5. CONTACT FORM — client-side validation
     ------------------------------------------------------------- */
  const form = document.querySelector('.contact-form');
  if (form) {
    const status = form.querySelector('.form-status');

    const showStatus = (message, isSuccess) => {
      status.textContent = message;
      status.classList.add('is-visible');
      status.classList.toggle('success', isSuccess);
      status.setAttribute('role', 'status');
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const name = form.querySelector('#name');
      const email = form.querySelector('#email');
      const message = form.querySelector('#message');
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
        showStatus('Please fill in every field before sending.', false);
        return;
      }
      if (!emailPattern.test(email.value.trim())) {
        showStatus('Please enter a valid email address.', false);
        return;
      }

      showStatus(`Thanks, ${name.value.trim()}! Your message is ready to send — connect a backend or form service to deliver it.`, true);
      form.reset();
    });
  }

  /* -------------------------------------------------------------
     6. SPOTLIGHT HOVER — soft glow that follows the cursor on cards.
        Applies a data-spotlight attribute (used by CSS) to existing
        card elements, so no HTML edits are required.
     ------------------------------------------------------------- */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReducedMotion) {
    const spotlightSelectors = '.info-card, .project-card, .skill-chip, .contact-form, .contact-aside, .terminal';
    document.querySelectorAll(spotlightSelectors).forEach((el) => {
      el.setAttribute('data-spotlight', '');
      el.addEventListener('pointermove', (event) => {
        const rect = el.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        el.style.setProperty('--spot-x', `${x}%`);
        el.style.setProperty('--spot-y', `${y}%`);
      });
    });
  }

});