let cuestionarioActivoId = null;

// Cargar cuestionarios al inicio
document.addEventListener('DOMContentLoaded', () => {
  fetch('/cuestionarios-activos')
    .then(response => response.json())
    .then(data => {
      const tableBody = document.getElementById('cuestionarioTable');
      tableBody.innerHTML = '';
      data.forEach(c => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${c.id_cuestionario}</td>
          <td>${c.nombre}</td>
          <td>${c.fecha_creacion}</td>
        `;
        row.style.cursor = "pointer";
        row.addEventListener('click', () => loadcuestionarioDetails(c.id_cuestionario));
        tableBody.appendChild(row);
      });
    });
});

// Cargar detalles del cuestionario seleccionado
function loadcuestionarioDetails(cuestionarioId) {
  cuestionarioActivoId = cuestionarioId;
  fetch(`/cuestionarios/${cuestionarioId}`)
    .then(res => res.json())
    .then(data => {
      const detalles = document.getElementById('cuestionarioDetails');
      detalles.innerHTML = `
        <div id="info-basica-cuestionario" class="card-body">
          <h2 class="card-title mb-3">Detalles del Cuestionario</h2>
          <p><strong>ID:</strong> ${data.id_cuestionario}</p>
          <p><strong>Nombre:</strong> ${data.nombre}</p>
          <div class="mb-3">
            <label class="form-label">Fecha de apertura:</label>
            <input type="date" class="form-control" id="fechaApertura" value="${data.fecha_apertura.split('T')[0]}" disabled>
          </div>
          <div class="mb-3">
            <label class="form-label">Fecha de cierre:</label>
            <input type="date" class="form-control" id="fechaCierre" value="${data.fecha_cierre.split('T')[0]}" disabled>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-danger" onclick="confirmarEliminarCuestionario(${data.id_cuestionario})">Eliminar</button>
            <button class="btn btn-warning" onclick="expandirModificacion(${data.id_cuestionario})">Modificar</button>
          </div>
        </div>
        <div id="modificacion-completa" class="p-3"></div>
      `;
    })
    .catch(error => console.error('Error al cargar detalles del cuestionario:', error));
}

// ====================
// FUNCIONES CRUD
// ====================

function confirmarEliminarCuestionario(id) {
  if (confirm("¿Estás seguro de que quieres eliminar este cuestionario?")) {
    fetch(`/cuestionarios/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(result => {
        alert(result.exito ? "Cuestionario eliminado correctamente" : "Error al eliminar el cuestionario");
        if (result.exito) location.reload();
      })
      .catch(error => console.error('Error al eliminar cuestionario:', error));
  }
}

function expandirModificacion(cuestionarioId) {
  document.getElementById('info-basica-cuestionario').style.display = 'none';
  fetch(`/cuestionarios/${cuestionarioId}`)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('modificacion-completa');
      container.innerHTML = `
        <div class="mb-3">
          <label class="form-label">Modificar fecha de apertura:</label>
          <input type="date" class="form-control" id="fechaAperturaEdit" value="${data.fecha_apertura.split('T')[0]}">
        </div>
        <div class="mb-3">
          <label class="form-label">Modificar fecha de cierre:</label>
          <input type="date" class="form-control" id="fechaCierreEdit" value="${data.fecha_cierre.split('T')[0]}">
        </div>
        <button class="btn btn-success mb-4" onclick="guardarFechas(${data.id_cuestionario})">Guardar fechas</button>
        <div id="preguntas-container"></div>
      `;
      cargarPreguntas(cuestionarioId);
    });
}

function guardarFechas(idCuestionario) {
  const fechaApertura = document.getElementById('fechaAperturaEdit').value;
  const fechaCierre = document.getElementById('fechaCierreEdit').value;
  if (!fechaApertura && !fechaCierre) {
    alert("Debes modificar al menos una fecha.");
    return;
  }

  const body = {};
  if (fechaApertura) body.fecha_apertura = fechaApertura;
  if (fechaCierre) body.fecha_cierre = fechaCierre;

  fetch(`/cuestionarios/${idCuestionario}/fechas`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
    .then(res => res.json())
    .then(result => {
      alert(result.exito ? "Fechas actualizadas correctamente" : "Error al actualizar fechas");
      if (result.exito) expandirModificacion(idCuestionario);
    })
    .catch(error => console.error('Error al guardar fechas:', error));
}

// ====================
// FUNCIONES DE PREGUNTAS
// ====================

function cargarPreguntas(cuestionarioId) {
  fetch('/get-cuestionarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idCuestionario: cuestionarioId })
  })
    .then(res => res.json())
    .then(preguntas => {
      const container = document.getElementById('preguntas-container');
      container.innerHTML = '<h4>Preguntas:</h4>';
      preguntas.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'border rounded p-3 mb-3';
        div.innerHTML = `
          <label><strong>Pregunta ${i + 1}:</strong></label>
          <input type="text" id="pregunta-${p.id_pregunta}" class="form-control mb-2" value="${p.texto_pregunta}">
          <div class="d-flex gap-2">
            <button class="btn btn-primary" onclick="guardarPregunta('${p.id_pregunta}', '${p.tipo_pregunta}')">Guardar</button>
            <button class="btn btn-danger" onclick="eliminarPregunta('${p.id_pregunta}', '${p.tipo_pregunta}')">Eliminar</button>
          </div>
        `;
        container.appendChild(div);
      });

      container.innerHTML += `
        <hr>
        <h4>Agregar nueva pregunta:</h4>
        <input type="text" id="nuevaPreguntaTexto" class="form-control mb-3" placeholder="Escribe la nueva pregunta">
        <select id="nuevaPreguntaTipo" class="form-select mb-3" onchange="mostrarCamposOpciones(this.value)">
          <option value="text">Texto libre</option>
          <option value="multiple">Múltiple</option>
          <option value="scale">Escala 1-5</option>
          <option value="matrix">Matriz 1-5</option>
        </select>
        <div id="opcionesContainer" class="mb-3"></div>
        <button class="btn btn-success" onclick="agregarPregunta(${cuestionarioId})">Agregar</button>
      `;
    })
    .catch(error => console.error('Error al cargar preguntas:', error));
}

function mostrarCamposOpciones(valor) {
  const contenedor = document.getElementById('opcionesContainer');
  contenedor.innerHTML = '';
  if (valor === 'multiple') {
    contenedor.innerHTML = `<label class="form-label">Opciones:</label>`;
    for (let i = 1; i <= 3; i++) {
      contenedor.innerHTML += `<input type="text" class="form-control opcion-multiple mb-2" placeholder="Opción ${i}">`;
    }
  }
}
