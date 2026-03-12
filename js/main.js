// main.js - UX/performance core

(function () {
  'use strict';

  const DEBUG = false;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  const isLowPowerDevice =
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4);

  const log = {
    info: (...args) => {
      if (DEBUG) console.info(...args);
    },
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args)
  };

  function injectStyle(id, cssText) {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = cssText;
    document.head.appendChild(style);
  }

  initSkeletonScreen();
  setTimeout(hideSkeletonScreen, 5000);

  document.addEventListener('DOMContentLoaded', function () {
    initAnimations();
    initTooltips();
    initScrollEffects();
    initMobileNavigation();
    initStatsCounters();
    initHoverEffects();
    initImageOptimizations();
    validateReplayLinks();

    log.info('GuildPrix core initialized');
  });

  window.addEventListener('load', hideSkeletonScreen, { once: true });

  function initAnimations() {
    const targets = document.querySelectorAll('.glassy, .stat-item, .podium-card');
    if (!targets.length) return;

    if (!('IntersectionObserver' in window) || prefersReducedMotion) {
      targets.forEach((el) => el.classList.add('animate-in'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    targets.forEach((el) => {
      el.classList.add('animate-on-scroll');
      observer.observe(el);
    });

    injectStyle(
      'main-animations-style',
      `
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.45s ease, transform 0.45s ease;
        }

        .animate-on-scroll.animate-in {
          opacity: 1;
          transform: translateY(0);
        }
      `
    );
  }

  function initTooltips() {
    if (!window.bootstrap || !window.bootstrap.Tooltip) return;
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach((tooltipTriggerEl) => {
      const existing = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
      if (existing) return;
      new bootstrap.Tooltip(tooltipTriggerEl, {
        delay: { show: 350, hide: 100 }
      });
    });
  }

  function initScrollEffects() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    if (window.matchMedia('(max-width: 991.98px)').matches) return;

    const navCollapse = document.getElementById('navMain');

    let lastScroll = 0;
    let ticking = false;

    window.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;

        requestAnimationFrame(() => {
          const currentScroll = window.pageYOffset;
          const isMenuOpen = navCollapse && navCollapse.classList.contains('show');

          if (isMenuOpen) {
            navbar.classList.remove('scroll-down');
            navbar.classList.add('scroll-up');
            ticking = false;
            return;
          }

          if (currentScroll <= 0) {
            navbar.classList.remove('scroll-up');
            ticking = false;
            return;
          }

          if (currentScroll > lastScroll + 5 && !navbar.classList.contains('scroll-down')) {
            navbar.classList.remove('scroll-up');
            navbar.classList.add('scroll-down');
          } else if (
            currentScroll < lastScroll - 5 &&
            navbar.classList.contains('scroll-down')
          ) {
            navbar.classList.remove('scroll-down');
            navbar.classList.add('scroll-up');
          }

          lastScroll = currentScroll;
          ticking = false;
        });
      },
      { passive: true }
    );

    injectStyle(
      'main-scroll-style',
      `
        .navbar.scroll-up {
          transform: translateY(0);
          transition: transform 0.25s ease;
        }

        .navbar.scroll-down {
          transform: translateY(-100%);
          transition: transform 0.25s ease;
        }

        .navbar {
          transition: transform 0.25s ease, backdrop-filter 0.25s ease;
        }
      `
    );
  }

  function initMobileNavigation() {
    const navbar = document.querySelector('.navbar');
    const navCollapse = document.getElementById('navMain');
    const toggler = document.querySelector('.navbar-toggler');
    if (!navbar || !navCollapse || !toggler || !window.bootstrap || !window.bootstrap.Collapse) return;

    const collapse = bootstrap.Collapse.getOrCreateInstance(navCollapse, { toggle: false });
    const navLinks = navCollapse.querySelectorAll('.nav-link');

    const ensureVisibleNavbar = () => {
      navbar.classList.remove('scroll-down');
      navbar.classList.add('scroll-up');
    };

    toggler.addEventListener('click', ensureVisibleNavbar);
    navCollapse.addEventListener('show.bs.collapse', ensureVisibleNavbar);
    navCollapse.addEventListener('shown.bs.collapse', ensureVisibleNavbar);

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth >= 992) return;
        collapse.hide();
      });
    });
  }

  function initStatsCounters() {
    const counters = document.querySelectorAll('.stat-value, .counter');
    if (!counters.length) return;

    const animateCounter = (element, target) => {
      const duration = 700;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        element.textContent = String(Math.floor(target * progress));
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          element.textContent = String(target);
        }
      };

      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) {
      counters.forEach((counter) => {
        if (!counter.classList.contains('stat-value')) return;
        const target = parseInt(counter.textContent, 10) || 0;
        if (target > 0) animateCounter(counter, target);
      });
      return;
    }

    const counterObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = parseInt(entry.target.textContent, 10) || 0;
          if (target > 0) animateCounter(entry.target, target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.35 }
    );

    counters.forEach((counter) => {
      if (counter.classList.contains('stat-value')) counterObserver.observe(counter);
    });
  }

  function initHoverEffects() {
    if (!hasFinePointer || isLowPowerDevice) return;

    document.querySelectorAll('.hero-card').forEach((card) => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px) scale(1.01)';
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });

    createParticles();
  }

  function createParticles() {
    if (prefersReducedMotion || !hasFinePointer || isLowPowerDevice || window.innerWidth < 1200) {
      return;
    }
    if (document.querySelector('.particles')) return;

    const particles = document.createElement('div');
    particles.className = 'particles';
    particles.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:-1;';
    document.body.appendChild(particles);

    for (let i = 0; i < 10; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute;
        width: ${Math.random() * 3 + 1}px;
        height: ${Math.random() * 3 + 1}px;
        background: rgba(${Math.random() > 0.5 ? '124, 58, 237' : '6, 182, 212'}, 0.22);
        border-radius: 50%;
        top: ${Math.random() * 100}vh;
        left: ${Math.random() * 100}vw;
        animation: float ${Math.random() * 28 + 18}s linear infinite;
      `;
      particles.appendChild(particle);
    }

    injectStyle(
      'main-particles-style',
      `
        @keyframes float {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% {
            transform: translateY(-55vh) translateX(35vw);
            opacity: 0;
          }
        }
      `
    );
  }

  function initImageOptimizations() {
    const images = Array.from(document.querySelectorAll('img'));
    const nonNavbarImages = images.filter((img) => !img.closest('.navbar'));

    images.forEach((img) => {
      if (!img.hasAttribute('decoding')) img.decoding = 'async';
    });

    nonNavbarImages.forEach((img, index) => {
      if (!img.hasAttribute('loading')) {
        img.loading = index === 0 ? 'eager' : 'lazy';
      }
      if (!img.hasAttribute('fetchpriority') && index === 0) {
        img.setAttribute('fetchpriority', 'high');
      }
    });
  }

  function validateReplayLinks() {
    const suspiciousLinks = document.querySelectorAll('a[href*="dragonbound.net/z/"]');
    if (suspiciousLinks.length) {
      log.warn(
        '[main.js] Se detectaron enlaces dragonbound con ruta /z/. Validar si son correctos:',
        suspiciousLinks.length
      );
    }
  }

  function initThemeToggle() {
    if (document.querySelector('.theme-toggle-btn')) return;

    const themeToggle = document.createElement('button');
    themeToggle.className = 'btn btn-sm btn-outline-secondary position-fixed bottom-3 end-3 theme-toggle-btn';
    themeToggle.type = 'button';
    themeToggle.setAttribute('aria-label', 'Cambiar tema');
    themeToggle.style.zIndex = '1000';
    document.body.appendChild(themeToggle);

    const renderThemeToggle = (theme) => {
      const icon = theme === 'dark' ? 'bi-moon-stars' : 'bi-sun';
      const label = theme === 'dark' ? 'Tema oscuro' : 'Tema claro';
      themeToggle.innerHTML = `<i class="bi ${icon}"></i>`;
      themeToggle.setAttribute('title', label);
      themeToggle.setAttribute('aria-label', `${label}. Clic para cambiar`);
    };

    themeToggle.addEventListener('click', function () {
      const currentTheme = document.documentElement.getAttribute('data-bs-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

      document.documentElement.setAttribute('data-bs-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      renderThemeToggle(newTheme);
    });

    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    renderThemeToggle(savedTheme);
  }

  function updateCopyrightYear() {
    const yearElements = document.querySelectorAll('[data-current-year]');
    const currentYear = new Date().getFullYear();
    yearElements.forEach((el) => {
      el.textContent = currentYear;
    });
  }

  function initLazyLoading() {
    if (!('IntersectionObserver' in window)) return;

    const lazyImages = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.add('loaded');
        observer.unobserve(img);
      });
    });

    lazyImages.forEach((img) => imageObserver.observe(img));
  }

  function initSkeletonScreen() {
    if (!document.documentElement.classList.contains('app-loading')) return;
    if (document.getElementById('app-skeleton')) return;

    const pageName = window.location.pathname.split('/').pop() || 'index.html';
    const skeletonTemplates = {
      'index.html': `
        <div class="app-skeleton__top"></div>
        <div class="app-skeleton__container">
          <div class="app-skeleton__hero"></div>
          <div class="app-skeleton__grid">
            <div class="app-skeleton__card"></div>
            <div class="app-skeleton__card"></div>
            <div class="app-skeleton__card"></div>
          </div>
          <div class="app-skeleton__list">
            <div class="app-skeleton__line"></div>
            <div class="app-skeleton__line"></div>
            <div class="app-skeleton__line"></div>
            <div class="app-skeleton__line app-skeleton__line--short"></div>
          </div>
        </div>
      `,
      'prix.html': `
        <div class="app-skeleton__top"></div>
        <div class="app-skeleton__container">
          <div class="app-skeleton__section">
            <div class="app-skeleton__title"></div>
            <div class="app-skeleton__pill"></div>
          </div>
          <div class="app-skeleton__table">
            <div class="app-skeleton__table-head"></div>
            <div class="app-skeleton__table-row"></div>
            <div class="app-skeleton__table-row"></div>
            <div class="app-skeleton__table-row"></div>
            <div class="app-skeleton__table-row"></div>
            <div class="app-skeleton__table-row app-skeleton__table-row--short"></div>
          </div>
          <div class="app-skeleton__table">
            <div class="app-skeleton__table-head"></div>
            <div class="app-skeleton__table-row"></div>
            <div class="app-skeleton__table-row"></div>
            <div class="app-skeleton__table-row app-skeleton__table-row--short"></div>
          </div>
        </div>
      `,
      'ranking.html': `
        <div class="app-skeleton__top"></div>
        <div class="app-skeleton__container">
          <div class="app-skeleton__hero app-skeleton__hero--compact"></div>
          <div class="app-skeleton__podium">
            <div class="app-skeleton__podium-card"></div>
            <div class="app-skeleton__podium-card"></div>
            <div class="app-skeleton__podium-card"></div>
          </div>
          <div class="app-skeleton__list">
            <div class="app-skeleton__line"></div>
            <div class="app-skeleton__line"></div>
            <div class="app-skeleton__line"></div>
            <div class="app-skeleton__line"></div>
            <div class="app-skeleton__line app-skeleton__line--short"></div>
          </div>
        </div>
      `,
      'live.html': `
        <div class="app-skeleton__top"></div>
        <div class="app-skeleton__container">
          <div class="app-skeleton__hero app-skeleton__hero--video"></div>
          <div class="app-skeleton__button"></div>
          <div class="app-skeleton__grid app-skeleton__grid--videos">
            <div class="app-skeleton__video"></div>
            <div class="app-skeleton__video"></div>
            <div class="app-skeleton__video"></div>
            <div class="app-skeleton__video"></div>
          </div>
        </div>
      `,
    };

    const defaultTemplate = skeletonTemplates['index.html'];
    const template = skeletonTemplates[pageName] || defaultTemplate;

    const skeleton = document.createElement('div');
    skeleton.id = 'app-skeleton';
    skeleton.className = `app-skeleton app-skeleton--${pageName.replace('.html', '')}`;
    skeleton.setAttribute('aria-hidden', 'true');
    skeleton.innerHTML = template;

    document.body.appendChild(skeleton);
  }

  function hideSkeletonScreen() {
    const skeleton = document.getElementById('app-skeleton');
    if (skeleton) {
      skeleton.classList.add('is-hidden');
      setTimeout(() => skeleton.remove(), 320);
    }

    document.documentElement.classList.remove('app-loading');
    document.documentElement.classList.add('app-ready');
  }

  updateCopyrightYear();
  initThemeToggle();
  initLazyLoading();

  window.addEventListener('error', function (e) {
    log.error('Error en GuildPrix:', e.error);
  });

  if ('performance' in window) {
    window.addEventListener('load', function () {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (!perfData) return;
        log.info('Tiempo de carga total:', Math.round(perfData.loadEventEnd - perfData.startTime), 'ms');
      }, 0);
    });
  }
})();
