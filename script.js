// --- JAVASCRIPT: Lógica de la Aplicación ---
/*




// Variables globales de estado
let metaCalorias = 2000;
let metaProteinas = 140; // Por defecto para un peso de 70kg (70 * 2g)

let consumidoCalorias = 0;
let consumidoProteinas = 0;

// Elementos del DOM
const perfilForm = document.getElementById('perfil-form');
const alimentoForm = document.getElementById('alimento-form');
const btnReiniciar = document.getElementById('btn-reiniciar');

// EVENTO: Al actualizar el perfil (Datos del usuario)
perfilForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const peso = parseFloat(document.getElementById('peso').value);
    metaCalorias = parseFloat(document.getElementById('objetivo-cal').value);
    metaProteinas = peso * 2; // Regla nutricional: 2g por kg de peso

    actualizarInterfaz();
});

// EVENTO: Al añadir un alimento al plato
alimentoForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Obtenemos el valor del select "calorias,proteinas" (ej: "165,31")
    const selectValue = document.getElementById('alimento').value;
    const [calBase, protBase] = selectValue.split(',').map(Number);
    const cantidad = parseFloat(document.getElementById('cantidad').value);

    // Calculamos la proporción según los gramos ingresados (base por cada 100g)
    const factor = cantidad / 100;
    consumidoCalorias += calBase * factor;
    consumidoProteinas += protBase * factor;

    actualizarInterfaz();
});

// EVENTO: Al pulsar el botón de reiniciar el día
btnReiniciar.addEventListener('click', () => {
    consumidoCalorias = 0;
    consumidoProteinas = 0;
    actualizarInterfaz();
});

// FUNCIÓN: Renderizar los datos en pantalla y actualizar barras de progreso
function actualizarInterfaz() {
    // 1. Actualizar los textos informativos
    document.getElementById('txt-cal').innerText = `${Math.round(consumidoCalorias)} / ${metaCalorias} kcal`;
    document.getElementById('txt-prot').innerText = `${Math.round(consumidoProteinas)} / ${metaProteinas} g`;

    // 2. Calcular los porcentajes correspondientes (con un tope máximo del 100%)
    const pctCal = Math.min((consumidoCalorias / metaCalorias) * 100, 100);
    const pctProt = Math.min((consumidoProteinas / metaProteinas) * 100, 100);

    // 3. Modificar los estilos CSS dinámicamente mediante el DOM
    document.getElementById('fill-cal').style.width = `${pctCal}%`;
    document.getElementById('fill-prot').style.width = `${pctProt}%`;
}

// Inicializar la aplicación mostrando los valores iniciales al cargar la página
actualizarInterfaz();*/



// Determinar si Supabase está correctamente configurado
const isSupabaseConfigured = typeof SUPABASE_URL !== 'undefined' &&
    typeof SUPABASE_ANON_KEY !== 'undefined' &&
    SUPABASE_URL !== "TU_SUPABASE_URL" &&
    SUPABASE_ANON_KEY !== "TU_SUPABASE_ANON_KEY" &&
    supabaseClient !== null;

// Variables de estado (valores de caché en memoria)
let peso = parseFloat(localStorage.getItem('peso')) || 70;
let metaCalorias = parseFloat(localStorage.getItem('metaCalorias')) || 2000;
let metaProteinas = parseFloat(localStorage.getItem('metaProteinas')) || 140;

let consumidoCalorias = 0;
let consumidoProteinas = 0;
let alimentosConsumidos = [];
let todosLosAlimentosGlobal = [];

let fechaSeleccionada = "";
let fechaHoy = "";
let authMode = "login";

// Elementos del DOM
const perfilForm = document.getElementById('perfil-form');
const alimentoForm = document.getElementById('alimento-form');
const fechaInput = document.getElementById('fecha-registro');
const authForm = document.getElementById('auth-form');

// Inicializar campos de entrada con los valores por defecto
document.getElementById('peso').value = peso;
document.getElementById('objetivo-cal').value = metaCalorias;

// --- Gestión de Autenticación con Supabase ---

