'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const seasons = require('../js/season-data.js');

function extractCellText(content) {
  return content.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
}

function extractTableRows(tableHtml) {
  return Array.from(tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi), ([, row]) => ({
    cells: Array.from(row.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi), ([, cell]) =>
      extractCellText(cell)
    )
  }));
}

test('conserva las temporadas y subtotales de las tablas Prix', () => {
  assert.deepEqual(seasons.getSeasonKeys(), ['2026-10-25', '2026-ii', '2026', '2025', '2024']);

  const expected = {
    '2026-ii': [4, 11, 13, -5],
    '2026': [12, -1, 4, 0, 10, -4],
    '2025': [5, -3, -3, 10, 1, 13],
    '2024': [10, 13]
  };

  for (const [year, subtotals] of Object.entries(expected)) {
    assert.deepEqual(
      seasons.getResults(year).map((player) => player.winsSubtotal),
      subtotals,
      `subtotal ${year}`
    );
  }
});

test('no mezcla temporadas y compara 2026-II contra 2026', () => {
  assert.equal(seasons.getPreviousSeason('2026-ii'), '2026');
  assert.equal(seasons.getPreviousSeason('2024'), null);
  assert.equal(seasons.getPreviousSeason('2026-10-25'), null);
  assert.deepEqual(seasons.getResults('2026-10-25'), []);
  assert.deepEqual(seasons.getRanking('2026-10-25'), []);
  assert.equal(seasons.hasCompleteScores('2026-10-25'), false);
  assert.deepEqual(
    seasons.getRanking('2026-ii').map(({ name, delta }) => [name, delta]),
    [
      ['Isacc', null],
      ['Frank', -1],
      ['Tume', null],
      ['Sergio', null]
    ]
  );
  assert.deepEqual(seasons.getResults('2099'), []);
});

test('calcula el porcentaje y total de participaciones con la lógica existente', () => {
  const frank = seasons.getRanking('2026').find((player) => player.name === 'Frank');
  assert.equal(frank.totalMatches, 24);
  assert.equal(frank.winRate, 75);
  assert.equal(frank.position, 1);
});

test('mantiene las posiciones calculadas de las cuatro temporadas', () => {
  const expected = {
    '2026-10-25': [],
    '2026-ii': ['Isacc', 'Frank', 'Tume', 'Sergio'],
    '2026': ['Frank', 'Observador', 'Chino', 'Benja', 'Carlos', 'Stone'],
    '2025': ['Frank', 'Carlos', 'Chino', 'Miguel', 'Jean PC', 'Nicson'],
    '2024': ['Franco', 'Carlos']
  };

  for (const [year, names] of Object.entries(expected)) {
    assert.deepEqual(
      seasons.getRanking(year).map((player) => player.name),
      names,
      `ranking ${year}`
    );
  }
});

test('los datos del ranking corresponden a las tablas históricas publicadas', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'prix.html'), 'utf8');
  const tables = Array.from(
    html.matchAll(/<table\b[^>]*class="table sheet[^\"]*"[^>]*>([\s\S]*?)<\/table>/gi),
    ([, table]) => extractTableRows(table)
  );
  assert.equal(tables.length, 5);

  seasons.getSeasonKeys().forEach((year, tableIndex) => {
    const rows = tables[tableIndex];
    if (year === '2026-10-25') {
      const scoreRowIndexes = [
        rows.findIndex((row) => row.cells[0]?.toUpperCase() === '1RA HORA'),
        rows.findIndex((row) => row.cells[0]?.toUpperCase() === '1RA HORA') + 1,
        rows.findIndex((row) => row.cells[0]?.toUpperCase() === '2DA HORA'),
        rows.findIndex((row) => row.cells[0]?.toUpperCase() === '2DA HORA') + 1
      ];
      assert.ok(
        scoreRowIndexes.every((index) => rows[index].cells.every((value) => value === '' || value === '1RA HORA' || value === '2DA HORA')),
        'el evento nuevo debe reservar las celdas sin cargar puntuaciones'
      );
      assert.deepEqual(seasons.getResults(year), []);
    }
    const playersRow = rows.find((row) => row.cells[0]?.toUpperCase() === 'PISADOR');
    const firstHourIndex = rows.findIndex((row) => row.cells[0]?.toUpperCase() === '1RA HORA');
    const secondHourIndex = rows.findIndex((row) => row.cells[0]?.toUpperCase() === '2DA HORA');
    const headerLength = rows[0].cells.length;

    const valuesFor = (rowIndex) => {
      const cells = rows[rowIndex].cells;
      const scores = cells.length === headerLength - 1 ? cells : cells.slice(1);
      return scores.map((value) => Number(value) || 0);
    };

    const tableResults = seasons.getResults(year);
    assert.deepEqual(tableResults.map((player) => player.name), playersRow.cells.slice(1).filter(Boolean));
    tableResults.forEach((player, index) => {
      assert.deepEqual(
        [player.wins1, player.loses1, player.wins2, player.loses2],
        [
          valuesFor(firstHourIndex)[index],
          valuesFor(firstHourIndex + 1)[index],
          valuesFor(secondHourIndex)[index],
          valuesFor(secondHourIndex + 1)[index]
        ],
        `${year}: ${player.name}`
      );
    });
  });
});
