# Pre-rendering (react-snap)

The site is a Create React App SPA. On every page request Vercel serves
`build/index.html`, which arrives at the crawler with an empty `<div id="root"></div>`.
Googlebot runs JavaScript and sees the rendered page fine, but Bing,
Twitter, Facebook, and LinkedIn crawlers do not — social share previews
look broken and non-Google indexing is painfully slow.

This repo uses **[react-snap](https://github.com/stereobooster/react-snap)**
to fix that. After `craco build` finishes, `react-snap` launches a headless
Chrome, visits every listed route, and writes the rendered HTML back to
`build/<route>/index.html`. Vercel's filesystem routing then serves that
file to the first request, so every crawler (and every user on a slow
connection) sees real content on first paint. React takes over via
`hydrateRoot` the moment its bundle finishes downloading.

## How it's wired

`frontend/package.json` runs `react-snap` as a `postbuild` script, so a
`yarn build` on Vercel does one extra step. The relevant blocks:

```json
"scripts": {
  "build": "craco build",
  "postbuild": "react-snap"
},
"reactSnap": {
  "source": "build",
  "destination": "build",
  "include": ["/", "/products", "/astro", "/support", "/terms",
              "/shipping-policy", "/refund-policy", "/login"],
  "crawl": true,
  "inlineCss": true,
  "skipThirdPartyRequests": true,
  "waitFor": 1500,
  "puppeteerArgs": ["--no-sandbox", "--disable-setuid-sandbox"]
}
```

`frontend/src/index.js` branches on whether `#root` has children:

```js
if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, tree);   // react-snap pre-rendered
} else {
  createRoot(rootElement).render(tree);   // fresh SPA load
}
```

## What is NOT pre-rendered

- `/admin` — gated behind auth, no point exposing to crawlers.
- `/products/:id` — dynamic routes with unknown IDs at build time.
  These keep the normal SPA behaviour: crawler fetches `/index.html`,
  JS loads, product renders on client. Googlebot handles it fine; for
  non-Google indexing we rely on the sitemap.
- `/cart`, `/checkout`, `/my-orders`, `/wishlist` — user state, must stay client-only.

Add a new static route to the `reactSnap.include` array when you add one.

## Known pain points

- **puppeteer is heavy.** Installing it downloads a Chromium binary
  (~170 MB). Vercel's Hobby plan handles this inside the build limit
  but each build is +60-90 s slower.
- **react-snap is unmaintained** (last release 2022). It mostly works on
  React 19 via `hydrateRoot` but can produce hydration-mismatch
  warnings on pages that use `window` / localStorage during initial
  render. If something breaks after a dep bump, the fastest escape hatch
  is to drop the `postbuild` script — pre-rendering is pure
  enhancement, the site still runs without it.
- **Crawl is best-effort.** If a page renders differently on each load
  (e.g. random hero carousel start index) the pre-rendered HTML will
  disagree with the hydration pass and React will unmount the whole
  tree. Use the `include` list as the source of truth and keep pages
  deterministic during pre-render.

## Local test

```
cd frontend
yarn install
yarn build         # runs craco build then react-snap
ls build           # should contain /, /products, /astro, …
```

Open `build/products/index.html` in a text editor: the product listing
HTML should be present before `<script>` tags, not an empty `<div id="root"></div>`.
