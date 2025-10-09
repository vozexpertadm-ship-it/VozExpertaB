(() => {
  const form = document.getElementById('registro-login');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    // Bootstrap valida primero
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    // Si es válido, mandamos datos al backend
    const name = document.getElementById('name').value;
    const lastname = document.getElementById('lastname').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('/registro-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, lastname, email, password })
      });

      const data = await response.json();

      if (data.exito) {
        alert('Registro completado exitosamente');
        window.location.href = "index.html";
      } else {
        alert('Error: ' + (data.mensaje || 'Correo o contraseña incorrectos'));
      }
    } catch (error) {
      console.error('Error en la solicitud:', error);
      alert('Ocurrió un error. Inténtalo de nuevo.');
    }
  });
})();
