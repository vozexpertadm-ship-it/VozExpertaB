// Ocultar botón al inicio
document.getElementById("button-ejecutar").style.display = 'none';

let id_Cuestionario = null;

// ==========================================
// Obtener lista de cuestionarios
// ==========================================
fetch('/cuestionarios-todos')
  .then(res => res.json())
  .then(data => {
    const table = document.getElementById('cuestionarios-table');

    data.forEach(c => {
      const row = document.createElement('tr');
      row.classList.add('cursor-pointer');

      row.innerHTML = `
        <td>${c.nombre}</td>
        <td>${c.fecha_apertura.slice(0, 10)}</td>
        <td>${c.fecha_cierre.slice(0, 10)}</td>
      `;

      row.addEventListener('click', () => cargarPreguntas(c.id_cuestionario));
      table.appendChild(row);
    });

    // Mostrar contenedor
    document.getElementById('evaluacion-container').style.display = 'block';
  })
  .catch(err => console.error("Error al obtener cuestionarios:", err));


// ==========================================
// Cargar preguntas del cuestionario
// ==========================================
function cargarPreguntas(id) {

  id_Cuestionario = id;

  fetch('/get-cuestionarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idCuestionario: id })
  })
  .then(res => res.json())
  .then(preguntas => {

    const div = document.getElementById('preview-contenido');
    div.innerHTML = '';

    preguntas.forEach((p, i) => {
      const bloque = document.createElement('div');
      bloque.className = 'mb-3 p-3 border rounded bg-light';

      bloque.innerHTML = `
        <strong>${i + 1}. ${p.texto_pregunta}</strong><br>
        <em class="text-muted">Tipo: ${p.tipo_pregunta}</em>
      `;

      div.appendChild(bloque);
    });

    // Mostrar botón cuando ya hay cuestionario seleccionado
    document.getElementById("button-ejecutar").style.display = 'block';
  })
  .catch(err => console.error("Error al cargar preguntas:", err));
}


// ==========================================
// Enviar correo de strikes
// ==========================================
function MensajeStrike() {

  if (!id_Cuestionario) {
    alert("No hay cuestionario seleccionado.");
    return;
  }

  fetch('/mensaje-strike', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_cuestionario: id_Cuestionario })
  })
  .then(res => res.ok ? res.json() : Promise.reject("Error en la solicitud"))
  .then(data => alert(data.mensaje || 'Correo enviado correctamente.'))
  .catch(error => {
    console.error('Error al enviar mensaje-strike:', error);
    alert('Ocurrió un error al enviar el correo.');
  });
}


// ==========================================
// Ejecutar evaluación
// ==========================================
function ejecutarEvaluacion() {

  if (!id_Cuestionario) {
    alert("No hay cuestionario seleccionado.");
    return;
  }

  const btn = document.querySelector('#evaluacion-container button');

  if (!confirm("¿Estás seguro de que deseas ejecutar la evaluación ahora?")) return;

  fetch('/verificar-evaluacion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_cuestionario: id_Cuestionario })
  })
  .then(res => res.json())
  .then(data => {

    if (data.yaEvaluado) {
      alert("Este cuestionario ya ha sido evaluado. No puedes ejecutar la evaluación dos veces.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Evaluando...";

    fetch('/ejecutar-evaluacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_cuestionario: id_Cuestionario })
    })
    .then(res => res.json())
    .then(data => {

      alert(data.mensaje || "Evaluación ejecutada exitosamente.");

      btn.textContent = "Ejecutar Evaluación";
      btn.disabled = false;
      btn.style.display = "none";


      MensajeStrike();
    })
    .catch(err => {
      console.error('Error al ejecutar evaluación:', err);
      alert("Hubo un error durante la evaluación.");
      btn.textContent = "Ejecutar Evaluación";
      btn.disabled = false;
    });
  })
  .catch(err => {
    console.error('Error al verificar evaluación previa:', err);
    alert("Error al verificar si este cuestionario ya fue evaluado.");
  });
}
