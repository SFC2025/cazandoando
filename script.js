/* script.js
- Cambiar WHATSAPP_NUMBER en: const WHATSAPP_NUMBER y data attributes [data-whatsapp]
- Cambiar CONTACT_EMAIL: en index.html (action del formulario FormSubmit)
- Editar categorías y productos: data/products.json
- Secciones a editar: render del Hero/Productos/Contacto si se agregan nuevos elementos
*/

(() => {
  const WHATSAPP_NUMBER = "5493424485574"; // Cambiar si hace falta
  const PRODUCTS_JSON = "data/products.json";
  const API_FALLBACK = "/api/products"; // Hook futuro: si existe API, usarla
  // en admin.html y en script.js (arriba, junto a los const)
  const SUPABASE_URL = "https://vtdwtjxadqtmwwhjjhey.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZHd0anhhZHF0bXd3aGpqaGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MTE2MjcsImV4cCI6MjA3NTA4NzYyN30.Hqz6S3MvccPgOwavAnA19cf-1mrtzLE_fd5RAqAs7hk";
  const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const $year = document.getElementById("year");
  if ($year) $year.textContent = new Date().getFullYear();
  // Header: translúcido en top, sólido al scrollear
  const header = document.querySelector(".site-header");
  const onScrollHeader = () => {
    if (header) header.classList.toggle("is-solid", (window.scrollY || 0) > 6);
  };
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader(); // estado correcto al cargar

  // Normaliza todos los enlaces/botones con data-whatsapp
  document.querySelectorAll("[data-whatsapp]").forEach((el) => {
    el.setAttribute("href", `https://wa.me/${WHATSAPP_NUMBER}`);
  });
  const $waFloat = document.getElementById("whatsapp-float");
  if ($waFloat) $waFloat.href = `https://wa.me/${WHATSAPP_NUMBER}`;

  // Modal accesible
  const modal = document.getElementById("contact-modal");
  const openers = document.querySelectorAll("[data-open-modal]");
  const closers = modal ? modal.querySelectorAll("[data-close-modal]") : [];
  let lastFocused = null;

  function openModal() {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.setAttribute("aria-hidden", "false");
    modal.style.display = "grid";
    const firstInput = modal.querySelector("input, textarea, button");
    firstInput?.focus();
    trapFocus(modal);
  }
  function closeModal() {
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    modal.style.display = "none";
    releaseFocusTrap();
    lastFocused?.focus();
  }
  openers.forEach((op) =>
    op.addEventListener("click", (e) => {
      e.preventDefault();
      openModal();
    })
  );
  closers.forEach((cl) => cl.addEventListener("click", closeModal));
  modal?.addEventListener("click", (e) => {
    if (e.target.matches(".modal-backdrop")) closeModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.getAttribute("aria-hidden") === "false")
      closeModal();
  });

  // Focus trap básico
  let trapHandler = null;
  function trapFocus(container) {
    trapHandler = (e) => {
      const focusables = container.querySelectorAll(
        'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const list = Array.from(focusables).filter(
        (el) => el.offsetParent !== null
      );
      const first = list[0],
        last = list[list.length - 1];
      if (!list.length) return;
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    container.addEventListener("keydown", trapHandler);
  }
  function releaseFocusTrap() {
    if (trapHandler && modal) modal.removeEventListener("keydown", trapHandler);
    trapHandler = null;
  }

  // Validación simple del formulario
  const contactForm = document.getElementById("contact-form");
  contactForm?.addEventListener("submit", (e) => {
    let valid = true;
    const name = contactForm.name.value.trim();
    const email = contactForm.email.value.trim();
    const message = contactForm.message.value.trim();
    const setErr = (id, msg) => {
      const n = document.getElementById(id);
      if (n) {
        n.textContent = msg || "";
      }
    };
    setErr("err-name", "");
    setErr("err-email", "");
    setErr("err-message", "");

    if (name.length < 2) {
      setErr("err-name", "Ingresá tu nombre.");
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("err-email", "Email inválido.");
      valid = false;
    }
    if (message.length < 6) {
      setErr("err-message", "Contanos en pocas palabras tu consulta.");
      valid = false;
    }
    if (!valid) e.preventDefault();
  });

  // Render de productos
  const grid = document.getElementById("products-grid");
  let products = [];
  let stockState = loadStockFromStorage(); // { id: number }

  // Filtros dinámicos (se construyen desde las categorías del JSON)
  const filtersWrap = document.getElementById("filters");

  // Un solo normalizador para todo el archivo
  const normalize = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  function renderFilters(list) {
    if (!filtersWrap) return;
    const cats = Array.from(new Set(list.map((p) => p.category || "Otros")));

    const html = [
      `<button class="filter-btn is-active" data-filter="all" role="tab" aria-selected="true">Todo</button>`,
      ...cats.map(
        (c) =>
          `<button class="filter-btn" data-filter="${c}" role="tab" aria-selected="false">${c}</button>`
      ),
    ].join("");

    filtersWrap.innerHTML = html;

    // Listeners
    filtersWrap.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        filtersWrap.querySelectorAll(".filter-btn").forEach((b) => {
          b.classList.remove("is-active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-selected", "true");

        filterByCategory(btn.dataset.filter);
        localStorage.setItem("ca_filter", btn.dataset.filter);

        document
          .getElementById("indumentaria")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    // Mostrar todo al cargar (evita quedar “pegado” a un filtro previo)
    filterByCategory("all");
    // restaurar filtro si el usuario vuelve (sin scrollear)
    const last = localStorage.getItem("ca_filter") || "all";
    const lastBtn = filtersWrap.querySelector(`[data-filter="${last}"]`);
    if (lastBtn) {
      filtersWrap.querySelectorAll(".filter-btn").forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-selected", "false");
      });
      lastBtn.classList.add("is-active");
      lastBtn.setAttribute("aria-selected", "true");
      filterByCategory(last); // aplicamos el filtro sin hacer scroll
    }
  }

  async function fetchProducts() {
    // 1) Supabase (REST)
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/products?select=id,category,name,price,stock,image_url&order=id.asc`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          cache: "no-store",
        }
      );
      if (res.ok) {
        const rows = await res.json();
        return rows.map((r) => ({
          id: r.id,
          category: r.category,
          name: r.name,
          price: r.price,
          stock: r.stock,
          image: r.image_url || "assets/placeholder.webp",
        }));
      }
    } catch (_) {}

    // 2) Respaldo local
    const res = await fetch(PRODUCTS_JSON, { cache: "no-store" });
    const data = await res.json();
    return Array.isArray(data) ? data : data.products || [];
  }

  function loadStockFromStorage() {
    try {
      const raw = localStorage.getItem("ca_stock");
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }
  function saveStockToStorage() {
    try {
      localStorage.setItem("ca_stock", JSON.stringify(stockState));
    } catch (_) {}
  }

  function getCurrentStock(p) {
    const overridden = stockState[p.id];
    return typeof overridden === "number" ? overridden : p.stock;
  }

  function renderProducts(list) {
    if (!grid) return;
    grid.setAttribute("aria-busy", "true");
    grid.innerHTML = "";
    list.forEach((p) => {
      const currentStock = getCurrentStock(p);
      const available = currentStock > 0;
      const card = document.createElement("article");
      card.className = "product-card";
      card.setAttribute("role", "listitem");
      card.innerHTML = `
        <div class="product-media">
  <img src="${p.image}" alt="${p.name}" loading="lazy" decoding="async"
       width="640" height="480"
       srcset="${p.image} 640w, ${p.image} 960w, ${p.image} 1280w"
       sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw">
</div>

        <div class="product-body">
          <div class="product-head">
            <h3 class="product-title">${p.name}</h3>
            <div class="product-price">$${p.price.toLocaleString("es-AR")}</div>
          </div>
          <div class="product-meta">
            <span class="badge ${available ? "ok" : "out"}">${
        available ? "Disponible" : "Agotado"
      }</span>
            <span class="stock-count" aria-label="Stock restante">Stock: ${Math.max(
              0,
              currentStock
            )}</span>
          </div>
        </div>
        <div class="product-actions">
          <input class="qty" type="number" min="1" value="1" aria-label="Cantidad a comprar" ${
            !available ? "disabled" : ""
          } />
          <button class="buy-btn" ${
            !available ? "disabled" : ""
          }>Comprar</button>
        </div>
      `;
      const buyBtn = card.querySelector(".buy-btn");
      const qtyInput = card.querySelector(".qty");
      // Comprar: descuenta stock local y abre WhatsApp Business con mensaje
      buyBtn?.addEventListener("click", () => {
        const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
        const stockNow = getCurrentStock(p);
        if (qty > stockNow) {
          alert(`Solo quedan ${stockNow} unidades de "${p.name}".`);
          return;
        }

        // 1) Descontar stock (MVP local)
        stockState[p.id] = stockNow - qty;
        saveStockToStorage();

        // 2) Actualizar UI de esta tarjeta
        const badge = card.querySelector(".badge");
        const sc = card.querySelector(".stock-count");
        const newStock = getCurrentStock(p);
        const nowAvail = newStock > 0;
        if (badge) {
          badge.textContent = nowAvail ? "Disponible" : "Agotado";
          badge.className = "badge " + (nowAvail ? "ok" : "out");
        }
        if (sc) sc.textContent = `Stock: ${Math.max(0, newStock)}`;
        if (!nowAvail) {
          buyBtn.disabled = true;
          qtyInput.disabled = true;
        }

        // 3) WhatsApp prellenado
        const msg =
          `Hola! Vengo de la web CazandoAndo.\n` +
          `Quiero comprar ${qty} × ${p.name} (ID ${p.id}).\n` +
          `Precio $${p.price.toLocaleString("es-AR")} c/u.\n` +
          `Stock restante mostrado: ${Math.max(0, newStock)}.\n` +
          `¿Seguimos?`;
        const waURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
          msg
        )}`;

        if (window.gtag) {
          gtag("event", "whatsapp_click", {
            event_category: "engagement",
            event_label: p.name,
            value: qty,
          });
        }

        window.open(waURL, "_blank", "noopener");
      });

      card.dataset.category = p.category;
      grid.appendChild(card);
    });
    grid.removeAttribute("aria-busy");
  }

  function filterByCategory(cat) {
    if (!grid) return;
    const target = normalize(cat);
    let visible = 0;

    // limpiar mensajes vacíos previos si hubiera más de uno
    grid.querySelectorAll(".empty-state")?.forEach((n) => n.remove());

    grid.querySelectorAll(".product-card").forEach((it) => {
      const match =
        target === "all" || normalize(it.dataset.category) === target;
      it.style.display = match ? "" : "none";
      if (match) visible++;
    });

    if (!visible) {
      const p = document.createElement("p");
      p.className = "empty-state";
      p.textContent = "No hay productos en esta categoría por el momento.";
      p.style.margin = "8px 0 0";
      p.style.opacity = ".85";
      grid.appendChild(p);
    }
  }
  // ==== STOCK real / Últimos ingresos ====
  async function loadStock() {
    const $stockGrid = document.getElementById("stock-grid");
    if (!$stockGrid) return;

    $stockGrid.setAttribute("aria-busy", "true");
    $stockGrid.innerHTML =
      '<div class="stock-item skeleton" style="height:280px;border-radius:14px"></div>'.repeat(
        8
      );
    const { data, error } = await supa
      .from("stock_images")
      .select("*")
      .eq("visible", true)
      .order("sort", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      $stockGrid.innerHTML = "<p style='opacity:.7'>Error cargando fotos.</p>";
    } else {
      $stockGrid.innerHTML = (data || [])
        .map(
          (i) => `
        <a role="listitem" class="stock-item" href="${
          i.image_url
        }" data-lightbox>
          <img src="${i.image_url}" alt="${
            i.title || "Foto de stock"
          }" loading="lazy" decoding="async"
               width="640" height="800"
               srcset="${i.image_url} 640w, ${i.image_url} 960w, ${
            i.image_url
          } 1280w"
               sizes="(max-width: 600px) 50vw, (max-width: 1200px) 33vw, 25vw" />
        </a>`
        )
        .join("");
    }

    $stockGrid.removeAttribute("aria-busy");
  }

  // Init
  (async function init() {
    try {
      if (grid) {
        grid.innerHTML =
          '<div class="product-card skeleton" style="height:260px"></div>'.repeat(
            6
          );
      }

      products = await fetchProducts();
      renderProducts(products);
      renderFilters(products);

      //cargar galería de stock
      loadStock();
    } catch (err) {
      console.error("Error cargando productos:", err);
      grid.innerHTML = `<p>Ocurrió un problema al cargar los productos. Reintentá más tarde.</p>`;
    }
  })();
})();

