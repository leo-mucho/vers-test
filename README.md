# vers — prototype website

Coded from the six wireframes on the "Wireframes: Claude" page of the
Vers Figma file. Plain HTML, CSS and JavaScript, no build step.

## Run it

Double-click `index.html` — it runs straight from the file system. Or use
any static file server from this folder:

```bash
ruby -run -e httpd -- -p 5173 .
```

then open <http://localhost:5173/>. (`npx serve .` or `python3 -m http.server`
work too if you have them.)

## Pages

| Route                     | Figma frame                             |
| ------------------------- | --------------------------------------- |
| `#/`                      | hero (the draggable room)               |
| `#/list?pic=p01&by=…`     | Picture Selected: Related content/list  |
| `#/grid?pic=p01&by=…`     | Picture Selected: Related content/grid  |
| `#/projects`              | Projects: Overview                      |
| `#/projects/house-011`    | Projects: Project Page (modal)          |
| `#/about`                 | About (modal over whatever view is open) |

## Interactions

- **Loading**: a white preloader with the logo while the room's pictures and
  fonts load (1.4 s minimum), then the tiles fly in from the camera showing
  their photos and settle into the room as the camera pulls back. Header and
  controls follow. Returning to the room replays the
  fly-in without the preloader.
- **Dimensions**: the room is a stack of rooms along the depth axis. Click any
  white space to dolly forward into the next one, or use the mouse wheel to
  travel continuously (it snaps to the nearest room when you stop). Rooms
  recycle behind the camera so the journey is endless; each shows a different
  set of pictures.
- **Room**: the camera turns to follow the cursor (CSS 3D look-around);
  click and drag to walk through the space (parallax by depth, with inertia);
  every panel is a picture; hover one to see its caption and click it to open
  it in the list view.
- **Show me more by […] as […]**: two dropdowns in the bottom bar. "by"
  reorders related pictures (materials / project / patterns / colors; it
  reads "[not selected]" until you pick one). Choosing "project" also lists the
  projects bottom-left: pick one to bring its pictures forward (the room dims
  the others; list and grid put them first), pick it again to clear; "as" switches room / list / grid.
- **List**: the picture crossing the centre line is the active one; the
  caption on the left follows it, and pictures never run under it. Over any
  picture the pointer becomes the "View Project" chip; click to open its project. The sequence repeats as you scroll (infinite scroll).
- **Grid**: over a tile the pointer becomes the "View Project" chip (it
  follows the cursor with a slight lag); click to open.
- **Projects**: over a row the pointer becomes the "View Project" chip (there
  is no static one); click anywhere in the row to open the project. In the modal, `prev` /
  `next` (or ← / →) move between projects, `x`, Esc or a click outside closes.
- **Menu**: logo → room, projects, about (a modal over the current view, so
  closing it returns you exactly where you were), contact (mailto).

## Files

- `index.html` – shell: header, view root, bottom bar, modal root
- `css/styles.css` – tokens and all styles
- `js/app.js` – hash router, views, room drag, list tracking, dropdowns, modals
- `js/data.js` – projects, pictures, room geometry (from Figma), about copy
- `assets/` – photos, room shape paths, icons, logo (exported from Figma)

## Fonts

The design uses TT Hoves Pro and Reckless Neue. Neither is bundled; the CSS
falls back to Inter and Instrument Serif from Google Fonts unless the real
faces are installed locally.
