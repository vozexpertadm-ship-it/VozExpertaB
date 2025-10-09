// Obtener token de la URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// Capturar el formulario y el div de mensajes
const form = document.getElementById('reset-form');
const messageDiv = document.getElementById('message');

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const newPassword = document.getElementById('newPassword').value.trim();

  if (!newPassword) {
    messageDiv.textContent = "Por favor, ingresa una contraseña.";
    messageDiv.style.color = 'red';
    return;
  }

  try {
    const res = await fetch('/restablecer-contrasena', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, nuevaContrasena: newPassword })
    });

    const data = await res.json();

    if (res.ok) {
      messageDiv.textContent = data.mensaje;
      messageDiv.style.color = 'green';
      form.reset();
    } else {
      messageDiv.textContent = data.mensaje;
      messageDiv.style.color = 'red';
    }
  } catch (err) {
    console.error(err);
    messageDiv.textContent = "Ocurrió un error al restablecer la contraseña.";
    messageDiv.style.color = 'red';
  }
});
