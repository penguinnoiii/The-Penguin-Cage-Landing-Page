const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
n// Serve static files from repo root
app.use(express.static(path.join(__dirname)));

// Health check for client detection
app.get('/api/ping', (req, res) => {
  res.json({ ok: true });
});

// User endpoints (demo, session-based)
app.post('/api/login', (req, res) => {
  const { username, email } = req.body || {};
  if (!username || !email) return res.status(400).json({ error: 'username and email required' });
  req.session.user = { username, email };
  return res.json({ ok: true, user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'could not logout' });
    res.json({ ok: true });
  });
});

app.get('/api/user', (req, res) => {
  if (!req.session.user) return res.status(204).end();
  res.json({ user: req.session.user });
});

// Cart endpoints (stored in session)
function ensureCart(req) {
  if (!req.session.cart) req.session.cart = [];
  return req.session.cart;
}

app.get('/api/cart', (req, res) => {
  res.json({ cart: ensureCart(req) });
});

app.post('/api/cart/add', (req, res) => {
  const { name, price } = req.body || {};
  if (!name || typeof price !== 'number') return res.status(400).json({ error: 'name and price required' });
  const cart = ensureCart(req);
  const found = cart.find(i => i.name === name);
  if (found) found.qty += 1; else cart.push({ name, price, qty: 1 });
  req.session.cart = cart;
  res.json({ ok: true, cart });
});

app.post('/api/cart/clear', (req, res) => {
  req.session.cart = [];
  res.json({ ok: true });
});

app.post('/api/checkout', (req, res) => {
  const cart = ensureCart(req);
  if (!cart || cart.length === 0) return res.status(400).json({ error: 'cart empty' });
  // Demo: just clear cart and return success
  req.session.cart = [];
  res.json({ ok: true, message: 'Checkout complete (demo)' });
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