window.switchAuthTab = function (mode) {
    authMode = mode;
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const submitBtn = document.getElementById('auth-submit-btn');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');

    if (mode === "login") {
        title.textContent = "Iniciar Sesión";
        subtitle.textContent = "Accede para guardar y sincronizar tus datos en la nube";
        submitBtn.textContent = "Entrar";
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
    } else {
        title.textContent = "Registrarse";
        subtitle.textContent = "Crea una cuenta para guardar tus consumos en la nube";
        submitBtn.textContent = "Registrar Cuenta";
        tabLogin.classList.remove('active');
        tabSignup.classList.add('active');
    }
}

if (isSupabaseConfigured) {
    // Escuchar cambios de estado en la autenticación
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('app-section').style.display = 'block';
            document.getElementById('user-badge').style.display = 'flex';
            document.getElementById('user-email-text').textContent = session.user.email;

            // Cargar y sincronizar datos de Supabase
            await inicializarDatosDesdeSupabase(session.user.id);
        } else {
            document.getElementById('auth-section').style.display = 'flex';
            document.getElementById('app-section').style.display = 'none';
            document.getElementById('user-badge').style.display = 'none';

            limpiarCachéLocal();
        }
    });
} else {
    // Si Supabase no está configurado, trabajar en modo local sin auth
    console.log("Supabase credentials not configured. Running in local-only offline mode.");
    document.getElementById('app-section').style.display = 'block';
    document.getElementById('local-mode-banner').style.display = 'block';

    // Cargar datos locales al iniciar
    peso = parseFloat(localStorage.getItem('peso')) || 70;
    metaCalorias = parseFloat(localStorage.getItem('metaCalorias')) || 2000;
    metaProteinas = parseFloat(localStorage.getItem('metaProteinas')) || 140;
    document.getElementById('peso').value = peso;
    document.getElementById('objetivo-cal').value = metaCalorias;
}

// Registrar / Iniciar Sesión submit handler
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorDiv = document.getElementById('auth-error-msg');

    errorDiv.style.display = 'none';
    errorDiv.textContent = "";

    if (!isSupabaseConfigured) return;

    try {
        if (authMode === "login") {
            const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.auth.signUp({ email, password });
            if (error) throw error;
            alert("¡Registro completado! Si Supabase requiere confirmación por correo electrónico, revisa tu bandeja de entrada.");
        }
    } catch (err) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = err.message || "Error al realizar la autenticación.";
    }
});

window.cerrarSesion = async function () {
    if (isSupabaseConfigured) {
        await supabaseClient.auth.signOut();
    }
}

function limpiarCachéLocal() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('nutricalc_log_') ||
            key === 'alimentosConsumidos' ||
            key === 'alimentosPersonalizados' ||
            key === 'peso' ||
            key === 'metaCalorias' ||
            key === 'metaProteinas') {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    peso = 70;
    metaCalorias = 2000;
    metaProteinas = 140;
    consumidoCalorias = 0;
    consumidoProteinas = 0;
    alimentosConsumidos = [];

    document.getElementById('peso').value = peso;
    document.getElementById('objetivo-cal').value = metaCalorias;
    cargarAlimentos();
    actualizarInterfaz(false);
}

// --- Carga y Sincronización de Datos ---

async function inicializarDatosDesdeSupabase(userId) {
    // 1. Cargar Perfil de usuario (peso y metas)
    const { data: perfil, error: errPerfil } = await supabaseClient
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (perfil) {
        peso = Number(perfil.peso);
        metaCalorias = Number(perfil.meta_calorias);
        metaProteinas = Number(perfil.meta_proteinas);

        localStorage.setItem('peso', peso);
        localStorage.setItem('metaCalorias', metaCalorias);
        localStorage.setItem('metaProteinas', metaProteinas);

        document.getElementById('peso').value = peso;
        document.getElementById('objetivo-cal').value = metaCalorias;
    } else if (errPerfil && errPerfil.code === "PGRST116") {
        // No existe perfil, lo creamos con valores actuales
        await supabaseClient.from('perfiles').insert({
            id: userId,
            peso: peso,
            meta_calorias: metaCalorias,
            meta_proteinas: metaProteinas
        });
    }

    // 2. Cargar Alimentos Personalizados
    const { data: alimentosCloud } = await supabaseClient
        .from('alimentos_personalizados')
        .select('*')
        .eq('user_id', userId);

    if (alimentosCloud) {
        const personalizados = alimentosCloud.map(a => ({
            nombre: a.nombre,
            calorias: Number(a.calorias),
            proteinas: Number(a.proteinas)
        }));
        localStorage.setItem('alimentosPersonalizados', JSON.stringify(personalizados));
    }

    // Refrescar selector de alimentos
    cargarAlimentos();

    // 3. Cargar consumos del día seleccionado
    await cargarDatosDeFecha(fechaSeleccionada);
}

