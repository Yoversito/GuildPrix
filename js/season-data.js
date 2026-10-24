(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.GuildPrixSeasonData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Snapshot de las filas de prix.html. Mantener los identificadores y valores
  // sincronizados con las tablas. En temporadas históricas, null conserva el
  // comportamiento heredado de tratar una celda vacía como cero.
  // Para activar 2026-10-25, añadir aquí participantes y sus cuatro resultados;
  // el ranking seguirá pendiente mientras falte alguna puntuación oficial.
  const seasons = {
    '2026-10-25': [],
    '2026-ii': [
      { name: 'Tume', team: '1', wins1: 13, loses1: 10, wins2: 3, loses2: 2 },
      { name: 'Frank', team: '2', wins1: 11, loses1: 8, wins2: 8, loses2: null },
      { name: 'Isacc', team: '3', wins1: 16, loses1: 4, wins2: 9, loses2: 8 },
      { name: 'Sergio', team: '4', wins1: 2, loses1: 7, wins2: 0, loses2: 0 }
    ],
    '2026': [
      { name: 'Frank', team: '1', wins1: 9, loses1: 3, wins2: 9, loses2: 3 },
      { name: 'Carlos', team: '2', wins1: 1, loses1: 2, wins2: 0, loses2: 0 },
      { name: 'Chino', team: '3', wins1: 2, loses1: 3, wins2: 8, loses2: 3 },
      { name: 'Benja', team: '4', wins1: 3, loses1: 3, wins2: 2, loses2: 2 },
      { name: 'Observador', team: '5', wins1: 11, loses1: 6, wins2: 9, loses2: 4 },
      { name: 'Stone', team: '6', wins1: 2, loses1: 6, wins2: 0, loses2: 0 }
    ],
    '2025': [
      { name: 'Chino', team: '1', wins1: 9, loses1: 8, wins2: 7, loses2: 3 },
      { name: 'Jean PC', team: '2', wins1: 7, loses1: 10, wins2: 0, loses2: 0 },
      { name: 'Nicson', team: '3', wins1: 2, loses1: 4, wins2: 0, loses2: 1 },
      { name: 'Carlos', team: '4', wins1: 8, loses1: 2, wins2: 7, loses2: 3 },
      { name: 'Miguel', team: '5', wins1: 10, loses1: 9, wins2: 0, loses2: 0 },
      { name: 'Frank', team: '6', wins1: 10, loses1: 5, wins2: 10, loses2: 2 }
    ],
    '2024': [
      { name: 'Carlos', team: '1', wins1: 7, loses1: 2, wins2: 9, loses2: 4 },
      { name: 'Franco', team: '2', wins1: 6, loses1: 1, wins2: 10, loses2: 2 }
    ]
  };

  const previousSeason = {
    '2025': '2024',
    '2026': '2025',
    '2026-ii': '2026'
  };
  const seasonOrder = ['2026-10-25', '2026-ii', '2026', '2025', '2024'];

  const numberOrZero = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  function getSeasonKeys() {
    return seasonOrder.filter((year) => Object.hasOwn(seasons, year));
  }

  function getResults(year) {
    const key = String(year);
    if (key === '2026-10-25' && !hasCompleteScores(key)) return [];
    return getParticipants(key).map((player) => {
      const wins1 = numberOrZero(player.wins1);
      const loses1 = numberOrZero(player.loses1);
      const wins2 = numberOrZero(player.wins2);
      const loses2 = numberOrZero(player.loses2);
      const subtotal = wins1 - loses1 + wins2 - loses2;

      return {
        name: player.name,
        team: `Team ${player.team}`,
        wins1,
        loses1,
        wins2,
        loses2,
        winsSubtotal: subtotal,
        totalNet: subtotal
      };
    });
  }

  function getParticipants(year) {
    const key = String(year);
    const participants = Object.hasOwn(seasons, key) ? seasons[key] : [];
    return participants.map((participant) => ({ ...participant }));
  }

  function hasCompleteScores(year) {
    const fields = ['wins1', 'loses1', 'wins2', 'loses2'];
    const participants = getParticipants(year);
    return participants.length > 0 && participants.every((participant) =>
      Boolean(participant.name?.trim()) && fields.every((field) => {
        const value = participant[field];
        return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
      })
    );
  }

  function calculateRanking(data) {
    return data
      .map((player) => {
        const wins1 = numberOrZero(player.wins1);
        const loses1 = numberOrZero(player.loses1);
        const wins2 = numberOrZero(player.wins2);
        const loses2 = numberOrZero(player.loses2);
        const totalMatches = wins1 + loses1 + wins2 + loses2;
        const winRate = totalMatches
          ? Math.round(((wins1 + wins2) / totalMatches) * 100)
          : 0;

        return { ...player, totalMatches, winRate };
      })
      .sort((a, b) =>
        b.winsSubtotal - a.winsSubtotal ||
        b.winRate - a.winRate ||
        b.totalMatches - a.totalMatches
      );
  }

  function getRanking(year) {
    const ranking = calculateRanking(getResults(year));
    const previousYear = previousSeason[String(year)];
    const previousPositions = new Map(
      calculateRanking(getResults(previousYear)).map((player, index) => [
        player.name.trim().toLowerCase(),
        index + 1
      ])
    );

    return ranking.map((player, index) => {
      const previousPosition = previousPositions.get(
        player.name.trim().toLowerCase()
      );
      const position = index + 1;

      return {
        ...player,
        position,
        delta: previousPosition === undefined ? null : previousPosition - position
      };
    });
  }

  return Object.freeze({
    getSeasonKeys,
    getParticipants,
    hasCompleteScores,
    getResults,
    calculateRanking,
    getRanking,
    getPreviousSeason: (year) => previousSeason[String(year)] || null
  });
});
