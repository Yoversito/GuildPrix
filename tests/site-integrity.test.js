'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'live.html', 'prix.html', 'ranking.html'];

test('las páginas no contienen referencias locales rotas ni IDs duplicados', () => {
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const ids = Array.from(html.matchAll(/\bid="([^"]+)"/g), (match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${page}: IDs duplicados`);

    for (const [, reference] of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) continue;
      const [filePath, fragment] = reference.split('#');
      const target = path.resolve(path.dirname(path.join(root, page)), filePath);
      assert.ok(fs.existsSync(target), `${page}: recurso local inexistente ${reference}`);

      if (fragment) {
        const targetHtml = fs.readFileSync(target, 'utf8');
        assert.match(targetHtml, new RegExp(`\\bid=["']${fragment}["']`), `${page}: destino #${fragment} inexistente`);
      }
    }

    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${page}: debe haber un encabezado principal`);
    assert.match(html, /data-bs-theme="light"/, `${page}: el tema debe ser claro`);
    assert.doesNotMatch(html, /app-loading|app-skeleton|speculationrules|savedTheme/);
    assert.ok(html.indexOf('./js/main.js') < html.indexOf('bootstrap.bundle.min.js'), `${page}: el JavaScript propio debe ejecutarse antes del bundle externo`);

    if (page === 'prix.html' || page === 'ranking.html') {
      const pageScript = page === 'prix.html' ? './js/prix.js' : './js/ranking.js';
      assert.ok(html.indexOf('./js/season-data.js') < html.indexOf(pageScript), `${page}: datos deben cargarse antes del cálculo`);
      assert.ok(html.indexOf(pageScript) < html.indexOf('bootstrap.bundle.min.js'), `${page}: el ranking/cálculo no debe esperar al bundle externo`);
    }

    for (const [, attributes] of html.matchAll(/<a\b([^>]*)>/gi)) {
      if (/\btarget="_blank"/i.test(attributes)) {
        assert.match(attributes, /\brel="[^"]*noopener/i, `${page}: enlace externo sin noopener`);
      }
    }
    for (const [, attributes] of html.matchAll(/<img\b([^>]*)>/gi)) {
      assert.match(attributes, /\balt="[^"]*"/i, `${page}: imagen sin texto alternativo`);
    }
  }
});

test('las URL locales de imagen del CSS existen', () => {
  for (const stylesheet of ['styles.css', 'styles.scss']) {
    const source = fs.readFileSync(path.join(root, stylesheet), 'utf8');
    for (const [, reference] of source.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/|data:|#)/i.test(reference)) continue;
      assert.ok(fs.existsSync(path.resolve(root, reference)), `${stylesheet}: recurso inexistente ${reference}`);
    }
  }
});

test('los estilos conservan la paleta oscura original y el contraste de navegación', () => {
  for (const stylesheet of ['styles.css', 'styles.scss']) {
    const source = fs.readFileSync(path.join(root, stylesheet), 'utf8');
    assert.match(source, /--guild-surface:\s*rgba\(15, 23, 42, 0\.85\)/);
    assert.match(source, /--guild-muted:\s*rgba\(255, 255, 255, 0\.7\)/);
    assert.match(source, /\.navbar \.navbar-brand\s*\{[\s\S]*?color: rgba\(255, 255, 255, 0\.9\) !important/);
    assert.match(source, /\.navbar \.navbar-brand:visited,[\s\S]*?\.navbar \.navbar-brand:active\s*\{\s*color: #fff !important/);
    assert.match(source, /\.navbar \.nav-link\s*\{\s*color: rgba\(255, 255, 255, 0\.88\)/);
    assert.doesNotMatch(source, /#f3f5fb|background-color:\s*#fff/);
  }
});

test('el evento del 25/10/2026 tiene un apartado independiente en las cuatro páginas', () => {
  const markers = {
    'index.html': 'data-event="2026-10-25"',
    'live.html': 'id="live-2026-10-25"',
    'prix.html': 'data-season-key="2026-10-25"',
    'ranking.html': 'data-year="2026-10-25"'
  };

  for (const [page, marker] of Object.entries(markers)) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.ok(html.includes(marker), `${page}: falta el apartado del evento`);
  }
});

test('los separadores solo se muestran en escritorio y la marca conserva contraste al interactuar', () => {
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.equal((html.match(/class="nav-separator"/g) || []).length, 3, `${page}: deben existir tres separadores`);
    assert.equal((html.match(/<li class="nav-separator" aria-hidden="true">\|<\/li>/g) || []).length, 3, `${page}: separadores decorativos sin enlaces`);
  }

  for (const stylesheet of ['styles.css', 'styles.scss']) {
    const source = fs.readFileSync(path.join(root, stylesheet), 'utf8');
    assert.match(source, /@media \(min-width: 992px\)[\s\S]*?\.navbar \.navbar-nav \.nav-separator/);
    assert.match(source, /\.navbar \{\s*background-color: rgba\(15, 23, 42, 0\.7\)/);
    assert.match(source, /\.navbar \.navbar-brand:visited,[\s\S]*?\.navbar \.navbar-brand:active\s*\{\s*color: #fff !important/);
  }
});
