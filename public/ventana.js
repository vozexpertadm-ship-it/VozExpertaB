// Obtener tipo de usuario desde localStorage
const tipoUsuario = localStorage.getItem('id_tipo');

// Mostrar opciones según el tipo de usuario
if (tipoUsuario == 1) { // Admin
  document.getElementById('admin-usuario').style.display = 'block';
  document.getElementById('admin-cuestionario').style.display = 'block';
}

// Cerrar sesión
document.getElementById('cerrar-sesion').addEventListener('click', () => {
  localStorage.clear();
  window.location.href = 'index.html';
});
