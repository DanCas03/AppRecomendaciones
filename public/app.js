// Estado global de la aplicación
const state = {
    canciones: [],
    cancionesOriginales: [], // Para mantener la lista completa sin filtrar
    cancionSeleccionada: null,
    recomendaciones: [],
    cargando: false,
    vistaActual: 'discover',
    usuarioActual: null, // { nombre_usuario: string }
    likesCache: {}, // { track_id: boolean }
    searchQuery: '', // Query de búsqueda actual
    searchTimeout: null, // Para debounce de búsqueda
    buscando: false, // Estado de búsqueda activa
    searchOffset: 0, // Offset para paginación de búsqueda
    searchHasMore: false, // Si hay más resultados de búsqueda
    searchTotal: 0 // Total de resultados de búsqueda
};

const API_BASE = window.location.origin;

// Elementos del DOM
const songsGrid = document.getElementById('songsGrid');
const loading = document.getElementById('loading');
const btnMasCanciones = document.getElementById('btnMasCanciones');
const discoverView = document.getElementById('discoverView');
const surpriseMeView = document.getElementById('surpriseMeView');
const exploreView = document.getElementById('exploreView');
const recommendationsView = document.getElementById('recommendationsView');
const profileView = document.getElementById('profileView');
const loginView = document.getElementById('loginView');
const sourceTrack = document.getElementById('sourceTrack');
const recommendationsList = document.getElementById('recommendationsList');
const sliderCards = document.getElementById('sliderCards');
const sliderDots = document.getElementById('sliderDots');
const exploreRecommendations = document.getElementById('exploreRecommendations');
const exploreSourceTrack = document.getElementById('exploreSourceTrack');
const exploreRecommendationsList = document.getElementById('exploreRecommendationsList');
const authSection = document.getElementById('authSection');
const profileSection = document.getElementById('profileSection');
const profileNavBtn = document.getElementById('profileNavBtn');
const loginNavBtn = document.getElementById('loginNavBtn');
const navBtns = document.querySelectorAll('.nav-btn');
const btnBack = document.getElementById('btnBack');
const logoHome = document.getElementById('logoHome');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const searchResultsInfo = document.getElementById('searchResultsInfo');
const searchResultsText = document.getElementById('searchResultsText');
const header = document.querySelector('.header');

// Función para pausar todos los iframes de Spotify
function pausarTodosLosIframes() {
    const iframes = document.querySelectorAll('iframe[src*="spotify.com/embed"]');
    iframes.forEach(iframe => {
        // Guardamos el src original
        const originalSrc = iframe.src;
        // Temporalmente lo cambiamos a about:blank para detener la reproducción
        iframe.src = 'about:blank';
        // Lo restauramos inmediatamente para que esté listo para reproducir de nuevo
        setTimeout(() => {
            iframe.src = originalSrc;
        }, 100);
    });
}

// Navegación entre vistas
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        cambiarVista(view);
    });
});

function cambiarVista(view) {
    // Pausar todas las canciones antes de cambiar de vista
    pausarTodosLosIframes();
    
    state.vistaActual = view;
    
    navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    discoverView.classList.toggle('hidden', view !== 'discover');
    exploreView.classList.toggle('hidden', view !== 'explore');
    recommendationsView.classList.toggle('hidden', view !== 'recommendations');
    surpriseMeView.classList.toggle('hidden', view !== 'surpriseMe');
    profileView.classList.toggle('hidden', view !== 'profile');
    loginView.classList.toggle('hidden', view !== 'login');
    
    // Mostrar/ocultar botón de regreso
    if (view === 'discover') {
        btnBack.classList.add('hidden');
    } else {
        btnBack.classList.remove('hidden');
    }
    
    // Si volvemos a discover, restaurar todas las canciones si había búsqueda activa
    if (view === 'discover') {
        if (state.searchQuery) {
            limpiarBusqueda();
        }
    } else {
        // Si salimos de discover, cancelar búsquedas pendientes
        if (state.searchTimeout) {
            clearTimeout(state.searchTimeout);
            state.searchTimeout = null;
        }
        state.buscando = false;
    }
    
    // Si cambiamos a Profile, verificar autenticación
    if (view === 'profile') {
        if (state.usuarioActual) {
            mostrarPerfil();
        } else {
            cambiarVista('login');
        }
    }
    
    // Si cambiamos a For You, cargar recomendaciones personalizadas
    if (view === 'explore') {
        cargarForYou();
        // Ocultar recomendaciones al cambiar de canción
        exploreRecommendations.classList.add('hidden');
    }

    if(view === 'surpriseMe'){
        cargarSurpriseMe();
    }
}

// Formatear duración
function formatearDuracion(ms) {
    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    return `${minutos}:${segundos.toString().padStart(2, '0')}`;
}

// Función de búsqueda con debounce (busca en la base de datos)
function buscarCanciones(query) {
    // Limpiar timeout anterior
    if (state.searchTimeout) {
        clearTimeout(state.searchTimeout);
    }
    
    state.searchQuery = query.trim();
    
    // Si no hay búsqueda, restaurar canciones originales
    if (!state.searchQuery) {
        mostrarCancionesFiltradas(state.cancionesOriginales, true);
        searchResultsInfo.classList.add('hidden');
        searchClear.classList.add('hidden');
        state.buscando = false;
        state.searchOffset = 0;
        state.searchHasMore = false;
        state.searchTotal = 0;
        return;
    }
    
    searchClear.classList.remove('hidden');
    
    // Si la búsqueda es muy corta, esperar más caracteres
    if (state.searchQuery.length < 2) {
        searchResultsInfo.classList.remove('hidden');
        searchResultsText.textContent = 'Escribe al menos 2 caracteres para buscar...';
        return;
    }
    
    // Mostrar loading inmediatamente
    searchResultsInfo.classList.remove('hidden');
    searchResultsText.innerHTML = '<div style="display: inline-flex; align-items: center; gap: 8px;"><div class="spinner" style="width: 16px; height: 16px; border-width: 2px; margin: 0;"></div> Buscando...</div>';
    
    // Resetear offset para nueva búsqueda
    state.searchOffset = 0;
    
    // Debounce: esperar 500ms después de que el usuario deje de escribir
    state.searchTimeout = setTimeout(async () => {
        await buscarEnBaseDeDatos(state.searchQuery, 0, false);
    }, 500);
}

