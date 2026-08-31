/**
 * <contact-card> — a native Web Component. No framework, no build step.
 *
 * Usage:
 *   <script type="module" src="/js/contact-card.js"></script>
 *   <contact-card
 *     name="John Kendric"
 *     role="Frontend Developer"
 *     initials="JP"
 *     phone="+1 234 567 890"
 *     email="name@email.com"
 *     tagline="A description of yourself and services"></contact-card>
 *
 * Or drive it from data (the reason to bother with JS at all):
 *   document.querySelector('contact-card').data = { name: '...', ... };
 */

const styles = `
  :host {
    display: block;
    font-family: "Poppins", Arial, sans-serif;
    container-type: inline-size;
  }
  .card {
    text-align: center;
    background-color: #333;
    color: #fff;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgb(0 0 0 / 0.2);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    max-width: 600px;
    width: 100%;
    margin-inline: auto;
    overflow: hidden;
  }
  .card:hover, .card:focus-within {
    transform: translateY(-10px);
    box-shadow: 0 8px 16px rgb(0 0 0 / 0.3);
  }
  @media (prefers-reduced-motion: reduce) {
    .card, .card:hover { transition: none; transform: none; }
  }
  .avatar {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    margin: 20px auto;
    background-color: #ccc;
    display: grid;
    place-items: center;
    font-size: 1.5em;
    font-weight: 600;
    color: #333;
    object-fit: cover;
  }
  .hero { padding: 20px; }
  .hero h1 { font-size: 2.5em; margin: 0; }
  .hero h2 { font-size: 1.5em; margin: 10px 0; font-weight: 400; }
  .hero p  { font-size: 1.2em; margin: 20px 0; }
  .details {
    text-align: left;
    padding: 20px;
    background-color: rgb(255 255 255 / 0.1);
    margin: 20px;
    border-radius: 10px;
  }
  .details p { margin: 10px 0; }
  a { color: #7fe9ff; }
  a:focus-visible { outline: 2px solid #7fe9ff; outline-offset: 3px; border-radius: 2px; }
  @container (max-width: 768px) {
    .hero h1 { font-size: 2em; }
    .hero h2 { font-size: 1.2em; }
    .hero p  { font-size: 1em; }
  }
`;

const escape = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);

export class ContactCard extends HTMLElement {
  static observedAttributes = [
    "name", "role", "initials", "phone", "email", "tagline", "greeting", "avatar",
  ];

  #data = {};

  /** Set every field at once from an object. Attributes win if both are set. */
  set data(value) {
    this.#data = { ...value };
    this.#render();
  }
  get data() {
    return { ...this.#data, ...this.#fromAttributes() };
  }

  connectedCallback() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.#render();
  }

  attributeChangedCallback() {
    if (this.shadowRoot) this.#render();
  }

  #fromAttributes() {
    const out = {};
    for (const key of ContactCard.observedAttributes) {
      const v = this.getAttribute(key);
      if (v !== null) out[key] = v;
    }
    return out;
  }

  #render() {
    const d = this.data;
    const name = d.name ?? "Your Name";
    const initials =
      d.initials ??
      name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

    const avatar = d.avatar
      ? `<img class="avatar" src="${escape(d.avatar)}" alt="Portrait of ${escape(name)}">`
      : `<div class="avatar" role="img" aria-label="Portrait placeholder for ${escape(name)}">${escape(initials)}</div>`;

    const phone = d.phone
      ? `<p><strong>Phone:</strong> <a href="tel:${escape(d.phone.replace(/[^\d+]/g, ""))}">${escape(d.phone)}</a></p>`
      : "";

    const email = d.email
      ? `<p><strong>Email:</strong> <a href="mailto:${escape(d.email)}">${escape(d.email)}</a></p>`
      : "";

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <article class="card">
        ${avatar}
        <div class="hero">
          <h1>${escape(d.greeting ?? "Hello, it's Me")}</h1>
          <h2>${escape(name)}</h2>
          ${d.role ? `<p>And I'm a ${escape(d.role)}</p>` : ""}
          ${d.tagline ? `<p>${escape(d.tagline)}</p>` : ""}
        </div>
        <div class="details">
          <p><strong>Name:</strong> ${escape(name)}</p>
          ${phone}
          ${email}
        </div>
      </article>
    `;
  }
}

if (!customElements.get("contact-card")) {
  customElements.define("contact-card", ContactCard);
}
