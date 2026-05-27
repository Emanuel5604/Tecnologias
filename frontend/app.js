document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const btnLoginModal = document.getElementById('btn-login-modal');
    const btnRegisterModal = document.getElementById('btn-register-modal');
    const btnUploadModal = document.getElementById('btn-upload-modal');
    const btnLogout = document.getElementById('btn-logout');
    
    const authModal = document.getElementById('auth-modal');
    const uploadModal = document.getElementById('upload-modal');
    
    const closeAuthBtn = document.querySelector('.close-btn');
    const closeUploadBtn = document.querySelector('.close-upload-btn');
    
    const authForm = document.getElementById('auth-form');
    const uploadForm = document.getElementById('upload-form');
    
    const feed = document.getElementById('feed');
    const emailInput = document.getElementById('email');
    const authTitle = document.getElementById('auth-title');
    const authError = document.getElementById('auth-error');
    
    let isLoginMode = true;

    // Check Auth State
    function updateNav() {
        const token = localStorage.getItem('token');
        if (token) {
            btnLoginModal.classList.add('hidden');
            btnRegisterModal.classList.add('hidden');
            btnUploadModal.classList.remove('hidden');
            btnLogout.classList.remove('hidden');
        } else {
            btnLoginModal.classList.remove('hidden');
            btnRegisterModal.classList.remove('hidden');
            btnUploadModal.classList.add('hidden');
            btnLogout.classList.add('hidden');
        }
    }

    // Modal Logic
    btnLoginModal.addEventListener('click', () => {
        isLoginMode = true;
        authTitle.innerText = 'Login';
        emailInput.classList.add('hidden');
        emailInput.removeAttribute('required');
        authModal.classList.remove('hidden');
        authError.innerText = '';
    });

    btnRegisterModal.addEventListener('click', () => {
        isLoginMode = false;
        authTitle.innerText = 'Sign Up';
        emailInput.classList.remove('hidden');
        emailInput.setAttribute('required', 'true');
        authModal.classList.remove('hidden');
        authError.innerText = '';
    });

    closeAuthBtn.addEventListener('click', () => authModal.classList.add('hidden'));
    
    btnUploadModal.addEventListener('click', () => {
        uploadModal.classList.remove('hidden');
        document.getElementById('upload-error').innerText = '';
    });
    
    closeUploadBtn.addEventListener('click', () => uploadModal.classList.add('hidden'));

    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('token');
        updateNav();
    });

    // Auth Form Submit
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            if (isLoginMode) {
                // Login requires form-urlencoded data for OAuth2
                const formData = new URLSearchParams();
                formData.append('username', username);
                formData.append('password', password);

                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData
                });
                
                if (!res.ok) throw new Error('Login failed');
                const data = await res.json();
                localStorage.setItem('token', data.access_token);
            } else {
                const email = document.getElementById('email').value;
                const res = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Registration failed');
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
            }
            
            authModal.classList.add('hidden');
            authForm.reset();
            updateNav();
        } catch (err) {
            authError.innerText = err.message;
        }
    });

    // Upload Form Submit
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('img-title').value;
        const desc = document.getElementById('img-desc').value;
        const file = document.getElementById('img-file').files[0];
        
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
            
            if (!res.ok) throw new Error('Upload failed');
            
            uploadModal.classList.add('hidden');
            uploadForm.reset();
            loadFeed(); // Reload images
        } catch (err) {
            document.getElementById('upload-error').innerText = err.message;
        }
    });

    // Load Feed
    async function loadFeed() {
        try {
            const res = await fetch('/api/images/');
            const images = await res.json();
            
            feed.innerHTML = '';
            images.forEach(img => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <img src="/uploads/${img.filename}" alt="${img.title}">
                    <div class="card-overlay">
                        <div class="card-title">${img.title}</div>
                        <a href="/api/images/${img.id}/download" class="btn-download" download>Download</a>
                    </div>
                `;
                feed.appendChild(card);
            });
        } catch (err) {
            console.error('Error loading feed:', err);
        }
    }

    // Initialize
    updateNav();
    loadFeed();
});
