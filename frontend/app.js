document.addEventListener('DOMContentLoaded', () => {
    // ===== DOM Elements =====
    const btnLoginModal = document.getElementById('btn-login-modal');
    const btnRegisterModal = document.getElementById('btn-register-modal');
    const btnUploadModal = document.getElementById('btn-upload-modal');
    const btnLogout = document.getElementById('btn-logout');
    const btnSearchMobile = document.getElementById('btn-search-mobile');
    const closeSearchMobile = document.getElementById('close-search-mobile');
    
    const authModal = document.getElementById('auth-modal');
    const uploadModal = document.getElementById('upload-modal');
    const mobileSearch = document.getElementById('mobile-search');
    
    const closeAuthBtn = document.querySelector('.close-btn');
    const closeUploadBtn = document.querySelector('.close-upload-btn');
    
    const authForm = document.getElementById('auth-form');
    const uploadForm = document.getElementById('upload-form');
    const authToggleBtn = document.getElementById('auth-toggle-btn');
    
    const feed = document.getElementById('feed');
    const emailInput = document.getElementById('email');
    const emailGroup = document.getElementById('email-group');
    const authTitle = document.getElementById('auth-title');
    const authError = document.getElementById('auth-error');
    const authSubmitText = document.getElementById('auth-submit-text');
    const authToggleText = document.getElementById('auth-toggle-text');
    
    const searchInput = document.getElementById('search-input');
    const searchInputMobile = document.getElementById('search-input-mobile');
    const imgFileInput = document.getElementById('img-file');
    const fileName = document.getElementById('file-name');
    
    const loading = document.getElementById('loading');
    const noResults = document.getElementById('no-results');
    const userMenu = document.querySelector('.user-menu');
    
    let isLoginMode = true;
    let allImages = [];
    let filteredImages = [];

    // ===== Auth State Management =====
    function updateNav() {
        const token = localStorage.getItem('token');
        if (token) {
            btnLoginModal.classList.add('hidden');
            btnRegisterModal.classList.add('hidden');
            btnUploadModal.classList.remove('hidden');
            userMenu.classList.remove('hidden');
        } else {
            btnLoginModal.classList.remove('hidden');
            btnRegisterModal.classList.remove('hidden');
            btnUploadModal.classList.add('hidden');
            userMenu.classList.add('hidden');
        }
    }

    // ===== Modal Toggle Functions =====
    function openLoginModal() {
        isLoginMode = true;
        authTitle.innerText = 'Ingresar';
        authSubmitText.innerText = 'Ingresar';
        authToggleText.innerText = '¿No tienes cuenta?';
        authToggleBtn.innerText = 'Registrarse';
        emailGroup.style.display = 'none';
        emailInput.removeAttribute('required');
        authForm.reset();
        authError.innerText = '';
        authModal.classList.remove('hidden');
    }

    function openRegisterModal() {
        isLoginMode = false;
        authTitle.innerText = 'Registrarse';
        authSubmitText.innerText = 'Crear Cuenta';
        authToggleText.innerText = '¿Ya tienes cuenta?';
        authToggleBtn.innerText = 'Ingresar';
        emailGroup.style.display = 'flex';
        emailInput.setAttribute('required', 'true');
        authForm.reset();
        authError.innerText = '';
        authModal.classList.remove('hidden');
    }

    function closeModal(modal) {
        modal.classList.add('hidden');
    }

    // ===== Event Listeners =====
    btnLoginModal.addEventListener('click', openLoginModal);
    btnRegisterModal.addEventListener('click', openRegisterModal);
    
    closeAuthBtn.addEventListener('click', () => closeModal(authModal));
    authToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isLoginMode) {
            openRegisterModal();
        } else {
            openLoginModal();
        }
    });
    
    btnUploadModal.addEventListener('click', () => {
        uploadForm.reset();
        fileName.innerText = 'Selecciona una imagen';
        document.getElementById('upload-error').innerText = '';
        uploadModal.classList.remove('hidden');
    });
    
    closeUploadBtn.addEventListener('click', () => closeModal(uploadModal));

    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('token');
        updateNav();
        loadFeed();
    });

    // Mobile Search
    btnSearchMobile.addEventListener('click', () => {
        mobileSearch.classList.remove('hidden');
        searchInputMobile.focus();
    });

    closeSearchMobile.addEventListener('click', () => {
        mobileSearch.classList.add('hidden');
    });

    // ===== Auth Form Submit =====
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            authError.innerText = 'Por favor completa todos los campos';
            return;
        }
        
        try {
            if (isLoginMode) {
                // Login
                const formData = new URLSearchParams();
                formData.append('username', username);
                formData.append('password', password);

                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData
                });
                
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Usuario o contraseña incorrectos');
                }
                
                const data = await res.json();
                localStorage.setItem('token', data.access_token);
                authError.innerHTML = '<span style="color: var(--success-color);">✓ Ingreso exitoso</span>';
                
                setTimeout(() => {
                    closeModal(authModal);
                    updateNav();
                    loadFeed();
                }, 500);
            } else {
                // Register
                const email = document.getElementById('email').value.trim();
                
                if (!email || !email.includes('@')) {
                    authError.innerText = 'Por favor ingresa un correo válido';
                    return;
                }
                
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'El usuario o correo ya existe');
                }
                
                // Auto login after register
                const formData = new URLSearchParams();
                formData.append('username', username);
                formData.append('password', password);
                const loginRes = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData
                });
                
                const data = await loginRes.json();
                localStorage.setItem('token', data.access_token);
                authError.innerHTML = '<span style="color: var(--success-color);">✓ Registro exitoso</span>';
                
                setTimeout(() => {
                    closeModal(authModal);
                    updateNav();
                    loadFeed();
                }, 500);
            }
        } catch (err) {
            authError.innerText = err.message;
        }
    });

    // ===== File Input Handler =====
    imgFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileName.innerText = e.target.files[0].name;
        }
    });

    // ===== Upload Form Submit =====
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('img-title').value.trim();
        const desc = document.getElementById('img-desc').value.trim();
        const file = imgFileInput.files[0];
        
        if (!title || !file) {
            document.getElementById('upload-error').innerText = 'Por favor completa todos los campos';
            return;
        }
        
        const formData = new FormData();
        formData.append('title', title);
        if (desc) formData.append('description', desc);
        formData.append('file', file);
        
        const token = localStorage.getItem('token');
        
        try {
            const res = await fetch('/api/images/', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            if (!res.ok) throw new Error('Error al subir la imagen');
            
            document.getElementById('upload-error').innerHTML = '<span style="color: var(--success-color);">✓ Imagen subida exitosamente</span>';
            
            setTimeout(() => {
                closeModal(uploadModal);
                uploadForm.reset();
                fileName.innerText = 'Selecciona una imagen';
                loadFeed();
            }, 800);
        } catch (err) {
            document.getElementById('upload-error').innerText = err.message;
        }
    });

    // ===== Search Function =====
    function filterImages(query) {
        const q = query.toLowerCase();
        filteredImages = allImages.filter(img => 
            img.title.toLowerCase().includes(q) || 
            (img.description && img.description.toLowerCase().includes(q))
        );
        renderFeed(filteredImages);
    }

    searchInput.addEventListener('input', (e) => filterImages(e.target.value));
    searchInputMobile.addEventListener('input', (e) => filterImages(e.target.value));

    // ===== Render Feed Function =====
    function renderFeed(images) {
        feed.innerHTML = '';
        
        if (images.length === 0) {
            noResults.classList.remove('hidden');
            loading.classList.add('hidden');
            return;
        }
        
        noResults.classList.add('hidden');
        
        images.forEach(img => {
            const card = document.createElement('div');
            card.className = 'card';
            
            const desc = img.description ? `<p class="card-description">${img.description}</p>` : '';
            
            card.innerHTML = `
                <img src="/uploads/${img.filename}" alt="${img.title}" loading="lazy">
                <div class="card-overlay">
                    <div>
                        <h3 class="card-title">${img.title}</h3>
                        ${desc}
                    </div>
                    <div class="card-actions">
                        <a href="/api/images/${img.id}/download" class="card-action-btn" title="Descargar" download>
                            <i class="fas fa-download"></i>
                        </a>
                        <button class="card-action-btn" title="Más opciones">
                            <i class="fas fa-share-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            
            feed.appendChild(card);
        });
    }

    // ===== Load Feed Function =====
    async function loadFeed() {
        try {
            loading.classList.remove('hidden');
            noResults.classList.add('hidden');
            feed.innerHTML = '';
            
            const res = await fetch('/api/images/');
            if (!res.ok) throw new Error('Error al cargar las imágenes');
            
            allImages = await res.json();
            filteredImages = allImages;
            
            loading.classList.add('hidden');
            renderFeed(filteredImages);
        } catch (err) {
            console.error('Error loading feed:', err);
            loading.classList.add('hidden');
            noResults.classList.remove('hidden');
        }
    }

    // ===== Click Outside Modal to Close =====
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) closeModal(authModal);
    });
    
    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) closeModal(uploadModal);
    });

    // ===== Keyboard Shortcuts =====
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal(authModal);
            closeModal(uploadModal);
        }
    });

    // ===== Initialize App =====
    updateNav();
    loadFeed();
});
