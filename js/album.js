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
function cloudAny(url, { w = 600, h = null, crop = null, gravity = null } = {}) {
  if (!url) return url;
  if (isCloudinary(url)) {
    const parts = url.split("/upload/");
    if (parts.length > 1) {
      const firstSeg = (parts[1] || "").split("/")[0];
      const hasTransforms = /\b(c_|w_|h_|ar_|g_|z_)/.test(firstSeg);
      if (hasTransforms) return url;
    }
  }
  const t = [
    "f_auto",
    "q_auto",
    "dpr_auto",
    crop ? `c_${crop}` : null,
    gravity ? `g_${gravity}` : null,
    w ? `w_${w}` : null,
    h ? `h_${h}` : null,
  ].filter(Boolean).join(",");
  if (isCloudinary(url)) {
    const parts = url.split("/upload/");
    return `${parts[0]}/upload/${t}/${parts[1]}`;
  } else {
    const base = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/fetch/`;
    const abs = new URL(url, window.location.origin).href;
    return `${base}${t}/${encodeURIComponent(abs)}`;
  }
}

// ===================== normalizadores =====================
function normalizePhotoItem(x) {
  if (!x) return null;
  if (typeof x === "string") return x;
  return (x.src || x.url || x.imagem || x.image || x.foto || x.path || null);
}
function normalizeVideoItem(x) {
  if (!x) return null;
  if (typeof x === "string") return x;
  return x.src || x.url || x.video || null;
}
function normalizeAlbum(raw) {
  if (!raw) return null;
  const titulo = pick(raw, ["titulo", "title", "nome"], "");
  const descricao = pick(raw, ["descricao", "descrição", "description"], "");
  const capa = normalizePhotoItem(pick(raw, ["capa", "cover", "thumb", "thumbnail", "imagem"]));
  const fotosLists = asArray(pick(raw, ["fotos", "fotos_multi", "fotos_multiplas", "fotos_multipla", "imagens", "images", "photos"], [])).flat();
  const videosLists = asArray(pick(raw, ["videos", "vídeos", "clips"], [])).flat();
  const itensMistos = asArray(pick(raw, ["itens", "items"], [])).flat();
  const itens = [];
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
  for (const v of videosLists) {
    const src = v.src || v.url || v.video;
    if (src) {
      itens.push({ tipo: "video", src });
    }
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

// ===================== Lógica da página de álbum =====================
(async () => {
  const albumId = parseInt(new URLSearchParams(window.location.search).get('id'));
  const galeriaD = await getJSON("/data/galeria.json") || {};
  const header = await getJSON("/data/header.json") || {};
  const footer = await getJSON("/data/footer.json") || {};

  const logoImgAlbum = document.getElementById("logo-img-album");
  if (logoImgAlbum) logoImgAlbum.src = header.logo || '';

  const footerTextAlbum = document.getElementById("footer-text-album");
  if (footerTextAlbum) footerTextAlbum.textContent = footer.texto || '';

  const rawAlbuns = pick(galeriaD, ["albuns", "álbuns", "albums", "lista"]) || [];
  const albuns = asArray(rawAlbuns).map(normalizeAlbum).filter(Boolean);
  const currentAlbum = albuns[albumId];

  if (currentAlbum && !isNaN(albumId)) {
    document.getElementById("album-page-title").textContent = currentAlbum.titulo || "Álbum";
    document.getElementById("album-page-description").textContent = currentAlbum.descricao || "";
    
    const albumContentGrid = document.getElementById("album-content-grid");
    albumContentGrid.innerHTML = "";
    
    const lightbox = new Lightbox(currentAlbum.itens);

    currentAlbum.itens.forEach((item, i) => {
      const wrap = el("div", "rounded overflow-hidden bg-white/60 relative group cursor-pointer aspect-square");
      
      if (item.tipo === "video") {
        const thumb = el("div", "aspect-video h-full bg-black/10 rounded grid place-items-center");
        thumb.innerHTML = `<span class="text-white text-xs">▶ Vídeo</span>`;
        thumb.addEventListener("click", () => lightbox.open(i));
        wrap.appendChild(thumb);
      } else {
        const imgEl = el("img", "w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]");
        imgEl.src = cloudAny(item.src, { w: 400, crop: 'fit' });
        imgEl.alt = item.alt;
        imgEl.addEventListener("click", () => lightbox.open(i));
        wrap.appendChild(imgEl);
      }
      albumContentGrid.appendChild(wrap);
    });

  } else {
    document.getElementById("album-page-title").textContent = "Álbum não encontrado";
    document.getElementById("album-page-description").textContent = "O álbum que você está procurando não existe ou o endereço está incorreto.";
  }
})();


class Lightbox {
  constructor(items) {
    this.items = items;
    this.currentIndex = 0;
    this.modal = document.getElementById("lightbox");
    this.imageElement = document.getElementById("lightbox-img");
    this.prevBtn = document.getElementById("lb-prev");
    this.nextBtn = document.getElementById("lb-next");
    this.closeBtn = document.getElementById("lb-close");
    this.boundHandleKeydown = this.handleKeydown.bind(this);
    this.boundClose = this.close.bind(this);
    
    if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.navigate(-1));
    if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.navigate(1));
    if (this.closeBtn) this.closeBtn.addEventListener('click', this.boundClose);
    if (this.modal) this.modal.addEventListener('click', e => {
      if (e.target.dataset.close === 'lightbox' || e.target === this.modal) {
        this.close();
      }
    });
  }

  open(index) {
    this.currentIndex = index;
    this.updateContent();
    this.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this.boundHandleKeydown);
  }

  close() {
    this.modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    document.removeEventListener('keydown', this.boundHandleKeydown);
    // Remove o conteúdo do iframe se for um vídeo
    if (this.imageElement.tagName !== 'IMG') {
        const img = document.createElement('img');
        img.id = 'lightbox-img';
        img.className = 'absolute max-h-[90%] max-w-[90%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded shadow-lg cursor-pointer';
        this.imageElement.replaceWith(img);
        this.imageElement = img;
    }
    this.imageElement.src = '';
  }

  navigate(direction) {
    this.currentIndex = (this.currentIndex + direction + this.items.length) % this.items.length;
    this.updateContent();
  }

  updateContent() {
    const item = this.items[this.currentIndex];
    this.imageElement.src = '';

    if (item.tipo === 'video') {
      const url = item.src || '';
      // Troca o elemento da imagem por um container para o iframe
      const videoContainer = el('div', 'absolute max-h-[90%] max-w-[90%] w-full h-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center');
      videoContainer.id = 'lightbox-img';
      this.imageElement.replaceWith(videoContainer);
      this.imageElement = videoContainer;

      let iframeHtml = '';
      if (/youtube\.com|youtu\.be/.test(url)) {
          const idMatch = url.match(/(?:v=|be\/)([A-Za-z0-9_-]{6,})/);
          const vid = idMatch ? idMatch[1] : '';
          iframeHtml = `<iframe class="w-full h-full rounded shadow-xl" src="https://www.youtube.com/embed/${vid}" frameborder="0" allowfullscreen></iframe>`;
      } else if (/vimeo\.com/.test(url)) {
          const idMatch = url.match(/vimeo\.com\/(\d+)/);
          const vid = idMatch ? idMatch[1] : '';
          iframeHtml = `<iframe class="w-full h-full rounded shadow-xl" src="https://player.vimeo.com/video/${vid}" frameborder="0" allowfullscreen></iframe>`;
      } else if (/\.mp4($|\?)/i.test(url)) {
          iframeHtml = `<video class="w-full h-full object-contain rounded shadow-xl" controls src="${url}"></video>`;
      }
      this.imageElement.innerHTML = iframeHtml;
    } else {
      // Garante que o elemento é uma imagem
      if (this.imageElement.tagName !== 'IMG') {
        const img = document.createElement('img');
        img.id = 'lightbox-img';
        img.className = 'absolute max-h-[90%] max-w-[90%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded shadow-lg cursor-pointer';
        this.imageElement.replaceWith(img);
        this.imageElement = img;
      }
      this.imageElement.src = cloudAny(item.src, { w: 2000, crop: 'fit' });
      this.imageElement.alt = item.alt;
    }

    // Lógica para esconder os botões se houver apenas uma foto
    if (this.items.length <= 1) {
      if (this.prevBtn) this.prevBtn.classList.add('hidden');
      if (this.nextBtn) this.nextBtn.classList.add('hidden');
    } else {
      if (this.prevBtn) this.prevBtn.classList.remove('hidden');
      if (this.nextBtn) this.nextBtn.classList.remove('hidden');
    }
  }

  handleKeydown(e) {
    if (e.key === "Escape") this.close();
    if (e.key === "ArrowRight") this.navigate(1);
    if (e.key === "ArrowLeft") this.navigate(-1);
  }
}