/* Marca el link activo del menú según la sección visible */
(() => {
  const sections = ["hero", "indumentaria", "clientes", "stock", "contacto"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const links = new Map(
    [...document.querySelectorAll(".primary-nav a")].map((a) => [
      a.getAttribute("href")?.replace("#", ""),
      a,
    ])
  );

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        const id = en.target.id;
        const link = links.get(id);
        if (!link) return;
        if (en.isIntersecting) {
          document.querySelectorAll(".primary-nav a.is-active").forEach((l) => {
            l.classList.remove("is-active");
            l.removeAttribute("aria-current");
          });
          link.classList.add("is-active");
          link.setAttribute("aria-current", "true");
        }
      });
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: 0.01 }
  );

  sections.forEach((s) => io.observe(s));
})();

// Cerrar menú móvil al elegir un link o con Escape
(() => {
  const nav = document.querySelector(".primary-nav");
  const toggle = document.querySelector(".menu-toggle");

  // Cierra si se hace click en un link
  document.addEventListener("click", (e) => {
    const a = e.target.closest(".primary-nav a");
    if (!a || !nav?.classList.contains("is-open")) return;
    nav.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
  });

  // Cierra con ESC
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !nav?.classList.contains("is-open")) return;
    nav.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
  });
})();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(console.error);
}
