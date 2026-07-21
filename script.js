document.addEventListener('DOMContentLoaded', function () {
    var body = document.body;
    var themeToggle = document.querySelector('.theme-toggle');
    var navLinks = document.querySelector('.nav-links');
    var useServer = false;

    if (!body || !themeToggle || !navLinks) {
        return;
    }

    body.classList.add('js');

    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark');
    }

    updateThemeButton();

    themeToggle.addEventListener('click', function () {
        body.classList.toggle('dark');
        var currentTheme = body.classList.contains('dark') ? 'dark' : 'light';
        localStorage.setItem('theme', currentTheme);
        updateThemeButton();
    });

    function updateThemeButton() {
        var isDark = body.classList.contains('dark');
        themeToggle.textContent = isDark ? '☀️' : '🌙';
        themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }

    // detect server API quickly
    fetch('/api/ping', { credentials: 'include' }).then(function (r) {
        if (r.ok) useServer = true;
    }).catch(function () { useServer = false; }).finally(function () {
        // after detection, render and wire things that may depend on server
        renderCart();
        wireCartActions();
        updateNavUser();
    });

    /* -- Cart and Login helpers (server-first, fallback to localStorage) -- */
    async function getCart() {
        if (useServer) {
            try {
                var res = await fetch('/api/cart', { credentials: 'include' });
                if (res.ok) {
                    var j = await res.json();
                    return j.cart || [];
                }
            } catch (e) { /* fallthrough */ }
        }
        try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch (e) { return []; }
    }

    async function saveCart(cart) {
        if (useServer) {
            // no bulk save endpoint; clear and re-add for simplicity (server stores session)
            try {
                await fetch('/api/cart/clear', { method: 'POST', credentials: 'include' });
                for (var i = 0; i < cart.length; i++) {
                    var item = cart[i];
                    await fetch('/api/cart/add', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: item.name, price: item.price }) });
                    // set qty by repeating adds; naive but fine for demo
                    for (var q = 1; q < item.qty; q++) {
                        await fetch('/api/cart/add', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: item.name, price: item.price }) });
                    }
                }
                return;
            } catch (e) { /* fallback */ }
        }
        localStorage.setItem('cart', JSON.stringify(cart));
    }

    async function addToCart(name, price, btn) {
        if (useServer) {
            try {
                await fetch('/api/cart/add', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name, price: price }) });
                // small UI feedback
                var old = btn.textContent;
                btn.textContent = 'Added ✓';
                setTimeout(function () { btn.textContent = old; }, 900);
                return;
            } catch (e) { /* fallback to local */ }
        }
        var cart = await getCart();
        var found = cart.find(function (c) { return c.name === name; });
        if (found) found.qty += 1; else cart.push({ name: name, price: price, qty: 1 });
        await saveCart(cart);
        var old = btn.textContent;
        btn.textContent = 'Added ✓';
        setTimeout(function () { btn.textContent = old; }, 900);
    }

    async function renderCart() {
        var container = document.getElementById('cart-contents');
        if (!container) return;
        var cart = await getCart();
        container.innerHTML = '';
        if (!cart || cart.length === 0) {
            container.innerHTML = '<p>Your cart is empty. Browse the <a href="menu.html">menu</a> to add items.</p>';
            return;
        }

        var table = document.createElement('div');
        table.className = 'cart-table';
        var total = 0;
        cart.forEach(function (item, idx) {
            var row = document.createElement('div');
            row.className = 'cart-row';
            row.innerHTML = '<strong>' + item.name + '</strong> — $' + (item.price).toFixed(2) + ' &times; ' +
                '<input type="number" min="1" value="' + item.qty + '" data-idx="' + idx + '" style="width:60px;margin-left:8px;" />' +
                ' <button data-idx="' + idx + '" class="remove-item" style="margin-left:10px;">Remove</button>';
            table.appendChild(row);
            total += item.price * item.qty;
        });

        var totalEl = document.createElement('div');
        totalEl.style.marginTop = '12px';
        totalEl.innerHTML = '<strong>Total: $' + total.toFixed(2) + '</strong>';
        container.appendChild(table);
        container.appendChild(totalEl);

        // Wire up quantity change and remove buttons
        container.querySelectorAll('input[type="number"]').forEach(function (el) {
            el.addEventListener('change', async function () {
                var i = parseInt(this.dataset.idx, 10);
                var val = parseInt(this.value, 10) || 1;
                var cart = await getCart();
                cart[i].qty = val;
                await saveCart(cart);
                renderCart();
            });
        });

        container.querySelectorAll('.remove-item').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                var i = parseInt(this.dataset.idx, 10);
                var cart = await getCart();
                cart.splice(i, 1);
                await saveCart(cart);
                renderCart();
            });
        });
    }

    // Add to cart buttons on menu pages
    document.querySelectorAll('.add-to-cart').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var name = this.dataset.name || this.textContent.trim();
            var price = parseFloat(this.dataset.price) || 0;
            addToCart(name, price, this);
        });
    });

    // Login form handling (server-backed when available)
    var loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            var username = (document.getElementById('username') || {}).value || '';
            var email = (document.getElementById('email') || {}).value || '';
            if (!username || !email) {
                document.getElementById('login-message').textContent = 'Please provide name and email.';
                return;
            }
            if (useServer) {
                try {
                    var res = await fetch('/api/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username, email: email }) });
                    if (res.ok) {
                        document.getElementById('login-message').textContent = 'Signed in as ' + username + '.';
                        setTimeout(function () { window.location = 'index.html'; }, 700);
                        return;
                    }
                } catch (e) { /* fallback to local */ }
            }
            var user = { username: username, email: email };
            localStorage.setItem('user', JSON.stringify(user));
            document.getElementById('login-message').textContent = 'Signed in as ' + username + '.';
            setTimeout(function () { window.location = 'index.html'; }, 700);
        });
    }

    // Update nav: show username and logout when signed in
    async function updateNavUser() {
        try {
            var user = null;
            if (useServer) {
                var r = await fetch('/api/user', { credentials: 'include' });
                if (r.ok) {
                    var j = await r.json();
                    user = j.user;
                }
            }
            if (!user) {
                var raw = localStorage.getItem('user');
                if (raw) user = JSON.parse(raw);
            }
            if (!user) return;
            var loginLink = document.querySelector('.nav-links a[href="login.html"]');
            if (loginLink) {
                loginLink.textContent = user.username || 'Account';
                loginLink.href = '#';
                loginLink.addEventListener('click', async function (e) {
                    e.preventDefault();
                    if (!confirm('Sign out ' + (user.username || 'user') + '?')) return;
                    if (useServer) {
                        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                    }
                    localStorage.removeItem('user');
                    location.reload();
                });
            }
        } catch (e) { /* ignore */ }
    }

    // Clear cart and checkout buttons on cart page
    function wireCartActions() {
        var clearBtn = document.getElementById('clear-cart');
        if (clearBtn) {
            clearBtn.addEventListener('click', async function () {
                if (confirm('Clear your cart?')) {
                    if (useServer) {
                        try { await fetch('/api/cart/clear', { method: 'POST', credentials: 'include' }); } catch (e) { /* fallback */ }
                    }
                    localStorage.removeItem('cart');
                    renderCart();
                }
            });
        }
        var checkoutBtn = document.getElementById('checkout');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', async function () {
                var cart = await getCart();
                if (!cart || cart.length === 0) {
                    alert('Your cart is empty.');
                    return;
                }
                if (useServer) {
                    var r = await fetch('/api/checkout', { method: 'POST', credentials: 'include' });
                    if (r.ok) {
                        var j = await r.json();
                        alert(j.message || 'Checkout complete (demo). Thank you!');
                        renderCart();
                        return;
                    }
                }
                var user = localStorage.getItem('user');
                if (!user) {
                    if (confirm('You are not signed in. Go to login page?')) {
                        window.location = 'login.html';
                        return;
                    }
                }
                alert('Checkout complete (demo). Thank you!');
                localStorage.removeItem('cart');
                renderCart();
            });
        }
    }

});