// Buscar canciones en la base de datos
async function buscarEnBaseDeDatos(query, offset = 0, append = false) {
    if (state.buscando) return;
    
    state.buscando = true;
    
    try {
        const response = await fetch(`${API_BASE}/api/canciones/search?q=${encodeURIComponent(query)}&limit=20&offset=${offset}`);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}`);
        }
        
        const data = await response.json();
        const resultados = data.canciones || [];
        
        // Solo actualizar si la query actual coincide con la búsqueda
        if (query === state.searchQuery) {
            // Actualizar estado de paginación
            state.searchOffset = offset;
            state.searchHasMore = data.hasMore || false;
            state.searchTotal = data.total || resultados.length;
            
            if (append) {
                // Agregar resultados a los existentes
                const indexInicial = state.canciones.length;
                state.canciones = [...state.canciones, ...resultados];
                agregarCancionesAlGrid(resultados, indexInicial);
            } else {
                // Reemplazar resultados
                state.canciones = resultados;
                mostrarCancionesFiltradas(resultados, false);
            }
            
            // Actualizar info de resultados
            const totalMostradas = state.canciones.length;
            if (state.searchTotal === 0) {
                searchResultsText.textContent = 'No se encontraron canciones que coincidan con tu búsqueda';
            } else if (state.searchTotal === 1) {
                searchResultsText.textContent = '1 canción encontrada';
            } else {
                searchResultsText.textContent = `Mostrando ${totalMostradas} de ${state.searchTotal} canciones encontradas`;
            }
            
            // Actualizar visibilidad del botón Load More
            actualizarBotonLoadMore();
        }
    } catch (error) {
        console.error('Error al buscar canciones:', error);
        searchResultsText.textContent = 'Error al buscar. Intenta de nuevo.';
    } finally {
        state.buscando = false;
    }
}

// Agregar canciones al grid sin borrar las existentes
function agregarCancionesAlGrid(canciones, indexInicial) {
    if (canciones.length === 0) return;
    
    canciones.forEach((cancion, index) => {
        const card = crearTarjetaCancion(cancion, indexInicial + index);
        songsGrid.appendChild(card);
    });
    
    // Verificar likes después de renderizar
    if (state.usuarioActual) {
        setTimeout(() => verificarLikes(canciones), 500);
    }
}

// Mostrar canciones filtradas (reemplaza todo el contenido)
function mostrarCancionesFiltradas(canciones, updateState = true) {
    if (updateState) {
        state.canciones = canciones;
    }
    
    songsGrid.innerHTML = '';
    
    if (canciones.length === 0) {
        songsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <p>No se encontraron canciones</p>
            </div>
        `;
        actualizarBotonLoadMore();
        return;
    }
    
    canciones.forEach((cancion, index) => {
        const card = crearTarjetaCancion(cancion, index);
        songsGrid.appendChild(card);
    });
    
    // Actualizar botón Load More
    actualizarBotonLoadMore();
    
    // Verificar likes después de renderizar
    if (state.usuarioActual) {
        setTimeout(() => verificarLikes(canciones), 500);
    }
}

// Actualizar visibilidad y texto del botón Load More
function actualizarBotonLoadMore() {
    if (!btnMasCanciones) return;
    
    if (state.searchQuery) {
        // Si hay búsqueda activa, mostrar solo si hay más resultados
        if (state.searchHasMore) {
            btnMasCanciones.style.display = 'block';
            btnMasCanciones.textContent = 'Load More Results';
        } else {
            btnMasCanciones.style.display = 'none';
        }
    } else {
        // Modo normal (sin búsqueda)
        btnMasCanciones.style.display = 'block';
        btnMasCanciones.textContent = 'Load More';
    }
}

// Limpiar búsqueda
function limpiarBusqueda() {
    // Limpiar timeout pendiente
    if (state.searchTimeout) {
        clearTimeout(state.searchTimeout);
        state.searchTimeout = null;
    }
    
    searchInput.value = '';
    state.searchQuery = '';
    state.buscando = false;
    state.searchOffset = 0;
    state.searchHasMore = false;
    state.searchTotal = 0;
    mostrarCancionesFiltradas(state.cancionesOriginales, true);
    searchResultsInfo.classList.add('hidden');
    searchClear.classList.add('hidden');
    searchInput.focus();
}

// Crear tarjeta de canción minimalista
function crearTarjetaCancion(cancion, index) {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.dataset.index = index;
    
    const spotify = cancion.spotify;
    const trackId = cancion.props?.track_id || '';
    const nombreCancion = spotify?.name || cancion.props?.nombre || 'Untitled';
    const artistas = spotify?.artists || 'Unknown Artist';
    const albumImage = spotify?.albumImage || null;
    
    card.innerHTML = `
        ${trackId && trackId.length > 0 ? `
            <iframe 
                src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=1" 
                width="100%" 
                height="352" 
                frameBorder="0" 
                allowfullscreen="" 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy"
                style="display: block; border: none; margin: 0 0 var(--spacing-sm, 16px) 0; padding: 0; width: 100%; max-width: 100%; overflow: hidden;">
            </iframe>
        ` : `
            ${albumImage ? `
                <div class="album-cover-container">
                    <img src="${albumImage}" alt="${nombreCancion}" class="album-cover" />
                </div>
            ` : ''}
            
            <div class="song-info">
                <div class="song-title">${nombreCancion}</div>
                <div class="song-artist">${artistas}</div>
            </div>
        `}
        
        <div class="song-actions">
            <button class="btn-recommend" onclick="obtenerRecomendaciones(${index})">
                Get Recommendations
            </button>
            ${trackId && trackId.length > 0 ? `
                <button class="btn-like" data-track-id="${trackId}" onclick="toggleLike('${trackId}'); event.stopPropagation();">
                    🤍
                </button>
            ` : ''}
        </div>
    `;
    
    // Click en la card para seleccionar
    card.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'IFRAME' && !e.target.closest('button')) {
            seleccionarCancion(cancion, index);
        }
    });
    
    return card;
}

// Crear tarjeta de canción para el perfil (sin botón de recomendaciones)
function crearTarjetaCancionPerfil(cancion, index) {
    const card = document.createElement('div');
    card.className = 'song-card';
    card.dataset.index = index;
    
    const trackId = cancion.props?.track_id || '';
    const nombreCancion = cancion.props?.nombre || 'Untitled';
    
    card.innerHTML = `
        ${trackId && trackId.length > 0 ? `
            <iframe 
                src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=1" 
                width="100%" 
                height="352" 
                frameBorder="0" 
                allowfullscreen="" 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy"
                style="display: block; border: none; margin: 0; padding: 0; width: 100%; max-width: 100%; overflow: hidden;">
            </iframe>
            ${trackId && trackId.length > 0 ? `
                <button class="btn-like" data-track-id="${trackId}" onclick="toggleLike('${trackId}'); event.stopPropagation();" style="margin-top: var(--spacing-sm);">
                    🤍
                </button>
            ` : ''}
        ` : `
            <div class="empty-message">
                Spotify widget not available
            </div>
        `}
    `;
    
    return card;
}