async function syncLogToCloud(userId, fecha, logDia) {
    await supabaseClient.from('registros_diarios').upsert({
        user_id: userId,
        fecha: fecha,
        consumido_calorias: logDia.consumidoCalorias,
        consumido_proteinas: logDia.consumidoProteinas,
        alimentos_consumidos: logDia.alimentosConsumidos,
        updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,fecha' });
}

// --- Lógica de la interfaz de la Calculadora ---

// Al actualizar el perfil
perfilForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    peso = parseFloat(document.getElementById('peso').value);
    metaCalorias = parseFloat(document.getElementById('objetivo-cal').value);
    metaProteinas = peso * 2; // Regla de 2g por kg de peso

    localStorage.setItem('peso', peso);
    localStorage.setItem('metaCalorias', metaCalorias);
    localStorage.setItem('metaProteinas', metaProteinas);

    actualizarInterfaz(true);

    // Sincronizar en la nube si está conectado
    if (isSupabaseConfigured) {
        const { data: s } = await supabaseClient.auth.getSession();
        if (s && s.session) {
            await supabaseClient.from('perfiles').upsert({
                id: s.session.user.id,
                peso: peso,
                meta_calorias: metaCalorias,
                meta_proteinas: metaProteinas,
                updated_at: new Date().toISOString()
            });
        }
    }
});

// Al añadir un alimento (CÓDIGO CORREGIDO Y CORRECCIÓN DE ASYNC)
alimentoForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const alimentoSelect = document.getElementById('alimento');
    if (alimentoSelect.value === "") return;

    const index = parseInt(alimentoSelect.value);
    const alimento = todosLosAlimentosGlobal[index];
    const cantidad = parseFloat(document.getElementById('cantidad').value);

    // ¡NUEVO! Capturamos el tipo de comida del desplegable
    const tipoComida = document.getElementById('tipo-comida').value;

    if (!alimento || isNaN(cantidad) || cantidad <= 0) return;

    const factor = cantidad / 100;
    // Redondeamos a 1 decimal para que quede súper limpio
    const calCalculadas = parseFloat((alimento.calorias * factor).toFixed(1));
    const protCalculadas = parseFloat((alimento.proteinas * factor).toFixed(1));

    consumidoCalorias += calCalculadas;
    consumidoProteinas += protCalculadas;

    // Añadir a la lista de consumidos (¡Ahora con categoría e ID único!)
    alimentosConsumidos.push({
        id_interno: Date.now(), // Etiqueta de tiempo para que borrar y clonar no de fallos
        nombre: alimento.nombre,
        cantidad: cantidad,
        calorias: calCalculadas,
        proteinas: protCalculadas,
        comida: tipoComida // <--- Propiedad mágica de clasificación
    });

    // Forzamos la actualización de la interfaz y la subida a Supabase
    await actualizarInterfaz(true);

    // Limpiamos el campo de cantidad para mayor comodidad
    document.getElementById('cantidad').value = 100;
});

