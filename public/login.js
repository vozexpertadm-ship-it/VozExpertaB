(() => {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', function(event) {
    if (!form.checkValidity()) {
      event.preventDefault();
      event.stopPropagation();
    } else {
      event.preventDefault(); // prevenimos envío real para usar fetch

      const correo = document.getElementById('correo').value;
      const contrasena = document.getElementById('contraseña').value;

      fetch('/verificar-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, contrasena })
      })
      .then(res => res.json())
      .then(data => {
        if (data.exito) {
          localStorage.setItem('id_tipo', data.id_tipo);
          localStorage.setItem('id_usuario', data.id_usuario);
          window.location.href = "ventana.html";
        } else {
          alert('Correo o contraseña incorrectos');
        }
      })
      .catch(err => {
        console.error('Error en la solicitud:', err);
        alert('Ocurrió un error. Inténtalo de nuevo.');
      });
    }

    form.classList.add('was-validated'); // activa estilos de validación
  }, false);
})();
