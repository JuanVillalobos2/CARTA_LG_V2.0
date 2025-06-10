const sheetID = '1P5GubM5SpR_NVo3QRZMNQQxWMatUQVz8UIbKREHFu9w'; // <-- tu ID
const sheetName = 'Carta';
const base = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?sheet=${sheetName}`;
const categoryView = document.getElementById('categoryButtons');
const homeView = document.getElementById('homeView');
const menuView = document.getElementById('menuView');
let allData = [];
let isDataLoaded = false;
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];

function updateCartCount() {
  const cartCount = document.getElementById('cartCount');
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  if (totalItems > 0) {
    cartCount.textContent = totalItems;
    cartCount.style.display = 'flex';
  } else {
    cartCount.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetch(base)
    .then(res => res.text())
    .then(rep => {
      const json = JSON.parse(rep.substring(47).slice(0, -2));
      const data = json.table.rows.map(row => ({
        categoria: row.c[0]?.v || '',
        nombre: row.c[1]?.v || '',
        descripcion: row.c[2]?.v || '',
        precio: row.c[3]?.v || '',
        imagen: convertirGoogleDriveURL(row.c[4]?.v || ''),
      }));

      allData = data;
      isDataLoaded = true;
      loadCategories();

      const firstCategoria = data[0]?.categoria || '';
      if (location.hash) {
        handleHashOnLoad(location.hash); // <- Nueva función para restaurar vista
      } else {
        showPlatosDeCategoria(firstCategoria, false);
      }

      // Activar búsqueda
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const query = e.target.value.trim().toLowerCase();
          filterDishes(query);
        });
      }
    });

  loadPromos();
  crearBotonCarrito();
});

function crearBotonCarrito() {
  const btn = document.createElement('button');
  btn.id = 'cartButton';
  btn.innerHTML = '🛒<div id="cartCount" style="display:none;"></div>';
  btn.onclick = () => mostrarVistaCarrito();
  document.body.appendChild(btn);
  updateCartCount();
}

function renderButtons(data) {
  const uniqueCats = [...new Set(data.map(p => p.categoria))];
  const nav = document.getElementById('categoryButtons');
  nav.innerHTML = '';

  uniqueCats.forEach(cat => {
    const btn = document.createElement('button');
    btn.textContent = cat;
    btn.onclick = () => showCategory(cat);
    nav.appendChild(btn);
  });
}

function filterDishes(query) {
  const container = document.getElementById('menuView');
  container.innerHTML = '';

  const resultados = allData.filter(p =>
    p.nombre.toLowerCase().includes(query) ||
    p.descripcion?.toLowerCase().includes(query)
  );

  if (resultados.length === 0) {
    container.innerHTML = '<p>No se encontraron platos.</p>';
    return;
  }

  resultados.forEach(plato => {
    const dish = document.createElement('div');
    dish.className = 'dish';
    dish.onclick = () => showDishDetails(plato);
    dish.innerHTML = `
      <img src="${plato.imagen}" alt="${plato.nombre}" />
      <div class="dish-info">
        <h3>${plato.nombre}</h3>
        <p>S/ ${plato.precio}</p>
      </div>
    `;

    container.appendChild(dish);
  });
  homeView.classList.remove('active');
  menuView.classList.add('active');
  if (location.hash !== '#search') {
    history.pushState(null, '', location.pathname + '#search');
  }
}

function showDishDetails(plato) {
  // Ocultar todas las vistas
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Mostrar solo la vista de detalle
  const dishDetailView = document.getElementById('dishDetailView');
  dishDetailView.classList.add('active');

  // Llenar los datos
  document.getElementById('detailName').textContent = plato.nombre;
  const detailImage = document.getElementById('detailImage');
  detailImage.src = plato.imagen;
  detailImage.alt = plato.nombre;
  document.getElementById('detailDescription').textContent = plato.descripcion;
  document.getElementById('detailPrice').textContent = `S/ ${plato.precio}`;

  // Eliminar contenedor anterior si existe
  let oldContainer = document.getElementById('addToCartContainer');
  if (oldContainer) {
    oldContainer.remove();
  }

  // Crear nuevo contenedor
  const container = document.createElement('div');
  container.id = 'addToCartContainer';
  container.className = 'add-to-cart-container';

  const inputQty = document.createElement('input');
  inputQty.type = 'number';
  inputQty.min = '1';
  inputQty.value = '1';
  inputQty.id = 'inputCantidad';
  inputQty.className = 'qty-input';

  const btnAgregar = document.createElement('button');
  btnAgregar.textContent = 'Agregar al carrito';
  btnAgregar.className = 'add-cart-button';

  btnAgregar.onclick = () => {
    const cantidad = parseInt(document.getElementById('inputCantidad').value);
    if (cantidad > 0) {
      agregarAlCarrito(plato, cantidad);
    } else {
      alert('Ingrese una cantidad válida');
    }
  };

  container.appendChild(inputQty);
  container.appendChild(btnAgregar);
  dishDetailView.appendChild(container);

  // Control de historial para navegación
  if (history.state?.detail !== plato.nombre) {
    history.pushState({ detail: plato.nombre }, '', `#detalle-${plato.nombre}`);
  }
}

