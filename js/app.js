// ===================== utilidades =====================
async function getJSON(path) {
  try {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw 0;
    return await r.json();
  } catch {
    return null;
  }
}
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function formatCurrency(v) {
  try {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return "R$ " + v;
  }
}

// ===================== app principal =====================
(async () => {
  const site = await getJSON("data/site.json") || {};
  const header = await getJSON("data/header.json") || {};
  const footer = await getJSON("data/footer.json") || {};
  const coord = await getJSON("data/coordenacao.json") || {};
  const membros = await getJSON("data/membros.json") || {};
  const galeria = await getJSON("data/galeria.json") || {};

  // ---------- HERO ----------
  document.getElementById("slogan").textContent = site.slogan || "";
  document.getElementById("lema").textContent = site.lema || "";
  const hero = document.getElementById("home");
  if (site.hero) hero.style.backgroundImage = `url('${site.hero}')`;
  document.getElementById("hero-overlay").style.background = `rgba(0,0,0,${site.tema?.hero_overlay ?? 0.45})`;

  // ---------- HEADER (logo + menu + mobile) ----------
  const logo = document.getElementById("logo-img");
  if (header.logo) logo.src = header.logo;

  // Clique na logo leva ao topo
  const logoLink = document.getElementById("logo-link");
  if (logoLink) {
    logoLink.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const nav = document.getElementById("nav-links");
  const mobile = document.getElementById("mobile-links");
  (header.menu || []).forEach((item) => {
    const a = el("a", "text-gray-700 hover:text-blue-700 font-medium", item.text);
    a.href = item.url;
    nav && nav.appendChild(a);
    const am = a.cloneNode(true);
    am.className = "block py-2 text-gray-700 hover:text-blue-700 font-medium";
    mobile && mobile.appendChild(am);
  });

  const btn = document.getElementById("mobile-menu-button");
  const menu = document.getElementById("mobile-menu");
  const closeMenu = () => menu && menu.classList.add("hidden");

  if (btn && menu) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("hidden");
    });

    // fecha ao rolar, ao clicar fora, ou ao clicar em link
    window.addEventListener("scroll", closeMenu, { passive: true });
    document.addEventListener("click", (e) => {
      if (!menu.classList.contains("hidden")) {
        const clickInside = menu.contains(e.target) || btn.contains(e.target);
        if (!clickInside) closeMenu();
      }
    });
    mobile &&
      mobile.addEventListener("click", (e) => {
        if (e.target.tagName === "A") closeMenu();
      });
  }

  // Scroll suave em âncoras internas
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id && id.startsWith("#")) {
        const elTarget = document.querySelector(id);
        if (elTarget) {
          e.preventDefault();
          window.scrollTo({ top: elTarget.offsetTop - 80, behavior: "smooth" });
        }
      }
    });
  });

  // ---------- TIMELINE ----------
  const tl = document.getElementById("timeline");
  (site.timeline || []).forEach((t) => {
    const box = el("div", "bg-gray-50 p-4 rounded shadow");
    box.innerHTML = `
      <h3 class="text-xl font-bold text-blue-900 mb-1">${t.titulo || ""}</h3>
      <p class="text-gray-600 mb-2">${t.ano || ""}</p>
      <p class="text-gray-700">${t.texto || ""}</p>`;
    tl && tl.appendChild(box);
  });

  // ---------- COORDENAÇÃO ----------
  const coordGrid = document.getElementById("coordenacao-grid");
  const equipe = coord.equipe || coord.lista || [];
  equipe.forEach((p) => {
    const c = el("div", "bg-white rounded-lg shadow overflow-hidden");
    c.innerHTML = `
      <img src="${p.foto || ""}" class="w-full h-56 object-cover" alt="${p.nome || ""}">
      <div class="p-4">
        <h3 class="text-lg font-bold">${p.nome || ""}</h3>
        <span class="inline-block mt-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">${
          p.cargo || ""
        }</span>
        ${p.descricao ? `<p class="text-sm text-gray-600 mt-2">${p.descricao}</p>` : ""}
      </div>`;
    coordGrid && coordGrid.appendChild(c);
  });
  if (coordGrid && equipe.length === 0)
    document.getElementById("coordenacao").classList.add("hidden");

  // ---------- MEMBROS + FILTROS ----------
  const filters = ["Todos", "1º Tenor", "2º Tenor", "Barítono", "Baixo"];
  const naipeFilters = document.getElementById("naipe-filters");
  let filtroAtual = "Todos";
  filters.forEach((f) => {
    const b = el("button", "px-4 py-2 rounded border", f);
    if (f === filtroAtual) b.classList.add("bg-blue-900", "text-white");
    b.addEventListener("click", () => {
      filtroAtual = f;
      [...naipeFilters.children].forEach(
        (x) => (x.className = "px-4 py-2 rounded border")
      );
      b.className = "px-4 py-2 rounded border bg-blue-900 text-white";
      renderMembros();
    });
    naipeFilters && naipeFilters.appendChild(b);
  });

  function renderMembros() {
    const grid = document.getElementById("members-grid");
    if (!grid) return;
    grid.innerHTML = "";
    (membros.membros || membros.lista || []).forEach((m) => {
      const match =
        filtroAtual === "Todos" || (m.naipes || [m.naipe]).includes(filtroAtual);
      if (!match) return;
      const card = el("div", "bg-white rounded-lg shadow overflow-hidden");
      card.innerHTML = `
        <img src="${m.foto || ""}" class="w-full h-64 object-cover" alt="${
        m.nome || ""
      }">
        <div class="p-4">
          <h3 class="text-lg font-bold">${m.nome || ""}</h3>
          <div class="flex flex-wrap gap-1 mb-2">
            ${(m.naipes || [m.naipe])
              .filter(Boolean)
              .map(
                (n) =>
                  `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${n}</span>`
              )
              .join("")}
          </div>
          ${m.bio ? `<p class="text-gray-700 text-sm">${m.bio}</p>` : ""}
        </div>`;
      grid.appendChild(card);
    });
  }
  renderMembros();

  // ---------- GALERIA (fallback simples por fotos soltas) ----------
  const ggrid = document.getElementById("gallery-grid");
  if (ggrid && Array.isArray(galeria.fotos)) {
    (galeria.fotos || []).forEach((f) => {
      const holder = el("div", "relative group");
      holder.innerHTML = `
        <img src="${f.src}" alt="${f.alt || ""}" class="w-full h-48 object-cover rounded">
        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <p class="text-white font-medium">${f.titulo || ""}</p>
        </div>`;
      ggrid.appendChild(holder);
    });
  }

  // ---------- DOAÇÕES ----------
  if (site.doacoes) {
    const meta = site.doacoes.meta_total || 0;
    const val = site.doacoes.arrecadado || 0;
    const elMeta = document.getElementById("meta-total");
    const elVal = document.getElementById("valor-arrecadado");
    const bar = document.getElementById("progress");
    elMeta && (elMeta.textContent = formatCurrency(meta));
    elVal && (elVal.textContent = formatCurrency(val));
    const pct = meta > 0 ? Math.min(100, (val / meta) * 100) : 0;
    bar && (bar.style.width = pct.toFixed(2) + "%");

    const chave = document.getElementById("pix-chave");
    chave && (chave.textContent = site.doacoes.pix?.chave || "");
    const qr = document.getElementById("pix-qr");
    if (qr) {
      if (site.doacoes.pix?.qr) qr.src = site.doacoes.pix.qr;
      else qr.classList.add("hidden");
    }

    const list = document.getElementById("doacao-links");
    (site.doacoes.links || []).forEach((l) => {
      const li = el("li");
      li.innerHTML = `<a href="${
        l.url
      }" class="inline-flex items-center gap-2 hover:underline"><i class="${
        l.icon || "fas fa-link"
      }"></i> ${l.nome}</a>`;
      list && list.appendChild(li);
    });
  }

  // ---------- OBJETIVOS + METAS ----------
  const objGrid = document.getElementById("objetivos-grid");
  (site.objetivos || []).forEach((o) => {
    const c = el("div", "bg-white p-6 rounded-lg shadow");
    c.innerHTML = `
      <div class="text-blue-900 text-3xl mb-3"><i class="${
        o.icon || "fas fa-check-circle"
      }"></i></div>
      <h3 class="text-xl font-bold mb-2">${o.titulo || ""}</h3>
      <p class="text-gray-700">${o.descricao || ""}</p>`;
    objGrid && objGrid.appendChild(c);
  });

  const metasGrid = document.getElementById("metas-grid");
  (site.metas || []).forEach((m) => {
    const pct = m.total > 0 ? Math.min(100, (m.atual / m.total) * 100) : 0;
    const c = el("div", "bg-white p-6 rounded-lg shadow border-l-4 border-blue-900");
    c.innerHTML = `
      <h4 class="text-lg font-bold mb-2">${m.titulo || ""}</h4>
      <p class="text-gray-700 mb-3">${m.descricao || ""}</p>
      <div class="w-full bg-gray-200 rounded-full h-2.5">
        <div class="bg-blue-900 h-2.5 rounded-full" style="width:${pct.toFixed(
          2
        )}%"></div>
      </div>
      <p class="text-sm text-gray-600 mt-1">${formatCurrency(
        m.atual || 0
      )} de ${formatCurrency(m.total || 0)}</p>`;
    metasGrid && metasGrid.appendChild(c);
  });

  // ---------- CONTATO ----------
  const cEmail = document.getElementById("contato-email");
  const cTel = document.getElementById("contato-telefone");
  const cEnd = document.getElementById("contato-endereco");
  cEmail && (cEmail.textContent = site.contato?.email || "");
  cTel && (cTel.textContent = site.contato?.telefone || "");
  cEnd && (cEnd.textContent = site.contato?.endereco || "");

  // ---------- AGENDA ----------
  const agenda = await getJSON("data/agenda.json") || {};
  const eventos = (agenda.eventos || []).map((e) => ({ ...e, data: e.data || "" }));
  eventos.sort((a, b) => (a.data > b.data ? 1 : -1));

  const tipos = ["Todos", ...Array.from(new Set(eventos.map((e) => e.tipo || "Outro")))];
  const filtrosEl = document.getElementById("agenda-filtros");
  const listaEl = document.getElementById("agenda-lista");
  let filtroAgenda = "Todos";

  if (filtrosEl) {
    tipos.forEach((t, idx) => {
      const btn = el(
        "button",
        "px-4 py-2 text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
        t
      );
      if (idx === 0) btn.classList.add("rounded-l-lg");
      if (idx === tipos.length - 1) btn.classList.add("rounded-r-lg");
      if (t === filtroAgenda) {
        btn.classList.add("bg-blue-900", "text-white");
      }
      btn.addEventListener("click", () => {
        filtroAgenda = t;
        [...filtrosEl.children].forEach(
          (x) =>
            (x.className =
              "px-4 py-2 text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50")
        );
        if (filtrosEl.firstChild) filtrosEl.firstChild.classList.add("rounded-l-lg");
        if (filtrosEl.lastChild) filtrosEl.lastChild.classList.add("rounded-r-lg");
        btn.classList.add("bg-blue-900", "text-white");
        renderAgenda();
      });
      filtrosEl.appendChild(btn);
    });
  }

  function badge(tipo) {
    const cores = {
      Ensaio: "bg-yellow-100 text-yellow-800",
      Apresentação: "bg-green-100 text-green-800",
      Culto: "bg-indigo-100 text-indigo-800",
      Turnê: "bg-pink-100 text-pink-800",
      Outro: "bg-gray-100 text-gray-800",
    };
    return `<span class="text-xs ${
      cores[tipo] || cores.Outro
    } px-2 py-1 rounded">${tipo}</span>`;
  }

  function renderAgenda() {
    if (!listaEl) return;
    listaEl.innerHTML = "";
    const filtered = eventos.filter(
      (e) => filtroAgenda === "Todos" || (e.tipo || "Outro") === filtroAgenda
    );
    if (filtered.length === 0) {
      listaEl.innerHTML = `<p class="text-center text-gray-600">Nenhum item na agenda.</p>`;
      return;
    }
    filtered.forEach((e) => {
      const item = el(
        "div",
        "bg-gray-50 p-4 rounded-lg shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
      );
      item.innerHTML = `
        <div>
          <p class="text-sm text-gray-500">${e.data}</p>
          <h4 class="text-lg font-bold">${e.titulo || ""}</h4>
          ${e.descricao ? `<p class="text-gray-700">${e.descricao}</p>` : ""}
          <p class="text-gray-700"><i class="fas fa-map-marker-alt mr-1"></i> ${
            e.local || ""
          }</p>
        </div>
        <div>${badge(e.tipo || "Outro")}</div>`;
      listaEl.appendChild(item);
    });
  }
  renderAgenda();

  // ---------- FOOTER ----------
  const footerLogo = document.getElementById("footer-logo");
  footerLogo && (footerLogo.src = footer.logo || header.logo || "");
  const fText = document.getElementById("footer-text");
  fText && (fText.textContent = footer.texto || "");
  const fl = document.getElementById("footer-links");
  (footer.links || []).forEach((l) => {
    const a = el(
      "a",
      "text-blue-200 hover:text-white transition",
      l.nome
    );
    a.href = l.url;
    fl && fl.appendChild(a);
  });
})();