// -- FUNCIÓN DE INTERFAZ Y GUARDADO (ADAPTADA CON GRUPOS Y BARRAS) ---
async function actualizarInterfaz(guardarEnSupabase = false) {
    // 1. Pintamos los textos y barras
    const txtCal = document.getElementById('txt-cal');
    const txtProt = document.getElementById('txt-prot');

    if (txtCal) txtCal.innerText = `${Math.round(consumidoCalorias.toFixed(1))} / ${metaCalorias} kcal`;
    if (txtProt) txtProt.innerText = `${consumidoProteinas.toFixed(1)} / ${metaProteinas} g`;
    const pctCal = Math.min((consumidoCalorias / metaCalorias) * 100, 100);
    const pctProt = Math.min((consumidoProteinas / metaProteinas) * 100, 100);

    const barCal = document.getElementById('fill-cal');
    const barProt = document.getElementById('fill-prot');

    if (barCal) barCal.style.width = `${pctCal}%`;
    if (barProt) barProt.style.width = `${pctProt}%`;

    // 2. Pintamos la lista de alimentos CLASIFICADA
    const lista = document.getElementById('lista-consumidos');
    if (lista) {
        lista.innerHTML = ''; // Limpiamos la lista

        const categorias = ["Desayuno", "Almuerzo", "Comida", "Merienda", "Cena", "Otros"];
        const agrupados = { "Desayuno": [], "Almuerzo": [], "Comida": [], "Merienda": [], "Cena": [], "Otros": [] };

        // Agrupamos los alimentos actuales
        alimentosConsumidos.forEach(item => {
            if (item.comida && agrupados[item.comida]) {
                agrupados[item.comida].push(item);
            } else {
                agrupados["Otros"].push(item); // Para alimentos antiguos sin clasificar
            }
        });

        categorias.forEach(cat => {
            const itemsCat = agrupados[cat];
            if (cat === "Otros" && itemsCat.length === 0) return; // Ocultamos "Otros" si está vacío

            // Contenedor de la comida
            const divCat = document.createElement('div');
            divCat.style.marginBottom = '20px';

            // Cabecera con Título y Botón de Clonar
            const cabecera = document.createElement('div');
            cabecera.style.display = 'flex';
            cabecera.style.justifyContent = 'space-between';
            cabecera.style.alignItems = 'center';
            cabecera.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            cabecera.style.paddingBottom = '5px';
            cabecera.style.marginBottom = '10px';

            let icono = cat;
            if (cat === "Desayuno") icono = "🍳 Desayuno";
            if (cat === "Almuerzo") icono = "🥪 Almuerzo";
            if (cat === "Comida") icono = "🍲 Comida";
            if (cat === "Merienda") icono = "🍌 Merienda";
            if (cat === "Cena") icono = "🥩 Cena";

            cabecera.innerHTML = `<h4 style="margin: 0; font-size: 1rem; color: var(--text-color);">${icono}</h4>`;

            // Botón mágico (solo en comidas oficiales)
            if (cat !== "Otros") {
                const btnClonar = document.createElement('button');
                btnClonar.innerHTML = '🔄 Copiar ayer';
                btnClonar.className = 'logout-btn';
                btnClonar.style.padding = '2px 8px';
                btnClonar.style.fontSize = '0.75rem';
                btnClonar.style.border = '1px solid var(--border)';
                btnClonar.onclick = () => clonarComidaDeAyer(cat);
                cabecera.appendChild(btnClonar);
            }
            divCat.appendChild(cabecera);

            // Lista de alimentos de esta categoría
            if (itemsCat.length === 0) {
                divCat.innerHTML += `<p style="font-size: 0.85rem; color: var(--text-muted); font-style: italic; margin: 0 0 0 10px;">Vacío</p>`;
            } else {
                itemsCat.forEach(alimento => {
                    const li = document.createElement('div');
                    li.className = 'alimento-item';
                    li.style.display = 'flex';
                    li.style.justifyContent = 'space-between';
                    li.style.alignItems = 'center';
                    li.style.marginBottom = '6px';

                    // ¡ATENCIÓN A LA FUNCIÓN DE BORRADO! Pasamos el id_interno o el nombre por seguridad si es muy antiguo
                    const idSeguro = alimento.id_interno ? alimento.id_interno : `'${alimento.nombre}'`;

                    li.innerHTML = `
                                <span><strong>${alimento.nombre}</strong> - ${alimento.cantidad}g (${Math.round(alimento.calorias)} kcal, ${Math.round(alimento.proteinas)}g P)</span>
                                <button class="delete-btn" onclick="eliminarAlimentoPorId(${idSeguro})">❌</button>
                            `;
                    divCat.appendChild(li);
                });
            }
            lista.appendChild(divCat);
        });
    }

    // 3. Guardado Local
    const logDia = { consumidoCalorias, consumidoProteinas, alimentosConsumidos };
    localStorage.setItem(`nutricalc_log_${fechaSeleccionada}`, JSON.stringify(logDia));

    // 4. Guardado en Supabase (Usando tu función exacta)
    if (guardarEnSupabase && isSupabaseConfigured) {
        console.log("🕵️‍♂️ Detective: Comprobando sesión del usuario...");
        try {
            const { data: s } = await supabaseClient.auth.getSession();
            if (s && s.session) {
                const userId = s.session.user.id;
                console.log("🚀 Enviando datos a Supabase para el usuario:", userId, "en la fecha:", fechaSeleccionada);
                await syncLogToCloud(userId, fechaSeleccionada, logDia);
                console.log("✅ Sincronización con la nube completada con éxito.");
            }
        } catch (err) {
            console.error("❌ Error crítico al guardar en Supabase:", err);
        }
    }
    // He quitado la llamada a "renderizarAlimentosConsumidos();" porque ya lo hacemos aquí arriba de forma clasificada.
}

