(function () {
  const yearsSections = Array.from(document.querySelectorAll(".ranking-year[data-year]"));
  if (!yearsSections.length) {
    console.warn("[ranking.js] No encuentro secciones .ranking-year[data-year].");
    return;
  }

  const loadDataForYear = (year) => {
    const key = `prixResults_${year}`;
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    if (Array.isArray(data) && data.length) return { data, key };

    // fallback: si no existe por año, intenta el viejo
    const fallback = JSON.parse(localStorage.getItem("prixResults") || "[]");
    if (Array.isArray(fallback) && fallback.length) return { data: fallback, key: "prixResults" };

    return { data: [], key };
  };

  const fillOne = (section, year) => {
    const { data, key } = loadDataForYear(year);
    if (!data.length) {
      console.warn(`[ranking.js] (${year}) Sin datos. Abre PRIX para generar ${key}.`);
      return;
    }

    const sorted = data.slice().sort((a, b) =>
      (b.winsSubtotal - a.winsSubtotal) || (b.totalNet - a.totalNet)
    );

    const top = sorted.slice(0, Math.min(sorted.length, 6));

    const podiumNames = section.querySelectorAll(".podium-card .name");
    if (podiumNames.length >= 3) {
      podiumNames[0].textContent = top[1]?.name ?? ""; // 2°
      podiumNames[1].textContent = top[0]?.name ?? ""; // 1°
      podiumNames[2].textContent = top[2]?.name ?? ""; // 3°
    }

    const list = section.querySelector("ul.rank-list");
    if (!list) return;
    list.innerHTML = "";

    const maxPts = Math.max(1, top[0]?.winsSubtotal ?? 0);

    top.slice(3).forEach((player, i) => {
      const rankNum = i + 4;
      const li = document.createElement("li");
      li.className = "rank-row";

      const pct = Math.max(0.2, Math.min(1, (player?.winsSubtotal ?? 0) / maxPts));
      li.style.setProperty("--pct", String(pct));

      const tag =
        rankNum === 4 ? "A nada..." :
        rankNum === 5 ? "Manco 1" :
        rankNum === 6 ? "Manco 2" : "";

      li.innerHTML = `
        <span class="rank-badge">${rankNum}</span>
        <span class="rank-name">${player?.name ?? ""}</span>
        <span class="rank-right">
          <span class="rank-points" data-bs-toggle="tooltip" title="pts">${player?.winsSubtotal ?? 0}</span>
          <span class="rank-delta same" data-bs-toggle="tooltip" title="="><i class="bi bi-dash-lg"></i></span>
          <span class="rank-tag">${tag}</span>
        </span>
      `;
      list.appendChild(li);
    });

    console.info(`[ranking.js] (${year}) Ranking cargado desde localStorage.${key}`);
  };

  yearsSections.forEach((section) => {
    const year = section.getAttribute("data-year");
    fillOne(section, year);
  });
})();
