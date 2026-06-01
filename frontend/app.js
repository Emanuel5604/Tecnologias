document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // STATE
    // =========================================================
    let currentUsername = null;
    let activeProfileUsername = null;
    let isLoginMode = true;
    let allImages = [];           // full feed array for lightbox nav
    let lightboxIndex = 0;        // current lightbox position
    let searchDebounceTimer = null;

    // =========================================================
    // DOM REFS
    // =========================================================
    const feed            = document.getElementById('feed');
    const loading         = document.getElementById('loading');
    const noResults       = document.getElementById('no-results');
    const profileHeader   = document.getElementById('profile-header');
    const searchResults   = document.getElementById('search-results');
    const heroSection     = document.getElementById('hero-section');
    const toastContainer  = document.getElementById('toast-container');
    const userMenu        = document.querySelector('.user-menu');
    const btnLoginModal   = document.getElementById('btn-login-modal');
    const btnRegisterModal= document.getElementById('btn-register-modal');
    const btnUploadModal  = document.getElementById('btn-upload-modal');
    const btnLogout       = document.getElementById('btn-logout');
    const btnUserProfile  = document.getElementById('btn-user-profile');
    const logoHome        = document.getElementById('logo-home');
    const userAvatarInit  = document.getElementById('user-avatar-initials');

    // Search
    const searchInput       = document.getElementById('search-input');
    const searchInputMobile = document.getElementById('search-input-mobile');
    const searchSpinner     = document.getElementById('search-spinner');
    const btnSearchMobile   = document.getElementById('btn-search-mobile');
    const closeSearchMobile = document.getElementById('close-search-mobile');
    const mobileSearch      = document.getElementById('mobile-search');

    // Auth modal
    const authModal       = document.getElementById('auth-modal');
    const authForm        = document.getElementById('auth-form');
    const authTitle       = document.getElementById('auth-title');
    const authSubtitle    = document.getElementById('auth-subtitle');
    const authError       = document.getElementById('auth-error');
    const authSubmitText  = document.getElementById('auth-submit-text');
    const authSubmitBtn   = document.getElementById('auth-submit-btn');
    const authToggleText  = document.getElementById('auth-toggle-text');
    const authToggleBtn   = document.getElementById('auth-toggle-btn');
    const emailGroup      = document.getElementById('email-group');
    const emailInput      = document.getElementById('email');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const eyeIcon           = document.getElementById('eye-icon');
    const passwordInput     = document.getElementById('password');

    // Upload modal
    const uploadModal       = document.getElementById('upload-modal');
    const uploadForm        = document.getElementById('upload-form');
    const uploadError       = document.getElementById('upload-error');
    const dropZone          = document.getElementById('drop-zone');
    const dropZoneContent   = document.getElementById('drop-zone-content');
    const imgFileInput      = document.getElementById('img-file');
    const imgPreviewContainer = document.getElementById('img-preview-container');
    const imgPreview        = document.getElementById('img-preview');
    const removePreview     = document.getElementById('remove-preview');
    const previewMeta       = document.getElementById('preview-meta');
    const uploadSubmitBtn   = document.getElementById('upload-submit-btn');

    // Lightbox
    const lightbox           = document.getElementById('lightbox');
    const lightboxClose      = document.getElementById('lightbox-close');
    const lightboxPrev       = document.getElementById('lightbox-prev');
    const lightboxNext       = document.getElementById('lightbox-next');
    const lightboxBackdrop   = document.getElementById('lightbox-backdrop');
    const lightboxImg        = document.getElementById('lightbox-img');
    const lightboxImgLoading = document.getElementById('lightbox-img-loading');
    const lightboxTitle      = document.getElementById('lightbox-title');
    const lightboxDesc       = document.getElementById('lightbox-desc');
    const lightboxUserBtn    = document.getElementById('lightbox-user-btn');
    const lightboxAvatar     = document.getElementById('lightbox-avatar');
    const lightboxUsername   = document.getElementById('lightbox-username');
    const lightboxDate       = document.getElementById('lightbox-date');
    const lightboxDownloadBtn= document.getElementById('lightbox-download-btn');
    const lightboxDeleteBtn  = document.getElementById('lightbox-delete-btn');
    const lightboxCounter    = document.getElementById('lightbox-counter');

    // Confirm modal
    const confirmModal    = document.getElementById('confirm-modal');
    const confirmTitle    = document.getElementById('confirm-title');
    const confirmMessage  = document.getElementById('confirm-message');
    const confirmOkBtn    = document.getElementById('confirm-ok-btn');
    const confirmCancelBtn= document.getElementById('confirm-cancel-btn');

    // Edit profile modal
    const editProfileModal = document.getElementById('edit-profile-modal');
    const editProfileForm  = document.getElementById('edit-profile-form');
    const editProfileError = document.getElementById('edit-profile-error');
    const profileBioInput  = document.getElementById('profile-bio');
    const bioCount         = document.getElementById('bio-count');

    // Stats
    const statPhotos = document.getElementById('stat-photos');
    const statUsers  = document.getElementById('stat-users');


    // =========================================================
    // TOAST NOTIFICATIONS
    // =========================================================
    function showToast(message, type = 'info', duration = 3500) {
        const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon"></i>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-out');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        }, duration);
    }


    // =========================================================
    // CONFIRM DIALOG
    // =========================================================
    function showConfirm(title, message) {
        return new Promise((resolve) => {
            confirmTitle.textContent = title;
            confirmMessage.textContent = message;
            confirmModal.classList.remove('hidden');
            const cleanup = (result) => {
                confirmModal.classList.add('hidden');
                confirmOkBtn.replaceWith(confirmOkBtn.cloneNode(true));
                confirmCancelBtn.replaceWith(confirmCancelBtn.cloneNode(true));
                resolve(result);
            };
            document.getElementById('confirm-ok-btn').addEventListener('click', () => cleanup(true), { once: true });
            document.getElementById('confirm-cancel-btn').addEventListener('click', () => cleanup(false), { once: true });
        });
    }


    // =========================================================
    // AUTH HELPERS
    // =========================================================
    function getToken() { return localStorage.getItem('token'); }

    function authHeaders() {
        const t = getToken();
        return t ? { Authorization: `Bearer ${t}` } : {};
    }

    async function loadCurrentUser() {
        const token = getToken();
        if (!token) { currentUsername = null; return; }
        try {
            const res = await fetch('/api/users/me', { headers: authHeaders() });
            if (!res.ok) { localStorage.removeItem('token'); currentUsername = null; return; }
            const data = await res.json();
            currentUsername = data.username;
        } catch {
            currentUsername = null;
        }
    }

    function updateNav() {
        const logged = !!getToken();
        btnLoginModal.classList.toggle('hidden', logged);
        btnRegisterModal.classList.toggle('hidden', logged);
        btnUploadModal.classList.toggle('hidden', !logged);
        userMenu.classList.toggle('hidden', !logged);
        if (logged && currentUsername) {
            userAvatarInit.textContent = currentUsername[0].toUpperCase();
        }
    }

    function avatarInitials(username) {
        return username ? username[0].toUpperCase() : '?';
    }


    // =========================================================
    // MODAL HELPERS
    // =========================================================
    function openModal(modal) { modal.classList.remove('hidden'); }
    function closeModal(modal) { modal.classList.add('hidden'); }

    // Generic close buttons [data-close]
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.close);
            if (target) closeModal(target);
        });
    });


    // =========================================================
    // AUTH MODAL
    // =========================================================
    function openLoginModal() {
        isLoginMode = true;
        authTitle.textContent = 'Bienvenido';
        authSubtitle.textContent = 'Ingresa a tu cuenta';
        authSubmitText.textContent = 'Ingresar';
        authToggleText.textContent = '¿No tienes cuenta?';
        authToggleBtn.textContent = 'Registrarse';
        emailGroup.classList.add('hidden');
        emailInput.removeAttribute('required');
        authForm.reset();
        hideError(authError);
        openModal(authModal);
    }

    function openRegisterModal() {
        isLoginMode = false;
        authTitle.textContent = 'Crea tu cuenta';
        authSubtitle.textContent = 'Es gratis y rápido';
        authSubmitText.textContent = 'Registrarse';
        authToggleText.textContent = '¿Ya tienes cuenta?';
        authToggleBtn.textContent = 'Ingresar';
        emailGroup.classList.remove('hidden');
        emailInput.setAttribute('required', 'true');
        authForm.reset();
        hideError(authError);
        openModal(authModal);
    }

    btnLoginModal.addEventListener('click', openLoginModal);
    btnRegisterModal.addEventListener('click', openRegisterModal);
    authToggleBtn.addEventListener('click', () => isLoginMode ? openRegisterModal() : openLoginModal());

    authModal.addEventListener('click', e => { if (e.target === authModal) closeModal(authModal); });

    // Toggle password visibility
    togglePasswordBtn.addEventListener('click', () => {
        const show = passwordInput.type === 'password';
        passwordInput.type = show ? 'text' : 'password';
        eyeIcon.className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = passwordInput.value;
        hideError(authError);
        authSubmitBtn.disabled = true;
        authSubmitText.textContent = 'Un momento...';

        try {
            if (isLoginMode) {
                const form = new URLSearchParams({ username, password });
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: form
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Usuario o contraseña incorrectos');
                }
                const data = await res.json();
                localStorage.setItem('token', data.access_token);
                await loadCurrentUser();
                updateNav();
                closeModal(authModal);
                showToast('¡Bienvenido de vuelta!', 'success');
                loadFeed();
            } else {
                const email = emailInput.value.trim();
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Error al registrarse');
                }
                // Auto-login after register
                const form = new URLSearchParams({ username, password });
                const loginRes = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: form
                });
                const data = await loginRes.json();
                localStorage.setItem('token', data.access_token);
                await loadCurrentUser();
                updateNav();
                closeModal(authModal);
                showToast('¡Cuenta creada exitosamente!', 'success');
                loadFeed();
                loadStats();
            }
        } catch (err) {
            showError(authError, err.message);
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitText.textContent = isLoginMode ? 'Ingresar' : 'Registrarse';
        }
    });

    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('token');
        currentUsername = null;
        updateNav();
        loadFeed();
        showToast('Sesión cerrada', 'info');
    });


    // =========================================================
    // UPLOAD MODAL - DRAG & DROP
    // =========================================================
    btnUploadModal.addEventListener('click', () => {
        uploadForm.reset();
        clearPreview();
        hideError(uploadError);
        openModal(uploadModal);
    });

    uploadModal.addEventListener('click', e => { if (e.target === uploadModal) closeModal(uploadModal); });

    function clearPreview() {
        imgPreview.src = '';
        imgPreviewContainer.classList.add('hidden');
        dropZoneContent.classList.remove('hidden');
        previewMeta.textContent = '';
        imgFileInput.value = '';
    }

    removePreview.addEventListener('click', (e) => {
        e.stopPropagation();
        clearPreview();
    });

    function handleFileSelect(file) {
        if (!file || !file.type.startsWith('image/')) {
            showToast('Por favor selecciona un archivo de imagen válido', 'error');
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            showToast('La imagen no puede superar 15MB', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            imgPreview.src = e.target.result;
            imgPreviewContainer.classList.remove('hidden');
            dropZoneContent.classList.add('hidden');
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            previewMeta.textContent = `${file.name} · ${sizeMB}MB`;
        };
        reader.readAsDataURL(file);
        const dt = new DataTransfer();
        dt.items.add(file);
        imgFileInput.files = dt.files;
    }

    // File input change
    imgFileInput.addEventListener('change', e => {
        if (e.target.files[0]) handleFileSelect(e.target.files[0]);
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(ev =>
        dropZone.addEventListener(ev, e => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        })
    );
    ['dragleave', 'drop'].forEach(ev =>
        dropZone.addEventListener(ev, e => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        })
    );
    dropZone.addEventListener('drop', e => {
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    });

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('img-title').value.trim();
        const desc  = document.getElementById('img-desc').value.trim();
        const file  = imgFileInput.files[0];

        if (!file) { showError(uploadError, 'Por favor selecciona una imagen'); return; }
        if (!title) { showError(uploadError, 'El título es obligatorio'); return; }

        const formData = new FormData();
        formData.append('title', title);
        if (desc) formData.append('description', desc);
        formData.append('file', file);

        uploadSubmitBtn.disabled = true;
        uploadSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
        hideError(uploadError);

        try {
            const res = await fetch('/api/images/', {
                method: 'POST',
                headers: authHeaders(),
                body: formData
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Error al subir la imagen');
            }
            closeModal(uploadModal);
            showToast('¡Foto publicada!', 'success');
            if (activeProfileUsername === currentUsername) {
                await loadUserGallery(currentUsername);
            } else {
                await loadFeed();
            }
            loadStats();
        } catch (err) {
            showError(uploadError, err.message);
        } finally {
            uploadSubmitBtn.disabled = false;
            uploadSubmitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> <span>Publicar foto</span>';
        }
    });


    // =========================================================
    // PROFILE: view, edit
    // =========================================================
    btnUserProfile.addEventListener('click', async () => {
        await loadCurrentUser();
        if (!currentUsername) { openLoginModal(); return; }
        loadUserGallery(currentUsername);
    });

    logoHome.addEventListener('click', () => {
        searchInput.value = '';
        searchInputMobile.value = '';
        loadFeed();
    });

    // Bio character counter
    profileBioInput.addEventListener('input', () => {
        bioCount.textContent = profileBioInput.value.length;
    });

    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bio = profileBioInput.value.trim();
        hideError(editProfileError);
        try {
            const res = await fetch('/api/users/me', {
                method: 'PATCH',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ bio })
            });
            if (!res.ok) throw new Error('No se pudo actualizar el perfil');
            closeModal(editProfileModal);
            showToast('Perfil actualizado', 'success');
            await loadUserGallery(currentUsername);
        } catch (err) {
            showError(editProfileError, err.message);
        }
    });


    // =========================================================
    // SEARCH
    // =========================================================
    function debounce(fn, delay) {
        return (...args) => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => fn(...args), delay);
        };
    }

    const debouncedSearch = debounce(async (query) => {
        const q = query.trim();
        if (!q) { loadFeed(); return; }
        await searchUsers(q);
    }, 400);

    searchInput.addEventListener('input', e => debouncedSearch(e.target.value));
    searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            clearTimeout(searchDebounceTimer);
            searchUsers(searchInput.value.trim());
        }
    });

    searchInputMobile.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            mobileSearch.classList.add('hidden');
            searchUsers(searchInputMobile.value.trim());
        }
    });

    btnSearchMobile.addEventListener('click', () => {
        mobileSearch.classList.remove('hidden');
        searchInputMobile.focus();
    });
    closeSearchMobile.addEventListener('click', () => mobileSearch.classList.add('hidden'));

    async function searchUsers(q) {
        if (!q) { loadFeed(); return; }
        setActiveView('search');
        searchSpinner.classList.remove('hidden');
        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
            if (!res.ok) throw new Error('Error al buscar');
            const users = await res.json();
            renderSearchResults(users, q);
        } catch {
            renderSearchError();
        } finally {
            searchSpinner.classList.add('hidden');
        }
    }

    function renderSearchResults(users, q) {
        searchResults.innerHTML = '';
        feed.innerHTML = '';
        profileHeader.classList.add('hidden');
        loading.classList.add('hidden');

        if (users.length === 0) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon"><i class="fas fa-user-slash"></i></div>
                    <p>No se encontró "${q}"</p>
                    <span>Intenta con otro nombre de usuario</span>
                </div>`;
            searchResults.classList.remove('hidden');
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'search-grid';
        users.forEach(user => {
            const card = document.createElement('button');
            card.className = 'search-card';
            card.type = 'button';
            card.innerHTML = `
                <div class="search-card-avatar">${avatarInitials(user.username)}</div>
                <div class="search-card-info">
                    <h3>${escapeHtml(user.username)}</h3>
                    <p>${user.image_count} foto${user.image_count !== 1 ? 's' : ''}${user.bio ? ' · ' + escapeHtml(user.bio.substring(0, 40)) : ''}</p>
                </div>
                <i class="fas fa-chevron-right"></i>
            `;
            card.addEventListener('click', () => loadUserGallery(user.username));
            grid.appendChild(card);
        });
        searchResults.appendChild(grid);
        searchResults.classList.remove('hidden');
    }

    function renderSearchError() {
        searchResults.innerHTML = `
            <div class="no-results">
                <div class="no-results-icon"><i class="fas fa-exclamation-circle"></i></div>
                <p>Error al buscar usuarios</p>
            </div>`;
        searchResults.classList.remove('hidden');
    }


    // =========================================================
    // GALLERY / PROFILE
    // =========================================================
    async function loadUserGallery(username) {
        activeProfileUsername = username;
        setActiveView('profile');
        showLoading(true);

        try {
            const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
            if (!res.ok) throw new Error('Usuario no encontrado');
            const data = await res.json();
            showLoading(false);
            renderProfileHeader(data.user, data.images.length, username === currentUsername);
            allImages = data.images;
            renderFeed(allImages);
        } catch (err) {
            showLoading(false);
            activeProfileUsername = null;
            feed.innerHTML = '';
            noResults.querySelector('p').textContent = err.message;
            noResults.classList.remove('hidden');
        }
    }

    function renderProfileHeader(user, imageCount, isOwn) {
        const memberDate = user.created_at
            ? new Date(user.created_at).toLocaleDateString('es', { month: 'long', year: 'numeric' })
            : '';
        const editBtn = isOwn
            ? `<button class="btn btn-secondary" id="btn-edit-profile">
                   <i class="fas fa-user-edit"></i> <span class="hidden-mobile">Editar bio</span>
               </button>`
            : '';

        profileHeader.innerHTML = `
            <div class="profile-card">
                <div class="profile-card-left">
                    <div class="profile-big-avatar">${avatarInitials(user.username)}</div>
                    <div class="profile-card-info">
                        <span class="profile-label">${isOwn ? 'Mi perfil' : 'Perfil'}</span>
                        <h2>${escapeHtml(user.username)}</h2>
                        ${user.bio ? `<p class="profile-bio-text">${escapeHtml(user.bio)}</p>` : ''}
                        <div class="profile-meta">
                            <span><i class="fas fa-images"></i> ${imageCount} foto${imageCount !== 1 ? 's' : ''}</span>
                            ${memberDate ? `<span><i class="fas fa-calendar-alt"></i> Desde ${memberDate}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="profile-card-actions">
                    ${editBtn}
                    <button class="btn btn-ghost" id="btn-back-home">
                        <i class="fas fa-arrow-left"></i> <span class="hidden-mobile">Volver</span>
                    </button>
                </div>
            </div>
        `;
        profileHeader.classList.remove('hidden');

        document.getElementById('btn-back-home').addEventListener('click', () => {
            searchInput.value = '';
            searchInputMobile.value = '';
            loadFeed();
        });

        if (isOwn) {
            document.getElementById('btn-edit-profile').addEventListener('click', () => {
                profileBioInput.value = user.bio || '';
                bioCount.textContent = profileBioInput.value.length;
                hideError(editProfileError);
                openModal(editProfileModal);
            });
        }
    }


    // =========================================================
    // FEED
    // =========================================================
    function shuffleArray(arr) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    async function loadFeed() {
        activeProfileUsername = null;
        setActiveView('feed');
        showLoading(true);
        feed.innerHTML = '';

        try {
            const res = await fetch('/api/images/?limit=100');
            if (!res.ok) throw new Error('Error al cargar imágenes');
            const images = await res.json();
            allImages = shuffleArray(images).slice(0, 30);
            showLoading(false);
            renderFeed(allImages);
        } catch {
            showLoading(false);
            noResults.classList.remove('hidden');
        }
    }

    function renderFeed(images) {
        feed.innerHTML = '';
        noResults.classList.add('hidden');

        if (images.length === 0) {
            noResults.classList.remove('hidden');
            return;
        }

        const token = getToken();
        images.forEach((img, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            const isOwner = img.owner?.username === currentUsername && activeProfileUsername === currentUsername;

            card.innerHTML = `
                <img src="/uploads/${escapeHtml(img.filename)}" alt="${escapeHtml(img.title)}" loading="lazy">
                <div class="card-overlay">
                    <div class="card-info">
                        <h3 class="card-title">${escapeHtml(img.title)}</h3>
                        ${img.description ? `<p class="card-description">${escapeHtml(img.description)}</p>` : ''}
                        <p class="card-author" data-author="${escapeHtml(img.owner?.username || '')}">
                            <i class="fas fa-user-circle"></i> ${escapeHtml(img.owner?.username || '')}
                        </p>
                    </div>
                    <div class="card-actions">
                        ${token
                            ? `<button class="card-action-btn" title="Descargar" data-download-id="${img.id}"><i class="fas fa-download"></i></button>`
                            : `<button class="card-action-btn" title="Inicia sesión para descargar" data-needs-login><i class="fas fa-download"></i></button>`
                        }
                        ${isOwner
                            ? `<button class="card-action-btn btn-danger-sm" title="Eliminar imagen" data-delete-id="${img.id}"><i class="fas fa-trash"></i></button>`
                            : ''
                        }
                    </div>
                </div>
            `;

            // Open lightbox on image click
            card.querySelector('img').addEventListener('click', () => openLightbox(index));
            card.querySelector('.card-title').addEventListener('click', () => openLightbox(index));

            // Author button → go to profile
            card.querySelector('.card-author').addEventListener('click', (e) => {
                e.stopPropagation();
                const author = e.currentTarget.dataset.author;
                if (author) loadUserGallery(author);
            });

            feed.appendChild(card);
        });

        // Attach action listeners after all cards are rendered
        feed.querySelectorAll('[data-download-id]').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); downloadImage(btn.dataset.downloadId); });
        });
        feed.querySelectorAll('[data-needs-login]').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); openLoginModal(); });
        });
        feed.querySelectorAll('[data-delete-id]').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); deleteImage(btn.dataset.deleteId); });
        });
    }


    // =========================================================
    // LIGHTBOX
    // =========================================================
    function openLightbox(index) {
        if (!allImages.length) return;
        lightboxIndex = index;
        lightbox.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        renderLightboxImage();
        updateLightboxNav();
    }

    function closeLightbox() {
        lightbox.classList.add('hidden');
        document.body.style.overflow = '';
        lightboxImg.src = '';
    }

    function renderLightboxImage() {
        const img = allImages[lightboxIndex];
        if (!img) return;

        // Show loading
        lightboxImg.style.opacity = '0';
        lightboxImgLoading.classList.remove('hidden');

        lightboxImg.onload = () => {
            lightboxImgLoading.classList.add('hidden');
            lightboxImg.style.opacity = '1';
        };
        lightboxImg.onerror = () => {
            lightboxImgLoading.classList.add('hidden');
            lightboxImg.style.opacity = '1';
        };

        lightboxImg.src = `/uploads/${img.filename}`;
        lightboxImg.alt = img.title;
        lightboxTitle.textContent = img.title;
        lightboxDesc.textContent = img.description || '';
        lightboxDesc.style.display = img.description ? '' : 'none';

        const username = img.owner?.username || '';
        lightboxAvatar.textContent = avatarInitials(username);
        lightboxUsername.textContent = username;
        lightboxDate.innerHTML = `<i class="fas fa-calendar-alt"></i> ${formatDate(img.created_at)}`;

        lightboxUserBtn.onclick = () => {
            closeLightbox();
            loadUserGallery(username);
        };

        // Download button
        lightboxDownloadBtn.onclick = () => downloadImage(img.id);

        // Delete button - only for owner when viewing own profile
        const isOwner = username === currentUsername && activeProfileUsername === currentUsername;
        lightboxDeleteBtn.classList.toggle('hidden', !isOwner);
        if (isOwner) {
            lightboxDeleteBtn.onclick = () => { closeLightbox(); deleteImage(img.id); };
        }

        lightboxCounter.textContent = allImages.length > 1
            ? `${lightboxIndex + 1} / ${allImages.length}`
            : '';
    }

    function updateLightboxNav() {
        const hasMultiple = allImages.length > 1;
        lightboxPrev.classList.toggle('hidden', !hasMultiple);
        lightboxNext.classList.toggle('hidden', !hasMultiple);
    }

    lightboxClose.addEventListener('click', closeLightbox);
    lightboxBackdrop.addEventListener('click', closeLightbox);

    lightboxPrev.addEventListener('click', () => {
        lightboxIndex = (lightboxIndex - 1 + allImages.length) % allImages.length;
        renderLightboxImage();
    });
    lightboxNext.addEventListener('click', () => {
        lightboxIndex = (lightboxIndex + 1) % allImages.length;
        renderLightboxImage();
    });

    // Keyboard navigation
    document.addEventListener('keydown', e => {
        if (!lightbox.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft')  { lightboxIndex = (lightboxIndex - 1 + allImages.length) % allImages.length; renderLightboxImage(); }
            if (e.key === 'ArrowRight') { lightboxIndex = (lightboxIndex + 1) % allImages.length; renderLightboxImage(); }
            if (e.key === 'Escape')     { closeLightbox(); }
        } else {
            if (e.key === 'Escape') {
                closeModal(authModal);
                closeModal(uploadModal);
                closeModal(editProfileModal);
                closeModal(confirmModal);
            }
        }
    });

    // Touch/swipe support for lightbox
    let touchStartX = 0;
    lightbox.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; });
    lightbox.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 50 && allImages.length > 1) {
            if (dx < 0) lightboxIndex = (lightboxIndex + 1) % allImages.length;
            else        lightboxIndex = (lightboxIndex - 1 + allImages.length) % allImages.length;
            renderLightboxImage();
        }
    });


    // =========================================================
    // IMAGE ACTIONS
    // =========================================================
    async function downloadImage(imageId) {
        const token = getToken();
        if (!token) { openLoginModal(); return; }
        try {
            const res = await fetch(`/api/images/${imageId}/download`, { headers: authHeaders() });
            if (!res.ok) {
                if (res.status === 401) { openLoginModal(); return; }
                throw new Error('No se pudo descargar la imagen');
            }
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url;
            a.download = `imagen-${imageId}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Descarga iniciada', 'success');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async function deleteImage(imageId) {
        const confirmed = await showConfirm(
            '¿Eliminar imagen?',
            'Esta acción no se puede deshacer.'
        );
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/images/${imageId}`, {
                method: 'DELETE',
                headers: authHeaders()
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'No se pudo eliminar la imagen');
            }
            showToast('Imagen eliminada', 'success');
            if (activeProfileUsername === currentUsername) {
                await loadUserGallery(currentUsername);
            } else {
                await loadFeed();
            }
            loadStats();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }


    // =========================================================
    // STATS
    // =========================================================
    async function loadStats() {
        try {
            const res = await fetch('/api/stats');
            if (!res.ok) return;
            const data = await res.json();
            animateNumber(statPhotos, data.total_images);
            animateNumber(statUsers,  data.total_users);
        } catch { /* silently fail */ }
    }

    function animateNumber(el, target) {
        const start = parseInt(el.textContent) || 0;
        const duration = 600;
        const step = (timestamp) => {
            if (!start_time) start_time = timestamp;
            const progress = Math.min((timestamp - start_time) / duration, 1);
            el.textContent = Math.floor(start + (target - start) * easeOut(progress));
            if (progress < 1) requestAnimationFrame(step);
        };
        let start_time = null;
        requestAnimationFrame(step);
    }

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }


    // =========================================================
    // VIEW MANAGEMENT
    // =========================================================
    function setActiveView(mode) {
        // mode: 'feed' | 'profile' | 'search'
        profileHeader.classList.add('hidden');
        searchResults.classList.add('hidden');
        noResults.classList.add('hidden');
        feed.innerHTML = '';
        heroSection.classList.toggle('hidden', mode !== 'feed');
    }

    function showLoading(show) {
        loading.classList.toggle('hidden', !show);
    }


    // =========================================================
    // HELPERS
    // =========================================================
    function showError(el, msg) {
        el.textContent = msg;
        el.classList.remove('hidden');
    }

    function hideError(el) {
        el.textContent = '';
        el.classList.add('hidden');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function formatDate(isoString) {
        if (!isoString) return '';
        return new Date(isoString).toLocaleDateString('es', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    }


    // =========================================================
    // INIT
    // =========================================================
    async function init() {
        await loadCurrentUser();
        updateNav();
        loadFeed();
        loadStats();
    }

    init();
});
