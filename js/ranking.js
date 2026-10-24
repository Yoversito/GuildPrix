(function () {
  'use strict';

  const seasonData = window.GuildPrixSeasonData;
  const yearsSections = Array.from(
    document.querySelectorAll('.ranking-year[data-year]')
  );

  if (!seasonData || !yearsSections.length) {
    console.error('[ranking.js] No se pudo inicializar el ranking.');
    return;
  }

  const formatDelta = (delta) => {
    if (delta === null) return 'Sin referencia anterior';
    if (delta > 0) return `Subió ${delta} ${delta === 1 ? 'puesto' : 'puestos'}`;
    if (delta < 0) return `Bajó ${Math.abs(delta)} ${delta === -1 ? 'puesto' : 'puestos'}`;
    return 'Se mantiene';
  };

  function fillOneSection(section, year) {
    section.querySelectorAll('.player-stats, .alert.alert-info').forEach((el) => el.remove());
    const list = section.querySelector('.rank-list');
    if (list) {
      list.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((element) => {
        window.bootstrap?.Tooltip?.getInstance(element)?.dispose();
      });
      list.replaceChildren();
    }

    const ranking = seasonData.getRanking(year);
    if (!ranking.length) {
      showNoDataMessage(section, year);
      return;
    }

    const podiumCards = section.querySelectorAll('.podium-card');
    const podiumOrder = [1, 0, 2];

    podiumOrder.forEach((cardIndex, positionIndex) => {
      const card = podiumCards[cardIndex];
      if (!card) return;

      const player = ranking[positionIndex];
      const name = card.querySelector('.name');
      const position = card.querySelector('.pos');
      const medal = card.querySelector('.medal');

      if (!player) {
        if (name && !name.textContent.trim()) name.textContent = 'Sin registro';
        if (name?.textContent.trim() === 'Sin registro') {
          addPlayerStats(card, { winRate: 0, totalMatches: 0 });
        }
        return;
      }

      if (name) {
        name.textContent = player.name;
        name.title = `Victorias: ${player.winRate}% | Participaciones: ${player.totalMatches}`;
        name.setAttribute('data-bs-toggle', 'tooltip');
      }
      if (position) position.textContent = String(positionIndex + 1);
      if (medal) {
        medal.title = formatDelta(player.delta);
        medal.setAttribute('data-bs-toggle', 'tooltip');
        medal.style.animation = `medalAppear 0.5s ease ${positionIndex * 0.2}s both`;
      }

      addPlayerStats(card, player);
    });

    if (list) {
      const top = ranking.slice(0, 6);
      const maxPoints = Math.max(1, top[0]?.winsSubtotal || 0);
      top.slice(3).forEach((player, index) => {
        const place = index + 4;
        const percentage = Math.max(
          0.2,
          Math.min(1, (player.winsSubtotal || 0) / maxPoints)
        );
        const item = createRankListItem(player, place, percentage);
        item.style.animation = `slideInRight 0.5s ease ${index * 0.1}s both`;
        list.appendChild(item);
      });
    }
  }

  function createRankListItem(player, place, percentage) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rank-row';
    button.style.setProperty('--pct', String(percentage));
    button.setAttribute(
      'aria-label',
      `${place}º, ${player.name}, ${player.winsSubtotal} puntos netos. Ver estadísticas`
    );

    const badge = document.createElement('span');
    badge.className = 'rank-badge';
    badge.textContent = String(place);

    const info = document.createElement('span');
    info.className = 'rank-info';
    const name = document.createElement('span');
    name.className = 'rank-name';
    name.textContent = player.name;
    const stats = document.createElement('span');
    stats.className = 'rank-stats';
    stats.textContent = `WR: ${player.winRate}% | Participaciones: ${player.totalMatches}`;
    info.append(name, stats);

    const right = document.createElement('span');
    right.className = 'rank-right';
    const points = document.createElement('span');
    points.className = 'rank-points';
    points.textContent = String(player.winsSubtotal);
    points.title = 'Puntos netos';

    const delta = createDeltaElement(player.delta);
    const tag = document.createElement('span');
    tag.className = 'rank-tag';
    tag.textContent = getPerformanceTag(place);
    right.append(points, delta, tag);

    button.append(badge, info, right);
    button.addEventListener('click', () => showPlayerDetails(player));
    item.appendChild(button);
    return item;
  }

  function createDeltaElement(delta) {
    const element = document.createElement('span');
    element.className = 'rank-delta';
    element.title = formatDelta(delta);

    const icon = document.createElement('i');
    icon.setAttribute('aria-hidden', 'true');
    if (delta === null || delta === 0) {
      element.classList.add('same');
      icon.className = 'bi bi-dash-lg';
    } else if (delta > 0) {
      element.classList.add('up');
      icon.className = 'bi bi-arrow-up-right';
      element.append(icon, document.createTextNode(String(delta)));
      return element;
    } else {
      element.classList.add('down');
      icon.className = 'bi bi-arrow-down-right';
      element.append(icon, document.createTextNode(String(Math.abs(delta))));
      return element;
    }

    element.appendChild(icon);
    if (delta === null) element.appendChild(document.createTextNode('—'));
    return element;
  }

  function getPerformanceTag(place) {
    if (place === 4) return '🔥 Promesa';
    if (place === 5) return '⚡ En crecimiento';
    if (place === 6) return '🎯 Mejorando';
    return '📊 Competitivo';
  }

  function addPlayerStats(card, player) {
    const stats = document.createElement('div');
    stats.className = 'player-stats mt-2';

    const rate = document.createElement('small');
    rate.className = 'stat-badge';
    rate.textContent = `${player.winRate}% WR`;
    const matches = document.createElement('small');
    matches.className = 'stat-badge';
    matches.textContent = `${player.totalMatches} PJ`;
    stats.append(rate, matches);

    const body = card.querySelector('.podium-body') || card;
    body.appendChild(stats);
  }

  function showNoDataMessage(section, year) {
    const message = document.createElement('p');
    message.className = 'alert alert-info text-center';
    message.setAttribute('role', 'status');
    message.textContent = year === '2026-10-25'
      ? 'Ranking pendiente de resultados oficiales del evento.'
      : 'No hay datos disponibles para esta temporada.';
    const container = section.querySelector('.rank-list')?.parentElement || section;
    container.appendChild(message);
  }

  function showPlayerDetails(player) {
    let dialog = document.getElementById('player-detail-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'player-detail-dialog';
      dialog.className = 'player-detail-dialog';
      dialog.setAttribute('aria-labelledby', 'player-detail-title');

      const header = document.createElement('div');
      header.className = 'player-detail-header';
      const title = document.createElement('h2');
      title.id = 'player-detail-title';
      title.className = 'h4 m-0';
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'btn btn-sm btn-outline-secondary';
      close.setAttribute('aria-label', 'Cerrar estadísticas');
      close.textContent = 'Cerrar';
      close.addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', (event) => {
        const bounds = dialog.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        ) dialog.close();
      });
      header.append(title, close);

      const content = document.createElement('dl');
      content.className = 'player-detail-content';
      dialog.append(header, content);
      document.body.appendChild(dialog);
    }

    const title = dialog.querySelector('#player-detail-title');
    const content = dialog.querySelector('.player-detail-content');
    title.textContent = player.name;
    content.replaceChildren();

    const details = [
      ['Equipo', player.team || 'N/D'],
      ['Puntos netos', player.winsSubtotal],
      ['Porcentaje de victorias', `${player.winRate}%`],
      ['Participaciones', player.totalMatches],
      ['Victorias 1.ª hora', player.wins1],
      ['Derrotas 1.ª hora', player.loses1],
      ['Victorias 2.ª hora', player.wins2],
      ['Derrotas 2.ª hora', player.loses2]
    ];

    details.forEach(([label, value]) => {
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = String(value ?? 0);
      content.append(term, description);
    });

    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
  }

  yearsSections.forEach((section) => {
    fillOneSection(section, section.getAttribute('data-year'));
  });
  initRankingTooltips();

  function initRankingTooltips() {
    if (!window.bootstrap?.Tooltip) return;
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((element) => {
      if (!window.bootstrap.Tooltip.getInstance(element)) {
        new window.bootstrap.Tooltip(element, { trigger: 'hover focus' });
      }
    });
  }

  window.dragonbound = window.dragonbound || {};
  window.dragonbound.ranking = {
    refresh() {
      yearsSections.forEach((section) => {
        fillOneSection(section, section.getAttribute('data-year'));
      });
      initRankingTooltips();
      return true;
    },
    getRanking(year) {
      return seasonData.getRanking(year);
    }
  };
})();
