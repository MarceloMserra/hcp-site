// ===================== utilidades =====================
async function getJSON(path) {
  try {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw 0;
    return await r.json();
  } catch (err) {
    console.error("Error fetching JSON:", err);
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

// helpers genéricos
const asArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const pick = (obj, keys, def = undefined) => {
  if (!obj) return def;
  for (const k of keys) if (obj[k] !== undefined) return obj[k];
  return def;
};

// ===================== Cloudinary helpers =====================
const CLOUDINARY_CLOUD = "dqfkwolc8";

function isCloudinary(url) {
  return /^https?:\/\/res\.cloudinary\.com\//.test(url || "");
}

function cloudPortrait(url, { w = 600 } = {}) {
  if (!url || !isCloudinary(url)) return url;
  const parts = url.split("/upload/");
  if (parts.length > 1) {
    const firstSeg = (parts[1] || "").split("/")[0];
    const hasTransforms = /\b(c_|w_|h_|ar_|g_|z_)/.test(firstSeg);
    if (hasTransforms) return url;
  }
  const t = `f_auto,q_auto,dpr_auto,c_fill,g_auto:subject,ar_3:4,w_${w},z_0.9`;
  return url.replace("/upload/", `/upload/${t}/`);
}

function cloudAny(url, { w = 600 } = {}) {
  if (!url) return url;
  if (isCloudinary(url)) return cloudPortrait(url, { w });
  const abs = new URL(url, window.location.origin).href;
  const t = `f_auto,q_auto,dpr_auto,c_fill,g_auto:subject,ar_3:4,w_${w},z_0.9`;
  const base = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/fetch/`;
  return `${base}${t}/${encodeURIComponent(abs)}`;
}
function cloudAnySrcset(url, widths = [400, 600, 900]) {
  return widths.map(w => `${cloudAny(url, { w })} ${w}w`).join(", ");
}

// ===================== normalizadores =====================
function normalizePhotoItem(x) {
  if (!x) return null;
  if (typeof x === "string") return x;
  return x.src || x.url || x.imagem || x.image || x.foto || x.path || null;
}
function normalizeVideoItem(x) {
  if (!x) return null;
  if (typeof x === "string") return x;
  return x.src || x.url || x.video || null;
}
function normalizeAlbum(raw) {
  if (!raw) return null;
  const titulo    = pick(raw, ["titulo", "title", "nome"], "");
  const descricao = pick(raw, ["descricao", "descrição", "description"], "");
  const capa      = normalizePhotoItem(pick(raw, ["capa", "cover", "thumb", "thumbnail", "imagem"]));
  const fotosLists  = asArray(pick(raw, ["fotos", "fotos_multi", "fotos_multiplas", "fotos_multipla", "imagens", "images", "photos"], [])).flat();
  const videosLists = asArray(pick(raw, ["videos", "vídeos", "clips"], [])).flat();
  const itensMistos = asArray(pick(raw, ["itens", "items"], [])).flat();
  const itens = [];
  for (const f of fotosLists) {
    const src = normalizePhotoItem(f);
    if (src) itens.push({ tipo: "foto", src, alt: (typeof f === "object" && (f.alt || f.legenda || f.caption)) || "" });
  }
  for (const v of videosLists) {
    const src = normalizeVideoItem(v);
    if (src) itens.push({ tipo: "video", src });
  }
  for (const it of itensMistos) {
    if (!it) continue;
    const t = (it.tipo || it.type || "").toLowerCase();
    if (t === "video" || t === "vídeo") {
      const src = normalizeVideoItem(it);
      if (src) itens.push({ tipo: "video", src });
    } else {
      const src = normalizePhotoItem(it);
      if (src) itens.push({ tipo: "foto", src, alt: it.alt || it.legenda || it.caption || "" });
    }
  }
  return { titulo, descricao, capa, itens };
}
function isVideo(url) {
  return (url || "").match(/youtube\.com|youtu\.be|vimeo\.com|\.mp4($|\?)/i);
}

// ===================== app principal =====================
(async () => {
  const site       = await getJSON("data/site.json")        || {};
  const header     = await getJSON("data/header.json")      || {};
  const footer     = await getJSON("data/footer.json")      || {};
  const coord      = await getJSON("data/coordenacao.json") || {};
  const membros    = await getJSON("data/membros.json")     || {};
  const galeriaD   = await getJSON("data/galeria.json")     || {};
  const doacoes    = await getJSON("data/doacoes.json")     || {};
  const objetivosD = await getJSON("data/objetivos.json")   || {};
  const agendaD    = await getJSON("data/agenda.json")      || {};
  const contato    = await getJSON("data/contato.json")     || {};

  // ---------- HERO ----------
  const slogan = document.getElementById("slogan");
  const lema   = document.getElementById("lema");
  if (slogan) slogan.textContent = site.slogan || "";
  if (lema)   lema.textContent   = site.lema   || "";

  const hero = document.getElementById("home");
  if (hero && site.hero) hero.style.backgroundImage = `url('${site.hero}')`;
  const heroOverlay = document.getElementById("hero-overlay");
  if (heroOverlay) heroOverlay.style.background = `rgba(0,0,0,${site.tema?.hero_overlay ?? 0.52})`;

  // ---------- HEADER ----------
  const logo = document.getElementById("logo-img");
  if (logo && header.logo) logo.src = header.logo;

  const logoLink = document.getElementById("logo-link");
  if (logoLink) {
    logoLink.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const nav         = document.getElementById("nav-links");
  const mobileLinks = document.getElementById("mobile-links");
  (header.menu || []).forEach((item) => {
    const a = el("a", "nav-link", item.text);
    a.href = item.url;
    if (nav) nav.appendChild(a);

    const am = el("a", "block py-2 px-1 text-gray-300 hover:text-yellow-400 font-medium transition text-sm border-b border-white/5 last:border-0", item.text);
    am.href = item.url;
    if (mobileLinks) mobileLinks.appendChild(am);
  });

  const btn            = document.getElementById("mobile-menu-button");
  const menu           = document.getElementById("mobile-menu");
  const mobileMenuIcon = document.getElementById("mobile-menu-icon");

  const closeMenu = () => {
    if (menu) {
      menu.classList.add("hidden");
      if (mobileMenuIcon) mobileMenuIcon.className = "fas fa-bars text-2xl";
    }
  };

  if (btn && menu && mobileMenuIcon) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("hidden");
      mobileMenuIcon.className = menu.classList.contains("hidden")
        ? "fas fa-bars text-2xl"
        : "fas fa-times text-2xl";
    });
    window.addEventListener("scroll", closeMenu, { passive: true });
    document.addEventListener("click", (e) => {
      if (!menu.classList.contains("hidden")) {
        if (!menu.contains(e.target) && !btn.contains(e.target)) closeMenu();
      }
    });
    if (mobileLinks) {
      mobileLinks.addEventListener("click", (e) => {
        if (e.target.tagName === "A") closeMenu();
      });
    }
  }

  // Smooth scroll com offset do header
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id && id.startsWith("#")) {
        const elTarget = document.querySelector(id);
        if (elTarget) {
          e.preventDefault();
          const headerHeight = document.getElementById("main-header").offsetHeight;
          window.scrollTo({ top: elTarget.offsetTop - headerHeight, behavior: "smooth" });
          closeMenu();
        }
      }
    });
  });

  // ---------- TIMELINE ----------
  const tl = document.getElementById("timeline");
  (site.timeline || []).forEach((t, i) => {
    const box = el("div", "relative reveal");
    box.style.transitionDelay = `${i * 120}ms`;
    box.innerHTML = `
      <div class="absolute -left-[2.625rem] top-1.5 w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow-md ring-2 ring-yellow-400/25 z-10"></div>
      <div class="bg-white rounded-2xl shadow-sm p-7 border border-gray-100 card-lift hover:border-yellow-100">
        <span class="text-[0.65rem] font-extrabold tracking-[0.25em] text-yellow-600 uppercase">${t.ano || ""}</span>
        <h3 class="text-2xl font-bold text-[#0f172a] mt-1 mb-2">${t.titulo || ""}</h3>
        <p class="text-gray-500 leading-relaxed text-sm">${t.texto || ""}</p>
      </div>`;
    if (tl) tl.appendChild(box);
  });

  // ---------- COORDENAÇÃO ----------
  const coordGrid = document.getElementById("coordenacao-grid");
  const equipe = coord.equipe || coord.lista || [];
  equipe.forEach((p, i) => {
    const foto   = cloudAny(p.foto);
    const srcset = cloudAnySrcset(p.foto);
    const c = el("div", "bg-white/5 border border-white/10 rounded-2xl overflow-hidden card-lift group reveal");
    c.style.transitionDelay = `${i * 80}ms`;
    c.innerHTML = `
      <div class="overflow-hidden" style="aspect-ratio:3/4">
        <img
          src="${foto || ""}"
          ${srcset ? `srcset="${srcset}"` : ""}
          sizes="(min-width:1280px) 300px,(min-width:1024px) 25vw,(min-width:640px) 33vw,100vw"
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          alt="${p.nome || ""}">
      </div>
      <div class="p-5">
        <h3 class="text-xl font-bold text-white">${p.nome || ""}</h3>
        ${p.cargo    ? `<span class="inline-block mt-2 text-xs text-yellow-400/90 font-semibold tracking-wide uppercase">${p.cargo}</span>` : ""}
        ${p.descricao ? `<p class="text-sm text-gray-400 mt-2 leading-relaxed">${p.descricao}</p>` : ""}
      </div>`;
    if (coordGrid) coordGrid.appendChild(c);
  });
  if (coordGrid && equipe.length === 0) {
    const sec = document.getElementById("coordenacao");
    if (sec) sec.classList.add("hidden");
  }

  // ---------- MEMBROS ----------
  const filters    = ["Todos", "1º Tenor", "2º Tenor", "Barítono", "Baixo"];
  const naipeFilters = document.getElementById("naipe-filters");
  let filtroAtual  = "Todos";

  filters.forEach((f) => {
    const b = el("button", "f-btn" + (f === filtroAtual ? " active" : ""), f);
    b.addEventListener("click", () => {
      filtroAtual = f;
      if (naipeFilters) {
        [...naipeFilters.children].forEach(x => x.classList.remove("active"));
      }
      b.classList.add("active");
      renderMembros();
    });
    if (naipeFilters) naipeFilters.appendChild(b);
  });

  function renderMembros() {
    const grid = document.getElementById("members-grid");
    if (!grid) return;
    grid.innerHTML = "";
    (membros.membros || membros.lista || []).forEach((m, i) => {
      const match = filtroAtual === "Todos" || (m.naipes || [m.naipe]).includes(filtroAtual);
      if (!match) return;
      const foto   = cloudAny(m.foto);
      const srcset = cloudAnySrcset(m.foto);
      const naipeBadges = (m.naipes || [m.naipe])
        .filter(Boolean)
        .map(n => `<span class="inline-block text-[0.6rem] font-bold tracking-wide bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full">${n}</span>`)
        .join("");
      const card = el("div", "relative rounded-2xl overflow-hidden shadow-md card-lift portrait-card cursor-pointer reveal");
      card.style.transitionDelay = `${(i % 5) * 60}ms`;
      card.innerHTML = `
        <div style="aspect-ratio:3/4">
          <img
            src="${foto || ""}"
            ${srcset ? `srcset="${srcset}"` : ""}
            sizes="(min-width:1280px) 20vw,(min-width:1024px) 25vw,(min-width:640px) 33vw,50vw"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            alt="${m.nome || ""}">
        </div>
        <div class="portrait-overlay"></div>
        <div class="portrait-info absolute bottom-0 inset-x-0 p-4 text-white">
          <div class="flex flex-wrap gap-1 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style="opacity:0;transition:opacity 0.35s ease">
            ${naipeBadges}
          </div>
          <h3 class="text-base font-bold leading-tight drop-shadow">${m.nome || ""}</h3>
          ${m.bio ? `<p class="text-xs text-gray-300 mt-1 line-clamp-2">${m.bio}</p>` : ""}
        </div>`;
      // Show naipe badges & bio on hover via JS (since Tailwind JIT group doesn't work inside innerHTML)
      card.addEventListener("mouseenter", () => {
        const badges = card.querySelector(".flex.flex-wrap");
        if (badges) badges.style.opacity = "1";
      });
      card.addEventListener("mouseleave", () => {
        const badges = card.querySelector(".flex.flex-wrap");
        if (badges) badges.style.opacity = "0";
      });
      grid.appendChild(card);
    });
  }
  renderMembros();

  // ---------- GALERIA ----------
  const albumsGrid = document.getElementById("albums-grid");
  const rawAlbuns  =
    pick(galeriaD, ["albuns", "álbuns", "albums", "lista"]) ||
    pick(galeriaD?.galeria, ["albuns", "álbuns", "albums", "lista"]) ||
    [];

  if (albumsGrid) {
    const albuns = asArray(rawAlbuns).map(normalizeAlbum).filter(Boolean);
    albumsGrid.innerHTML = "";
    albuns.forEach((a, i) => albumsGrid.appendChild(albumCard(a, i)));
  }

  function albumCard(album, idx) {
    const capa = normalizePhotoItem(album.capa) || "";
    const card = el("a", "relative block rounded-2xl overflow-hidden card-lift group reveal cursor-pointer");
    card.style.transitionDelay = `${(idx % 3) * 80}ms`;
    card.href = `/album.html?id=${idx}`;
    card.innerHTML = `
      <div class="aspect-video overflow-hidden">
        <img src="${capa}" alt="${album.titulo || ""}"
             class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
             loading="lazy">
      </div>
      <div class="album-overlay"></div>
      <div class="absolute bottom-0 inset-x-0 p-6 text-white">
        <h3 class="text-xl font-bold mb-1 drop-shadow">${album.titulo || ""}</h3>
        ${album.descricao ? `<p class="text-sm text-gray-300 mb-3 line-clamp-2">${album.descricao}</p>` : ""}
        <span class="text-[0.65rem] font-extrabold tracking-[0.2em] uppercase text-yellow-400">
          Ver álbum →
        </span>
      </div>`;
    return card;
  }

  // ---------- DOAÇÕES ----------
  const metaEl        = document.getElementById("meta-total");
  const arrEl         = document.getElementById("valor-arrecadado");
  const bar           = document.getElementById("progress");
  const doacoesTitulo = document.getElementById("doacoes-titulo");

  if (metaEl && arrEl && bar && doacoesTitulo) {
    const meta = Number(doacoes.meta_total || 0);
    const arr  = Number(doacoes.arrecadado || 0);
    const pct  = meta ? Math.min(100, Math.round((arr / meta) * 100)) : 0;

    doacoesTitulo.textContent = doacoes.nome_da_meta || "Doações";
    metaEl.textContent        = "";
    arrEl.textContent         = `${pct}%`;

    // Animate progress bar after a short delay
    setTimeout(() => { bar.style.width = pct + "%"; }, 400);
  }

  const pixChave = document.getElementById("pix-chave");
  const pixQr    = document.getElementById("pix-qr");
  if (pixChave) pixChave.textContent = doacoes.pix_chave || doacoes.pix?.chave || "";
  if (pixQr && doacoes.pix_qr) pixQr.src = doacoes.pix_qr;
  else if (pixQr) pixQr.style.display = "none";

  const doacaoLinks = document.getElementById("doacao-links");
  (doacoes.links || []).forEach((l) => {
    const li = el("li");
    li.innerHTML = `
      <a class="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition text-sm font-medium"
         href="${l.url}" target="_blank" rel="noopener">
        <i class="fas fa-external-link-alt text-xs opacity-70"></i>
        ${l.nome}
      </a>`;
    if (doacaoLinks) doacaoLinks.appendChild(li);
  });

  // ---------- OBJETIVOS e METAS ----------
  const objetivosGrid = document.getElementById("objetivos-grid");
  const metasGrid     = document.getElementById("metas-grid");

  if (objetivosGrid) {
    (objetivosD.objetivos || []).forEach((o, i) => {
      const card = el("div", "bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100 card-lift reveal");
      card.style.transitionDelay = `${i * 80}ms`;
      card.innerHTML = `
        ${o.icone ? `
        <div class="w-16 h-16 rounded-full bg-yellow-50 border border-yellow-100 flex items-center justify-center mx-auto mb-6">
          <i class="${o.icone} text-2xl text-yellow-600"></i>
        </div>` : ""}
        <h3 class="text-2xl font-bold text-[#0f172a] mb-3">${o.titulo || ""}</h3>
        <p class="text-gray-500 leading-relaxed text-sm">${o.descricao || ""}</p>`;
      objetivosGrid.appendChild(card);
    });
  }

  if (metasGrid) {
    (objetivosD.metas || []).forEach((m, i) => {
      const card   = el("div", "bg-[#faf8f3] rounded-2xl p-7 border border-gray-100 reveal");
      card.style.transitionDelay = `${i * 80}ms`;
      const atual  = Number(m.valor_atual || 0);
      const total  = Number(m.valor_total || 0);
      const pct    = total > 0 ? Math.min(100, Math.round((atual / total) * 100)) : 0;
      card.innerHTML = `
        <h3 class="text-xl font-bold text-[#0f172a] mb-2">${m.titulo || ""}</h3>
        ${m.descricao ? `<p class="text-sm text-gray-500 mb-5 leading-relaxed">${m.descricao}</p>` : ""}
        <div class="flex justify-between text-xs text-gray-400 mb-2">
          <span class="font-semibold text-gray-600">Progresso</span>
          <span class="font-bold text-yellow-600 text-base">${pct}%</span>
        </div>
        <div class="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div class="h-2.5 rounded-full" style="width:${pct}%;background:linear-gradient(90deg,#c9a84c,#f0d080);transition:width 1.4s cubic-bezier(.4,0,.2,1)"></div>
        </div>`;
      metasGrid.appendChild(card);
    });
  }

  // ---------- AGENDA ----------
  const agendaLista = document.getElementById("agenda-lista");
  if (agendaLista) {
    const eventos = agendaD.eventos || [];
    eventos.sort((a, b) => new Date(a.data) - new Date(b.data));

    const tipos       = ["Todos", ...new Set(eventos.map(e => e.tipo))];
    const agendaFiltros = document.getElementById("agenda-filtros");
    let filtroAgenda  = "Todos";

    const badgeMap = {
      "Ensaio":       "badge badge-ensaio",
      "Culto":        "badge badge-culto",
      "Apresentação": "badge badge-apresentacao",
      "Turnê":        "badge badge-turne",
    };
    const accentMap = {
      "Ensaio":       "#1d4ed8",
      "Culto":        "#d97706",
      "Apresentação": "#16a34a",
      "Turnê":        "#7c3aed",
    };

    const renderEventos = () => {
      agendaLista.innerHTML = "";
      eventos
        .filter(e => filtroAgenda === "Todos" || e.tipo === filtroAgenda)
        .forEach((e, i) => {
          const data          = new Date(e.data);
          const dia           = data.toLocaleDateString("pt-BR", { day: "2-digit" });
          const mes           = data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
          const ano           = data.getFullYear();
          const horaFormatada = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          const badgeCls      = badgeMap[e.tipo] || "badge badge-default";
          const accent        = accentMap[e.tipo] || "#64748b";

          const eventoEl = el("div", "flex items-stretch bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 card-lift reveal");
          eventoEl.style.transitionDelay = `${i * 60}ms`;
          eventoEl.innerHTML = `
            <!-- Accent bar -->
            <div class="w-1.5 flex-shrink-0" style="background:${accent}"></div>
            <!-- Date block -->
            <div class="flex flex-col items-center justify-center bg-[#0f172a] text-white px-5 py-4 min-w-[72px] text-center flex-shrink-0">
              <span class="text-3xl font-bold leading-none">${dia}</span>
              <span class="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mt-1">${mes}</span>
              <span class="text-[0.6rem] text-gray-600 mt-0.5">${ano}</span>
            </div>
            <!-- Content -->
            <div class="flex-1 py-4 px-5">
              <span class="${badgeCls} mb-2">${e.tipo}</span>
              <h3 class="text-xl font-bold text-[#0f172a] mb-1 leading-tight">${e.titulo || ""}</h3>
              ${e.descricao ? `<p class="text-gray-500 text-sm mb-2 leading-snug">${e.descricao}</p>` : ""}
              <div class="flex flex-wrap items-center gap-4 text-gray-400 text-xs mt-2">
                <span class="flex items-center gap-1"><i class="fas fa-clock text-[10px]"></i>${horaFormatada}</span>
                <span class="flex items-center gap-1"><i class="fas fa-map-marker-alt text-[10px]"></i>${e.local || ""}</span>
              </div>
            </div>`;
          agendaLista.appendChild(eventoEl);
        });
    };

    tipos.forEach(t => {
      const b = el("button", "f-btn" + (t === filtroAgenda ? " active" : ""), t);
      b.addEventListener("click", () => {
        filtroAgenda = t;
        [...agendaFiltros.children].forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        renderEventos();
      });
      agendaFiltros.appendChild(b);
    });
    renderEventos();
  }

  // ---------- CONTATO ----------
  const contatoEmail = document.getElementById("contato-email");
  const contatoTel   = document.getElementById("contato-telefone");
  const contatoEnd   = document.getElementById("contato-endereco");
  if (contatoEmail) contatoEmail.textContent = contato.email    || "";
  if (contatoTel)   contatoTel.textContent   = contato.telefone || "";
  if (contatoEnd)   contatoEnd.textContent   = contato.endereco || "";

  // ---------- FOOTER ----------
  const footerLogo = document.getElementById("footer-logo");
  if (footerLogo) footerLogo.src = footer.logo || header.logo || "";
  const fText = document.getElementById("footer-text");
  if (fText) fText.textContent = footer.texto || "";
  const fl = document.getElementById("footer-links");
  (footer.links || []).forEach((l) => {
    const a = el("a", "text-gray-500 hover:text-yellow-400 transition text-sm font-medium", l.nome);
    a.href = l.url;
    if (fl) fl.appendChild(a);
  });
})();
