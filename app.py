from flask import Flask, jsonify, render_template, send_from_directory, request, session, redirect, url_for
import json
import os
import tempfile

HERE = os.path.dirname(__file__)
DATA_FILE = os.path.join(HERE, 'data', 'products.json')

app = Flask(__name__)
# Secret key for session; override with environment variable for production
app.secret_key = os.environ.get('MINI_STORE_SECRET', 'change-this-secret')

# Admin token (optional). If set, visiting `/admin?token=...` with this token grants admin access.
ADMIN_TOKEN = os.environ.get('MINI_STORE_ADMIN_TOKEN')


def load_products():
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_products(products):
    # atomic write
    dirpath = os.path.dirname(DATA_FILE)
    fd, tmp = tempfile.mkstemp(dir=dirpath, text=True)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(products, f, ensure_ascii=False, indent=2)
        os.replace(tmp, DATA_FILE)
    finally:
        if os.path.exists(tmp):
            try:
                os.remove(tmp)
            except Exception:
                pass


def is_admin_authorized():
    if session.get('is_admin'):
        return True
    token = request.args.get('token')
    if token and ADMIN_TOKEN and token == ADMIN_TOKEN:
        session['is_admin'] = True
        return True
    return False


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/products')
def api_products():
    products = load_products()
    return jsonify(products)


@app.route('/products')
def products_page():
    # Server-rendered products page for SEO/crawlers
    products = load_products()
    return render_template('products.html', products=products)


@app.route('/product/<int:pid>')
def product_page(pid):
    products = load_products()
    for p in products:
        if p.get('id') == pid:
            return render_template('product.html', product=p)
    return render_template('product.html', product=None), 404


@app.route('/sitemap.xml')
def sitemap():
    # dynamic sitemap with basic urls
    host = request.host_url.rstrip('/')
    urls = [url_for('index', _external=True), url_for('products_page', _external=True)]
    products = load_products()
    for p in products:
        urls.append(url_for('product_page', pid=p.get('id'), _external=True))
    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        xml.append('  <url><loc>{}</loc></url>'.format(u))
    xml.append('</urlset>')
    return app.response_class('\n'.join(xml), mimetype='application/xml')


@app.route('/robots.txt')
def robots():
    lines = [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Sitemap: ' + url_for('sitemap', _external=True)
    ]
    return app.response_class('\n'.join(lines), mimetype='text/plain')


@app.route('/api/search')
def api_search():
    q = (request.args.get('q') or '').strip()
    if not q:
        return jsonify([])
    ql = q.lower()
    products = load_products()
    results = [p for p in products if ql in (p.get('name','').lower() + ' ' + p.get('description','').lower())]
    return jsonify(results)


@app.route('/search')
def search_page():
    q = (request.args.get('q') or '').strip()
    products = []
    if q:
        ql = q.lower()
        products = [p for p in load_products() if ql in (p.get('name','').lower() + ' ' + p.get('description','').lower())]
    return render_template('search.html', q=q, products=products)


@app.route('/api/products', methods=['POST'])
def api_create_product():
    if not is_admin_authorized():
        return jsonify({'error': 'unauthorized'}), 401
    payload = request.get_json() or {}
    products = load_products()
    new_id = max((p.get('id', 0) for p in products), default=0) + 1
    product = {
        'id': new_id,
        'name': payload.get('name', 'Untitled'),
        'price': float(payload.get('price', 0.0)),
        'image': payload.get('image', ''),
        'description': payload.get('description', '')
    }
    products.append(product)
    save_products(products)
    return jsonify(product), 201


@app.route('/api/products/<int:pid>', methods=['PUT'])
def api_update_product(pid):
    if not is_admin_authorized():
        return jsonify({'error': 'unauthorized'}), 401
    payload = request.get_json() or {}
    products = load_products()
    for i, p in enumerate(products):
        if p.get('id') == pid:
            p['name'] = payload.get('name', p.get('name'))
            p['price'] = float(payload.get('price', p.get('price', 0)))
            p['image'] = payload.get('image', p.get('image', ''))
            p['description'] = payload.get('description', p.get('description', ''))
            products[i] = p
            save_products(products)
            return jsonify(p)
    return jsonify({'error': 'not found'}), 404


@app.route('/api/products/<int:pid>', methods=['GET'])
def api_get_product(pid):
    products = load_products()
    for p in products:
        if p.get('id') == pid:
            return jsonify(p)
    return jsonify({'error': 'not found'}), 404


@app.route('/api/products/<int:pid>', methods=['DELETE'])
def api_delete_product(pid):
    if not is_admin_authorized():
        return jsonify({'error': 'unauthorized'}), 401
    products = load_products()
    new = [p for p in products if p.get('id') != pid]
    if len(new) == len(products):
        return jsonify({'error': 'not found'}), 404
    save_products(new)
    return jsonify({'status': 'deleted'})


@app.route('/admin', methods=['GET'])
def admin():
    if not is_admin_authorized():
        return render_template('admin_login.html')
    return render_template('admin.html')


@app.route('/admin/login', methods=['POST'])
def admin_login():
    # Accept token or password (token is preferred). Password here is the same as token for simplicity.
    token = request.form.get('token') or request.form.get('password')
    if ADMIN_TOKEN and token == ADMIN_TOKEN:
        session['is_admin'] = True
        return redirect(url_for('admin'))
    # fall back: if no ADMIN_TOKEN configured, any non-empty password grants access (development only)
    if not ADMIN_TOKEN and token:
        session['is_admin'] = True
        return redirect(url_for('admin'))
    return render_template('admin_login.html', error='Invalid token')


@app.route('/admin/logout')
def admin_logout():
    session.pop('is_admin', None)
    return redirect(url_for('index'))


@app.route('/cart')
def cart_page():
    return render_template('cart.html')


@app.route('/checkout', methods=['POST'])
def checkout():
    payload = request.get_json() or {}
    items = payload.get('items', [])
    buyer = payload.get('buyer', {})
    # Very small simulation of order creation
    import time, random
    order_id = f"ORD{int(time.time())}{random.randint(100,999)}"
    # In a real app you'd validate, charge payment, and persist order
    return jsonify({'status': 'ok', 'order_id': order_id, 'items_count': len(items), 'buyer': buyer})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
