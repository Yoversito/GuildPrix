(function () {
  'use strict';

  const seasonData = window.GuildPrixSeasonData;
  const tables = Array.from(document.querySelectorAll('table.table.sheet'));
  const computedResults = new Map();

  const log = { warn: (...args) => console.warn(...args) };

  const num = (value) => {
    const parsed = parseFloat(String(value ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  if (!tables.length) return;

  document.querySelectorAll('table.sheet th.win, table.sheet th.lose').forEach((header) => {
    const cell = document.createElement('td');
    Array.from(header.attributes).forEach((attribute) => {
      cell.setAttribute(attribute.name, attribute.value);
    });
    cell.textContent = header.textContent;
    header.replaceWith(cell);
  });
  tables.forEach((table) => {
    table.querySelectorAll('thead th').forEach((cell) => cell.setAttribute('scope', 'col'));
    table.querySelectorAll('.sheet-subhead th').forEach((cell, index) => {
      cell.setAttribute('scope', index === 0 ? 'row' : 'col');
    });
    table.querySelectorAll('tbody > tr > th:first-child').forEach((cell) => {
      cell.setAttribute('scope', 'row');
    });
  });

  function getTableSeasonKey(table) {
    const scope = table.closest('[data-season-key]') || table.closest('.glassy') || document;
    const explicitKey = scope.getAttribute?.('data-season-key') || table.getAttribute('data-season-key');
    if (explicitKey) return explicitKey.trim();

    const heading = scope.querySelector('h1, h2');
    const match = (heading?.textContent || '').match(/20\d{2}/);
    return match ? match[0] : null;
  }

  function populatePreparedEvent(table) {
    const year = getTableSeasonKey(table);
    if (year !== '2026-10-25' || !seasonData?.getParticipants) return;

    const participants = seasonData.getParticipants(year);
    if (!participants.length) return;

    const headers = table.querySelector('.sheet-head')?.cells || [];
    const playerHeaders = table.querySelector('.sheet-subhead')?.cells || [];
    const capacity = Math.min(headers.length - 1, playerHeaders.length - 1);
    if (participants.length > capacity) {
      log.warn(`[prix.js] (${year}) La plantilla admite ${capacity} participantes; hay ${participants.length}.`);
    }

    const displayed = participants.slice(0, capacity);
    const accountCells = table.querySelectorAll('tbody tr:not(.sheet-subhead):not(.sheet-block):not(.sheet-total) td .sheet-cuentas');
    const winCells = table.querySelectorAll('.sheet-block .win');
    const loseCells = table.querySelectorAll('.sheet-block .lose');

    displayed.forEach((participant, index) => {
      const column = index + 1;
      headers[column].textContent = participant.team || String(column);
      playerHeaders[column].textContent = participant.name || '';

      const accountCell = accountCells[index];
      if (accountCell && Array.isArray(participant.accounts)) {
        accountCell.replaceChildren(...participant.accounts.map((account) => {
          const item = document.createElement('div');
          item.textContent = String(account);
          return item;
        }));
      }

      const participantCount = headers.length - 1;
      const scores = [participant.wins1, participant.wins2];
      const losses = [participant.loses1, participant.loses2];
      scores.forEach((score, hour) => {
        const cell = winCells[hour * participantCount + index];
        if (cell && score !== null && score !== undefined) cell.textContent = String(score);
      });
      losses.forEach((score, hour) => {
        const cell = loseCells[hour * participantCount + index];
        if (cell && score !== null && score !== undefined) cell.textContent = String(score);
      });
    });
  }

  function computeOneTable(table) {
    const year = getTableSeasonKey(table) || 'unknown';
    const tableRows = Array.from(table.querySelectorAll('tr'));
    const rows = tableRows.map((row) =>
      Array.from(row.querySelectorAll('th, td'), (cell) => cell.textContent.trim())
    );
    const findRowIndex = (label) =>
      rows.findIndex((row) => (row[0] || '').toUpperCase() === label);

    const idxPisador = findRowIndex('PISADOR');
    const idxFirstHour = findRowIndex('1RA HORA');
    const idxSecondHour = findRowIndex('2DA HORA');
    const idxSubtotal = findRowIndex('SUBTOTAL');

    if ([idxPisador, idxFirstHour, idxSecondHour, idxSubtotal].some((index) => index < 0)) {
      log.warn(`[prix.js] (${year}) Faltan filas esperadas.`);
      return { year, ok: false };
    }

    const headerLength = (rows[0] || []).length;
    const playerColumns = Array.from({ length: Math.max(0, headerLength - 1) }, (_, i) => i + 1);
    const numberAt = (rowIndex, columnIndex) => {
      const row = rows[rowIndex] || [];
      const hasRowspanGap = row.length === headerLength - 1;
      return num(row[hasRowspanGap ? columnIndex - 1 : columnIndex]);
    };

    const namesRow = rows[idxPisador] || [];
    const playerNames = playerColumns.map((column) => namesRow[column] || '');
    if (!playerNames.some((name) => name.trim())) {
      const payload = [];
      computedResults.set(year, payload);
      validateRankingSnapshot(year, payload);
      return { year, ok: true, payload };
    }
    if (year === '2026-10-25' && !seasonData?.hasCompleteScores(year)) {
      const payload = [];
      computedResults.set(year, payload);
      validateRankingSnapshot(year, payload);
      return { year, ok: true, payload };
    }
    const firstWins = playerColumns.map((column) => numberAt(idxFirstHour, column));
    const firstLosses = playerColumns.map((column) => numberAt(idxFirstHour + 1, column));
    const secondWins = playerColumns.map((column) => numberAt(idxSecondHour, column));
    const secondLosses = playerColumns.map((column) => numberAt(idxSecondHour + 1, column));
    const subtotals = playerColumns.map(
      (_, index) =>
        playerNames[index]
          ? firstWins[index] - firstLosses[index] + secondWins[index] - secondLosses[index]
          : null
    );

    const subtotalCells = tableRows[idxSubtotal]?.querySelectorAll('th, td') || [];
    playerColumns.forEach((column, index) => {
      const cell = subtotalCells[column];
      if (!cell) return;
      cell.textContent = subtotals[index] === null ? '' : String(subtotals[index]);
      cell.classList.add('updated-value');
      window.setTimeout(() => {
        cell.classList.add('highlight');
        window.setTimeout(() => cell.classList.remove('highlight'), 1000);
      }, index * 100);
    });

    const total = subtotals.reduce((sum, value) => sum + (value ?? 0), 0);
    const totalCell = table.querySelector('.total-num') || subtotalCells[subtotalCells.length - 1];
    if (totalCell) {
      totalCell.textContent = String(total);
      totalCell.classList.add('updated-value', 'total-highlight');
      window.setTimeout(() => {
        totalCell.classList.add('total-pulse');
        window.setTimeout(() => totalCell.classList.remove('total-pulse'), 1500);
      }, 500);
    }

    const pointsRow = tableRows[idxSubtotal + 2];
    pointsRow?.querySelector('th:last-child, td:last-child')?.classList.add('puntos-highlight');

    const payload = playerColumns
      .map((column, index) => ({
        name: String(playerNames[index]).trim(),
        winsSubtotal: subtotals[index] ?? 0,
        totalNet: subtotals[index] ?? 0,
        team: (rows[0] || [])[column] || `Team ${column}`,
        wins1: firstWins[index],
        loses1: firstLosses[index],
        wins2: secondWins[index],
        loses2: secondLosses[index]
      }))
      .filter((player) => player.name && player.name !== '0' && player.name !== '—');

    computedResults.set(year, payload);
    validateRankingSnapshot(year, payload);
    return { year, ok: true, payload };
  }

  function validateRankingSnapshot(year, payload) {
    if (!seasonData || !seasonData.getSeasonKeys().includes(year)) return;
    const expected = seasonData.getResults(year);
    const matches = payload.length === expected.length && payload.every((player, index) => {
      const source = expected[index];
      return source &&
        player.name === source.name &&
        player.winsSubtotal === source.winsSubtotal &&
        player.wins1 === source.wins1 &&
        player.loses1 === source.loses1 &&
        player.wins2 === source.wins2 &&
        player.loses2 === source.loses2;
    });

    if (!matches) {
      log.warn(`[prix.js] (${year}) La tabla y los datos del ranking no coinciden.`);
    }
  }

  function showMatchDetail(cell, table) {
    const row = cell.closest('tr');
    const tableHead = table.querySelector('.sheet-head');
    const playerHeader = table.querySelector('.sheet-subhead');
    const hasRowspanGap = row.cells.length === tableHead.cells.length - 1;
    const column = cell.cellIndex + (hasRowspanGap ? 1 : 0);
    const player = playerHeader?.cells[column]?.textContent.trim() || `Team ${column}`;
    const team = tableHead?.cells[column]?.textContent.trim() || String(column);
    const period = cell.classList.contains('win') ? 'Victoria' : 'Derrota';
    const rowIndex = Array.from(table.querySelectorAll('.sheet-block')).indexOf(row);
    const hour = rowIndex < 2 ? '1.ª hora' : '2.ª hora';

    let notification = document.querySelector('.match-notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'match-notification';
      notification.setAttribute('role', 'status');
      notification.setAttribute('aria-live', 'polite');
      document.body.appendChild(notification);
    }

    notification.textContent = `${period}: ${player} (Team ${team}), ${hour}: ${cell.textContent.trim() || '0'}`;
    notification.classList.remove('is-visible');
    requestAnimationFrame(() => notification.classList.add('is-visible'));
    window.clearTimeout(notification.dismissTimer);
    notification.dismissTimer = window.setTimeout(() => {
      notification.classList.remove('is-visible');
    }, 3000);
  }

  function initTableInteractions() {
    tables.forEach((table) => {
      table.addEventListener('click', (event) => {
        const cell = event.target.closest('.win, .lose');
        if (cell && cell.textContent.trim() && table.contains(cell)) showMatchDetail(cell, table);
      });

      table.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const cell = event.target.closest('.win, .lose');
        if (!cell || !cell.textContent.trim() || !table.contains(cell)) return;
        event.preventDefault();
        showMatchDetail(cell, table);
      });

      table.addEventListener('mouseover', (event) => {
        const row = event.target.closest('.sheet-block');
        if (row && table.contains(row)) row.classList.add('row-highlight');
      });

      table.addEventListener('mouseout', (event) => {
        const row = event.target.closest('.sheet-block');
        if (row && !row.contains(event.relatedTarget)) row.classList.remove('row-highlight');
      });
    });

    document.querySelectorAll('.sheet-block .win, .sheet-block .lose').forEach((cell) => {
      if (!cell.textContent.trim()) return;
      const row = cell.closest('tr');
      const table = cell.closest('table');
      const header = table.querySelector('.sheet-head');
      const hasRowspanGap = row.cells.length === header.cells.length - 1;
      const column = cell.cellIndex + (hasRowspanGap ? 1 : 0);
      const player = table.querySelector('.sheet-subhead')?.cells[column]?.textContent.trim() || `Team ${column}`;
      const rowIndex = Array.from(table.querySelectorAll('.sheet-block')).indexOf(row);
      const hour = rowIndex < 2 ? 'primera' : 'segunda';
      const result = cell.classList.contains('win') ? 'victoria' : 'derrota';
      cell.classList.add('is-interactive-score');
      cell.tabIndex = 0;
      cell.setAttribute('role', 'button');
      cell.setAttribute(
        'aria-label',
        `Ver ${result} de ${player}, ${hour} hora: ${cell.textContent.trim() || '0'}`
      );
    });
  }

  tables.forEach(populatePreparedEvent);
  tables.forEach(computeOneTable);
  initTableInteractions();

  window.dragonbound = window.dragonbound || {};
  window.dragonbound.prix = {
    recalculate() {
      return tables.map(computeOneTable);
    },
    getResults(year) {
      if (year) return computedResults.get(String(year)) || seasonData?.getResults(year) || [];
      const latestYear = Array.from(computedResults.keys())
        .filter((key) => /^\d{4}$/.test(key))
        .sort((a, b) => Number(b) - Number(a))[0];
      return computedResults.get(latestYear) || [];
    },
    exportData(year) {
      return JSON.stringify(this.getResults(year), null, 2);
    }
  };
})();