// Seleccionar canción
function seleccionarCancion(cancion, index) {
    // Remover selección anterior
    document.querySelectorAll('.song-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Marcar como seleccionada
    const card = document.querySelector(`.song-card[data-index="${index}"]`);
    if (card) {
        card.classList.add('selected');
    }
    
    state.cancionSeleccionada = cancion;
    
    // Cambiar a vista de recomendaciones (esto pausará automáticamente)
    cambiarVista('recommendations');
    mostrarCancionBase(cancion);
}

// Mostrar canción base en vista de recomendaciones
function mostrarCancionBase(cancion) {
    const trackId = cancion.props?.track_id || '';
    const audio = cancion.props?.caracteristicas_audio;
    
    const previewCard = sourceTrack.querySelector('.track-preview-card');
    
    // Verificar si está liked
    const isLiked = state.usuarioActual && state.likesCache[trackId];
    const likeIcon = isLiked ? '❤️' : '🤍';
    const likeClass = isLiked ? 'liked' : '';
    
    let widgetHTML = '';
    if (trackId && trackId.length > 0) {
        widgetHTML = `
            <iframe 
                src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=1" 
                width="100%" 
                height="352" 
                frameBorder="0" 
                allowfullscreen="" 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy"
                style="display: block; border: none; margin: 0 0 20px 0; padding: 0; width: 100%; max-width: 100%; overflow: hidden;">
            </iframe>
            <div class="song-actions">
                <button class="btn-like ${likeClass}" data-track-id="${trackId}" onclick="toggleLike('${trackId}'); event.stopPropagation();">
                    ${likeIcon}
                </button>
            </div>
        `;
    } else {
        widgetHTML = `
            <div class="empty-message" style="margin-bottom: 20px;">
                Spotify widget not available for this track
            </div>
        `;
    }
    
    // Mostrar parámetros de recomendación
    let parametrosHTML = '';
    if (audio) {
        parametrosHTML = `
            <div class="recommendation-params">
                <p class="params-title">Recomendando basado en:</p>
                <div class="params-grid">
                    <div class="param-item">
                        <span class="param-label">Tempo:</span>
                        <span class="param-value">${Math.round(audio.tempo || 0)} BPM</span>
                    </div>
                    <div class="param-item">
                        <span class="param-label">Energy:</span>
                        <span class="param-value">${((audio.energy || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="param-item">
                        <span class="param-label">Danceability:</span>
                        <span class="param-value">${((audio.danceability || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="param-item">
                        <span class="param-label">Valence:</span>
                        <span class="param-value">${((audio.valence || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="param-item">
                        <span class="param-label">Acousticness:</span>
                        <span class="param-value">${((audio.acousticness || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="param-item">
                        <span class="param-label">Speechiness:</span>
                        <span class="param-value">${((audio.speechiness || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="param-item">
                        <span class="param-label">Instrumentalness:</span>
                        <span class="param-value">${((audio.instrumentalness || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="param-item">
                        <span class="param-label">Liveness:</span>
                        <span class="param-value">${((audio.liveness || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="param-item">
                        <span class="param-label">Loudness:</span>
                        <span class="param-value">${(audio.loudness || 0).toFixed(1)} dB</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    previewCard.innerHTML = widgetHTML + parametrosHTML;
    
    // Actualizar botón de like después de un momento
    setTimeout(() => {
        if (state.usuarioActual) {
            verificarLikes([cancion]).then(() => {
                actualizarBotonesLike();
            });
        }
    }, 500);
    
    // Obtener recomendaciones automáticamente
    obtenerRecomendaciones(state.canciones.indexOf(cancion));
}

// Inicializar slider de Explore
let sliderTimeline = null;
let currentSlide = 0;

// Cargar canciones para "For You" basadas en likes del usuario
async function cargarForYou() {
    sliderCards.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading personalized recommendations...</p></div>';
    sliderDots.innerHTML = '';
    
    if (!state.usuarioActual) {
        sliderCards.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <p>Please log in to see personalized recommendations based on your liked songs</p>
                <button class="btn-recommend" onclick="cambiarVista('login')" style="margin-top: var(--spacing-md);">
                    Go to Login
                </button>
            </div>
        `;
        return;
    }
    
    try {
        // Obtener canciones liked del usuario
        const likesRes = await fetch(`${API_BASE}/api/user/likes?username=${state.usuarioActual.nombre_usuario}`, {
            headers: { 'x-username': state.usuarioActual.nombre_usuario }
        });
        
        if (!likesRes.ok) throw new Error('Error al cargar likes');
        
        const likesData = await likesRes.json();
        
        if (likesData.canciones.length === 0) {
            sliderCards.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <p>Like some songs to get personalized recommendations!</p>
                    <button class="btn-recommend" onclick="cambiarVista('discover')" style="margin-top: var(--spacing-md);">
                        Discover Songs
                    </button>
                </div>
            `;
            return;
        }
        
        // Crear una canción "ideal" basada en el promedio de las canciones liked
        const cancionesLiked = likesData.canciones;
        const audioPromedio = calcularPromedioAudioFeatures(cancionesLiked);
        
        const cancionIdeal = {
            track_id: 'ideal',
            nombre: 'Based on your likes',
            artista_ids: [],
            album_id: 0,
            genero_id: 0,
            popularidad: 50,
            duracion_ms: audioPromedio.avg_duration,
            explicito: audioPromedio.avg_explicit > 0.5,
            caracteristicas_audio: {
                danceability: audioPromedio.avg_danceability,
                energy: audioPromedio.avg_energy,
                key: Math.round(audioPromedio.avg_key),
                loudness: audioPromedio.avg_loudness,
                mode: Math.round(audioPromedio.avg_mode),
                speechiness: audioPromedio.avg_speechiness,
                acousticness: audioPromedio.avg_acousticness,
                instrumentalness: audioPromedio.avg_instrumentalness,
                liveness: audioPromedio.avg_liveness,
                valence: audioPromedio.avg_valence,
                tempo: audioPromedio.avg_tempo,
                time_signature: Math.round(audioPromedio.avg_time_signature)
            }
        };
        
        // Obtener recomendaciones basadas en la canción ideal
        const recRes = await fetch(`${API_BASE}/recomendaciones?limit=10`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cancionIdeal)
        });
        
        if (!recRes.ok) throw new Error('Error al obtener recomendaciones');
        
        const recomendaciones = await recRes.json();
        const cancionesRec = Array.isArray(recomendaciones) ? recomendaciones : [recomendaciones];
        
        if (cancionesRec.length === 0) {
            sliderCards.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <p>No recommendations found. Try liking more songs!</p>
                </div>
            `;
            return;
        }
        
        // Inicializar slider con las recomendaciones
        inicializarSlider(cancionesRec);
        
    } catch (error) {
        console.error('Error al cargar For You:', error);
        sliderCards.innerHTML = `
            <div class="error-message" style="grid-column: 1 / -1;">
                Error loading personalized recommendations
            </div>
        `;
    }
}

// Calcular promedio de características de audio de canciones liked
function calcularPromedioAudioFeatures(canciones) {
    if (canciones.length === 0) {
        return {
            avg_duration: 180000,
            avg_explicit: 0,
            avg_danceability: 0.5,
            avg_energy: 0.5,
            avg_key: 5,
            avg_loudness: -10,
            avg_mode: 1,
            avg_speechiness: 0.1,
            avg_acousticness: 0.5,
            avg_instrumentalness: 0.1,
            avg_liveness: 0.2,
            avg_valence: 0.5,
            avg_tempo: 120,
            avg_time_signature: 4
        };
    }
    
    const sumas = canciones.reduce((acc, cancion) => {
        const audio = cancion.caracteristicas_audio || {};
        return {
            avg_duration: acc.avg_duration + (cancion.duracion_ms || 180000),
            avg_explicit: acc.avg_explicit + (cancion.explicito ? 1 : 0),
            avg_danceability: acc.avg_danceability + (audio.danceability || 0.5),
            avg_energy: acc.avg_energy + (audio.energy || 0.5),
            avg_key: acc.avg_key + (audio.key || 5),
            avg_loudness: acc.avg_loudness + (audio.loudness || -10),
            avg_mode: acc.avg_mode + (audio.mode || 1),
            avg_speechiness: acc.avg_speechiness + (audio.speechiness || 0.1),
            avg_acousticness: acc.avg_acousticness + (audio.acousticness || 0.5),
            avg_instrumentalness: acc.avg_instrumentalness + (audio.instrumentalness || 0.1),
            avg_liveness: acc.avg_liveness + (audio.liveness || 0.2),
            avg_valence: acc.avg_valence + (audio.valence || 0.5),
            avg_tempo: acc.avg_tempo + (audio.tempo || 120),
            avg_time_signature: acc.avg_time_signature + (audio.time_signature || 4)
        };
    }, {
        avg_duration: 0,
        avg_explicit: 0,
        avg_danceability: 0,
        avg_energy: 0,
        avg_key: 0,
        avg_loudness: 0,
        avg_mode: 0,
        avg_speechiness: 0,
        avg_acousticness: 0,
        avg_instrumentalness: 0,
        avg_liveness: 0,
        avg_valence: 0,
        avg_tempo: 0,
        avg_time_signature: 0
    });
    
    const count = canciones.length;
    return {
        avg_duration: sumas.avg_duration / count,
        avg_explicit: sumas.avg_explicit / count,
        avg_danceability: sumas.avg_danceability / count,
        avg_energy: sumas.avg_energy / count,
        avg_key: sumas.avg_key / count,
        avg_loudness: sumas.avg_loudness / count,
        avg_mode: sumas.avg_mode / count,
        avg_speechiness: sumas.avg_speechiness / count,
        avg_acousticness: sumas.avg_acousticness / count,
        avg_instrumentalness: sumas.avg_instrumentalness / count,
        avg_liveness: sumas.avg_liveness / count,
        avg_valence: sumas.avg_valence / count,
        avg_tempo: sumas.avg_tempo / count,
        avg_time_signature: sumas.avg_time_signature / count
    };
}

function inicializarSlider(cancionesParaSlider) {
    if (!cancionesParaSlider || cancionesParaSlider.length === 0) return;
    
    // Limpiar slider anterior
    sliderCards.innerHTML = '';
    sliderDots.innerHTML = '';
    
    // Verificar likes antes de crear las cards
    if (state.usuarioActual && cancionesParaSlider.length > 0) {
        const trackIds = cancionesParaSlider
            .map(c => c.props?.track_id || c.track_id)
            .filter(Boolean);
        verificarLikes(cancionesParaSlider.map(c => ({ props: { track_id: c.props?.track_id || c.track_id } })));
    }
    
    // Crear tarjetas del slider (máximo 10 para performance)
    const cancionesLimitadas = cancionesParaSlider.slice(0, 10);
    cancionesLimitadas.forEach((cancion, index) => {
        // Convertir formato de respuesta a formato Song
        const cancionFormateada = {
            props: cancion.props || cancion,
            spotify: cancion.spotify || null
        };
        
        const card = crearCardSlider(cancionFormateada, index);
        sliderCards.appendChild(card);
        
        // Crear dot
        const dot = document.createElement('div');
        dot.className = 'slider-dot';
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => irASlide(index));
        sliderDots.appendChild(dot);
    });
    
    // Configurar scroll horizontal con snap
    configurarScrollSlider();
    
    // Actualizar dots cuando se hace scroll
    sliderCards.addEventListener('scroll', actualizarDotsDesdeScroll, { passive: true });
    
    // Actualizar botones de like después de un momento
    setTimeout(() => {
        if (state.usuarioActual) {
            actualizarBotonesLike();
        }
    }, 500);
}