function goBackToMenu() {
  history.back();
}

const promoSheetID = '1P5GubM5SpR_NVo3QRZMNQQxWMatUQVz8UIbKREHFu9w';
const promoSheetName = 'PROMOS';
const promoURL = `https://docs.google.com/spreadsheets/d/${promoSheetID}/gviz/tq?sheet=${promoSheetName}`;

let currentPromoIndex = 0;
let promoCount = 0;
let promoInterval;

function convertirGoogleDriveURL(url) {
  if (!url || typeof url !== 'string') {
    // Si url es null, undefined o no es string, devuelve cadena vacía
    return '';
  }
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return url;
}

function loadPromos() {
  fetch(promoURL)
    .then(res => res.text())
    .then(rep => {
      const json = JSON.parse(rep.substring(47).slice(0, -2));
      const rows = json.table.rows;

      const promoContainer = document.getElementById('promoContainer');
      promoContainer.innerHTML = '';

      rows.forEach(row => {
        const imgUrlOriginal = row.c[1]?.v;
        const imgUrl = convertirGoogleDriveURL(imgUrlOriginal);
        if (imgUrl) {
          const img = document.createElement('img');
          img.src = imgUrl;
          img.alt = row.c[0]?.v || 'Promoción'; // Columna PROMO
          promoContainer.appendChild(img);
        }
      });

      promoCount = rows.length;
      currentPromoIndex = 0;
      updatePromoPosition();

      // Iniciar el bucle automático
      if (promoInterval) clearInterval(promoInterval);
      promoInterval = setInterval(() => {
        currentPromoIndex = (currentPromoIndex + 1) % promoCount;
        updatePromoPosition();
      }, 5000);
    });
}

function updatePromoPosition() {
  const container = document.getElementById('promoContainer');
  const offset = -currentPromoIndex * window.innerWidth;
  container.style.transform = `translateX(${offset}px)`;
}

function slidePromos(direction) {
  currentPromoIndex += direction;
  if (currentPromoIndex < 0) currentPromoIndex = promoCount - 1;
  if (currentPromoIndex >= promoCount) currentPromoIndex = 0;
  updatePromoPosition();

  // Reiniciar el intervalo para que espere 5 segundos después de interacción manual
  clearInterval(promoInterval);
  promoInterval = setInterval(() => {
    currentPromoIndex = (currentPromoIndex + 1) % promoCount;
    updatePromoPosition();
  }, 5000);
}

const categoriasSheetName = 'CATEGORIAS';
const categoriasURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?sheet=${categoriasSheetName}`;

function loadCategories() {
  fetch(categoriasURL)
    .then(res => res.text())
    .then(rep => {
      const json = JSON.parse(rep.substring(47).slice(0, -2));
      const rows = json.table.rows;

      const nav = document.getElementById('categoryButtons');
      nav.innerHTML = '';

      rows.forEach(row => {
        const nombre = row.c[0]?.v || '';
        const imagenOriginal = row.c[1]?.v || '';
        const imagen = convertirGoogleDriveURL(imagenOriginal);

        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.onclick = () => {
          if (location.hash !== `#${nombre}`) {
            history.pushState({ category: nombre }, '', `#${nombre}`);
          }

          showPlatosDeCategoria(nombre);
        };

        btn.innerHTML = `
          <div class="cat-img-container">
            <img src="${imagen}" alt="${nombre}" />
          </div>
          <div class="cat-name">${nombre}</div>
        `;

        nav.appendChild(btn);
      });
      showCategoryButtons();
    });
}

