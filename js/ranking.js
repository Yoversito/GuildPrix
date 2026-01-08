// ranking.js - Mejorado con animaciones y más datos

(function () {
  'use strict';
  
  const yearsSections = Array.from(document.querySelectorAll(".ranking-year[data-year]"));
  if (!yearsSections.length) {
    console.warn("[ranking.js] No se encontraron secciones de ranking.");
    return;
  }

  const loadDataForYear = (year) => {
    const key = `prixResults_${year}`;
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    if (Array.isArray(data) && data.length) return { data, key };

    const fallback = JSON.parse(localStorage.getItem("prixResults") || "[]");
    if (Array.isArray(fallback) && fallback.length) return { data: fallback, key: "prixResults" };

    return { data: [], key };
  };

  const calculateRanking = (data) => {
    if (!data.length) return [];
    
    // Calcular estadísticas adicionales
    const enriched = data.map(player => {
      const totalMatches = (player.wins1 || 0) + (player.loses1 || 0) + 
                          (player.wins2 || 0) + (player.loses2 || 0);
      const winRate = totalMatches > 0 ? 
        ((player.wins1 || 0) + (player.wins2 || 0)) / totalMatches * 100 : 0;
      
      return {
        ...player,
        totalMatches,
        winRate: Math.round(winRate),
        performance: player.winsSubtotal * 10 + winRate
      };
    });

    return enriched.sort((a, b) => {
      if (b.winsSubtotal !== a.winsSubtotal) return b.winsSubtotal - a.winsSubtotal;
      if (b.performance !== a.performance) return b.performance - a.performance;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.totalMatches - a.totalMatches;
    });
  };

  const fillOneSection = (section, year) => {
    const { data, key } = loadDataForYear(year);
    const sorted = calculateRanking(data);
    
    if (!sorted.length) {
      console.warn(`[ranking.js] (${year}) Sin datos disponibles.`);
      showNoDataMessage(section);
      return;
    }

    const top = sorted.slice(0, Math.min(sorted.length, 6));

    // Llenar podio
    const podiumCards = section.querySelectorAll('.podium-card');
    if (podiumCards.length >= 3) {
      const podiumData = [
        { card: podiumCards[1], player: top[0], medal: 'gold', position: 1 },   // 1er lugar
        { card: podiumCards[0], player: top[1], medal: 'silver', position: 2 }, // 2do lugar
        { card: podiumCards[2], player: top[2], medal: 'bronze', position: 3 }  // 3er lugar
      ];

      podiumData.forEach(({ card, player, medal, position }, index) => {
        if (player) {
          const nameEl = card.querySelector('.name');
          const posEl = card.querySelector('.pos');
          const medalEl = card.querySelector('.medal');
          
          if (nameEl) {
            nameEl.textContent = player.name;
            nameEl.setAttribute('data-bs-toggle', 'tooltip');
            nameEl.setAttribute('title', `Win Rate: ${player.winRate}% | Partidas: ${player.totalMatches}`);
          }
          
          if (posEl) posEl.textContent = position;
          if (medalEl) {
            // Actualizar tooltip del medal
            const tooltipText = position === 1 ? 'Líder del ranking' :
                              position === 2 ? 'Segundo lugar' : 'Tercer lugar';
            medalEl.setAttribute('data-bs-original-title', tooltipText);
            
            // Agregar animación de entrada
            setTimeout(() => {
              medalEl.style.animation = `medalAppear 0.5s ease ${index * 0.2}s both`;
            }, 100);
          }
          
          // Agregar badge de estadísticas
          addPlayerStats(card, player);
        }
      });
    }

    // Llenar lista del 4to al 6to lugar
    const list = section.querySelector("ul.rank-list");
    if (list) {
      list.innerHTML = "";
      const maxPts = Math.max(1, top[0]?.winsSubtotal || 0);

      top.slice(3).forEach((player, index) => {
        const rankNum = index + 4;
        const pct = Math.max(0.2, Math.min(1, (player?.winsSubtotal || 0) / maxPts));
        
        const li = createRankListItem(player, rankNum, pct);
        list.appendChild(li);
        
        // Animación de entrada escalonada
        setTimeout(() => {
          li.style.animation = `slideInRight 0.5s ease ${index * 0.1}s both`;
        }, 300);
      });
    }

    // Actualizar tooltips
    initRankingTooltips();
    
    console.info(`[ranking.js] (${year}) Ranking generado para ${top.length} jugadores.`);
  };

  const createRankListItem = (player, rankNum, pct) => {
    const li = document.createElement("li");
    li.className = "rank-row";
    li.style.setProperty("--pct", String(pct));
    
    // Determinar etiqueta basada en rendimiento
    const tag = getPerformanceTag(rankNum, player.winRate);
    const delta = getDeltaIcon(player.delta);
    
    li.innerHTML = `
      <span class="rank-badge">${rankNum}</span>
      <div class="rank-info">
        <span class="rank-name">${player.name}</span>
        <div class="rank-stats">
          <small class="text-muted">WR: ${player.winRate}% | Partidas: ${player.totalMatches}</small>
        </div>
      </div>
      <span class="rank-right">
        <span class="rank-points" data-bs-toggle="tooltip" title="Puntos totales">${player.winsSubtotal}</span>
        ${delta}
        <span class="rank-tag">${tag}</span>
      </span>
    `;
    
    // Agregar evento click para ver detalles
    li.addEventListener('click', () => showPlayerDetails(player));
    
    return li;
  };

  const getPerformanceTag = (position, winRate) => {
    if (position === 4) return "🔥 Promesa";
    if (position === 5) return "⚡ En crecimiento";
    if (position === 6) return "🎯 Mejorando";
    return "📊 Competitivo";
  };

  const getDeltaIcon = (delta) => {
    if (delta > 0) return `<span class="rank-delta up" data-bs-toggle="tooltip" title="Subió ${delta} posiciones"><i class="bi bi-arrow-up-right"></i>${delta}</span>`;
    if (delta < 0) return `<span class="rank-delta down" data-bs-toggle="tooltip" title="Bajó ${Math.abs(delta)} posiciones"><i class="bi bi-arrow-down-right"></i>${Math.abs(delta)}</span>`;
    return `<span class="rank-delta same" data-bs-toggle="tooltip" title="Sin cambios"><i class="bi bi-dash-lg"></i></span>`;
  };

  const addPlayerStats = (card, player) => {
    const statsDiv = document.createElement('div');
    statsDiv.className = 'player-stats mt-2';
    statsDiv.innerHTML = `
      <div class="d-flex justify-content-center gap-3">
        <small class="stat-badge">${player.winRate}% WR</small>
        <small class="stat-badge">${player.totalMatches} PJ</small>
      </div>
    `;
    
    const cardBody = card.querySelector('.podium-body') || card;
    cardBody.appendChild(statsDiv);
  };

  const showNoDataMessage = (section) => {
    const message = document.createElement('div');
    message.className = 'alert alert-info text-center';
    message.innerHTML = `
      <i class="bi bi-info-circle me-2"></i>
      No hay datos disponibles para este ranking. 
      <a href="prix.html" class="alert-link">Revisa la página de Prix</a> para generar estadísticas.
    `;
    
    const container = section.querySelector('.glassy') || section;
    container.appendChild(message);
  };

  const initRankingTooltips = () => {
    // Reinicializar tooltips de Bootstrap
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(el => {
      new bootstrap.Tooltip(el, {
        boundary: document.body,
        trigger: 'hover focus'
      });
    });
  };

  const showPlayerDetails = (player) => {
    // Modal de detalles del jugador (puedes implementarlo completo si quieres)
    console.log('Detalles del jugador:', player);
    
    const detail = `
      <strong>${player.name}</strong><br>
      <small>Team: ${player.team || 'N/A'}</small><br><br>
      <strong>Estadísticas:</strong><br>
      • Puntos: ${player.winsSubtotal}<br>
      • Win Rate: ${player.winRate}%<br>
      • Partidas jugadas: ${player.totalMatches}<br>
      • Victorias 1ra hora: ${player.wins1 || 0}<br>
      • Derrotas 1ra hora: ${player.loses1 || 0}<br>
      • Victorias 2da hora: ${player.wins2 || 0}<br>
      • Derrotas 2da hora: ${player.loses2 || 0}
    `;
    
    // Notificación simple
    const notification = document.createElement('div');
    notification.className = 'player-detail-notification';
    notification.innerHTML = detail;
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(15, 23, 42, 0.98);
      color: white;
      padding: 2rem;
      border-radius: 1rem;
      border: 2px solid #7c3aed;
      z-index: 9999;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: modalAppear 0.3s ease;
    `;
    
    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 9998;
      animation: fadeIn 0.3s ease;
    `;
    
    // Cerrar al hacer click
    overlay.addEventListener('click', () => {
      notification.style.animation = 'modalDisappear 0.3s ease';
      overlay.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        notification.remove();
        overlay.remove();
      }, 300);
    });
    
    document.body.appendChild(overlay);
    document.body.appendChild(notification);
    
    // Agregar estilos de animación si no existen
    addModalStyles();
  };

  const addModalStyles = () => {
    if (!document.querySelector('#modal-styles')) {
      const style = document.createElement('style');
      style.id = 'modal-styles';
      style.textContent = `
        @keyframes modalAppear {
          from { opacity: 0; transform: translate(-50%, -60%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
        
        @keyframes modalDisappear {
          from { opacity: 1; transform: translate(-50%, -50%); }
          to { opacity: 0; transform: translate(-50%, -60%); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        @keyframes medalAppear {
          from { transform: scale(0) rotate(-180deg); opacity: 0; }
          to { transform: scale(1) rotate(0); opacity: 1; }
        }
        
        @keyframes slideInRight {
          from { transform: translateX(50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .stat-badge {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.2rem 0.5rem;
          border-radius: 0.5rem;
          font-size: 0.8rem;
        }
        
        .player-stats {
          animation: fadeIn 0.5s ease 0.5s both;
        }
        
        .rank-info {
          flex-grow: 1;
        }
        
        .rank-stats {
          font-size: 0.85rem;
          opacity: 0.8;
        }
        
        .rank-delta {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 0.5rem;
          font-weight: 700;
          font-size: 0.85rem;
        }
        
        .rank-delta.up {
          background: rgba(74, 222, 128, 0.2);
          color: #4ade80;
          border: 1px solid rgba(74, 222, 128, 0.3);
        }
        
        .rank-delta.down {
          background: rgba(248, 113, 113, 0.2);
          color: #f87171;
          border: 1px solid rgba(248, 113, 113, 0.3);
        }
        
        .rank-delta.same {
          background: rgba(168, 176, 195, 0.2);
          color: #a8b0c3;
          border: 1px solid rgba(168, 176, 195, 0.3);
        }
      `;
      document.head.appendChild(style);
    }
  };

  // Inicializar ranking para todas las secciones
  yearsSections.forEach((section) => {
    const year = section.getAttribute("data-year");
    fillOneSection(section, year);
  });

  // Agregar funcionalidad de actualización
  const updateButton = document.createElement('button');
  updateButton.className = 'btn btn-sm btn-outline-secondary position-fixed bottom-3 start-3';
  updateButton.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Actualizar';
  updateButton.style.zIndex = '1000';
  
  updateButton.addEventListener('click', () => {
    updateButton.classList.add('rotating');
    yearsSections.forEach((section) => {
      const year = section.getAttribute("data-year");
      fillOneSection(section, year);
    });
    
    setTimeout(() => {
      updateButton.classList.remove('rotating');
    }, 1000);
  });
  
  document.body.appendChild(updateButton);
  
  // Estilo para botón giratorio
  const updateStyle = document.createElement('style');
  updateStyle.textContent = `
    .rotating {
      animation: rotate 1s linear;
    }
    
    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(updateStyle);

  // Exportar para uso global
  window.dragonbound = window.dragonbound || {};
  window.dragonbound.ranking = {
    refresh: function() {
      yearsSections.forEach((section) => {
        const year = section.getAttribute("data-year");
        fillOneSection(section, year);
      });
      return true;
    },
    getRanking: function(year) {
      const { data } = loadDataForYear(year);
      return calculateRanking(data);
    }
  };
})();