// ===================== GALERIA (ÁLBUNS com redirecionamento) =====================
// Depende de getJSON e el já definidos acima
(async function () {
  const gal = await getJSON("data/galeria.json") || {};
  // Mescla fotos_multi (upload múltiplo) em itens do álbum
  const albuns = (gal.albuns || []).map((a) => {
    const itens = Array.isArray(a.itens) ? [...a.itens] : [];
    if (Array.isArray(a.fotos_multi) && a.fotos_multi.length) {
      a.fotos_multi.forEach((src) => itens.push({ tipo: "foto", src }));
    }
    return { ...a, itens };
  });

  const albumsGrid = document.getElementById("albums-grid");

  function albumCard(album, idx) {
    const card = el(
      "div",
      "bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
    );
    card.innerHTML = `
      <div class="h-48 overflow-hidden">
        <img src="${album.capa || ""}" alt="${
      album.titulo || ""
    }" class="w-full h-48 object-cover">
      </div>
      <div class="p-4">
        <h3 class="text-lg font-bold mb-1">${album.titulo || ""}</h3>
        ${
          album.descricao
            ? `<p class="text-gray-600 text-sm">${album.descricao}</p>`
            : ""
        }
        <button data-album-id="${idx}" class="mt-3 text-sky-600 font-medium hover:underline">Abrir álbum →</button>
      </div>`;
    // Adiciona event listener ao botão para salvar o ID no localStorage e redirecionar
    card.querySelector("button").addEventListener("click", () => {
      localStorage.setItem('currentAlbumId', idx);
      window.location.href = '/album.html'; // Redireciona para a página do álbum
    });
    return card;
  }

  if (albumsGrid) {
    albumsGrid.innerHTML = "";
    albuns.forEach((a, i) => albumsGrid.appendChild(albumCard(a, i)));
  }

  // Removido todo o código do modal de álbum e lightbox desta parte do app.js
  // pois agora eles serão controlados pela nova página album.html
})();