function configurarScrollSlider() {
    // Permitir scroll horizontal con mouse drag
    let isDown = false;
    let startX;
    let scrollLeft;
    
    sliderCards.addEventListener('mousedown', (e) => {
        isDown = true;
        sliderCards.style.cursor = 'grabbing';
        startX = e.pageX - sliderCards.offsetLeft;
        scrollLeft = sliderCards.scrollLeft;
    });
    
    sliderCards.addEventListener('mouseleave', () => {
        isDown = false;
        sliderCards.style.cursor = 'grab';
    });
    
    sliderCards.addEventListener('mouseup', () => {
        isDown = false;
        sliderCards.style.cursor = 'grab';
    });
    
    sliderCards.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - sliderCards.offsetLeft;
        const walk = (x - startX) * 2; // Velocidad del scroll
        sliderCards.scrollLeft = scrollLeft - walk;
    });
    
    // Touch events para móvil
    let touchStartX = 0;
    let touchScrollLeft = 0;
    
    sliderCards.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].pageX - sliderCards.offsetLeft;
        touchScrollLeft = sliderCards.scrollLeft;
    }, { passive: true });
    
    sliderCards.addEventListener('touchmove', (e) => {
        if (!touchStartX) return;
        const x = e.touches[0].pageX - sliderCards.offsetLeft;
        const walk = (x - touchStartX) * 2;
        sliderCards.scrollLeft = touchScrollLeft - walk;
    }, { passive: true });
}

function actualizarDotsDesdeScroll() {
    const cards = sliderCards.querySelectorAll('.card');
    if (cards.length === 0) return;
    
    const cardWidth = cards[0].offsetWidth;
    const gap = 16; // var(--spacing-sm)
    const totalWidth = cardWidth + gap;
    const scrollLeft = sliderCards.scrollLeft;
    const currentIndex = Math.round(scrollLeft / totalWidth);
    
    sliderDots.querySelectorAll('.slider-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
    });
    
    currentSlide = currentIndex;
}

function crearCardSlider(cancion, index) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = index;
    
    const trackId = cancion.props?.track_id || cancion.track_id || '';
    const spotify = cancion.spotify;
    const nombreCancion = spotify?.name || cancion.props?.nombre || cancion.nombre || 'Untitled';
    
    // Guardar canción en el estado si no existe
    const cancionIndex = state.canciones.findIndex(c => 
        (c.props?.track_id || c.track_id) === trackId
    );
    const indexFinal = cancionIndex !== -1 ? cancionIndex : state.canciones.length;
    
    if (cancionIndex === -1 && cancion.props) {
        state.canciones.push(cancion);
    }
    
    // Verificar si está liked
    const isLiked = state.usuarioActual && state.likesCache[trackId];
    const likeIcon = isLiked ? '❤️' : '🤍';
    const likeClass = isLiked ? 'liked' : '';
    
    if (trackId && trackId.length > 0) {
        card.innerHTML = `
            <iframe 
                src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=1" 
                width="100%" 
                height="352" 
                frameBorder="0" 
                allowfullscreen="" 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy"
                style="display: block; border: none; margin: 0; padding: 0; width: 100%; max-width: 100%; overflow: hidden;">
            </iframe>
            <div class="song-actions">
                <button class="btn-recommend" onclick="obtenerRecomendacionesExplore(${indexFinal})">
                    Get Recommendations
                </button>
                <button class="btn-like ${likeClass}" data-track-id="${trackId}" onclick="toggleLike('${trackId}'); event.stopPropagation();">
                    ${likeIcon}
                </button>
            </div>
        `;
    } else {
        card.innerHTML = `
            <div class="empty-message">
                Spotify widget not available
            </div>
            <div class="song-actions">
                <button class="btn-recommend" onclick="obtenerRecomendacionesExplore(${indexFinal})">
                    Get Recommendations
                </button>
            </div>
        `;
    }
    
    return card;
}

