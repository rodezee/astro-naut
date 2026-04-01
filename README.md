
# 🚀 AstroNaut

A super-lightweight, zero-build, reactive in-browser component engine. AstroNaut allows you to write UI files using a syntax heavily inspired by [Astro](https://astro.build/) and execute them natively in the client's browser without any servers, Node.js, or complex bundlers.

## ✨ Features

* **Zero Build Step:** No Vite, no Webpack, no Go compilers. Just drop the script on your page.
* **Hybrid Fetching:** Supports pulling `.astro` component files directly from a CDN (like jsDelivr) or writing them directly inline.
* **Encapsulated Auto-Scoping CSS:** No Shadow DOM! Styles are written in the global Light DOM but are intelligently prefixed with instance IDs so they don't break the rest of your site's design.
* **Native Reactivity:** Supports setting dynamic data via standard HTML attributes or directly via the JS `.props` property.
* **Brackets State Machine:** Uses an iterative bracket-counting algorithm to safely parse and evaluate complex JavaScript expressions, map loops, and short-circuits.

---

## 📦 Installation

Just add the compiled script to the `<head>` of your website.

```html
<script type="module" src="https://esm.sh/gh/rodezee/astro-naut/"></script>

```

----------

## 🚀 Usage

### 1. External Component (CDN)

Point the `src` attribute to any raw `.astro` file on the web (or your local directory).

```html
<astro-naut src="https://cdn.jsdelivr.net/gh/rodezee/astro-naut/supply-store.astro"></astro-naut>

```

### 2. Inline Component

Write code on the fly without making a single network request using a `text/astro` script tag.

```html
<astro-naut>
  <script type="text/astro">
    ---
    const title = "Inline AstroNaut is Alive!";
    const pillColor = "#a855f7";
    ---
    <div class="banner">
      <h2>{title}</h2>
      <p>No external network requests needed for this component! 🚀</p>
      <span class="pill" style="background: {pillColor}">Fast & Local</span>
    </div>

    <style>
      .banner { border: 2px solid #e2e8f0; padding: 20px; border-radius: 12px; }
      h2 { color: #0f172a; margin-top: 0; }
      .pill { color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; }
    </style>
  </script>
</astro-naut>

```

### 3. Passing Props & Reactivity

You can supply custom properties through HTML attributes:

```html
<astro-naut 
  src="./supply-store.astro"
  props='{
    "basePrice": 30,
    "discount": 0.15,
    "items": [
      { "name": "Swiss Cheese Plant", "stock": 4 },
      { "name": "Fiddle Leaf Fig", "stock": 0 }
    ]
  }'>
</astro-naut>

```

Or perfectly bridge it with vanilla JS reactivity:

```javascript
const shop = document.getElementById('my-shop');

// This instantly triggers a DOM re-render!
shop.props = {
  basePrice: 15,
  discount: 0.50,
  items: [
    { name: "Cactus", stock: 100 },
    { name: "Fern", stock: 2 }
  ]
};

```

----------

## 🛠️ How It Works

1.  **Frontmatter Execution:** It isolates the data within the `---` fences and uses a scoped `new Function()` constructor to safely generate the component's state variables.
    
2.  **HTML Templating:** It walks the string matching `{` and `}` brackets. Any script detected inside brackets is executed in a controlled environment mapping variables to evaluated strings.
    
3.  **Style Scoping:** It runs a RegEx over your `<style>` block to extract class rules, rewriting them with targeted `[data-astro-id="..."]` attributes so component styling stays strictly local.
    

## 📄 License

MIT © Biensure

