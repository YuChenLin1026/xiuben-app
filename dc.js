// Minimal runtime for the 岫本 APP screens: {{ holes }}, <sc-for>, <sc-if>, DCLogic components.
(function () {
  class DCLogic {
    constructor(p) { this.props = p || {}; this.state = {}; }
    setState(o) {
      Object.assign(this.state, typeof o === 'function' ? o(this.state, this.props) : o);
      if (!this.__q) { this.__q = true; queueMicrotask(() => { this.__q = false; this.__render && this.__render(); }); }
    }
  }
  window.DCLogic = DCLogic;
  const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g, ONE = /^\{\{\s*([^}]+?)\s*\}\}$/;
  function get(scope, path) {
    if (path === 'true') return true; if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return +path;
    let v = scope; for (const k of path.split('.')) { if (v == null) return undefined; v = v[k]; } return v;
  }
  const str = v => v == null || v === false ? '' : String(v);
  const EV = { onclick: 'click', oninput: 'input', onchange: 'change', onpointerdown: 'pointerdown', onpointerup: 'pointerup', onkeydown: 'keydown' };
  function build(node, scope, out) {
    if (node.nodeType === 3) { out.push({ t: 3, v: node.nodeValue.replace(HOLE, (_, p) => str(get(scope, p))) }); return; }
    if (node.nodeType !== 1) return;
    const tag = node.localName;
    if (tag === 'sc-for') {
      const list = get(scope, node.getAttribute('list').match(ONE)[1]) || [], as = node.getAttribute('as');
      list.forEach((it, i) => { const s = Object.create(scope); s[as] = it; s.index = i; node.childNodes.forEach(c => build(c, s, out)); });
      return;
    }
    if (tag === 'sc-if') { if (get(scope, node.getAttribute('value').match(ONE)[1])) node.childNodes.forEach(c => build(c, scope, out)); return; }
    const v = { t: 1, tag, ns: node.namespaceURI, a: {}, h: {}, c: [] };
    for (const at of node.attributes) {
      const n = at.name; if (n.startsWith('hint-')) continue;
      const m = at.value.match(ONE);
      if (EV[n.toLowerCase()]) { if (m) v.h[EV[n.toLowerCase()]] = get(scope, m[1]); continue; }
      if (m) { const x = get(scope, m[1]); if (x === false || x == null) continue; v.a[n] = x === true ? '' : String(x); }
      else v.a[n] = at.value.replace(HOLE, (_, p) => str(get(scope, p)));
    }
    (node.content || node).childNodes.forEach(c => build(c, scope, v.c));
    out.push(v);
  }
  function create(v) {
    if (v.t === 3) return document.createTextNode(v.v);
    const el = document.createElementNS(v.ns, v.tag);
    patch(el, v); return el;
  }
  function patch(el, v) {
    for (const n of Array.from(el.attributes)) if (!(n.name in v.a)) el.removeAttribute(n.name);
    for (const n in v.a) if (el.getAttribute(n) !== v.a[n]) el.setAttribute(n, v.a[n]);
    if (v.tag === 'input') {
      if ('value' in v.a && el.value !== v.a.value) el.value = v.a.value;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = 'checked' in v.a;
    }
    el.__h = el.__h || {};
    for (const t in v.h) if (!(t in el.__h)) el.addEventListener(t, e => { const f = el.__h[t]; if (typeof f === 'function') f(e); });
    for (const t in el.__h) if (!(t in v.h)) el.__h[t] = null;
    Object.assign(el.__h, v.h);
    morph(el, v.c);
  }
  function morph(parent, vs) {
    const kids = Array.from(parent.childNodes);
    vs.forEach((v, i) => {
      const k = kids[i];
      if (k && v.t === 3 && k.nodeType === 3) { if (k.nodeValue !== v.v) k.nodeValue = v.v; }
      else if (k && v.t === 1 && k.nodeType === 1 && k.localName === v.tag && k.namespaceURI === v.ns) patch(k, v);
      else { const n = create(v); k ? parent.replaceChild(n, k) : parent.appendChild(n); }
    });
    for (let i = vs.length; i < kids.length; i++) parent.removeChild(kids[i]);
  }
  window.dcMount = function (Comp, props) {
    const tpl = document.getElementById('tpl').content, host = document.getElementById('screen');
    const q = new URLSearchParams(location.search); for (const [k, val] of q) props[k] = val;
    const c = new Comp(props);
    c.__render = () => { const out = []; const vals = c.renderVals ? c.renderVals() : {}; tpl.childNodes.forEach(n => build(n, vals, out)); morph(host, out); };
    c.__render(); c.componentDidMount && c.componentDidMount();
    addEventListener('pagehide', () => c.componentWillUnmount && c.componentWillUnmount());
  };
  // fit the 390×844 screen to the window
  function fit() {
    const s = Math.min(innerWidth / 390, innerHeight / 844), el = document.getElementById('screen');
    el.style.transform = 'scale(' + s + ')';
    el.style.left = (innerWidth - 390 * s) / 2 + 'px'; el.style.top = (innerHeight - 844 * s) / 2 + 'px';
  }
  addEventListener('resize', fit); addEventListener('DOMContentLoaded', fit);
})();