function showCategoryButtons() {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  homeView.classList.add('active');
  //menuView.classList.remove('active');
  menuView.innerHTML = '';
}

function showPlatosDeCategoria(categoria, addToHistory = true) {
  homeView.classList.remove('active');
  menuView.classList.add('active');
  dishDetailView.classList.remove('active');

  // Oculta el carrito si existe
  const cartView = document.getElementById('cartView');
  if (cartView) cartView.classList.remove('active');

  menuView.innerHTML = '';

  // Crear botón volver
  const backButton = document.createElement('button');
  backButton.textContent = '⬅ Volver';
  backButton.className = 'back-btn';
  backButton.onclick = () => history.back();

  menuView.appendChild(backButton);

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.width = '100%';

  const title = document.createElement('h2');
  title.textContent = categoria;
  title.style.textAlign = 'center';
  title.style.width = '100%';
  wrapper.appendChild(title);

  const grid = document.createElement('div');
  grid.style.display = 'flex';
  grid.style.flexWrap = 'wrap';
  grid.style.justifyContent = 'center';
  grid.style.gap = '10px';
  grid.style.width = '100%';

  const platos = allData.filter(p => p.categoria === categoria);
  platos.forEach(plato => {
    const btn = document.createElement('button');
    btn.className = 'dish-btn';
    btn.onclick = () => showDishDetails(plato);

    btn.innerHTML = `
      <div class="dish-img-container">
        <img src="${plato.imagen}" alt="${plato.nombre}" />
      </div>
      <div class="dish-info">
        <div class="dish-name">${plato.nombre}</div>
        <div class="dish-price">S/ ${plato.precio}</div>
      </div>
    `;
    grid.appendChild(btn);
  });

  wrapper.appendChild(grid);
  menuView.appendChild(wrapper);

  if (addToHistory && history.state?.category !== categoria) {
    history.pushState({ category: categoria }, '', `#${categoria}`);
  }
}

function handleHashOnLoad(hash) {
  if (!isDataLoaded) return;

  if (hash.startsWith('#detalle-')) {
    const nombre = decodeURIComponent(hash.replace('#detalle-', ''));
    const plato = allData.find(p => p.nombre === nombre);
    if (plato) {
      showDishDetails(plato);
    } else {
      showCategoryButtons(); // Si no lo encuentra, va al home
    }
  } else if (hash.startsWith('#')) {
    const categoria = decodeURIComponent(hash.replace('#', ''));
    const existe = allData.some(p => p.categoria === categoria);
    if (existe) {
      showPlatosDeCategoria(categoria, false);
    } else {
      showCategoryButtons();
    }
  } else {
    showCategoryButtons();
  }
}

function agregarAlCarrito(plato, cantidad) {
  const existente = carrito.find(item => item.nombre === plato.nombre);
  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({ ...plato, cantidad });
  }
  localStorage.setItem('carrito', JSON.stringify(carrito));
  updateCartCount();
}

