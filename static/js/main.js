async function fetchProducts(){
  const res = await fetch('/api/products');
  if(!res.ok) return [];
  return await res.json();
}

function makeCard(p){
  const el = document.createElement('article');
  el.className = 'card';
  el.innerHTML = `
    <img src="${p.image}" alt="${p.name}">
    <div class="body">
      <h3 class="title">${p.name}</h3>
      <div class="desc">${p.description}</div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="price">$${p.price.toFixed(2)}</div>
        <div class="actions">
          <button class="btn primary" onclick="addToCartFromList(${p.id})">Add</button>
          <button class="btn" onclick="buyNowFromList(${p.id})">Buy Now</button>
          <a class="btn ghost" href="#" onclick="showDetails(${p.id});return false">Details</a>
        </div>
      </div>
    </div>
  `;
  return el;
}

function showDetails(id){
  alert('Open product details page for ID: '+id+' (not implemented).');
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const container = document.getElementById('products');
  container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#6b7280">Loading products…</div>';
  const products = await fetchProducts();
  container.innerHTML = '';
  if(!products || products.length===0){
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#6b7280">No products available.</div>';
    return;
  }
  products.forEach(p=>container.appendChild(makeCard(p)));
});