// --- FUNCIÓN ÚNICA PARA RENDERIZAR LA LISTA VISUAL ---
function renderizarAlimentosConsumidos() {
    const listaConsumidos = document.getElementById('lista-consumidos');
    if (!listaConsumidos) return;

    listaConsumidos.innerHTML = '';

    if (alimentosConsumidos.length === 0) {
        listaConsumidos.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #94a3b8; font-style: italic; font-size: 0.9rem;">
                        No has añadido alimentos para esta fecha.
                    </div>
                `;
        return;
    }

    alimentosConsumidos.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'food-item';
        div.innerHTML = `
                    <div class="food-details">
                        <span class="food-name">${item.nombre}</span>
                        <span class="food-macros">${item.cantidad}g -> ${Math.round(item.calorias)} kcal / ${item.proteinas.toFixed(1)}g prot</span>
                    </div>
                    <button class="delete-btn" onclick="eliminarAlimentoConsumido(${index})">Eliminar</button>
                `;
        listaConsumidos.appendChild(div);
    });
}

// --- ACCIONES GLOBALES (ELIMINAR Y REINICIAR) ---
window.eliminarAlimentoConsumido = async function (index) {
    const item = alimentosConsumidos[index];
    if (!item) return;

    consumidoCalorias = Math.max(0, consumidoCalorias - item.calorias);
    consumidoProteinas = Math.max(0, consumidoProteinas - item.proteinas);
    alimentosConsumidos.splice(index, 1);

    // Al eliminar también actualizamos la nube pasándole true
    await actualizarInterfaz(true);
}

window.reiniciarDia = async function () {
    if (confirm(`¿Estás seguro de que quieres reiniciar el progreso para el día ${fechaSeleccionada}?`)) {
        consumidoCalorias = 0;
        consumidoProteinas = 0;
        alimentosConsumidos = [];
        localStorage.removeItem(`nutricalc_log_${fechaSeleccionada}`);

        if (isSupabaseConfigured) {
            const { data: s } = await supabaseClient.auth.getSession();
            if (s && s.session) {
                await supabaseClient
                    .from('registros_diarios')
                    .delete()
                    .eq('user_id', s.session.user.id)
                    .eq('fecha', fechaSeleccionada);
            }
        }
        await actualizarInterfaz(false);
    }
}

// --- CARGA DE ALIMENTOS DISPONIBLES ---
function cargarAlimentos(filtro = "") {
    const alimentosSelect = document.getElementById('alimento');
    if (!alimentosSelect) return;
    alimentosSelect.innerHTML = '';

    const alimentosPorDefecto = [

    ];

    const alimentosPersonalizados = JSON.parse(localStorage.getItem('alimentosPersonalizados')) || [];
    todosLosAlimentosGlobal = [...alimentosPorDefecto, ...alimentosPersonalizados];

    const query = filtro.toLowerCase().trim();
    let matches = 0;

    todosLosAlimentosGlobal.forEach((alimento, index) => {
        if (alimento.nombre.toLowerCase().includes(query)) {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${alimento.nombre} (100g) -> ${alimento.calorias}kcal / ${alimento.proteinas}g prot`;
            alimentosSelect.appendChild(option);
            matches++;
        }
    });

    if (matches === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No se encontraron alimentos";
        alimentosSelect.appendChild(option);
    }
}