function mostrarVistaCarrito() {
  // Si el estado actual no es carrito, empuja uno nuevo al historial
  if (history.state?.view !== 'carrito') {
    history.pushState({ view: 'carrito' }, '', '#carrito');
  }

  // Oculta todas las vistas
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Crear o mostrar vista carrito
  let cartView = document.getElementById('cartView');
  if (!cartView) {
    cartView = document.createElement('div');
    cartView.id = 'cartView';
    cartView.className = 'view';
    cartView.style.padding = '20px';
    cartView.style.maxWidth = '800px';
    cartView.style.margin = '0 auto';
    document.body.appendChild(cartView);
  }

  cartView.classList.add('active');
  document.getElementById('cartButton').style.display = 'none';
  cartView.innerHTML = ''; // ← Limpiar contenido previo

  // Botón volver
  const volverBtn = document.createElement('button');
  volverBtn.textContent = '⬅ Volver';
  volverBtn.className = 'back-btn';
  volverBtn.onclick = () => history.back();
  cartView.appendChild(volverBtn);

  const titulo = document.createElement('h2');
  titulo.textContent = 'Tu Carrito';
  cartView.appendChild(titulo);

  if (carrito.length === 0) {
    const vacio = document.createElement('p');
    vacio.textContent = 'Tu carrito está vacío.';
    cartView.appendChild(vacio);
    return;
  }

  const lista = document.createElement('ul');
  lista.style.listStyle = 'none';
  lista.style.padding = '0';

  carrito.forEach((item, index) => {
    const li = document.createElement('li');
    li.style.marginBottom = '15px';
    li.style.display = 'flex';
    li.style.alignItems = 'center';

    li.innerHTML = `
      <img src="${item.imagen}" alt="${item.nombre}" style="width:80px; height:80px; object-fit:cover; border-radius: 6px; margin-right: 15px;" />
      <div style="flex-grow:1;">
        <strong>${item.nombre}</strong><br>
        S/ ${item.precio} x 
        <input type="number" min="1" value="${item.cantidad}" style="width:50px;" data-index="${index}" class="qtyInput" />
      </div>
      <button data-index="${index}" class="removeBtn" style="background:#802434; color:white; border:none; border-radius:5px; padding:5px 10px; cursor:pointer;">Eliminar</button>
    `;
    lista.appendChild(li);
  });

  cartView.appendChild(lista);

  const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const totalDiv = document.createElement('div');
  totalDiv.style.marginTop = '20px';
  totalDiv.style.fontWeight = 'bold';
  totalDiv.textContent = `Total: S/ ${total.toFixed(2)}`;
  cartView.appendChild(totalDiv);

  const orderBtn = document.createElement('button');
  orderBtn.textContent = 'Hacer pedido por WhatsApp';
  orderBtn.style.marginTop = '15px';
  orderBtn.style.backgroundColor = '#25d366';
  orderBtn.style.color = 'white';
  orderBtn.style.border = 'none';
  orderBtn.style.padding = '10px 20px';
  orderBtn.style.borderRadius = '8px';
  orderBtn.style.cursor = 'pointer';
  orderBtn.onclick = () => enviarPedidoWhatsApp();

  cartView.appendChild(orderBtn);

  // Eventos de actualización de cantidad
  cartView.querySelectorAll('.qtyInput').forEach(input => {
    input.addEventListener('change', (e) => {
      const i = parseInt(e.target.getAttribute('data-index'));
      let val = parseInt(e.target.value);
      if (isNaN(val) || val < 1) {
        alert("Cantidad inválida");
        e.target.value = 1;
        return;
      }
      carrito[i].cantidad = val;
      localStorage.setItem('carrito', JSON.stringify(carrito));
      mostrarVistaCarrito();
      updateCartCount();
    });
  });

  // Evento para eliminar
  cartView.querySelectorAll('.removeBtn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const i = parseInt(e.target.getAttribute('data-index'));
      carrito.splice(i, 1);
      localStorage.setItem('carrito', JSON.stringify(carrito));
      mostrarVistaCarrito();
      updateCartCount();
    });
  });
  if (location.hash !== '#carrito') {
    history.pushState({ view: 'carrito' }, '', '#carrito');
  }
}


function enviarPedidoWhatsApp() {
  if (carrito.length === 0) {
    alert('Tu carrito está vacío');
    return;
  }

  const numeroWhatsApp = '51922391112'; // Cambia este número si es necesario
  let mensaje = 'Hola, quiero hacer el siguiente pedido:%0A';

  carrito.forEach(item => {
    mensaje += `- ${item.nombre} x${item.cantidad} (S/ ${item.precio * item.cantidad})%0A`;
  });

  const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  mensaje += `%0ATotal: S/ ${total.toFixed(2)}`;

  const url = `https://wa.me/${numeroWhatsApp}?text=${mensaje}`;
  window.open(url, '_blank');

  // Vaciar carrito después de abrir WhatsApp
  carrito = [];
  localStorage.removeItem('carrito');
  updateCartCount();
  mostrarVistaCarrito();
}

window.addEventListener('popstate', (event) => {
  if (!isDataLoaded) return;

  const hash = location.hash;
  if (hash === '#carrito') {
    mostrarVistaCarrito();
  } else {
    document.getElementById('cartButton').style.display = 'flex';
    handleHashOnLoad(hash);
  }
});
