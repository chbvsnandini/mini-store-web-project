// Simple client-side cart using sessionStorage
const CART_KEY = 'mini_store_cart_v1';

function getCart(){
  try{ return JSON.parse(sessionStorage.getItem(CART_KEY) || '[]'); }catch(e){ return []; }
}

function saveCart(cart){
  sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount(){
  const cnt = getCart().reduce((s,i)=>s+i.qty,0);
  const el = document.getElementById('cart-count');
  if(el) el.textContent = cnt;
}

async function fetchProductById(id){
  const res = await fetch('/api/products/' + id);
  if(!res.ok) throw new Error('Product not found');
  return await res.json();
}

async function addToCartFromList(id){
  try{
    const p = await fetchProductById(id);
    addToCart(p);
    alert('Added to cart: '+p.name);
  }catch(e){ alert('Error: '+e.message); }
}

function addToCart(product){
  const cart = getCart();
  const idx = cart.findIndex(i=>i.id===product.id);
  if(idx>=0){ cart[idx].qty += 1; }
  else { cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty: 1 }); }
  saveCart(cart);
}

async function buyNowFromList(id){
  try{
    const p = await fetchProductById(id);
    // simulate immediate checkout with single item
    const payload = { items: [{ id: p.id, name: p.name, price: p.price, qty: 1 }], buyer: {} };
    const res = await fetch('/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const data = await res.json();
    if(data && data.status === 'ok'){
      alert('Order placed. Order ID: '+data.order_id);
      // optionally redirect to order confirmation page (not implemented)
    }else{
      alert('Checkout failed');
    }
  }catch(e){ alert('Error: '+e.message); }
}

// Render cart page if present
function renderCartPage(){
  const root = document.getElementById('cartRoot');
  if(!root) return;
  const cart = getCart();
  if(cart.length===0){ root.innerHTML = '<p>Your cart is empty.</p>'; return; }
  let html = '<div style="background:#fff;padding:12px;border-radius:8px"><table style="width:100%;border-collapse:collapse"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th></th></tr></thead><tbody>';
  let total = 0;
  cart.forEach(item=>{ total += item.price * item.qty; html += `<tr><td style="padding:8px"><img src="${item.image}" style="width:84px;height:56px;object-fit:cover;border-radius:6px;margin-right:8px;vertical-align:middle"> ${item.name}</td><td style="text-align:center">${item.qty}</td><td style="text-align:right">$${(item.price*item.qty).toFixed(2)}</td><td style="text-align:right"><button class="btn" onclick="removeFromCart(${item.id})">Remove</button></td></tr>` });
  html += `</tbody></table><div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px"><div style="font-weight:700">Total: $${total.toFixed(2)}</div><div><button class="btn primary" onclick="checkoutCart()">Checkout</button></div></div></div>`;
  root.innerHTML = html;
}

function removeFromCart(id){
  let cart = getCart(); cart = cart.filter(i=>i.id!==id); saveCart(cart); renderCartPage();
}

async function checkoutCart(){
  const cart = getCart();
  if(cart.length===0){ alert('Cart is empty'); return; }
  const payload = { items: cart.map(i=>({ id:i.id, name:i.name, price:i.price, qty:i.qty })), buyer: {} };
  try{
    const res = await fetch('/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const data = await res.json();
    if(data && data.status === 'ok'){
      alert('Order placed. Order ID: '+data.order_id);
      sessionStorage.removeItem(CART_KEY);
      updateCartCount();
      renderCartPage();
    }else{
      alert('Checkout failed');
    }
  }catch(e){ alert('Error: '+e.message); }
}

// init
document.addEventListener('DOMContentLoaded', ()=>{
  updateCartCount();
  renderCartPage();
});
