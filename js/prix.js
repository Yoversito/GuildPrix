(function () {
  const num = (s) => {
    const n = parseFloat(String(s).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const tables = Array.from(document.querySelectorAll("table.table.sheet"));
  if (!tables.length) return;

  const computedYears = [];

  const getYearForTable = (table) => {
    // Busca un "2025/2026" en el h1 más cercano (tu layout lo tiene dentro del contenedor glassy)
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
      console.warn(`[prix.js] (${year}) Faltan filas esperadas (PISADOR / 1RA HORA / 2DA HORA / SubTotal).`);
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
      // Si hay gap por rowspan, en tus tablas suele faltar el primer "TEAM" en la fila lose.
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

    const trSub = table.querySelectorAll("tr")[idxSub];
    if (trSub) {
      playerCols.forEach((c, i) => {
        const cell = trSub.querySelectorAll("th,td")[c];
        if (cell) cell.textContent = String(sub[i]);
      });
    }

    const totalGeneral = sub.reduce((a, b) => a + b, 0);
    const totalCell = table.querySelector(".total-num") || trSub?.querySelector("td:last-child, th:last-child");
    if (totalCell) totalCell.textContent = String(totalGeneral);

    const payload = playerCols.map((c, i) => ({
      name: String(playerNames[i]).trim(),
      winsSubtotal: sub[i],
      totalNet: sub[i],
    })).filter(x => x.name && x.name !== "0" && x.name !== "—");

    const key = `prixResults_${year}`;
    localStorage.setItem(key, JSON.stringify(payload));
    computedYears.push(year);

    console.info(`[prix.js] (${year}) SubTotals y TOTAL listos. Guardado en localStorage.${key}:`, payload);

    return { year, ok: true, key, payload };
  };

  const results = tables.map(computeOneTable);

  // Compatibilidad: además guarda "prixResults" apuntando al año más nuevo (ej: 2026)
  const numericYears = results
    .map(r => r.year)
    .filter(y => /^\d{4}$/.test(String(y)))
    .map(y => parseInt(y, 10));

  if (numericYears.length) {
    const latest = String(Math.max(...numericYears));
    const latestKey = `prixResults_${latest}`;
    const latestPayload = JSON.parse(localStorage.getItem(latestKey) || "[]");
    localStorage.setItem("prixResults", JSON.stringify(latestPayload));
    console.info(`[prix.js] Compat: localStorage.prixResults -> ${latestKey}`);
  }
})();
