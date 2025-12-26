// Variables globales
let currentConfig = {};
let allProfiles = [];
let currentLang = 'ES';

// Funciones para manejar cookies
function setCookie(name, value, days = 7) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "; expires=" + date.toUTCString();
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Funciones para API
async function fetchConfig(lang) {
    try {
        const response = await fetch(`/ATI/api/config/${lang}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error cargando configuración:', error);
    }
    return null;
}

async function fetchEstudiantes() {
    try {
        const response = await fetch('/ATI/api/estudiantes');
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error cargando estudiantes:', error);
    }
    return [];
}

async function fetchPerfil(ci) {
    try {
        const response = await fetch(`/ATI/api/perfil/${ci}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Error cargando perfil:', error);
    }
    return null;
}

async function setLanguage(lang) {
    try {
        const response = await fetch('/ATI/api/set_lang', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ lang: lang })
        });
        return response.ok;
    } catch (error) {
        console.error('Error cambiando idioma:', error);
        return false;
    }
}

// Actualizar interfaz
function updateUITexts() {
    // Título del sitio
    if (currentConfig.sitio) {
        document.title = currentConfig.sitio.join(' ');
        const navBrand = document.getElementById('nav-brand');
        if (navBrand) {
            navBrand.textContent = currentConfig.sitio.join(' ');
        }
    }

    // Placeholder de búsqueda
    const searchInput = document.getElementById('nombre');
    if (searchInput && currentConfig.nombre) {
        searchInput.placeholder = currentConfig.nombre + '...';
    }

    // Botón de búsqueda
    const searchButton = document.getElementById('buscar');
    if (searchButton && currentConfig.buscar) {
        searchButton.textContent = currentConfig.buscar;
    }

    // Copyright
    const copyright = document.getElementById('copyRight');
    if (copyright && currentConfig.copyRight) {
        copyright.textContent = currentConfig.copyRight;
    }

    // Saludo
    const saludo = document.getElementById('saludo');
    if (saludo && currentConfig.saludo) {
        saludo.textContent = `${currentConfig.saludo}, Gabriel!`;
    }

    // Selector de idioma
    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
        langSelect.value = currentLang;
    }
}

// Renderizar lista de estudiantes
function renderStudentGrid(profiles) {
    const main = document.getElementById('main-content');
    
    if (!profiles || profiles.length === 0) {
        main.innerHTML = `<p style="text-align: center; padding: 20px;">
            ${currentConfig.noResultados || 'No hay estudiantes para mostrar'}
        </p>`;
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'estudiantes-grid';
    
    profiles.forEach(profile => {
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'estudiante-link';
        link.dataset.ci = profile.ci;
        
        const card = document.createElement('div');
        card.className = 'estudiante-card';
        
        const img = document.createElement('img');
        img.src = `/${profile.imagen}`;
        img.alt = profile.nombre;
        img.className = 'estudiante-foto';
        img.onerror = function() {
            this.src = '/ATI/static/default.jpg';
        };
        
        const name = document.createElement('p');
        name.textContent = profile.nombre;
        
        card.appendChild(img);
        card.appendChild(name);
        link.appendChild(card);
        grid.appendChild(link);
    });
    
    main.innerHTML = '';
    main.appendChild(grid);
    
    // Event listeners para las tarjetas
    grid.querySelectorAll('.estudiante-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const ci = link.dataset.ci;
            await loadPerfil(ci);
        });
    });
}

