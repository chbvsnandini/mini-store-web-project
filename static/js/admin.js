async function api(path, method='GET', body){
  const opts = { method, headers: {} };
  if(body){ opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(path, opts);
  if(!res.ok){
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return await res.json();
}

function renderProductRow(p){
  const div = document.createElement('div');
  div.style.borderBottom = '1px solid #eef2f7';
  div.style.padding = '8px 0';
  div.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center">
      <img src="${p.image}" style="width:84px;height:56px;object-fit:cover;border-radius:6px">
      <div style="flex:1">
        <div style="font-weight:600">${p.name} <span style="color:#6b7280;font-weight:400">— $${Number(p.price).toFixed(2)}</span></div>
        <div style="color:#6b7280">${p.description || ''}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="editProduct(${p.id})">Edit</button>
        <button class="btn" onclick="deleteProduct(${p.id})">Delete</button>
      </div>
    </div>
  `;
  return div;
}

async function loadAdminProducts(){
  const container = document.getElementById('adminProducts');
  container.innerHTML = 'Loading…';
  const products = await api('/api/products');
  container.innerHTML = '';
  products.forEach(p=>container.appendChild(renderProductRow(p)));
}

document.addEventListener('DOMContentLoaded', ()=>{
  loadAdminProducts();
  const form = document.getElementById('addForm');
  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.price = parseFloat(data.price || 0);
    try{
      await api('/api/products', 'POST', data);
      form.reset();
      loadAdminProducts();
    }catch(err){
      alert('Error: '+err.message);
    }
  });
});

window.deleteProduct = async function(id){
  if(!confirm('Delete product #'+id+'?')) return;
  try{
    await api('/api/products/'+id, 'DELETE');
    loadAdminProducts();
  }catch(err){ alert('Error: '+err.message); }
}

window.editProduct = async function(id){
  const name = prompt('New name');
  if(name === null) return;
  const price = prompt('New price');
  if(price === null) return;
  try{
    await api('/api/products/'+id, 'PUT', { name, price: parseFloat(price) });
    loadAdminProducts();
  }catch(err){ alert('Error: '+err.message); }
}
