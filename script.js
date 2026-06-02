// --- JAVASCRIPT: Lógica de la Aplicación ---





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
actualizarInterfaz();