// Renderizar perfil
async function renderPerfil(perfil) {
    const main = document.getElementById('main-content');
    
    if (!perfil) {
        main.innerHTML = '<p>Error cargando perfil</p>';
        return;
    }
    
    // Guardar CI en cookie
    setCookie('currentCI', perfil.ci);
    
const perfilHTML = `
    <button id="back-button" class="back-button">← ${currentConfig.home || 'Volver'}</button>
    <div class="perfil-container">    
        <picture>
            <source media="(min-width: 769px)" srcset="/ATI/perfiles/${perfil.ci}/${perfil.ci}.jpg">
            <img src="/ATI/perfiles/${perfil.ci}/${perfil.ci}.jpg" alt="Foto de perfil" class="foto-perfil" 
                 onerror="this.src='/ATI/static/default.jpg'">
        </picture>
        <div class="info-perfil">
            <h1 class="nombre-titulo">${perfil.nombre || ''}</h1>
            <p class="descripcion">${perfil.descripcion || ''}</p>
            <ul class="datos-lista">
                <li>
                    <span class="label-color">${currentConfig.color || 'Mi color favorito es:'}</span>
                    <span id="color">${perfil.color || ''}</span>
                </li>
                <li>
                    <span class="label-libro">${currentConfig.libro || 'Mi libro favorito es:'}</span>
                    <span id="libro">${Array.isArray(perfil.libro) ? perfil.libro.join(', ') : (perfil.libro || '')}</span>
                </li>
                <li>
                    <span class="label-musica">${currentConfig.musica || 'Mi estilo de música preferida:'}</span>
                    <span id="musica">${Array.isArray(perfil.musica) ? perfil.musica.join(', ') : (perfil.musica || '')}</span>
                </li>
                <li>
                    <span class="label-videojuego">${currentConfig.video_juego || 'Video juegos favoritos:'}</span>
                    <span id="video-juego">${Array.isArray(perfil.video_juego) ? perfil.video_juego.join(', ') : (perfil.video_juego || '')}</span>
                </li>
                <li id="lenguajes-item">
                    <span class="label-lenguajes">${currentConfig.lenguajes || 'Lenguajes aprendidos:'}</span>
                    <span id="lenguajes">${Array.isArray(perfil.lenguajes) ? perfil.lenguajes.join(', ') : (perfil.lenguajes || '')}</span>
                </li>
            </ul>
            <div id="email-container">
                ${currentConfig.email ? 
                    currentConfig.email.replace('[email]', 
                        `<a href="mailto:${perfil.email || ''}" class="email-link">${perfil.email || ''}</a>`) : 
                    (perfil.email ? `<a href="mailto:${perfil.email}" class="email-link">${perfil.email}</a>` : '')
                }
            </div>
        </div>
    </div>
`;
    
    main.innerHTML = perfilHTML;
    
    // Event listener para botón de regresar
    document.getElementById('back-button').addEventListener('click', () => {
        setCookie('currentCI', '', -1); // Eliminar cookie
        loadEstudiantes();
    });
    document.getElementById('nav-brand').addEventListener('click', () => {
        setCookie('currentCI', '', -1); // Eliminar cookie
        loadEstudiantes();
    });
}

// Cargar lista de estudiantes
async function loadEstudiantes() {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div id="loading">Cargando estudiantes...</div>';
    
    allProfiles = await fetchEstudiantes();
    renderStudentGrid(allProfiles);
}

// Cargar perfil
async function loadPerfil(ci) {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div id="loading">Cargando perfil...</div>';
    
    const perfil = await fetchPerfil(ci);
    renderPerfil(perfil);
}

// Buscar estudiantes
function performSearch(query) {
    if (!query.trim()) {
        renderStudentGrid(allProfiles);
        return;
    }
    
    const filtered = allProfiles.filter(profile =>
        profile.nombre.toLowerCase().includes(query.toLowerCase())
    );
    
    const main = document.getElementById('main-content');
    if (filtered.length === 0) {
        const noMatchText = currentConfig.noCoincidencias || 'No hay alumnos que tengan en su nombre: [query]';
        const searchMessage = noMatchText.replace('[query]', query);
        main.innerHTML = `<p style="text-align: center; padding: 20px;">${searchMessage}</p>`;
    } else {
        renderStudentGrid(filtered);
    }
}

// Inicialización
async function initSPA() {
    // Obtener idioma de cookie
    currentLang = getCookie('lang') || 'ES';
    
    // Cargar configuración
    currentConfig = await fetchConfig(currentLang);
    updateUITexts();
    
    // Cargar estudiantes
    await loadEstudiantes();
    
    // Verificar si hay un perfil guardado en cookie
    const savedCI = getCookie('currentCI');
    if (savedCI) {
        await loadPerfil(savedCI);
    }
    
    // Event listeners
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('nombre');
    const langSelect = document.getElementById('lang-select');
    
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (searchInput) {
                performSearch(searchInput.value);
            }
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            performSearch(e.target.value);
        });
    }
    
    if (langSelect) {
        langSelect.addEventListener('change', async (e) => {
            currentLang = e.target.value;
            const success = await setLanguage(currentLang);
            if (success) {
                currentConfig = await fetchConfig(currentLang);
                updateUITexts();
                
                // Recargar contenido con nuevo idioma
                const currentCI = getCookie('currentCI');
                if (currentCI) {
                    await loadPerfil(currentCI);
                } else {
                    await loadEstudiantes();
                }
            }
        });
    }
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initSPA);