function animarSlider() {
    // Esta función ya no se usa con scroll nativo, pero la mantenemos por compatibilidad
    // El scroll ahora se maneja con scroll-behavior: smooth
}

function irASlide(index) {
    if (index < 0 || index >= sliderCards.children.length) return;
    
    // Pausar todas las canciones al cambiar de slide
    pausarTodosLosIframes();
    
    currentSlide = index;
    
    const cards = sliderCards.querySelectorAll('.card');
    if (cards.length === 0) return;
    
    const card = cards[index];
    const cardWidth = card.offsetWidth;
    const gap = 16; // var(--spacing-sm)
    const totalWidth = cardWidth + gap;
    const scrollPosition = index * totalWidth;
    
    // Scroll suave hacia la tarjeta
    card.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
    });
    
    // Actualizar dots
    sliderDots.querySelectorAll('.slider-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

function handleSliderKeyboard(e) {
    if (state.vistaActual !== 'explore') return;
    
    const cards = sliderCards.querySelectorAll('.card');
    if (cards.length === 0) return;
    
    if (e.key === 'ArrowLeft' && currentSlide > 0) {
        e.preventDefault();
        irASlide(currentSlide - 1);
    } else if (e.key === 'ArrowRight' && currentSlide < cards.length - 1) {
        e.preventDefault();
        irASlide(currentSlide + 1);
    }
}

// Obtener recomendaciones en Explore
async function obtenerRecomendacionesExplore(index) {
    const cancion = state.canciones[index];
    if (!cancion) return;
    
    // Pausar todas las canciones al obtener nuevas recomendaciones
    pausarTodosLosIframes();
    
    // Mostrar sección de recomendaciones
    exploreRecommendations.classList.remove('hidden');
    exploreRecommendations.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Mostrar canción base con parámetros
    mostrarCancionBaseExplore(cancion);
    
    // Mostrar loading
    exploreRecommendationsList.innerHTML = `
        <p class="section-label">Recommendations</p>
        <div class="loading">
            <div class="spinner"></div>
            <p>Finding similar songs...</p>
        </div>
    `;
    
    try {
        if (!cancion.props?.caracteristicas_audio) {
            exploreRecommendationsList.innerHTML = `
                <p class="section-label">Recommendations</p>
                <div class="error-message">
                    Esta canción no tiene características de audio disponibles para generar recomendaciones.
                </div>
            `;
            return;
        }
        
        const cancionData = {
            track_id: cancion.props?.track_id || '',
            nombre: cancion.props?.nombre || '',
            artista_ids: cancion.props?.artista_ids || [],
            album_id: cancion.props?.album_id || 0,
            genero_id: cancion.props?.genero_id || 0,
            popularidad: cancion.props?.popularidad || 0,
            duracion_ms: cancion.props?.duracion_ms || 0,
            explicito: cancion.props?.explicito || false,
            caracteristicas_audio: cancion.props.caracteristicas_audio
        };
        
        const multiResponse = await fetch(`${API_BASE}/recomendaciones?limit=5`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cancionData)
        });
        
        if (!multiResponse.ok) {
            throw new Error(`Error ${multiResponse.status}`);
        }
        
        const multiRecs = await multiResponse.json();
        const recomendaciones = Array.isArray(multiRecs) ? multiRecs : [multiRecs];
        
        mostrarRecomendacionesExplore(recomendaciones);
        
    } catch (error) {
        console.error('Error al obtener recomendaciones:', error);
        exploreRecommendationsList.innerHTML = `
            <p class="section-label">Recommendations</p>
            <div class="error-message">
                Error loading recommendations. Please try again.
            </div>
        `;
    }
}

function mostrarCancionBaseExplore(cancion) {
    const trackId = cancion.props?.track_id || '';
    const audio = cancion.props?.caracteristicas_audio;
    
    const previewCard = exploreSourceTrack.querySelector('.track-preview-card');
    
    // Verificar si está liked
    const isLiked = state.usuarioActual && state.likesCache[trackId];
    const likeIcon = isLiked ? '❤️' : '🤍';
    const likeClass = isLiked ? 'liked' : '';
    
    let widgetHTML = '';
    if (trackId && trackId.length > 0) {
        widgetHTML = `
            <iframe 
                src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=1" 
                width="100%" 
                height="352" 
                frameBorder="0" 
                allowfullscreen="" 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy"
                style="display: block; border: none; margin: 0 0 20px 0; padding: 0; width: 100%; max-width: 100%; overflow: hidden;">
            </iframe>
            <div class="song-actions">
                <button class="btn-like ${likeClass}" data-track-id="${trackId}" onclick="toggleLike('${trackId}'); event.stopPropagation();">
                    ${likeIcon}
                </button>
            </div>
        `;
    } else {
        widgetHTML = `
            <div class="empty-message" style="margin-bottom: 20px;">
                Spotify widget not available for this track
            </div>
        `;
    }
    
    let parametrosHTML = '';
    if (audio) {
        parametrosHTML = `
            <div class="recommendation-params">
                <p class="params-title">Recomendando basado en:</p>
                <div class="params-grid">
                    <div class="param-item">
                        <span class="param-label">Tempo:</span>
                        <span class="param-value">${Math.round(audio.tempo || 0)} BPM</span>
                    </div>
                    <div class="param-item">
                        <span class="param-label">Energy:</span>
                        <span class="param-value">${((audio.energy || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="param-item">
                        <span class="param-label">Danceability:</span>
                        <span class="param-value">${((audio.danceability || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="param-item">
                        <span class="param-label">Valence:</span>
                        <span class="param-value">${((audio.valence || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="param-item">
                        <span class="param-label">Acousticness:</span>
                        <span class="param-value">${((audio.acousticness || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="param-item">
                        <span class="param-label">Speechiness:</span>
                        <span class="param-value">${((audio.speechiness || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="param-item">
                        <span class="param-label">Instrumentalness:</span>
                        <span class="param-value">${((audio.instrumentalness || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="param-item">
                        <span class="param-label">Liveness:</span>
                        <span class="param-value">${((audio.liveness || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div class="param-item">
                        <span class="param-label">Loudness:</span>
                        <span class="param-value">${(audio.loudness || 0).toFixed(1)} dB</span>
                    </div>
                </div>
            </div>
        `;
    }
    
           previewCard.innerHTML = widgetHTML + parametrosHTML;
           
           // Actualizar botón de like después de un momento
           setTimeout(() => {
               if (state.usuarioActual) {
                   verificarLikes([cancion]).then(() => {
                       actualizarBotonesLike();
                   });
               }
           }, 500);
       }