// --- CARGA DE DATOS POR FECHA ---
async function cargarDatosDeFecha(fecha) {
    let logDia = null;

    if (isSupabaseConfigured) {
        const { data: s } = await supabaseClient.auth.getSession();
        if (s && s.session) {
            const userId = s.session.user.id;
            const { data: logCloud } = await supabaseClient
                .from('registros_diarios')
                .select('*')
                .eq('user_id', userId)
                .eq('fecha', fecha)
                .maybeSingle();

            if (logCloud) {
                logDia = {
                    consumidoCalorias: Number(logCloud.consumido_calorias),
                    consumidoProteinas: Number(logCloud.consumido_proteinas),
                    alimentosConsumidos: logCloud.alimentos_consumidos || []
                };
                localStorage.setItem(`nutricalc_log_${fecha}`, JSON.stringify(logDia));
            }
        }
    }

    if (!logDia) {
        logDia = JSON.parse(localStorage.getItem(`nutricalc_log_${fecha}`));
    }

    if (!logDia) {
        logDia = {
            consumidoCalorias: 0,
            consumidoProteinas: 0,
            alimentosConsumidos: []
        };
    }

    consumidoCalorias = logDia.consumidoCalorias;
    consumidoProteinas = logDia.consumidoProteinas;
    alimentosConsumidos = logDia.alimentosConsumidos;

    await actualizarInterfaz(false);
}

// --- INICIALIZACIÓN DE DISPARADORES Y EVENTOS ---
const buscadorAlimento = document.getElementById('buscador-alimento');
if (buscadorAlimento) {
    buscadorAlimento.addEventListener('input', (e) => {
        cargarAlimentos(e.target.value);
    });
}

if (fechaInput) {
    fechaInput.addEventListener('change', async (e) => {
        fechaSeleccionada = e.target.value;
        await cargarDatosDeFecha(fechaSeleccionada);
    });
}

// Configurar fecha inicial de hoy por defecto
const hoy = new Date();
const yyyy = hoy.getFullYear();
const mm = String(hoy.getMonth() + 1).padStart(2, '0');
const dd = String(hoy.getDate()).padStart(2, '0');
fechaHoy = `${yyyy}-${mm}-${dd}`;

if (fechaInput) fechaInput.value = fechaHoy;
fechaSeleccionada = fechaHoy;

// Función de arranque de la aplicación
async function inicializarApp() {
    cargarAlimentos();

    if (isSupabaseConfigured) {
        const { data: s } = await supabaseClient.auth.getSession();
        if (s && s.session) {
            await cargarDatosDeFecha(fechaSeleccionada);
            return;
        }
    }
    await cargarDatosDeFecha(fechaSeleccionada);
}



// --- CONTROLADOR DE VISTAS ACTUALIZADO (AJUSTADO PARA FLEXBOX) ---
const btnVistaDiario = document.getElementById('btn-vista-diario');
const btnVistaDatos = document.getElementById('btn-vista-datos');
const vistaDiario = document.getElementById('vista-diario');
const vistaDatos = document.getElementById('vista-datos');

btnVistaDiario.addEventListener('click', () => {
    vistaDiario.style.display = 'grid';
    vistaDatos.style.display = 'none';

    // Estilo activo para Diario, transparente para Perfil
    btnVistaDiario.className = 'btn-blue';
    btnVistaDatos.className = 'logout-btn';
    btnVistaDatos.style.background = 'transparent';
});

btnVistaDatos.addEventListener('click', () => {
    vistaDiario.style.display = 'none';
    vistaDatos.style.display = 'flex'; // ¡Cambiado de 'block' a 'flex' para activar el gap!

    // Estilo activo para Perfil, transparente para Diario
    btnVistaDatos.className = 'btn-blue';
    btnVistaDiario.className = 'logout-btn';
    btnVistaDiario.style.background = 'transparent';
});

// --- GESTIÓN DE CAMBIO DE CONTRASEÑA EN LA NUBE ---
const passwordForm = document.getElementById('password-form');
const nuevaPasswordInput = document.getElementById('nueva-password');
const confirmarPasswordInput = document.getElementById('confirmar-password');
const passwordMsg = document.getElementById('password-msg');

