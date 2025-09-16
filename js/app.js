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

// Respeita URLs Cloudinary já transformadas
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

// Força QUALQUER URL (incluindo /img/uploads/...) a passar pelo Cloudinary via fetch
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

// ===================== normalizadores (CMS <-> Front) =====================

// aceita string OU objeto e tenta achar a URL da imagem
function normalizePhotoItem(x) {
  if (!x) return null;
  if (typeof x === "string") return x;
  return (
    x.src ||
    x.url ||
    x.imagem ||
    x.image ||
    x.foto ||
    x.path ||
    null
  );
}

// idem para vídeos (string ou objeto)
function normalizeVideoItem(x) {
  if (!x) return null;
  if (typeof x === "string") return x;
  return x.src || x.url || x.video || null;
}

// transforma qualquer “raw album” em um formato uniforme:
// { titulo, descricao, capa, itens: [{tipo:'foto'|'video', src, alt?}] }
function normalizeAlbum(raw) {
  if (!raw) return null;

  const titulo = pick(raw, ["titulo", "title", "nome"], "");
  const descricao = pick(raw, ["descricao", "descrição", "description"], "");
  const capa = normalizePhotoItem(
    pick(raw, ["capa", "cover", "thumb", "thumbnail", "imagem"])
  );

  // possíveis nomes para lista de fotos
  const fotosLists = asArray(pick(raw, ["fotos", "fotos_multi", "fotos_multiplas", "fotos_multipla", "imagens", "images", "photos"], []))
    .flat();

  // possíveis nomes para lista de vídeos
  const videosLists = asArray(pick(raw, ["videos", "vídeos", "clips"], []))
    .flat();

  // algumas coleções salvam um campo "itens"/"items" já misto
  const itensMistos = asArray(pick(raw, ["itens", "items"], [])).flat();

  const itens = [];

  // fotos explícitas
  for (const f of fotosLists) {
    const src = normalizePhotoItem(f);
    if (src) {
      itens.push({
        tipo: "foto",
        src,
        alt: (typeof f === "object" && (f.alt || f.legenda || f.caption)) || "",
      });
    }
  }

  // vídeos explícitos
  for (const v of videosLists) {
    const src = normalizeVideoItem(v);
    if (src) {
      itens.push({ tipo: "video", src });
    }
  }

  // itens já mistos (foto/video)
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

// detecta vídeo por padrão
function isVideo(url) {
  return (url || "").match(/youtube\.com|youtu\.be|vimeo\.com|\.mp4($|\?)/i);
}

// ===================== app principal =====================
(async () => {
  const site      = await getJSON("data/site.json")         || {};
  const header    = await getJSON("data/header.json")       || {};
  const footer    = await getJSON("data/footer.json")       || {};
  const coord     = await getJSON("data/coordenacao.json")  || {};
  const membros   = await getJSON("data/membros.json")      || {};
  const galeriaD  = await getJSON("data/galeria.json")      || {};
  const doacoes   = await getJSON("data/doacoes.json")      || {};
  const objetivosD = await getJSON("data/objetivos.json")   || {};
  const agendaD   = await getJSON("data/agenda.json")       || {};
  const contato   = await getJSON("data/contato.json")      || {};

  // ---------- HERO ----------
  const slogan = document.getElementById("slogan");
  const lema   = document.getElementById("lema");
  if (slogan) slogan.textContent = site.slogan || "";
  if (lema)   lema.textContent   = site.lema   || "";

  const hero = document.getElementById("home");
  if (hero && site.hero) hero.style.backgroundImage = `url('${site.hero}')`;
  const heroOverlay = document.getElementById("hero-overlay");
  if (heroOverlay) heroOverlay.style.background = `rgba(0,0,0,${site.tema?.hero_overlay ?? 0.45})`;

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

  const nav = document.getElementById("nav-links");
  const mobileLinks = document.getElementById("mobile-links");
  (header.menu || []).forEach((item) => {
    const a = el("a", "text-gray-700 hover:text-blue-700 font-medium", item.text);
    a.href = item.url;
    if (nav) nav.appendChild(a);

    const am = a.cloneNode(true);
    am.className = "block py-2 text-gray-700 hover:text-blue-700 font-medium";
    if (mobileLinks) mobileLinks.appendChild(am);
  });

  const btn = document.getElementById("mobile-menu-button");
  const menu = document.getElementById("mobile-menu");
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
        const clickInside = menu.contains(e.target) || btn.contains(e.target);
        if (!clickInside) closeMenu();
      }
    });
    if (mobileLinks) {
      mobileLinks.addEventListener("click", (e) => {
        if (e.target.tagName === "A") closeMenu();
      });
    }
  }

  // Smooth scroll com offset para o header
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id && id.startsWith("#")) {
        const elTarget = document.querySelector(id);
        if (elTarget) {
          e.preventDefault();
          const headerHeight = document.getElementById('main-header').offsetHeight;
          window.scrollTo({ top: elTarget.offsetTop - headerHeight, behavior: "smooth" });
          // Fecha o menu móvel após clicar
          closeMenu();
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
    if (tl) tl.appendChild(box);
  });

  // ---------- COORDENAÇÃO ----------
  const coordGrid = document.getElementById("coordenacao-grid");
  const equipe = coord.equipe || coord.lista || [];
  equipe.forEach((p) => {
    const foto = cloudAny(p.foto);
    const srcset = cloudAnySrcset(p.foto);
    const c = el("div", "bg-white rounded-lg shadow overflow-hidden cursor-pointer group");
    c.innerHTML = `
      <div class="overflow-hidden" style="aspect-ratio: 3 / 4;">
        <img
          src="${foto || ""}"
          ${srcset ? `srcset="${srcset}"` : ""}
          sizes="(min-width:1280px) 300px, (min-width:1024px) 25vw, (min-width:640px) 33vw, 100vw"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          alt="${p.nome || ""}">
      </div>
      <div class="p-4">
        <h3 class="text-lg font-bold">${p.nome || ""}</h3>
        ${p.cargo ? `<span class="inline-block mt-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">${p.cargo}</span>` : ""}
        ${p.descricao ? `<p class="text-sm text-gray-600 mt-2">${p.descricao}</p>` : ""}
      </div>`;
    if (coordGrid) coordGrid.appendChild(c);
  });
  if (coordGrid && equipe.length === 0) {
    const sec = document.getElementById("coordenacao");
    if (sec) sec.classList.add("hidden");
  }

  // ---------- MEMBROS ----------
  const filters = ["Todos", "1º Tenor", "2º Tenor", "Barítono", "Baixo"];
  const naipeFilters = document.getElementById("naipe-filters");
  let filtroAtual = "Todos";
  filters.forEach((f) => {
    const b = el("button", "px-4 py-2 rounded border", f);
    if (f === filtroAtual) b.classList.add("bg-blue-900", "text-white");
    b.addEventListener("click", () => {
      filtroAtual = f;
      if (naipeFilters) {
        [...naipeFilters.children].forEach(
          (x) =>
            (x.className =
              "px-4 py-2 rounded border bg-white text-gray-700 hover:bg-gray-50")
        );
      }
      b.className = "px-4 py-2 rounded border bg-blue-900 text-white";
      renderMembros();
    });
    if (naipeFilters) naipeFilters.appendChild(b);
  });

  function renderMembros() {
    const grid = document.getElementById("members-grid");
    if (!grid) return;
    grid.innerHTML = "";
    (membros.membros || membros.lista || []).forEach((m) => {
      const match =
        filtroAtual === "Todos" || (m.naipes || [m.naipe]).includes(filtroAtual);
      if (!match) return;

      const foto = cloudAny(m.foto);
      const srcset = cloudAnySrcset(m.foto);
      const card = el("div", "bg-white rounded-lg shadow overflow-hidden");
      card.innerHTML = `
        <div class="overflow-hidden" style="aspect-ratio: 3 / 4;">
          <img
            src="${foto || ""}"
            ${srcset ? `srcset="${srcset}"` : ""}
            sizes="(min-width:1280px) 300px, (min-width:1024px) 25vw, (min-width:640px) 33vw, 100vw"
            class="w-full h-full object-cover"
            alt="${m.nome || ""}">
        </div>
        <div class="p-4">
          <h3 class="text-lg font-bold">${m.nome || ""}</h3>
          <div class="flex flex-wrap gap-1 mb-2">
            ${(m.naipes || [m.naipe])
              .filter(Boolean)
              .map(n => `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${n}</span>`)
              .join("")}
          </div>
          ${m.bio ? `<p class="text-gray-700 text-sm">${m.bio}</p>` : ""}
        </div>`;
      grid.appendChild(card);
    });
  }
  renderMembros();

  // ---------- GALERIA (cards que redirecionam para nova página) ----------
  const albumsGrid = document.getElementById("albums-grid");
  const rawAlbuns =
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
    const card = el(
      "a",
      "block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer group",
      `
      <div class="h-48 overflow-hidden">
        <img src="${capa}" alt="${
        album.titulo || ""
      }" class="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-[1.02]">
      </div>
      <div class="p-4">
        <h3 class="text-lg font-bold mb-1">${album.titulo || ""}</h3>
        ${
          album.descricao
            ? `<p class="text-gray-600 text-sm">${album.descricao}</p>`
            : ""
        }
        <span class="mt-3 inline-block text-sky-600 font-medium">Abrir álbum →</span>
      </div>`
    );
    // Redireciona para a nova página do álbum com o ID
    card.href = `/album.html?id=${idx}`;
    return card;
  }
  
  // ---------- DOAÇÕES ----------
  const metaEl = document.getElementById("meta-total");
  const arrEl = document.getElementById("valor-arrecadado");
  const bar = document.getElementById("progress");
  const doacoesTitulo = document.getElementById("doacoes-titulo");
  
  if (metaEl && arrEl && bar && doacoesTitulo) {
    const meta = Number(doacoes.meta_total || 0);
    const arr = Number(doacoes.arrecadado || 0);
    const pct = meta ? Math.min(100, Math.round((arr / meta) * 100)) : 0;
    
    doacoesTitulo.textContent = doacoes.nome_da_meta || "Doações";
    metaEl.textContent = meta ? formatCurrency(meta) : "-";
    arrEl.textContent = `${pct}% (${formatCurrency(arr)})`;
    bar.style.width = pct + "%";
  }

  const pixChave = document.getElementById("pix-chave");
  const pixQr = document.getElementById("pix-qr");
  if (pixChave) pixChave.textContent = doacoes.pix_chave || doacoes.pix?.chave || "";
  if (pixQr && doacoes.pix_qr) pixQr.src = doacoes.pix_qr;

  const doacaoLinks = document.getElementById("doacao-links");
  (doacoes.links || []).forEach((l) => {
    const li = el("li");
    li.innerHTML = `<a class="text-sky-600 hover:underline" href="${l.url}" target="_blank" rel="noopener">${l.nome}</a>`;
    if (doacaoLinks) doacaoLinks.appendChild(li);
  });
  
  // ---------- OBJETIVOS e METAS ----------
  const objetivosGrid = document.getElementById("objetivos-grid");
  const metasGrid = document.getElementById("metas-grid");
  
  if (objetivosGrid) {
    (objetivosD.objetivos || []).forEach(o => {
      const card = el("div", "bg-white rounded-lg shadow p-6 text-center");
      card.innerHTML = `
        ${o.icone ? `<i class="${o.icone} text-4xl text-blue-900 mb-4"></i>` : ''}
        <h3 class="text-xl font-bold mb-2">${o.titulo}</h3>
        <p class="text-gray-600">${o.descricao}</p>
      `;
      objetivosGrid.appendChild(card);
    });
  }

  if (metasGrid) {
    (objetivosD.metas || []).forEach(m => {
      const card = el("div", "bg-white rounded-lg shadow p-6");
      const pct = (m.valor_atual / m.valor_total) * 100;
      card.innerHTML = `
        <h3 class="text-xl font-bold mb-2">${m.titulo}</h3>
        <p class="text-gray-600 mb-4">${m.descricao}</p>
        <div class="flex justify-between text-sm mb-1">
          <span>${formatCurrency(m.valor_atual)}</span>
          <span>${formatCurrency(m.valor_total)}</span>
        </div>
        <div class="h-2 bg-gray-200 rounded-full">
          <div class="h-2 bg-sky-500 rounded-full" style="width:${pct}%"></div>
        </div>
      `;
      metasGrid.appendChild(card);
    });
  }

  // ---------- AGENDA ----------
  const agendaLista = document.getElementById("agenda-lista");
  if (agendaLista) {
    const eventos = agendaD.eventos || [];
    eventos.sort((a, b) => new Date(a.data) - new Date(b.data)); // Ordena por data

    const tipos = ["Todos", ...new Set(eventos.map(e => e.tipo))];
    const agendaFiltros = document.getElementById("agenda-filtros");
    let filtroAgenda = "Todos";

    const renderEventos = () => {
        agendaLista.innerHTML = "";
        eventos.filter(e => filtroAgenda === "Todos" || e.tipo === filtroAgenda)
        .forEach(e => {
            const data = new Date(e.data);
            const dataFormatada = data.toLocaleDateString("pt-BR", { day: '2-digit', month: 'long' });
            const horaFormatada = data.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
            
            let corBadge = 'bg-gray-200 text-gray-800';
            if (e.tipo === 'Ensaio') corBadge = 'bg-blue-100 text-blue-800';
            if (e.tipo === 'Culto') corBadge = 'bg-yellow-100 text-yellow-800';
            if (e.tipo === 'Apresentação') corBadge = 'bg-green-100 text-green-800';
            if (e.tipo === 'Turnê') corBadge = 'bg-purple-100 text-purple-800';

            const eventoEl = el("div", "flex flex-col sm:flex-row bg-white rounded-lg shadow-md p-4 space-y-4 sm:space-y-0 sm:space-x-4 items-center");
            eventoEl.innerHTML = `
                <div class="flex-shrink-0 text-center">
                    <span class="block text-2xl font-bold text-blue-900">${dataFormatada.split(' ')[0]}</span>
                    <span class="block text-sm text-gray-500 uppercase">${dataFormatada.split(' ')[1].slice(0, 3)}</span>
                </div>
                <div class="flex-grow">
                    <span class="inline-block text-xs font-medium ${corBadge} rounded-full px-2 py-1 mb-2">${e.tipo}</span>
                    <h3 class="text-xl font-bold text-blue-900 mb-1">${e.titulo}</h3>
                    <p class="text-gray-600 mb-2">${e.descricao || ''}</p>
                    <div class="flex items-center text-gray-500 text-sm">
                        <i class="fas fa-clock mr-2"></i><span>${horaFormatada}</span>
                        <i class="fas fa-map-marker-alt ml-4 mr-2"></i><span>${e.local}</span>
                    </div>
                </div>
            `;
            agendaLista.appendChild(eventoEl);
        });
    };

    tipos.forEach(t => {
      const b = el("button", "px-4 py-2 rounded-full border border-gray-300 transition", t);
      if (t === filtroAgenda) b.classList.add("bg-blue-900", "text-white");
      b.addEventListener("click", () => {
        filtroAgenda = t;
        [...agendaFiltros.children].forEach(x => x.className = "px-4 py-2 rounded-full border border-gray-300 transition bg-white text-gray-700 hover:bg-gray-100");
        b.className = "px-4 py-2 rounded-full border border-blue-900 bg-blue-900 text-white transition";
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
  if (contatoEmail) contatoEmail.textContent = contato.email || "";
  if (contatoTel)   contatoTel.textContent   = contato.telefone || "";
  if (contatoEnd)   contatoEnd.textContent   = contato.endereco || "";

  // ---------- FOOTER ----------
  const footerLogo = document.getElementById("footer-logo");
  if (footerLogo) footerLogo.src = footer.logo || header.logo || "";
  const fText = document.getElementById("footer-text");
  if (fText) fText.textContent = footer.texto || "";
  const fl = document.getElementById("footer-links");
  (footer.links || []).forEach((l) => {
    const a = el("a", "text-blue-200 hover:text-white transition", l.nome);
    a.href = l.url;
    if (fl) fl.appendChild(a);
  });
})();