function mostrarRecomendacionesExplore(recomendaciones) {
    if (recomendaciones.length === 0) {
        exploreRecommendationsList.innerHTML = `
            <p class="section-label">Recommendations</p>
            <div class="empty-state">
                No recommendations found
            </div>
        `;
        return;
    }
    
    exploreRecommendationsList.innerHTML = `
        <p class="section-label">Recommendations (${recomendaciones.length})</p>
        ${recomendaciones.map((rec, idx) => crearItemRecomendacion(rec, idx)).join('')}
    `;
    
    // Actualizar botones de like después de renderizar
    setTimeout(() => {
        if (state.usuarioActual) {
            actualizarBotonesLike();
        }
    }, 500);
}

// Obtener recomendaciones
async function obtenerRecomendaciones(index) {
    const cancion = state.canciones[index];
    if (!cancion) return;
    
    state.cargando = true;
    
    // Cambiar a vista de recomendaciones si no está ahí
    if (state.vistaActual !== 'recommendations' && state.vistaActual !== 'explore') {
        seleccionarCancion(cancion, index);
        return;
    }
    
    // Si estamos en explore, usar función específica
    if (state.vistaActual === 'explore') {
        await obtenerRecomendacionesExplore(index);
        state.cargando = false;
        return;
    }
    
    // Mostrar loading en recomendaciones
    recommendationsList.innerHTML = `
        <p class="section-label">Recommendations</p>
        <div class="loading">
            <div class="spinner"></div>
            <p>Finding similar songs...</p>
        </div>
    `;
    
    try {
        // Verificar que tenga características de audio
        if (!cancion.props?.caracteristicas_audio) {
            console.error('⚠️ Canción sin características de audio:', cancion);
            recommendationsList.innerHTML = `
                <p class="section-label">Recommendations</p>
                <div class="error-message">
                    Esta canción no tiene características de audio disponibles para generar recomendaciones.
                </div>
            `;
            return;
        }
        
        const cancionData = {
            track_id: cancion.props?.track_id || '',
            nombre: cancion.props?.nombre || '',
            artista_ids: cancion.props?.artista_ids || [],
            album_id: cancion.props?.album_id || 0,
            genero_id: cancion.props?.genero_id || 0,
            popularidad: cancion.props?.popularidad || 0,
            duracion_ms: cancion.props?.duracion_ms || 0,
            explicito: cancion.props?.explicito || false,
            caracteristicas_audio: cancion.props.caracteristicas_audio
        };
        
        console.log('📤 Enviando canción para recomendaciones:', {
            nombre: cancionData.nombre,
            tempo: cancionData.caracteristicas_audio?.tempo,
            energy: cancionData.caracteristicas_audio?.energy,
            danceability: cancionData.caracteristicas_audio?.danceability
        });
        
        // Intentar obtener múltiples recomendaciones en una sola llamada
        let recomendaciones = [];
        try {
            const multiResponse = await fetch(`${API_BASE}/recomendaciones?limit=5`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cancionData)
            });
            
            if (multiResponse.ok) {
                const multiRecs = await multiResponse.json();
                recomendaciones = Array.isArray(multiRecs) ? multiRecs : [multiRecs];
            } else {
                throw new Error(`Error ${multiResponse.status}`);
            }
        } catch (e) {
            // Fallback: obtener una recomendación a la vez
            const todasRecomendaciones = [];
            
            // Obtener 5 recomendaciones individuales
            for (let i = 0; i < 5; i++) {
                try {
                    const res = await fetch(`${API_BASE}/recomendaciones`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(cancionData)
                    });
                    if (res.ok) {
                        const rec = await res.json();
                        const trackId = rec.props?.track_id;
                        // Evitar duplicados y evitar la canción original
                        if (trackId && 
                            trackId !== cancion.props?.track_id &&
                            !todasRecomendaciones.find(r => r.props?.track_id === trackId)) {
                            todasRecomendaciones.push(rec);
                        }
                        if (todasRecomendaciones.length >= 5) break;
                    }
                } catch (err) {
                    break;
                }
            }
            recomendaciones = todasRecomendaciones;
        }
        
        state.recomendaciones = recomendaciones;
        mostrarRecomendaciones(recomendaciones);
        
    } catch (error) {
        console.error('Error al obtener recomendaciones:', error);
        recommendationsList.innerHTML = `
            <p class="section-label">Recommendations</p>
            <div class="error-message">
                Error loading recommendations. Please try again.
            </div>
        `;
    } finally {
        state.cargando = false;
    }
}

// Mostrar recomendaciones
function mostrarRecomendaciones(recomendaciones) {
    if (recomendaciones.length === 0) {
        recommendationsList.innerHTML = `
            <p class="section-label">Recommendations</p>
            <div class="empty-state">
                No recommendations found
            </div>
        `;
        return;
    }
    
    recommendationsList.innerHTML = `
        <p class="section-label">Recommendations (${recomendaciones.length})</p>
        ${recomendaciones.map((rec, idx) => crearItemRecomendacion(rec, idx)).join('')}
    `;
    
    // Actualizar botones de like después de renderizar
    setTimeout(() => {
        if (state.usuarioActual) {
            actualizarBotonesLike();
        }
    }, 500);
}

// Crear item de recomendación
function crearItemRecomendacion(cancion, index) {
    const trackId = cancion.props?.track_id || '';
    
    // Verificar si está liked
    const isLiked = state.usuarioActual && state.likesCache[trackId];
    const likeIcon = isLiked ? '❤️' : '🤍';
    const likeClass = isLiked ? 'liked' : '';
    
    if (trackId && trackId.length > 0) {
        return `
            <div style="margin-bottom: var(--spacing-md, 24px);">
                <iframe 
                    src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=1" 
                    width="100%" 
                    height="352" 
                    frameBorder="0" 
                    allowfullscreen="" 
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                    loading="lazy"
                    style="display: block; border: none; margin: 0 0 var(--spacing-sm, 16px) 0; padding: 0; width: 100%; max-width: 100%; overflow: hidden;">
                </iframe>
                <div class="song-actions">
                    <button class="btn-like ${likeClass}" data-track-id="${trackId}" onclick="toggleLike('${trackId}'); event.stopPropagation();">
                        ${likeIcon}
                    </button>
                </div>
            </div>
        `;
    } else {
        // Fallback si no hay track_id
        const spotify = cancion.spotify;
        const nombreCancion = spotify?.name || cancion.props?.nombre || 'Untitled';
        const artistas = spotify?.artists || 'Unknown Artist';
        const albumImage = spotify?.albumImage || null;
        
        return `
            <div class="recommendation-item">
                ${albumImage ? `
                    <div class="album-cover-container">
                        <img src="${albumImage}" alt="${nombreCancion}" class="album-cover" />
                    </div>
                ` : '<div class="album-cover-container" style="background: #f0f0f0;"></div>'}
                
                <div class="song-info">
                    <div class="song-title">${nombreCancion}</div>
                    <div class="song-artist">${artistas}</div>
                    <div class="song-meta">
                        <span class="meta-item">${formatearDuracion(spotify?.duration_ms || cancion.props?.duracion_ms || 0)}</span>
                    </div>
                </div>
            </div>
        `;
    }
}