if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evitamos que la página se recargue

        const nuevaPassword = nuevaPasswordInput.value;
        const confirmarPassword = confirmarPasswordInput.value;

        // 1. Validar que las contraseñas coincidan localmente
        if (nuevaPassword !== confirmarPassword) {
            passwordMsg.style.display = 'block';
            passwordMsg.style.backgroundColor = 'var(--danger-light)';
            passwordMsg.style.color = '#fca5a5';
            passwordMsg.style.border = '1px solid hsla(350, 80%, 55%, 0.2)';
            passwordMsg.innerText = "❌ Las contraseñas introducidas no coinciden.";
            return;
        }

        // 2. Intentar actualizar en Supabase
        if (isSupabaseConfigured) {
            try {
                // Método oficial del SDK de Supabase para actualizar datos del usuario logueado
                const { data, error } = await supabaseClient.auth.updateUser({
                    password: nuevaPassword
                });

                if (error) {
                    passwordMsg.style.display = 'block';
                    passwordMsg.style.backgroundColor = 'var(--danger-light)';
                    passwordMsg.style.color = '#fca5a5';
                    passwordMsg.style.border = '1px solid hsla(350, 80%, 55%, 0.2)';
                    passwordMsg.innerText = "❌ Error de Supabase: " + error.message;
                } else {
                    // Éxito rotundo
                    passwordMsg.style.display = 'block';
                    passwordMsg.style.backgroundColor = 'var(--primary-light)';
                    passwordMsg.style.color = '#34d399';
                    passwordMsg.style.border = '1px solid hsla(142, 72%, 40%, 0.2)';
                    passwordMsg.innerText = "✅ ¡Contraseña actualizada con éxito!";

                    // Limpiamos los campos del formulario
                    passwordForm.reset();

                    // Ocultamos el mensaje automáticamente a los 4 segundos
                    setTimeout(() => {
                        passwordMsg.style.display = 'none';
                    }, 4000);
                }
            } catch (err) {
                console.error(err);
                alert("Hubo un problema de conexión con el servidor.");
            }
        } else {
            alert("Supabase no está configurado de forma correcta.");
        }
    });
}

// --- NUEVA FUNCIÓN DE BORRADO SEGURO ---
async function eliminarAlimentoPorId(idObtenido) {
    // Buscamos cuál es el índice real del elemento en el array global
    const indexReal = alimentosConsumidos.findIndex(a => a.id_interno === idObtenido || a.nombre === idObtenido);

    if (indexReal !== -1) {
        const item = alimentosConsumidos[indexReal];
        // Restamos macros
        consumidoCalorias -= item.calorias;
        consumidoProteinas -= item.proteinas;
        // Prevenimos que baje de 0
        if (consumidoCalorias < 0) consumidoCalorias = 0;
        if (consumidoProteinas < 0) consumidoProteinas = 0;

        // Lo sacamos del array
        alimentosConsumidos.splice(indexReal, 1);

        // Actualizamos pantalla y nube
        await actualizarInterfaz(true);
    }
}

// --- FUNCIÓN CLONAR (ADAPTADA A TU CÓDIGO) ---
async function clonarComidaDeAyer(categoria) {
    if (!isSupabaseConfigured) return;

    // Calculamos ayer
    const fechaObj = new Date(fechaSeleccionada);
    fechaObj.setDate(fechaObj.getDate() - 1);
    const yyyy = fechaObj.getFullYear();
    const mm = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const dd = String(fechaObj.getDate()).padStart(2, '0');
    const fechaAyerStr = `${yyyy}-${mm}-${dd}`;

    try {
        const { data: s } = await supabaseClient.auth.getSession();
        if (!s || !s.session) return;
        const userId = s.session.user.id;

        // Buscamos ayer en tu tabla 'diarios'
        const { data, error } = await supabaseClient
            .from('diarios')
            .select('*')
            .eq('user_id', userId)
            .eq('fecha', fechaAyerStr)
            .single();

        if (error || !data || !data.datos || !data.datos.alimentosConsumidos) {
            alert(`No se encontraron registros en el día de ayer.`);
            return;
        }

        // Filtramos la comida elegida (ej. Desayuno)
        const alimentosDeAyer = data.datos.alimentosConsumidos;
        const clonados = alimentosDeAyer.filter(item => item.comida === categoria);

        if (clonados.length === 0) {
            alert(`Ayer no registraste nada en: ${categoria}`);
            return;
        }

        // Los añadimos al día actual generando un ID nuevo a cada uno
        clonados.forEach(item => {
            const copia = { ...item, id_interno: Date.now() + Math.random() };
            alimentosConsumidos.push(copia);
            consumidoCalorias += copia.calorias;
            consumidoProteinas += copia.proteinas;
        });

        // Como usamos tu función actualizarInterfaz(true), esto ya invoca tu syncLogToCloud automático
        await actualizarInterfaz(true);

    } catch (err) {
        console.error("Error al clonar:", err);
    }
}



// ¡Arrancamos la aplicación limpia!
inicializarApp();
