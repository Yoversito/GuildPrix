// prix.js - MODIFICADO para puntos manuales

(function () {
  'use strict';
  
  const num = (s) => {
    const n = parseFloat(String(s).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const tables = Array.from(document.querySelectorAll("table.table.sheet"));
  if (!tables.length) return;

  const computedYears = [];

  const getYearForTable = (table) => {
    const scope = table.closest(".glassy") || document;
    const h1 = scope.querySelector("h1");
    const txt = (h1?.textContent || "").trim();
    const m = txt.match(/20\d{2}/);
    return m ? m[0] : null;
  };

  const computeOneTable = (table) => {
    const year = getYearForTable(table) || "unknown";

    const rows = Array.from(table.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.querySelectorAll("th,td")).map((td) => (td.textContent || "").trim())
    );

    const findRowIndex = (label) =>
      rows.findIndex((r) => ((r[0] || "").toUpperCase() === label));

    const idxPisador = findRowIndex("PISADOR");
    const idx1ra = findRowIndex("1RA HORA");
    const idx2da = findRowIndex("2DA HORA");
    const idxSub = findRowIndex("SUBTOTAL");

    if (idxPisador < 0 || idx1ra < 0 || idx2da < 0 || idxSub < 0) {
      console.warn(`[prix.js] (${year}) Faltan filas esperadas.`);
      return { year, ok: false };
    }

    const idxLose1 = idx1ra + 1;
    const idxLose2 = idx2da + 1;

    const header = rows[0] || [];
    const headerLen = header.length;
    const playerCols = [];
    for (let c = 1; c < headerLen; c++) playerCols.push(c);

    const getNumAt = (rowIndex, colIndex) => {
      const row = rows[rowIndex] || [];
      const hasRowspanGap = (row.length === headerLen - 1);
      const trueIdx = hasRowspanGap ? (colIndex - 1) : colIndex;
      return num(row[trueIdx]);
    };

    const namesRow = rows[idxPisador] || [];
    const playerNames = playerCols.map((c) => namesRow[c] || `P${c}`);

    const w1 = playerCols.map((c) => getNumAt(idx1ra, c));
    const l1 = playerCols.map((c) => getNumAt(idxLose1, c));
    const w2 = playerCols.map((c) => getNumAt(idx2da, c));
    const l2 = playerCols.map((c) => getNumAt(idxLose2, c));

    const sub = playerCols.map((_, i) => (w1[i] - l1[i]) + (w2[i] - l2[i]));

    // Actualizar celdas de subtotal
    const trSub = table.querySelectorAll("tr")[idxSub];
    if (trSub) {
      playerCols.forEach((c, i) => {
        const cell = trSub.querySelectorAll("th,td")[c];
        if (cell) {
          cell.textContent = String(sub[i]);
          cell.classList.add('updated-value');
          
          // Agregar animación
          setTimeout(() => {
            cell.classList.add('highlight');
            setTimeout(() => cell.classList.remove('highlight'), 1000);
          }, i * 100);
        }
      });
    }

    const totalGeneral = sub.reduce((a, b) => a + b, 0);
    const totalCell = table.querySelector(".total-num") || trSub?.querySelector("td:last-child, th:last-child");
    if (totalCell) {
      totalCell.textContent = String(totalGeneral);
      totalCell.classList.add('updated-value', 'total-highlight');
      
      // Animación para total
      setTimeout(() => {
        totalCell.classList.add('pulse');
        setTimeout(() => totalCell.classList.remove('pulse'), 1500);
      }, 500);
    }

    // ============================================
    // PUNTOS - SE MANTIENE EL VALOR MANUAL DEL HTML
    // ============================================
    // No calculamos puntos automáticamente, respetamos el valor en HTML
    const puntosRow = table.querySelectorAll("tr")[idxSub + 2];
    if (puntosRow) {
      const puntosCell = puntosRow.querySelector("th:last-child, td:last-child");
      if (puntosCell) {
        // Solo agregamos clase para estilos, NO cambiamos el valor
        puntosCell.classList.add('puntos-highlight');
        console.log(`[prix.js] (${year}) Puntos manuales: ${puntosCell.textContent}`);
      }
    }

    const payload = playerCols.map((c, i) => ({
      name: String(playerNames[i]).trim(),
      winsSubtotal: sub[i],
      totalNet: sub[i],
      team: header[c] || `Team ${c}`,
      wins1: w1[i],
      loses1: l1[i],
      wins2: w2[i],
      loses2: l2[i]
    })).filter(x => x.name && x.name !== "0" && x.name !== "—");

    const key = `prixResults_${year}`;
    localStorage.setItem(key, JSON.stringify(payload));
    computedYears.push(year);

    console.info(`[prix.js] (${year}) Cálculos completados (sin puntos).`, payload);

    // Agregar estilos para animaciones
    addAnimationStyles();
    
    return { year, ok: true, key, payload };
  };

  const results = tables.map(computeOneTable);

  // Compatibilidad con versión anterior
  const numericYears = results
    .map(r => r.year)
    .filter(y => /^\d{4}$/.test(String(y)))
    .map(y => parseInt(y, 10));

  if (numericYears.length) {
    const latest = String(Math.max(...numericYears));
    const latestKey = `prixResults_${latest}`;
    const latestPayload = JSON.parse(localStorage.getItem(latestKey) || "[]");
    localStorage.setItem("prixResults", JSON.stringify(latestPayload));
    console.info(`[prix.js] Datos guardados en localStorage.prixResults -> ${latestKey}`);
  }

  // Inicializar eventos interactivos
  initTableInteractions();

  function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .updated-value {
        transition: all 0.3s ease;
      }
      
      .highlight {
        background-color: rgba(124, 58, 237, 0.3) !important;
        animation: highlight-fade 1s ease;
      }
      
      .total-highlight {
        color: #ffd700 !important;
        text-shadow: 0 0 10px rgba(255, 215, 0, 0.5) !important;
      }
      
      .puntos-highlight {
        /* Solo decoración, no cambia valor */
        color: #4ade80 !important;
        text-shadow: 0 0 10px rgba(74, 222, 128, 0.3) !important;
      }
      
      .pulse {
        animation: pulse 1.5s ease-in-out;
      }
      
      @keyframes highlight-fade {
        0% { background-color: rgba(124, 58, 237, 0.5); }
        100% { background-color: rgba(124, 58, 237, 0.1); }
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  function initTableInteractions() {
    // Resaltar filas al pasar el mouse
    document.querySelectorAll('.sheet-block th, .sheet-block td').forEach(cell => {
      cell.addEventListener('mouseenter', function() {
        const row = this.closest('tr');
        row.classList.add('row-highlight');
      });
      
      cell.addEventListener('mouseleave', function() {
        const row = this.closest('tr');
        row.classList.remove('row-highlight');
      });
    });

    // Click en celdas para ver detalles
    document.querySelectorAll('.win, .lose').forEach(cell => {
      cell.addEventListener('click', function() {
        const value = this.textContent;
        const isWin = this.classList.contains('win');
        const team = this.closest('tr').querySelector('th:first-child')?.textContent || '';
        const column = this.cellIndex;
        const header = document.querySelector(`.sheet-head th:nth-child(${column + 1})`)?.textContent || '';
        
        showMatchDetail({
          team,
          header,
          value,
          isWin,
          position: { row: this.parentElement.rowIndex, col: column }
        });
      });
    });

    // Agregar estilos para interacciones
    const interactionStyles = document.createElement('style');
    interactionStyles.textContent = `
      .row-highlight {
        background-color: rgba(6, 182, 212, 0.2) !important;
      }
      
      .win, .lose {
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .win:hover {
        background-color: rgba(74, 222, 128, 0.3) !important;
        transform: scale(1.1);
      }
      
      .lose:hover {
        background-color: rgba(248, 113, 113, 0.3) !important;
        transform: scale(1.1);
      }
    `;
    document.head.appendChild(interactionStyles);
  }

  function showMatchDetail(detail) {
    console.log('Detalle de partida:', detail);
    
    const notification = document.createElement('div');
    notification.className = 'match-notification';
    notification.innerHTML = `
      <strong>${detail.isWin ? 'Victoria' : 'Derrota'}:</strong> 
      ${detail.team} - ${detail.header}: ${detail.value}
    `;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(15, 23, 42, 0.95);
      color: white;
      padding: 1rem;
      border-radius: 0.5rem;
      border-left: 4px solid ${detail.isWin ? '#4ade80' : '#f87171'};
      z-index: 9999;
      animation: slideIn 0.3s ease;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
    
    if (!document.querySelector('#match-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'match-notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Exportar funciones para uso global
  window.dragonbound = window.dragonbound || {};
  window.dragonbound.prix = {
    recalculate: function() {
      return tables.map(computeOneTable);
    },
    getResults: function(year) {
      const key = year ? `prixResults_${year}` : 'prixResults';
      return JSON.parse(localStorage.getItem(key) || "[]");
    },
    exportData: function(year) {
      const data = this.getResults(year);
      return JSON.stringify(data, null, 2);
    }
  };
})();