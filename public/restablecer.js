(() => {
  const form = document.getElementById('solicitud-form');
  const mensaje = document.getElementById('mensaje');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Bootstrap validación
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    const email = document.getElementById('email').value;

    try {
      const res = await fetch('/solicitar-restablecimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: email })
      });

      const data = await res.json();
      mensaje.textContent = data.mensaje || 'Revisa tu correo para continuar.';
      mensaje.classList.add('text-success');
    } catch (err) {
      console.error('Error:', err);
      mensaje.textContent = 'Ocurrió un error al enviar el enlace.';
      mensaje.classList.add('text-danger');
    }
  });
})();