// Abrir recomendación en nueva pestaña de Spotify
function abrirRecomendacion(trackId) {
    if (trackId) {
        window.open(`https://open.spotify.com/track/${trackId}`, '_blank');
    }
}

// Cargar canciones
async function cargarCanciones(limit = 12) {
    if (state.cargando) return Promise.resolve();
    
    state.cargando = true;
    if (loading) loading.style.display = 'flex';
    
    try {
        const response = await fetch(`${API_BASE}/api/canciones?limit=${limit}`);
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const canciones = await response.json();
        if (canciones.length === 0) {
            if (songsGrid) songsGrid.innerHTML = '<div class="empty-state">No songs found</div>';
            return;
        }
        
        const nuevasCanciones = canciones.map((cancion, idx) => {
            const card = crearTarjetaCancion(cancion, state.canciones.length + idx);
            return card;
        });
        
        if (songsGrid) {
            nuevasCanciones.forEach(card => songsGrid.appendChild(card));
        }
        state.canciones = [...state.canciones, ...canciones];
        state.cancionesOriginales = [...state.cancionesOriginales, ...canciones];
        
        // Verificar likes después de cargar canciones
        if (state.usuarioActual) {
            setTimeout(() => verificarLikes(canciones), 500);
        }
        
    } catch (error) {
        console.error('Error al cargar canciones:', error);
        if (songsGrid) {
            songsGrid.innerHTML = `
                <div class="error-message">
                    Error loading songs. Please refresh the page.
                </div>
            `;
        }
    } finally {
        if (loading) loading.style.display = 'none';
        state.cargando = false;
    }
}

// Event listeners
btnMasCanciones.addEventListener('click', async () => {
    if (state.searchQuery) {
        // Cargar más resultados de búsqueda
        const nuevoOffset = state.searchOffset + 20;
        await buscarEnBaseDeDatos(state.searchQuery, nuevoOffset, true);
    } else {
        // Cargar más canciones normales
        cargarCanciones(12);
    }
});

// Cargar canciones iniciales
window.addEventListener('load', () => {
    cargarCanciones(12);
});

// ==================== AUTENTICACIÓN Y LIKES ====================

// Verificar autenticación al cargar
function verificarAutenticacion() {
    const username = localStorage.getItem('username');
    if (username) {
        state.usuarioActual = { nombre_usuario: username };
        actualizarNavAutenticado();
    } else {
        actualizarNavNoAutenticado();
    }
}

// Actualizar navegación cuando está autenticado
function actualizarNavAutenticado() {
    if (profileNavBtn) {
        profileNavBtn.style.display = 'block';
    }
    if (loginNavBtn) {
        loginNavBtn.style.display = 'none';
    }
}

// Actualizar navegación cuando NO está autenticado
function actualizarNavNoAutenticado() {
    if (profileNavBtn) {
        profileNavBtn.style.display = 'none';
    }
    if (loginNavBtn) {
        loginNavBtn.style.display = 'block';
    }
}

// Mostrar perfil de usuario
async function mostrarPerfil() {
    if (!state.usuarioActual) {
        cambiarVista('login');
        return;
    }
    
    try {
        // Obtener perfil
        const profileRes = await fetch(`${API_BASE}/api/user/profile?username=${state.usuarioActual.nombre_usuario}`, {
            headers: { 'x-username': state.usuarioActual.nombre_usuario }
        });
        
        if (!profileRes.ok) throw new Error('Error al obtener perfil');
        
        const profile = await profileRes.json();
        document.getElementById('profileUsername').textContent = profile.nombre_usuario;
        document.getElementById('likedCount').textContent = profile.canciones_liked_count || 0;
        document.getElementById('acceptedCount').textContent = profile.canciones_aceptadas || 0;
        
        // Cargar canciones liked
        await cargarCancionesLiked();
    } catch (error) {
        console.error('Error al cargar perfil:', error);
    }
}

// Cargar canciones liked
async function cargarCancionesLiked() {
    const grid = document.getElementById('likedSongsGrid');
    if (!state.usuarioActual) {
        grid.innerHTML = '<div class="empty-state">Please log in to see your favorite songs</div>';
        return;
    }
    
    grid.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading favorites...</p></div>';
    
    try {
        const res = await fetch(`${API_BASE}/api/user/likes?username=${state.usuarioActual.nombre_usuario}`, {
            headers: { 'x-username': state.usuarioActual.nombre_usuario }
        });
        
        if (!res.ok) throw new Error('Error al cargar likes');
        
        const data = await res.json();
        
        if (data.canciones.length === 0) {
            grid.innerHTML = '<div class="empty-state">No favorite songs yet. Like songs to add them here!</div>';
            return;
        }
        
        // Convertir documentos de MongoDB a formato Song
        // Para el perfil, crear tarjetas sin botón de recomendaciones
        const cancionesLiked = data.canciones.map((doc, idx) => {
            const cancion = {
                props: {
                    _id: doc._id,
                    track_id: doc.track_id,
                    nombre: doc.nombre,
                    artista_ids: doc.artista_ids || [],
                    album_id: doc.album_id,
                    genero_id: doc.genero_id,
                    popularidad: doc.popularidad || 0,
                    duracion_ms: doc.duracion_ms || 0,
                    explicito: doc.explicito || false,
                    caracteristicas_audio: doc.caracteristicas_audio
                },
                spotify: null
            };
            return crearTarjetaCancionPerfil(cancion, idx);
        });
        
        grid.innerHTML = '';
        cancionesLiked.forEach(card => grid.appendChild(card));
        
        // Verificar likes después de renderizar
        if (state.usuarioActual) {
            setTimeout(() => verificarLikes(data.canciones.map(doc => ({ props: { track_id: doc.track_id } }))), 500);
        }
    } catch (error) {
        console.error('Error al cargar likes:', error);
        grid.innerHTML = '<div class="error-message">Error loading favorite songs</div>';
    }
}

// Login
async function hacerLogin(username, password) {
    try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Error al hacer login');
        }
        
        localStorage.setItem('username', username);
        state.usuarioActual = { nombre_usuario: username };
        mostrarPerfil();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Register
