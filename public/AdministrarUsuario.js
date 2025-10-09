
    let selectedUserId = null;
    let isEditing = false;

    const addUserButton = document.getElementById('addUserButton');
    const saveButton = document.getElementById('saveButton');
    const userForm = document.getElementById('userForm');
    const modalTitle = document.getElementById('modalTitle');
    const userModal = new bootstrap.Modal(document.getElementById('userModal'));

    document.addEventListener('DOMContentLoaded', loadUsers);

    function loadUsers() {
      fetch('/usuarios')
        .then(res => res.json())
        .then(data => {
          const tbody = document.getElementById('userTable');
          tbody.innerHTML = '';
          data.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${user.id_usuario}</td><td>${user.nombre}</td><td>${user.apellido}</td>`;
            row.addEventListener('click', () => loadUserDetails(user.id_usuario));
            tbody.appendChild(row);
          });
        });
    }

    function loadUserDetails(userId) {
      fetch(`/usuarios/${userId}`)
        .then(res => res.json())
        .then(user => {
          selectedUserId = user.id_usuario;
          const details = document.getElementById('userDetails');
          details.querySelector('.card-title').textContent = `Detalles de ${user.nombre}`;
          details.querySelector('.card-text').innerHTML = `
            <p><strong>ID:</strong> ${user.id_usuario}</p>
            <p><strong>Nombre:</strong> ${user.nombre}</p>
            <p><strong>Apellido:</strong> ${user.apellido}</p>
            <p><strong>Correo:</strong> ${user.correo}</p>
            <p><strong>Contraseña:</strong> ********</p>
          `;
          const buttons = document.getElementById('actionButtons');
          buttons.classList.remove('d-none');
        });
    }

    // Agregar usuario
    addUserButton.addEventListener('click', () => {
      isEditing = false;
      selectedUserId = null;
      modalTitle.textContent = 'Agregar Usuario';
      userForm.reset();
      userForm.classList.remove('was-validated');
    });

    // Guardar usuario
    saveButton.addEventListener('click', () => {
      if (!userForm.checkValidity()) {
        userForm.classList.add('was-validated');
        return;
      }

      const data = {
        nombre: document.getElementById('name').value,
        apellido: document.getElementById('lastname').value,
        correo: document.getElementById('email').value,
        password: document.getElementById('password').value,
        id_tipo: document.getElementById('isAdmin').checked ? 1 : 2
      };

      const url = isEditing ? `/usuarios/${selectedUserId}` : '/usuarios';
      const method = isEditing ? 'PUT' : 'POST';

      fetch(url, {
        method,
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
      })
      .then(res => {
        if (res.ok) {
          alert(isEditing ? 'Usuario modificado' : 'Usuario agregado');
          userModal.hide();
          loadUsers();
        } else alert('Error al guardar usuario');
      })
      .catch(console.error);
    });

    // Modificar y eliminar botones dinámicos
    document.getElementById('userDetails').addEventListener('click', e => {
      if (e.target.id === 'modifyButton') {
        isEditing = true;
        fetch(`/usuarios/${selectedUserId}`)
          .then(res => res.json())
          .then(user => {
            modalTitle.textContent = 'Modificar Usuario';
            document.getElementById('name').value = user.nombre;
            document.getElementById('lastname').value = user.apellido;
            document.getElementById('email').value = user.correo;
            document.getElementById('password').value = '';
            document.getElementById('isAdmin').checked = user.id_tipo === 1;
            userModal.show();
          });
      } else if (e.target.id === 'deleteButton') {
        if (confirm('¿Eliminar usuario?')) {
          fetch(`/usuarios/${selectedUserId}`, {method:'DELETE'})
            .then(res => { if(res.ok){ alert('Usuario eliminado'); loadUsers(); }})
        }
      }
    });
