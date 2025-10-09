function addQuestion() {
  const container = document.getElementById('questions-container');
  const block = document.createElement('div');
  block.className = 'question-block border rounded p-3 mt-3 bg-white shadow-sm';
  block.innerHTML = `
    <label class="form-label fw-bold">Texto de la pregunta</label>
    <input type="text" name="questionText" class="form-control mb-2" required>

    <label class="form-label fw-bold">Tipo de respuesta</label>
    <select name="answerType" class="form-select mb-3" onchange="toggleOptions(this)">
      <option value="text">Texto libre</option>
      <option value="multiple">Opción múltiple</option>
      <option value="scale">Escala 1-5</option>
      <option value="matrix">Matriz 1-5</option>
    </select>

    <div class="options-container mb-3" style="display:none">
      <label class="form-label fw-bold">Opciones:</label>
      <div class="option-list mb-2">
        <input type="text" class="form-control option-input mb-2" placeholder="Opción 1">
        <input type="text" class="form-control option-input mb-2" placeholder="Opción 2">
      </div>
      <button type="button" class="btn btn-sm btn-outline-secondary" onclick="addOption(this)">Añadir opción</button>
    </div>

    <button type="button" class="btn btn-sm btn-outline-danger mt-2" onclick="removeQuestion(this.parentElement)">
      🗑 Eliminar pregunta
    </button>
  `;
  container.appendChild(block);
}

function toggleOptions(selectElement) {
  const optionsDiv = selectElement.parentElement.querySelector('.options-container');
  optionsDiv.style.display = (selectElement.value === 'multiple') ? 'block' : 'none';
}

function addOption(button) {
  const container = button.parentElement.querySelector('.option-list');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-control option-input mb-2';
  input.placeholder = `Opción ${container.children.length + 1}`;
  container.appendChild(input);
}

function removeQuestion(questionDiv) {
  questionDiv.remove();
}

function handleFormSubmit(event) {
  event.preventDefault();

  const nombre = document.getElementById('nombre-cuestionario').value.trim();
  const fechaApertura = document.getElementById('fechaApertura').value;
  const fechaCierre = document.getElementById('fechaCierre').value;
  const Umbral = Number(document.getElementById('umbral-cuestionario').value);

  if (!nombre || !fechaApertura || !fechaCierre) {
    alert("Por favor completa el nombre del cuestionario y las fechas.");
    return;
  }

  const preguntas = [];
  document.querySelectorAll('.question-block').forEach(block => {
    const texto = block.querySelector('input[name="questionText"]').value.trim();
    const tipo = block.querySelector('select[name="answerType"]').value;

    if (!texto) return;

    const pregunta = { questionText: texto, answerType: tipo };

    if (tipo === 'multiple') {
      const opciones = Array.from(block.querySelectorAll('.option-input'))
                            .map(opt => opt.value.trim())
                            .filter(opt => opt !== '');
      if (opciones.length < 2) {
        alert("Cada pregunta de opción múltiple debe tener al menos 2 opciones.");
        return;
      }
      pregunta.options = opciones;
    }

    preguntas.push(pregunta);
  });

  if (preguntas.length === 0) {
    alert("Debes agregar al menos una pregunta.");
    return;
  }

  const payload = {
    nombreCuestionario: nombre,
    fechaCreacion: new Date().toISOString().split('T')[0],
    fechaApertura,
    fechaCierre,
    preguntas,
    Umbral
  };

  fetch('/guardar-cuestionario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(response => {
    if (response.exito) {
      alert("Cuestionario guardado exitosamente.");
      window.location.href = "AdministrarCuestionarios.html";
    } else {
      alert("Hubo un error al guardar el cuestionario.");
    }
  })
  .catch(err => {
    console.error("Error:", err);
    alert("Error al guardar el cuestionario.");
  });
}
