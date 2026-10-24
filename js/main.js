(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  const isLowPowerDevice =
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4);

  document.addEventListener('DOMContentLoaded', function () {
    initAnimations();
    initTooltips();
    initScrollEffects();
    initMobileNavigation();
    initStatsCounters();
    createParticles();
  });

  function initAnimations() {
    const targets = document.querySelectorAll('.glassy, .stat-item, .podium-card');
    if (!targets.length || prefersReducedMotion || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    targets.forEach((element) => {
      element.classList.add('animate-on-scroll');
      observer.observe(element);
    });
  }

  function initTooltips() {
    const Tooltip = window.bootstrap?.Tooltip;
    if (!Tooltip) return;

    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((element) => {
      if (!Tooltip.getInstance(element)) {
        new Tooltip(element, { delay: { show: 350, hide: 100 } });
      }
    });
  }

  function initScrollEffects() {
    const navbar = document.querySelector('.navbar');
    if (!navbar || window.matchMedia('(max-width: 991.98px)').matches) return;

    const navCollapse = document.getElementById('navMain');
    let lastScroll = 0;
    let ticking = false;

    navbar.addEventListener('focusin', () => {
      navbar.classList.remove('scroll-down');
      navbar.classList.add('scroll-up');
    });

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const currentScroll = window.scrollY;
        const menuIsOpen = navCollapse?.classList.contains('show');

        if (menuIsOpen || currentScroll <= 0) {
          navbar.classList.remove('scroll-down');
          navbar.classList.toggle('scroll-up', menuIsOpen);
        } else if (currentScroll > lastScroll + 5) {
          navbar.classList.remove('scroll-up');
          navbar.classList.add('scroll-down');
        } else if (currentScroll < lastScroll - 5) {
          navbar.classList.remove('scroll-down');
          navbar.classList.add('scroll-up');
        }

        lastScroll = currentScroll;
        ticking = false;
      });
    }, { passive: true });
  }

  function initMobileNavigation() {
    const navCollapse = document.getElementById('navMain');
    const toggler = document.querySelector('.navbar-toggler');
    const Collapse = window.bootstrap?.Collapse;
    if (!navCollapse || !toggler || !Collapse) return;

    const collapse = Collapse.getOrCreateInstance(navCollapse, { toggle: false });
    const navbar = document.querySelector('.navbar');
    const ensureVisible = () => {
      navbar?.classList.remove('scroll-down');
      navbar?.classList.add('scroll-up');
    };

    toggler.addEventListener('click', ensureVisible);
    navCollapse.addEventListener('show.bs.collapse', ensureVisible);
    navCollapse.addEventListener('show.bs.collapse', () => {
      toggler.setAttribute('aria-expanded', 'true');
      toggler.setAttribute('aria-label', 'Cerrar menú de navegación');
    });
    navCollapse.addEventListener('hidden.bs.collapse', () => {
      toggler.setAttribute('aria-expanded', 'false');
      toggler.setAttribute('aria-label', 'Abrir menú de navegación');
    });
    navCollapse.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 992) collapse.hide();
      });
    });
  }

  function initStatsCounters() {
    if (prefersReducedMotion) return;
    const counters = document.querySelectorAll('.stat-value');
    if (!counters.length) return;

    const animate = (element) => {
      const target = Number.parseInt(element.textContent, 10) || 0;
      if (target <= 0) return;

      const start = performance.now();
      const duration = 700;
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        element.textContent = String(Math.floor(target * progress));
        if (progress < 1) requestAnimationFrame(tick);
        else element.textContent = String(target);
      };
      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) {
      counters.forEach(animate);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.35 });

    counters.forEach((counter) => observer.observe(counter));
  }

  function createParticles() {
    if (
      prefersReducedMotion ||
      !hasFinePointer ||
      isLowPowerDevice ||
      window.innerWidth < 1200 ||
      document.querySelector('.particles')
    ) return;

    const particles = document.createElement('div');
    particles.className = 'particles';
    particles.setAttribute('aria-hidden', 'true');
    document.body.appendChild(particles);

    for (let index = 0; index < 10; index += 1) {
      const particle = document.createElement('span');
      particle.className = 'particle';
      particle.style.setProperty('--particle-x', `${Math.random() * 100}vw`);
      particle.style.setProperty('--particle-y', `${Math.random() * 100}vh`);
      particle.style.setProperty('--particle-size', `${Math.random() * 3 + 1}px`);
      particle.style.setProperty('--particle-duration', `${Math.random() * 28 + 18}s`);
      particle.style.setProperty('--particle-color', Math.random() > 0.5 ? '#7c3aed' : '#06b6d4');
      particles.appendChild(particle);
    }
  }

  document.querySelectorAll('[data-current-year]').forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
})();
