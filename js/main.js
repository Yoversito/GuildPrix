// main.js - Mejoras y funcionalidades adicionales

(function() {
  'use strict';
  
  // ========== INITIALIZATION ==========
  document.addEventListener('DOMContentLoaded', function() {
    initAnimations();
    initTooltips();
    initScrollEffects();
    initStatsCounters();
    initHoverEffects();
    
    console.log('DragonBound Guild Prix - Inicializado');
  });
  
  // ========== ANIMATIONS ==========
  function initAnimations() {
    // Animación de entrada para elementos
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);
    
    // Observar elementos con clase .animate-on-scroll
    document.querySelectorAll('.glassy, .stat-item, .podium-card').forEach(el => {
      el.classList.add('animate-on-scroll');
      observer.observe(el);
    });
    
    // Agregar estilos CSS para animaciones
    const style = document.createElement('style');
    style.textContent = `
      .animate-on-scroll {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
      }
      
      .animate-on-scroll.animate-in {
        opacity: 1;
        transform: translateY(0);
      }
      
      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // ========== TOOLTIPS ==========
  function initTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl, {
        delay: { show: 500, hide: 100 }
      });
    });
  }
  
  // ========== SCROLL EFFECTS ==========
  function initScrollEffects() {
    let lastScroll = 0;
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
      const currentScroll = window.pageYOffset;
      
      if (currentScroll <= 0) {
        navbar.classList.remove('scroll-up');
        return;
      }
      
      if (currentScroll > lastScroll && !navbar.classList.contains('scroll-down')) {
        // Scroll hacia abajo
        navbar.classList.remove('scroll-up');
        navbar.classList.add('scroll-down');
      } else if (currentScroll < lastScroll && navbar.classList.contains('scroll-down')) {
        // Scroll hacia arriba
        navbar.classList.remove('scroll-down');
        navbar.classList.add('scroll-up');
      }
      
      lastScroll = currentScroll;
    });
    
    // Agregar estilos para efectos de scroll
    const scrollStyles = document.createElement('style');
    scrollStyles.textContent = `
      .navbar.scroll-up {
        transform: translateY(0);
        transition: transform 0.3s ease;
      }
      
      .navbar.scroll-down {
        transform: translateY(-100%);
        transition: transform 0.3s ease;
      }
      
      .navbar {
        transition: transform 0.3s ease, backdrop-filter 0.3s ease;
      }
    `;
    document.head.appendChild(scrollStyles);
  }
  
  // ========== STATS COUNTERS ==========
  function initStatsCounters() {
    const counters = document.querySelectorAll('.stat-value, .counter');
    
    counters.forEach(counter => {
      if (counter.classList.contains('stat-value')) {
        const target = parseInt(counter.textContent) || 0;
        if (target > 0) {
          animateCounter(counter, target);
        }
      }
    });
    
    function animateCounter(element, target) {
      let current = 0;
      const increment = target / 50;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          element.textContent = target;
          clearInterval(timer);
        } else {
          element.textContent = Math.floor(current);
        }
      }, 30);
    }
  }
  
  // ========== HOVER EFFECTS ==========
  function initHoverEffects() {
    // Efecto de brillo en tarjetas
    document.querySelectorAll('.glassy-hover, .hero-card').forEach(card => {
      card.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateY = (x - centerX) / 25;
        const rotateX = (centerY - y) / 25;
        
        this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      });
      
      card.addEventListener('mouseleave', function() {
        this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      });
    });
    
    // Efecto de partículas en el fondo
    createParticles();
  }
  
  // ========== PARTICLES BACKGROUND ==========
  function createParticles() {
    if (!document.querySelector('.particles')) {
      const particles = document.createElement('div');
      particles.className = 'particles';
      particles.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
      `;
      document.body.appendChild(particles);
      
      // Crear partículas
      for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
          position: absolute;
          width: ${Math.random() * 4 + 1}px;
          height: ${Math.random() * 4 + 1}px;
          background: rgba(${Math.random() > 0.5 ? '124, 58, 237' : '6, 182, 212'}, ${Math.random() * 0.3 + 0.1});
          border-radius: 50%;
          top: ${Math.random() * 100}vh;
          left: ${Math.random() * 100}vw;
          animation: float ${Math.random() * 20 + 10}s linear infinite;
        `;
        particles.appendChild(particle);
      }
      
      // Agregar animación de flotación
      const particleAnimation = document.createElement('style');
      particleAnimation.textContent = `
        @keyframes float {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(${Math.random() > 0.5 ? '-' : ''}${Math.random() * 100 + 50}vh) 
                       translateX(${Math.random() > 0.5 ? '-' : ''}${Math.random() * 100 + 50}vw);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(particleAnimation);
    }
  }
  
  // ========== THEME TOGGLE ==========
  function initThemeToggle() {
    const themeToggle = document.createElement('button');
    themeToggle.className = 'btn btn-sm btn-outline-secondary position-fixed bottom-3 end-3';
    themeToggle.innerHTML = '<i class="bi bi-moon-stars"></i>';
    themeToggle.style.zIndex = '1000';
    document.body.appendChild(themeToggle);
    
    themeToggle.addEventListener('click', function() {
      const currentTheme = document.documentElement.getAttribute('data-bs-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-bs-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      
      this.innerHTML = newTheme === 'dark' 
        ? '<i class="bi bi-moon-stars"></i>' 
        : '<i class="bi bi-sun"></i>';
    });
    
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    themeToggle.innerHTML = savedTheme === 'dark' 
      ? '<i class="bi bi-moon-stars"></i>' 
      : '<i class="bi bi-sun"></i>';
  }
  
  // ========== COPYRIGHT YEAR ==========
  function updateCopyrightYear() {
    const yearElements = document.querySelectorAll('[data-current-year]');
    const currentYear = new Date().getFullYear();
    
    yearElements.forEach(el => {
      el.textContent = currentYear;
    });
  }
  
  // ========== LAZY LOADING ==========
  function initLazyLoading() {
    if ('IntersectionObserver' in window) {
      const lazyImages = document.querySelectorAll('img[data-src]');
      
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.add('loaded');
            imageObserver.unobserve(img);
          }
        });
      });
      
      lazyImages.forEach(img => imageObserver.observe(img));
    }
  }
  
  // ========== INIT ALL ==========
  updateCopyrightYear();
  initThemeToggle();
  initLazyLoading();
  
  // ========== ERROR HANDLING ==========
  window.addEventListener('error', function(e) {
    console.error('Error en DragonBound Guild Prix:', e.error);
  });
  
  // ========== PERFORMANCE MONITORING ==========
  if ('performance' in window) {
    window.addEventListener('load', function() {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        console.log('Tiempo de carga:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
      }, 0);
    });
  }
})();