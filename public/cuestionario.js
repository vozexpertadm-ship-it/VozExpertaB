let preguntasCargadas = [];
let cuestionarioCargado;
const idUsuarioLogueado = localStorage.getItem('id_usuario');

// Cargar encuestas disponibles
fetch('/get-idcuestionarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fechaActual: new Date().toISOString().slice(0, 10) })
})
.then(response => response.json())
.then(data => {
    const tableBody = document.getElementById('userTable');
    tableBody.innerHTML = '';

    data.forEach(cuestionario => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${cuestionario.id_cuestionario}</td>
            <td>${cuestionario.nombre}</td>
            <td>${cuestionario.fecha_apertura.slice(0, 10)}</td>
            <td>${cuestionario.fecha_cierre.slice(0, 10)}</td>
        `;
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => loadQuestionnaireDetails(cuestionario.id_cuestionario));
        tableBody.appendChild(row);
    });
})
.catch(error => console.error('Error al cargar los cuestionarios disponibles:', error));

// Cargar preguntas del cuestionario seleccionado
function loadQuestionnaireDetails(questId) {
    fetch('/verificar-respuesta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id_usuario: parseInt(idUsuarioLogueado),
            id_cuestionario: questId
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.yaContestado) {
            alert('Ya has respondido este cuestionario. Solo se permite una participación.');
            return;
        }

        cuestionarioCargado = questId;

        fetch('/get-cuestionarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idCuestionario: questId })
        })
        .then(res => res.json())
        .then(preguntas => {
            const preview = document.getElementById('questionnaire-preview');
            preview.innerHTML = '';

            preguntasCargadas = preguntas.map(p => ({
                id: p.id_pregunta,
                orden: p.orden,
                tipo: p.tipo_pregunta
            }));

            preguntas.forEach((pregunta, index) => {
                const div = document.createElement('div');
                div.classList.add('mb-4', 'p-3', 'border', 'rounded');

                const titulo = document.createElement('p');
                titulo.classList.add('fw-bold');
                titulo.textContent = `${index + 1}. ${pregunta.texto_pregunta}`;
                div.appendChild(titulo);

                switch (pregunta.tipo_pregunta) {
                    case 'texto': {
                        const input = document.createElement('textarea');
                        input.required = true;
                        input.name = `pregunta_${pregunta.orden}`;
                        input.classList.add('form-control');
                        input.rows = 5;
                        div.appendChild(input);
                        break;
                    }
                    case 'multiple': {
                        fetch('/get-opcionesM', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ idPregunta: pregunta.id_pregunta })
                        })
                        .then(res => res.json())
                        .then(opcionesP => {
                            opcionesP.forEach((opcion, i) => {
                                const formCheck = document.createElement('div');
                                formCheck.classList.add('form-check');
                                const input = document.createElement('input');
                                input.required = true;
                                input.type = 'radio';
                                input.name = `pregunta_${pregunta.orden}`;
                                input.value = opcion.id_opcionpregunta;
                                input.classList.add('form-check-input');
                                input.id = `opcion_${pregunta.id_pregunta}_${i}`;
                                const label = document.createElement('label');
                                label.classList.add('form-check-label');
                                label.htmlFor = input.id;
                                label.textContent = opcion.opcionpregunta;
                                formCheck.appendChild(input);
                                formCheck.appendChild(label);
                                div.appendChild(formCheck);
                            });
                        });
                        break;
                    }
                    case 'scale': {
                        for (let i = 1; i <= 5; i++) {
                            const label = document.createElement('label');
                            label.classList.add('me-3');
                            const input = document.createElement('input');
                            input.required = true;
                            input.type = 'radio';
                            input.name = `pregunta_${pregunta.orden}`;
                            input.value = i;
                            label.appendChild(input);
                            label.append(` ${i} `);
                            div.appendChild(label);
                        }
                        break;
                    }
                    case 'matrix': {
                        const table = document.createElement('table');
                        table.classList.add('table', 'table-bordered', 'text-center');
                        const thead = document.createElement('thead');
                        const headRow = document.createElement('tr');
                        headRow.innerHTML = '<th>Nombre</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>NA</th>';
                        thead.appendChild(headRow);
                        table.appendChild(thead);

                        const tbody = document.createElement('tbody');
                        fetch('/usuarios-matrix')
                        .then(response => response.json())
                        .then(data => {
                            data.forEach(user => {
                                const row = document.createElement('tr');
                                const nameCell = document.createElement('td');
                                nameCell.textContent = `${user.nombre} ${user.apellido}`;
                                row.appendChild(nameCell);

                                for (let i = 1; i <= 6; i++) {
                                    const radioCell = document.createElement('td');
                                    const input = document.createElement('input');
                                    input.required = true;
                                    input.type = 'radio';
                                    input.name = `pregunta_${pregunta.orden}_usuario_${user.id_usuario}`;
                                    input.value = i === 6 ? 0 : i;
                                    radioCell.appendChild(input);
                                    row.appendChild(radioCell);
                                }

                                tbody.appendChild(row);
                            });
                            table.appendChild(tbody);
                            div.appendChild(table);
                        });
                        break;
                    }
                }

                preview.appendChild(div);
            });
        });
    })
    .catch(error => {
        console.error('Error al verificar respuesta previa:', error);
        alert('No se pudo verificar la participación anterior.');
    });
}

// Enviar respuestas
function submitResponses() {
    if (!idUsuarioLogueado) return alert('No estás logueado.');
    if (!cuestionarioCargado) return alert('No has seleccionado ningún cuestionario.');

    const respuestas = [];

    preguntasCargadas.forEach(pregunta => {
        const nombreCampo = `pregunta_${pregunta.orden}`;
        const tipo = pregunta.tipo;

        if (tipo === 'texto') {
            const textarea = document.querySelector(`textarea[name="${nombreCampo}"]`);
            if (textarea && textarea.value.trim() !== "")
                respuestas.push({
                    id_preguntac: pregunta.id,
                    respuesta: textarea.value.trim(),
                    tipo: 'texto',
                    id_cuestionario: cuestionarioCargado
                });
        } else if (tipo === 'multiple' || tipo === 'scale') {
            const seleccion = document.querySelector(`input[name="${nombreCampo}"]:checked`);
            if (seleccion)
                respuestas.push({
                    id_pregunta: pregunta.id,
                    respuesta: seleccion.value,
                    tipo: tipo
                });
        } else if (tipo === 'matrix') {
            const inputsMatrix = document.querySelectorAll(`input[name^="${nombreCampo}_usuario_"]:checked`);
            inputsMatrix.forEach(input => {
                const match = input.name.match(/^pregunta_(\d+)_usuario_(\d+)$/);
                if (match) {
                    const id_usuario_objetivo = parseInt(match[2]);
                    respuestas.push({
                        id_pregunta: pregunta.id,
                        id_usuario: parseInt(idUsuarioLogueado),
                        id_usuario_objetivo: id_usuario_objetivo,
                        respuesta: input.value,
                        tipo: 'matrix'
                    });
                }
            });
        }
    });

    if (respuestas.length === 0) return alert('No has respondido ninguna pregunta.');

    const respuestasFiltradas = respuestas.filter(r =>
        r.respuesta && r.respuesta !== "undefined"
    );

    fetch('/guardar-respuestas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id_usuario: parseInt(idUsuarioLogueado),
            id_cuestionario: cuestionarioCargado,
            respuestas: respuestasFiltradas
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.exito) {
            alert('Respuestas guardadas con éxito.');
            document.getElementById('questionnaire-preview').innerHTML = '';
            cuestionarioCargado = null;
        } else alert('Error al guardar las respuestas.');
    })
    .catch(err => {
        console.error('Error al enviar respuestas:', err);
        alert('Error de conexión con el servidor.');
    });
}

document.getElementById('response-form').addEventListener('submit', e => {
    e.preventDefault();
    submitResponses();
});
