document.getElementById('btnEnviar').addEventListener('click', enviarComentario);

function enviarComentario() {
  const mensaje = document.getElementById('comentario').value.trim();

  if (!mensaje) {
    alert("Por favor, escribe un comentario antes de enviarlo.");
    return;
  }

  fetch('/comentario-anonimo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensaje })
  })
  .then(res => res.json())
  .then(data => {
    alert(data.mensaje || "Comentario enviado.");
    window.location.href = "index.html";
  })
  .catch(err => {
    console.error("Error al enviar comentario:", err);
    alert("Ocurrió un error al enviar tu comentario.");
  });
}