async function hacerRegister(username, password) {
    try {
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Error al registrar');
        }
        
        localStorage.setItem('username', username);
        state.usuarioActual = { nombre_usuario: username };
        mostrarPerfil();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Toggle like
async function toggleLike(trackId) {
    if (!state.usuarioActual) {
        // Redirigir a login en vez de mostrar alert
        cambiarVista('login');
        return;
    }
    
    const actualmenteLiked = state.likesCache[trackId] || false;
    
    try {
        let res;
        if (actualmenteLiked) {
            res = await fetch(`${API_BASE}/api/user/like/${trackId}?username=${state.usuarioActual.nombre_usuario}`, {
                method: 'DELETE',
                headers: { 'x-username': state.usuarioActual.nombre_usuario }
            });
        } else {
            res = await fetch(`${API_BASE}/api/user/like?username=${state.usuarioActual.nombre_usuario}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-username': state.usuarioActual.nombre_usuario
                },
                body: JSON.stringify({ track_id: trackId })
            });
        }
        
        if (!res.ok) throw new Error('Error al actualizar like');
        
        const data = await res.json();
        state.likesCache[trackId] = data.liked;
        
        // Actualizar UI
        actualizarBotonesLike();
        
        // Si estamos en Profile, recargar perfil completo
        if (state.vistaActual === 'profile') {
            await mostrarPerfil();
        }
    } catch (error) {
        console.error('Error al toggle like:', error);
    }
}

    // Verificar likes de canciones
async function verificarLikes(canciones) {
    if (!state.usuarioActual || canciones.length === 0) return Promise.resolve();
    
    try {
        const trackIds = canciones.map(c => c.props?.track_id || c.track_id).filter(Boolean);
        
        for (const trackId of trackIds) {
            if (state.likesCache[trackId] !== undefined) continue;
            
            const res = await fetch(`${API_BASE}/api/user/like/${trackId}?username=${state.usuarioActual.nombre_usuario}`, {
                headers: { 'x-username': state.usuarioActual.nombre_usuario }
            });
            
            if (res.ok) {
                const data = await res.json();
                state.likesCache[trackId] = data.liked;
            }
        }
        
        actualizarBotonesLike();
        return Promise.resolve();
    } catch (error) {
        console.error('Error al verificar likes:', error);
        return Promise.resolve();
    }
}

// Actualizar botones de like en el DOM
function actualizarBotonesLike() {
    document.querySelectorAll('.btn-like').forEach(btn => {
        const trackId = btn.dataset.trackId;
        if (trackId && state.likesCache[trackId]) {
            btn.classList.add('liked');
            btn.innerHTML = '❤️';
        } else {
            btn.classList.remove('liked');
            btn.innerHTML = '🤍';
        }
    });
}

// Event listeners para autenticación
document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const messageEl = document.getElementById('loginMessage');
    
    messageEl.textContent = 'Logging in...';
    messageEl.className = 'auth-message';
    
        const result = await hacerLogin(username, password);
        
        if (result.success) {
            messageEl.textContent = 'Login successful!';
            messageEl.className = 'auth-message success';
            actualizarNavAutenticado();
            // Después de 1 segundo, cambiar a Profile
            setTimeout(() => {
                cambiarVista('profile');
            }, 1000);
        } else {
            messageEl.textContent = result.error || 'Login failed';
            messageEl.className = 'auth-message error';
        }
});

document.getElementById('registerFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const messageEl = document.getElementById('registerMessage');
    
    messageEl.textContent = 'Registering...';
    messageEl.className = 'auth-message';
    
        const result = await hacerRegister(username, password);
        
        if (result.success) {
            messageEl.textContent = 'Registration successful!';
            messageEl.className = 'auth-message success';
            actualizarNavAutenticado();
            // Después de 1 segundo, cambiar a Profile
            setTimeout(() => {
                cambiarVista('profile');
            }, 1000);
        } else {
            messageEl.textContent = result.error || 'Registration failed';
            messageEl.className = 'auth-message error';
        }
});

// Tabs de autenticación
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tabName}Form`).classList.add('active');
    });
});

// Logout
document.getElementById('btnLogout').addEventListener('click', () => {
    localStorage.removeItem('username');
    state.usuarioActual = null;
    state.likesCache = {};
    actualizarNavNoAutenticado();
    cambiarVista('login');
});

// Exportar funciones globalmente para onclick
window.obtenerRecomendaciones = obtenerRecomendaciones;
window.obtenerRecomendacionesExplore = obtenerRecomendacionesExplore;
window.abrirRecomendacion = abrirRecomendacion;
window.toggleLike = toggleLike;

// Verificar autenticación al cargar
window.addEventListener('load', () => {
    verificarAutenticacion();
});

// Minimizar header al hacer scroll
let lastScrollTop = 0;
const scrollThreshold = 50; // Píxeles que debe scrollear antes de minimizar

window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > scrollThreshold) {
        // Si ha scrolleado más de 50px, minimizar
        header.classList.add('minimized');
    } else {
        // Si está en el top, mostrar normal
        header.classList.remove('minimized');
    }
    
    lastScrollTop = scrollTop;
}, { passive: true });

// Botón de regreso - volver a Discover
btnBack.addEventListener('click', () => {
    cambiarVista('discover');
});

// Logo - volver a Discover
logoHome.addEventListener('click', () => {
    cambiarVista('discover');
});

// Accesibilidad: permitir Enter en el logo
logoHome.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        cambiarVista('discover');
    }
});

// Event listeners para búsqueda
searchInput.addEventListener('input', (e) => {
    buscarCanciones(e.target.value);
});

searchClear.addEventListener('click', () => {
    limpiarBusqueda();
});

// Limpiar búsqueda con Escape
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        limpiarBusqueda();
    }
});

async function cargarSurpriseMe() {
    sliderCards.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading surprise recommendations...</p></div>';
    sliderDots.innerHTML = '';
    
    try {
        // Obtener canciones liked del usuario
        const likesRes = await fetch(`${API_BASE}/api/canciones/random`, {
            headers: { 'x-username': state.usuarioActual.nombre_usuario }
        });
        if (!likesRes.ok) {
            throw new Error('Error al obtener canciones sorpresa');
        }
        const cancionesRec = await likesRes.json();
        // Inicializar slider con las recomendaciones
        inicializarRandom([cancionesRec]);        
    } catch (error) {
        console.error('Error al cargar Surprise Me:', error);
        sliderCards.innerHTML = `
            <div class="error-message" style="grid-column: 1 / -1;">
                Error loading personalized recommendations
            </div>
        `;
    }
}

function inicializarRandom(cancionesParaSlider) {
    if (!cancionesParaSlider || cancionesParaSlider.length === 0) return;
    
    // Limpiar slider anterior
    document.getElementById('sliderCardsSurprise').innerHTML = '';
    //document.getElementById('sliderDotsSurprise').innerHTML = '';
    const sliderCardsSurprise = document.getElementById('sliderCardsSurprise');    
    // Crear tarjetas del slider (máximo 10 para performance)
    const cancionesLimitadas = cancionesParaSlider.slice(0, 10);
    cancionesLimitadas.forEach((cancion, index) => {
        // Convertir formato de respuesta a formato Song
        const cancionFormateada = {
            props: cancion.props || cancion,
            spotify: cancion.spotify || null
        };
        sliderCardsSurprise.innerHTML = '';
        const card = crearCardSlider(cancionFormateada, index);
        sliderCardsSurprise.appendChild(card);
        
        // Crear dot
        const dot = document.createElement('div');
        dot.className = 'slider-dot';
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => irASlide(index));
        sliderDots.appendChild(dot);
    });
    
    // Configurar scroll horizontal con snap
    configurarScrollSlider();
    
    // Actualizar dots cuando se hace scroll
    sliderCards.addEventListener('scroll', actualizarDotsDesdeScroll, { passive: true });
    
    // Actualizar botones de like después de un momento
    setTimeout(() => {
        if (state.usuarioActual) {
            actualizarBotonesLike();
        }
    }, 500);
}
