# CazandoAndo
Sitio estático (HTML/CSS/JS) para catálogo de indumentaria y artículos de caza.  
MVP con stock en tiempo real conectado a **Supabase** (tabla `products`).

## Demo local
- Abrí `index.html` con Live Server (VS Code) o doble clic en el archivo.
```
## Estructura
/
├── index.html # Sitio público
├── admin.html # Panel simple (carga/edición vía Supabase)
├── style.css # Estilos globales
├── script.js # JS común (modal, lightbox, etc.)
├── assets/ # Imágenes (favicon, hero, productos, testimonios)
└── README.md

## Variables y datos a cambiar
- **WhatsApp**: en ambos HTML buscar `data-whatsapp` y el `<a id="whatsapp-float">`.
- **Email de contacto**: buscar `CONTACT_EMAIL` (acción del form con FormSubmit).
- **Hero**: imagen en `assets/CazandoAndo.webp`.
- **Favicon**: `assets/favicon.webp`.

> Opcional: mantener un `.env` con `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `WHATSAPP_NUMBER`, `CONTACT_EMAIL`. (En front puro, las variables se editan en los HTML. El `.env` sirve para futuros builds o backend.)

## Supabase
**Tabla `products`**
| campo       | tipo        | notas                         |
|-------------|-------------|-------------------------------|
| id          | int8 (PK)   | autoincremental               |
| category    | text        | ej: "Gorras", "Ópticas"       |
| name        | text        | nombre del producto           |
| price       | numeric     | precio en ARS                 |
| stock       | int4        | unidades disponibles          |
| image_url   | text        | URL completa a la imagen      |
```
- El front **lee** y **actualiza** `stock` con `anon` key.
- Si activás **RLS**, agrega políticas de lectura pública y actualización controlada (o mové la lógica de “comprar” a un backend propio).

## Accesibilidad/UX
- Navegación con `aria-*` y roles en secciones y grillas.
- Lightbox accesible para galerías (testimonios/stock).
- Cursor en tarjetas de producto **sin** “lupita” (no hay zoom en productos).

## Despliegue
### GitHub Pages
1. Subí a `main`.
2. En el repo: **Settings → Pages → Branch: `main` / root → Save**.
3. Queda en `https://TU_USUARIO.github.io/cazandoando/`.

### Vercel / Netlify (recomendado)
- Importá el repo → Framework: **Other**.
- Build Command: _(vacío)_ — Output dir: `/`.
- (Opcional) Cargá `SUPABASE_URL` y `SUPABASE_ANON_KEY` como Environment Variables.

## Flujo de trabajo
```bash
git add .
git commit -m "feat: ajuste X"
git push origin main

