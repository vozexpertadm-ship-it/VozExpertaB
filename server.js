require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const path = require('path');  // Para manejar rutas de archivos

const app = express();
const port = process.env.PORT || 3000;

//esto es para restablecer el password con verificacion de codigo en email
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
// Configura tu transportador de correo
const transporter = nodemailer.createTransport({
  service: 'gmail', // o el servicio que uses
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

//cosas de prueba
app.use((req, _res, next) => {
  console.log('REQ', req.method, req.url);
  next();
});


// Middleware para servir archivos estáticos (como HTML, JS, CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para parsear el cuerpo de la solicitud como JSON
app.use(bodyParser.json());

// Conexión a la base de datos PostgreSQL
const isProd = process.env.NODE_ENV === 'production';
const client = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false
});

//rutas de prueba
app.get('/ping', (_req, res) => res.send('pong')); // sin DB
app.get('/health', async (_req, res) => {
  try {
    const { rows } = await client.query('SELECT NOW()');
    res.json({ ok: true, now: rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.get('/', (_req, res) => res.send('OK'));

// Ruta para verificar el login
app.post('/verificar-login', async (req, res) => {
    const { correo, contrasena } = req.body;

    try {
        // Consulta a la base de datos para verificar el correo y la contraseña
        const result = await client.query('SELECT * FROM usuario WHERE correo = $1', [correo]);
        if (result.rows.length === 0) {
      return res.json({ exito: false, mensaje: 'Correo no registrado' });
    }

    const usuario = result.rows[0];
    //comparar la contraseña ingresada con el hash en la BD
    const match = await bcrypt.compare (contrasena,usuario.password);
    if (!match){
      return res.json({exito: false, mensaje: 'Contraseña incorrecta'});
    }
    res.json({
      exito: true,
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      correo: usuario.correo,
      id_tipo: usuario.id_tipo,
    });
  }catch (error){
    console.error ('Error al verificar el login:', error);
    res.status(500).json({exito:false, mensaje: 'Error del servidor'});
  }
  /*
        if (result.rows.length > 0) {
            // Si se encuentra un usuario con los datos correctos
            const usuario = result.rows[0];  // Obtén los datos del primer usuario encontrado

            // Puedes devolver toda la información que necesites, por ejemplo:
            res.json({
                exito: true,
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                correo: usuario.correo,
                id_tipo: usuario.id_tipo,
                password: usuario.password
            });
        } else {
            // Si no se encuentra el usuario
            res.json({ exito: false });
        }
    } catch (error) {
        console.error('Error al verificar el login:', error);
        res.status(500).json({ exito: false, mensaje: 'Error del servidor' });
    }
        */
});

// Ruta para insertar registro
app.post('/registro-login', async (req, res) => {
    const { name,lastname,email,password } = req.body;
    try{
      //Verifica si el correo ya esta registraado
      const existe = await client.query('SELECT * FROM usuario WHERE correo=$1', [email]);
      if(existe.rows.length>0){
        return res.status(400).json({mensaje: 'El correo ya está registrado.'});
      }
      //Hashea la contraseña antes de guardarla
        const hashedPassword = await bcrypt.hash(password,10);
        const id_max = await client.query('SELECT max(id_usuario) FROM usuario');
        //const id_max = result.rows[0];
        let Id_max = id_max.rows[0].max + 1;
        const query = `INSERT INTO usuario (id_usuario, nombre, apellido, correo, password,id_tipo)
        VALUES ($1, $2, $3, $4,$5, $6) RETURNING id_usuario`;
        const values = [Id_max,name, lastname, email, hashedPassword,2];
        const results = await client.query(query, values);
        if(results.rows.length > 0){
            res.json({exito:true});
        }
        else{
            res.json({exito:false});
        }
    }catch (err) {
        console.log('Error al insertar el usuario', err.stack);
        res.status(500).json({mensaje: 'Error del servidor'});
    }
});

// Endpoint para listar usuarios en AdminUsuario
app.get('/usuarios', async (req, res) => {
    try {
      const result = await client.query('SELECT id_usuario, nombre, apellido FROM usuario order by id_usuario');
      res.json(result.rows);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
  });
  
// Endpoint para obtener un usuario por ID
app.get('/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await client.query('SELECT * FROM usuario WHERE id_usuario = $1 order by id_usuario ASC', [id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Usuario no encontrado' });
      } else {
        res.json(result.rows[0]);
      }
    } catch (error) {
      console.error('Error al obtener el usuario:', error);
      res.status(500).json({ error: 'Error al obtener el usuario' });
    }
  });
  

// Modificar un usuario
app.put('/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, correo, password ,id_tipo} = req.body;
    try {
      let query,values;

      if(password && password.trim() !== ''){
        const hashedPassword = await bcrypt.hash(password,10);
        query=`
        UPDATE usuario
        SET nombre = $1, apellido = $2, correo = $3, password = $4, id_tipo = $5
        WHERE id_usuario = $6
      `;
      values = [nombre, apellido, correo, hashedPassword, id_tipo, id];
      }else {
        query = `
        UPDATE usuario
        SET nombre = $1, apellido = $2, correo = $3, id_tipo = $4
        WHERE id_usuario = $5
      `;
      values = [nombre, apellido, correo, id_tipo, id];
      }
     const result = await client.query(query,values);
     if (result.rowCount > 0) {
      res.json({ mensaje: 'Usuario actualizado correctamente' });
    } else {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
});
  
// Eliminar un usuario
app.delete('/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await client.query('DELETE FROM usuario WHERE id_usuario = $1', [id]);
      if (result.rowCount > 0) {
        res.sendStatus(200);
      } else {
        res.status(404).json({ error: 'Usuario no encontrado' });
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({ error: 'Error al eliminar usuario' });
    }
  });
//endpoint para uso de Administrar usuarios
app.post('/usuarios', async (req, res) => {
  const { nombre, apellido, correo, password,id_tipo } = req.body;
  try {
      const hashedPassword = await bcrypt.hash (password,10);
      const id_max = await client.query(`SELECT max(id_usuario) from usuario`);
      let Id_max = id_max.rows[0].max + 1;
      const result = await client.query(
          'INSERT INTO usuario (id_usuario,nombre, apellido, correo, password,id_tipo) VALUES ($1, $2, $3, $4, $5,$6)',
          [Id_max,nombre, apellido, correo, hashedPassword,id_tipo]
      );
      res.status(201).json({ message: 'Usuario agregado con éxito.' });
  } catch (error) {
    console.error('Error al agregar usuario:', error);
    res.status(500).json({ error: 'Error al agregar usuario' });
  }
});

app.get('/usuarios-matrix', async (req, res) => {
    try {
      const result = await client.query('SELECT id_usuario, nombre, apellido FROM usuario WHERE id_usuario != 1 order by id_usuario ');
      res.json(result.rows);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
  });

// Endpoint para insertar preguntas del cuestionario
app.post('/guardar-cuestionario', async (req, res) => {
  const { nombreCuestionario, fechaCreacion, fechaApertura, fechaCierre, preguntas,Umbral} = req.body;

  try {
      // Insertar el cuestionario en la tabla `cuestionario`
      const cuestionarioResult = await client.query(
          `INSERT INTO cuestionario (nombre, fecha_creacion, fecha_apertura, fecha_cierre,umbral_aceptacion) 
           VALUES ($1, $2, $3, $4, $5) RETURNING id_cuestionario`,
          [nombreCuestionario, fechaCreacion, fechaApertura, fechaCierre, Umbral]
      );

      const idCuestionario = cuestionarioResult.rows[0].id_cuestionario;

      let orden=1 //esto es para el orden de preguntas
      // Procesar las preguntas y guardarlas en la base de datos
      for (const pregunta of preguntas) {
          const { questionText, answerType, options } = pregunta;

          if (answerType === 'text') {
              // Insertar en la tabla `pregunta_cuali`
              await client.query(
                  `INSERT INTO pregunta_cuali ( pregunta_c, id_cuestionario, orden) 
                   VALUES ($1, $2, $3) RETURNING id_preguntac` ,
                  [questionText, idCuestionario, orden]
              );
          } else {
              // Insertar en la tabla `pregunta_cuant`
              // Aquí asumimos que las opciones no se guardan directamente como respuesta
              // porque las respuestas se almacenarán posteriormente por el usuario.
              
              const PreguntaCuant = await client.query(
                  `INSERT INTO pregunta_cuant ( pregunta, id_cuestionario, tipo, orden) 
                   VALUES ($1, $2, $3, $4) RETURNING id_pregunta`,
                  [questionText, idCuestionario, answerType, orden]
              );

              const idPregunta = PreguntaCuant.rows[0].id_pregunta;

              if (answerType ==='multiple'){
                for(var i=0; i< options.length; i++ ){
                  await client.query(
                    `INSERT INTO opcion_preguntas (opcionPregunta, id_pregunta) 
                    VALUES ($1,$2) RETURNING id_opcionPregunta`,
                    [options[i],idPregunta]
                  );
                }
              }
          } 
          orden++;
      }

      res.status(201).json({ exito: true, mensaje: 'Cuestionario guardado exitosamente' });
  } catch (error) {
      console.error('Error al guardar el cuestionario:', error);
      res.status(500).json({ exito: false, mensaje: 'Error al guardar el cuestionario' });
  }
});

//Recuperar id de cuestionarios dentro de fechas
app.post('/get-idcuestionarios', async(req, res)=>{
  const{fechaActual} = req.body;
  try{
    const idCuestionariosFecha = await client.query(`SELECT id_cuestionario, nombre, fecha_apertura, fecha_cierre 
    FROM cuestionario WHERE $1  BETWEEN fecha_apertura AND fecha_cierre `,[fechaActual]);
    res.json(idCuestionariosFecha.rows);
  }
  catch(error){
    console.error('Error al cargar los idcuestionarios:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al cargar los idcuestionarios' });
  }
});

app.post('/verificar-respuesta', async (req, res) => {
  const { id_usuario, id_cuestionario } = req.body;

  try {
    // Verificamos si hay respuestas cuantitativas o cualitativas del usuario para ese cuestionario
    const cuant = await client.query(
      `SELECT 1 FROM resultado_cuant rc
       JOIN pregunta_cuant pq ON rc.id_pregunta = pq.id_pregunta
       WHERE rc.id_usuario = $1 AND pq.id_cuestionario = $2 LIMIT 1`,
      [id_usuario, id_cuestionario]
    );

    const cuali = await client.query(
      `SELECT 1 FROM resultado_cuali
       WHERE id_usuario = $1 AND id_cuestionario = $2 LIMIT 1`,
      [id_usuario, id_cuestionario]
    );

    if (cuant.rows.length > 0 || cuali.rows.length > 0) {
      res.json({ yaContestado: true });
    } else {
      res.json({ yaContestado: false });
    }

  } catch (error) {
    console.error('Error al verificar si el usuario ya contestó:', error);
    res.status(500).json({ yaContestado: false, error: 'Error del servidor' });
  }
});

app.post('/verificar-evaluacion', async (req, res) => {
  const { id_cuestionario } = req.body;

  try {
    const evaluado = await client.query(`
      SELECT 1 FROM promedio_matrix
      WHERE id_cuestionario = $1
      LIMIT 1
    `, [id_cuestionario]);

    if (evaluado.rows.length > 0) {
      res.json({ yaEvaluado: true });
    } else {
      res.json({ yaEvaluado: false });
    }
  } catch (err) {
    console.error('Error al verificar evaluación:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});



app.post('/get-cuestionarios', async (req, res) => {
  const { idCuestionario } = req.body;
  try {
    const CuestionariosID = await client.query(`
      SELECT 
          p.id_pregunta AS id_pregunta,
          p.pregunta AS texto_pregunta,
          p.tipo AS tipo_pregunta,
          p.id_cuestionario,
          p.orden
      FROM pregunta_cuant p
      WHERE p.id_cuestionario = $1

      UNION ALL

      SELECT 
          c.id_preguntac AS id_pregunta,
          c.pregunta_c AS texto_pregunta,
          'texto' AS tipo_pregunta,
          c.id_cuestionario,
          c.orden
      FROM pregunta_cuali c
      WHERE c.id_cuestionario = $1

      ORDER BY orden ASC
    `, [idCuestionario]);

    res.json(CuestionariosID.rows);
  } catch (error) {
    console.error('Error al cargar los cuestionarios:', error.stack);
    res.status(500).json({ exito: false, mensaje: 'Error al cargar los cuestionarios' });
  }
});


app.post('/get-opcionesM', async(req,res)=>{
  const {idPregunta} = req.body;
  try{
    const PreguntaOpciones = await client.query(`SELECT * from opcion_preguntas 
      where id_pregunta= $1;`,[idPregunta]);
    res.json(PreguntaOpciones.rows);
  }
  catch(error){
    console.error('Error al cargar las opciones de la pregunta:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al cargar las opciones de la pregunta' });
  }
});

//Endpoint para obtener la lista de cuestionarios
app.get('/cuestionarios', async (req, res) => {
  try {
    const result = await client.query('SELECT id_cuestionario, nombre, fecha_creacion FROM cuestionario');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener cuestionarios:', error);
    res.status(500).json({ error: 'Error al obtener los cuestionarios' });
  }
});

// Endpoint para obtener un cuestionario por ID
app.get('/cuestionarios/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query('SELECT * FROM cuestionario WHERE id_cuestionario = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Cuestionario no encontrado' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Error al obtener el cuestionario:', error);
    res.status(500).json({ error: 'Error al obtener el cuestionario' });
  }
});

// Actualizar fechas del cuestionario
app.put('/cuestionarios/:id/fechas', async (req, res) => {
  const { id } = req.params;
  const { fecha_apertura, fecha_cierre } = req.body;
  
  //console.log('FECHAS RECIBIDAS:', { id, fecha_apertura, fecha_cierre });

  try {
    const fields = [];
    const values = [];
    let idx = 1;
    if (fecha_apertura) {
      fields.push(`fecha_apertura = $${idx++}`);
      values.push(fecha_apertura);
    }
    if (fecha_cierre) {
      fields.push(`fecha_cierre = $${idx++}`);
      values.push(fecha_cierre);
    }
    if (fields.length === 0) {
      return res.status(400).json({ exito: false, mensaje: 'No hay campos para actualizar.' });
    }

    const query = `
      UPDATE cuestionario
      SET ${fields.join(', ')}
      WHERE id_cuestionario = $${idx}
    `;
    values.push(id); // Último valor es el ID

    //console.log('QUERY:', query);
    //console.log('VALUES:', values);
    const result = await client.query(query, values);
    if (result.rowCount > 0) {
      res.json({ exito: true, mensaje: 'Fechas actualizadas correctamente.' });
    } else {
      res.status(404).json({ exito: false, mensaje: 'Cuestionario no encontrado.' });
    }
  } catch (error) {
    console.error('Error al actualizar las fechas:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al actualizar las fechas' });
  }
});


// Obtener cuestionarios con fecha de cierre futura o actual
app.get('/cuestionarios-activos', async (req, res) => {
  try {
    const result = await client.query(`
      SELECT id_cuestionario, nombre, fecha_creacion, fecha_apertura, fecha_cierre
      FROM cuestionario
      WHERE fecha_apertura >= CURRENT_DATE
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener cuestionarios activos:', error);
    res.status(500).json({ error: 'Error al obtener los cuestionarios activos' });
  }
});

// Actualizar pregunta cuantitativa
app.put('/pregunta-cuant/:id', async (req, res) => {
  const { id } = req.params;
  const { pregunta, tipo } = req.body;

  try {
    const result = await client.query(
      `UPDATE pregunta_cuant SET pregunta = $1, tipo = $2 WHERE id_pregunta = $3`,
      [pregunta, tipo, id]
    );
    res.json({ exito: true });
  } catch (error) {
    console.error('Error al actualizar pregunta cuantitativa:', error);
    res.status(500).json({ exito: false });
  }
});

// Actualizar pregunta cualitativa
app.put('/pregunta-cuali/:id', async (req, res) => {
  const { id } = req.params;
  const { pregunta } = req.body;

  try {
    const result = await client.query(
      `UPDATE pregunta_cuali SET pregunta_c = $1 WHERE id_preguntac = $2`,
      [pregunta, id]
    );
    res.json({ exito: true });
  } catch (error) {
    console.error('Error al actualizar pregunta cualitativa:', error);
    res.status(500).json({ exito: false });
  }
});

// Eliminar pregunta cuantitativa
app.delete('/pregunta-cuant/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await client.query('DELETE FROM pregunta_cuant WHERE id_pregunta = $1', [id]);
    res.json({ exito: true });
  } catch (error) {
    console.error('Error al eliminar pregunta cuantitativa:', error);
    res.status(500).json({ exito: false });
  }
});

// Eliminar pregunta cualitativa
app.delete('/pregunta-cuali/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await client.query('DELETE FROM pregunta_cuali WHERE id_preguntac = $1', [id]);
    res.json({ exito: true });
  } catch (error) {
    console.error('Error al eliminar pregunta cualitativa:', error);
    res.status(500).json({ exito: false });
  }
});
//Agregar pregunta en la seccion de modificar
/* app.post('/preguntas', async (req, res) => {
  const { idCuestionario, texto, tipo, opciones } = req.body;
  try {
    if (tipo === 'text') {
      await client.query(
        `INSERT INTO pregunta_cuali (pregunta_c, id_cuestionario)
         VALUES ($1, $2)`,
        [texto, idCuestionario]
      );
    } else {
      const result = await client.query(
        `INSERT INTO pregunta_cuant (pregunta, tipo, id_cuestionario)
         VALUES ($1, $2, $3) RETURNING id_pregunta`,
        [texto, tipo, idCuestionario]
      );

      const idPregunta = result.rows[0].id_pregunta;

      if (tipo === 'multiple' && opciones && opciones.length > 0) {
        for (const opcion of opciones) {
          await client.query(
            `INSERT INTO opcion_preguntas (opcionPregunta, id_pregunta)
             VALUES ($1, $2)`,
            [opcion, idPregunta]
          );
        }
      }
    }

    res.json({ exito: true });
  } catch (error) {
    console.error('Error al agregar nueva pregunta:', error);
    res.status(500).json({ exito: false });
  }
}); */

app.post('/preguntas', async (req, res) => {
  const { idCuestionario, texto, tipo, opciones } = req.body;

  try {
    // Obtener el valor máximo de 'orden' actual
    const ordenQuery = await client.query(`
      SELECT MAX(orden) as max_orden FROM (
        SELECT orden FROM pregunta_cuant WHERE id_cuestionario = $1
        UNION ALL
        SELECT orden FROM pregunta_cuali WHERE id_cuestionario = $1
      ) AS todas
    `, [idCuestionario]);

    const nuevoOrden = (ordenQuery.rows[0].max_orden || 0) + 1;

    if (tipo === 'text') {
      await client.query(
        `INSERT INTO pregunta_cuali (pregunta_c, id_cuestionario, orden)
         VALUES ($1, $2, $3)`,
        [texto, idCuestionario, nuevoOrden]
      );
    } else {
      const result = await client.query(
        `INSERT INTO pregunta_cuant (pregunta, tipo, id_cuestionario, orden)
         VALUES ($1, $2, $3, $4) RETURNING id_pregunta`,
        [texto, tipo, idCuestionario, nuevoOrden]
      );

      const idPregunta = result.rows[0].id_pregunta;

      if (tipo === 'multiple' && opciones && opciones.length > 0) {
        for (const opcion of opciones) {
          await client.query(
            `INSERT INTO opcion_preguntas (opcionPregunta, id_pregunta)
             VALUES ($1, $2)`,
            [opcion, idPregunta]
          );
        }
      }
    }

    res.json({ exito: true });
  } catch (error) {
    console.error('Error al agregar nueva pregunta:', error);
    res.status(500).json({ exito: false });
  }
});


//modificar pregunta de opciones multiples
app.post('/get-opcionesM', async (req, res) => {
  const { idPregunta } = req.body;
  // console.log("Recibido idPregunta en backend:", idPregunta); // TEMPORAL

  try {
    const resultado = await client.query(
      `SELECT * FROM opcion_preguntas WHERE id_pregunta = $1`,
      [idPregunta]
    );
    res.json(resultado.rows);
  } catch (error) {
    console.error('Error al obtener opciones:', error);
    res.status(500).json({ error: 'Error al obtener opciones' });
  }
});
//modificar las opciones multiples
app.put('/opciones', async (req, res) => {
  const { opciones } = req.body;

  try {
    for (const opcion of opciones) {
      await client.query(
        `UPDATE opcion_preguntas SET opcionPregunta = $1 WHERE id_opcionPregunta = $2`,
        [opcion.texto, opcion.id]
      );
    }

    res.json({ exito: true });
  } catch (error) {
    console.error('Error al actualizar opciones:', error);
    res.status(500).json({ exito: false });
  }
});
//insertar nueva opcion multiple en modificar
app.post('/opcion', async (req, res) => {
  const { idPregunta, texto } = req.body;
  try {
    await client.query(
      'INSERT INTO opcion_preguntas (opcionPregunta, id_pregunta) VALUES ($1, $2)',
      [texto, idPregunta]
    );
    res.json({ exito: true });
  } catch (error) {
    console.error('Error al insertar opción:', error);
    res.status(500).json({ exito: false });
  }
});

//eliminar opcion multiple en modificar
app.delete('/opcion/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await client.query('DELETE FROM opcion_preguntas WHERE id_opcionpregunta = $1', [id]);
    res.json({ exito: true });
  } catch (error) {
    console.error('Error al eliminar opción:', error);
    res.status(500).json({ exito: false });
  }
});

//Endpoint para eliminar un cuestionario por completo
 app.delete('/cuestionarios/:id', async (req, res) => {
  const id = req.params.id;

  try {
    // Primero elimina preguntas asociadas
    await client.query('DELETE FROM opcion_preguntas WHERE id_pregunta IN (SELECT id_pregunta FROM pregunta_cuant WHERE id_cuestionario = $1)', [id]);
    await client.query('DELETE FROM pregunta_cuant WHERE id_cuestionario = $1', [id]);
    await client.query('DELETE FROM pregunta_cuali WHERE id_cuestionario = $1', [id]);

    // Luego elimina el cuestionario
    await client.query('DELETE FROM cuestionario WHERE id_cuestionario = $1', [id]);

    res.json({ exito: true });
  } catch (error) {
    console.error('Error al eliminar cuestionario:', error);
    res.status(500).json({ exito: false });
  }
});
//Endpoint para listar todos los cuestionarios, solo lectura
app.get('/cuestionarios-todos', async (req, res) => {
  try {
    const result = await client.query(`
      SELECT id_cuestionario, nombre, fecha_apertura, fecha_cierre
      FROM cuestionario
      ORDER BY fecha_apertura DESC
    `);
    res.json(result.rows);
  } catch (error) { 
    console.error('Error al obtener cuestionarios:', error);
    res.status(500).json({ error: 'Error al obtener los cuestionarios' });
  }
});


//Capturar las respuestas del usuario a un cuestionario
app.post('/guardar-respuestas', async (req, res) => {
  const { id_usuario, id_cuestionario, respuestas } = req.body;

  if (!id_usuario || !id_cuestionario || !Array.isArray(respuestas)) {
    return res.status(400).json({ exito: false, error: 'Datos inválidos' });
  }

  try {
    for (const r of respuestas) {
      const {
        id_pregunta,
        id_preguntac,
        respuesta,
        tipo,
        id_usuario_objetivo
      } = r;

      // Validación básica mejorada
      if ((!id_pregunta && !id_preguntac) || respuesta === undefined || respuesta === null || respuesta === "") {
        console.warn('Omitiendo respuesta inválida:', r);
        continue;
      }

      if (tipo === 'texto') {
        // Para preguntas cualitativas (texto)
        console.log('Insertando cualitativa:', { id_preguntac, respuesta, id_usuario, id_cuestionario });
        await client.query(`
          INSERT INTO resultado_cuali (id_preguntac, respuesta, id_usuario, id_cuestionario)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id_usuario, id_preguntac)
          DO UPDATE SET respuesta = EXCLUDED.respuesta;
        `, [id_preguntac, respuesta, id_usuario, id_cuestionario]);

      } else {
        // Para preguntas cuantitativas
        const respuestaInt = parseInt(respuesta);
        if (isNaN(respuestaInt)) {
          console.warn('Respuesta cuantitativa no es un número válido:', respuesta);
          continue;
        }
        
        console.log('Insertando cuantitativa:', { id_usuario, id_pregunta, respuesta: respuestaInt, id_usuarioevaluado: id_usuario_objetivo || null });
        // Para no-matrix, usamos 0 en lugar de NULL
        const idEvaluado = (tipo === 'matrix') ? (id_usuario_objetivo ?? 0) : 0;
        await client.query(`
          INSERT INTO resultado_cuant (id_usuario, id_pregunta, respuesta, id_usuarioevaluado)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id_usuario, id_pregunta, id_usuarioevaluado)
          DO UPDATE SET respuesta = EXCLUDED.respuesta;
        `, [id_usuario, id_pregunta, respuestaInt, idEvaluado]);
      }
    }

    res.json({ exito: true });

  } catch (error) {
    console.error('Error al guardar respuestas:', error.stack || error);
    res.status(500).json({ exito: false, error: error.message || 'Error interno del servidor' });
  }
});


//Endpoint para solicitar restablecer password con codigo de verificacion
app.post('/solicitar-restablecimiento', async (req, res) => {
  const { correo } = req.body;

  try {
    const userResult = await client.query(
      'SELECT * FROM usuario WHERE correo = $1',
      [correo]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const fecha_expiracion = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Guarda el token junto con el correo
    await client.query(
      `INSERT INTO restablecer_tokens (correo, token, fecha_expiracion)
       VALUES ($1, $2, $3)`,
      [correo, token, fecha_expiracion]
    );

    const enlace = `${baseUrl}/nueva_contrasena.html?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: correo,
      subject: 'Restablecimiento de contraseña',
      html: `<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
             <a href="${enlace}">${enlace}</a>
             <p>Este enlace expirará en 15 minutos.</p>`
    });

    res.json({ mensaje: 'Correo enviado con el enlace de restablecimiento.' });
  } catch (error) {
    console.error('Error solicitando restablecimiento:', error);
    res.status(500).json({ mensaje: 'Error al procesar la solicitud.' });
  }
});


//Endpoint para restablecer contraseña por si se le olvida al usuario
app.post('/restablecer-contrasena', async (req, res) => {
  const { token, nuevaContrasena } = req.body;

  try {
    const tokenResult = await client.query(
      `SELECT correo, fecha_expiracion FROM restablecer_tokens
       WHERE token = $1`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ exito: false, mensaje: 'Token inválido.' });
    }

    const { correo, fecha_expiracion } = tokenResult.rows[0];

    if (new Date() > new Date(fecha_expiracion)) {
      return res.status(400).json({ exito: false, mensaje: 'El token ha expirado.' });
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);

    await client.query(
      `UPDATE usuario SET password = $1 WHERE correo = $2`,
      [hashedPassword, correo]
    );

    // Eliminar el token usado
    await client.query(
      `DELETE FROM restablecer_tokens WHERE token = $1`,
      [token]
    );

    res.json({ exito: true, mensaje: 'Contraseña restablecida correctamente.' });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({ exito: false, mensaje: 'Error interno.' });
  }
});


//Endpoint para ejecutar evaluación, enviar correos y guardar los promedios en la base de datos
app.post('/ejecutar-evaluacion', async (req, res) => {
  //la fecha de cierre es igual o menor a la fecha actual, se puede modificar a solo que sea menor
  const  {id_cuestionario} = req.body;
  try {
    const cuestionarios = await client.query(` 
      SELECT umbral_aceptacion 
      FROM cuestionario 
      WHERE id_cuestionario= $1 and fecha_cierre <= CURRENT_DATE`, [id_cuestionario] 
    );

    for (const cuestionario of cuestionarios.rows) {
      const {umbral_aceptacion } = cuestionario;

      // console.log(id_cuestionario,umbral_aceptacion);

      const usuarios = await client.query(`
        SELECT DISTINCT rc.id_usuarioevaluado AS id_objetivo, u.correo
        FROM resultado_cuant rc
        JOIN usuario u ON rc.id_usuarioevaluado = u.id_usuario
        JOIN pregunta_cuant pq ON rc.id_pregunta = pq.id_pregunta
        WHERE pq.id_cuestionario = $1 AND pq.tipo = 'matrix'
      `, [id_cuestionario]);

      for (const user of usuarios.rows) {
        const { id_objetivo, correo } = user;

        //console.log(id_cuestionario,id_objetivo);

        const respuestas = await client.query(`
        SELECT 
          pq.pregunta,
          AVG(rc.respuesta)::numeric(4,2) AS promedio_pregunta,
          STDDEV_POP(rc.respuesta)::numeric(4,2) AS desviacion
        FROM resultado_cuant rc
        JOIN pregunta_cuant pq ON rc.id_pregunta = pq.id_pregunta
        WHERE pq.id_cuestionario = $1 
          AND pq.tipo = 'matrix' 
          AND rc.id_usuarioevaluado = $2
        GROUP BY pq.pregunta
      `, [id_cuestionario, id_objetivo]);

        //Este segmento es por group by
        const resultados = respuestas.rows.map(r => ({
          pregunta: r.pregunta,
          promedio: parseFloat(r.promedio_pregunta),
          desviacion: parseFloat(r.desviacion)
        }));

        //console.log("Resultados por pregunta:", resultados);

        const valores = respuestas.rows.map(r => parseFloat(r.promedio_pregunta));
        const promedio = valores.reduce((a, b) => a + b, 0) / valores.length || 0;
        const desviacion = Math.sqrt(valores.map(x => Math.pow(x - promedio, 2)).reduce((a, b) => a + b, 0) / valores.length || 0);
        console.log("valores de prueba",valores, promedio, desviacion);

        // Guardar en la tabla promedio_matrix
        await client.query(`
          INSERT INTO promedio_matrix (total_puntos, promedio, desviacion, id_usuario, id_cuestionario)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id_usuario, id_cuestionario) DO NOTHING
        `, [valores.length, promedio, desviacion, id_objetivo, id_cuestionario]);
        
        console.log ("aqui se supone que ya inserto los valores en la bd");
        
        // Clasificar y enviar correo
        let mensaje = '';
        if (promedio < umbral_aceptacion) {
          mensaje = `
            <p>Tu promedio fue de ${promedio.toFixed(2)}, por debajo del umbral de ${umbral_aceptacion}.</p>
            <p>Estas fueron tus calificaciones por pregunta:</p>
            <ul>
              ${respuestas.rows.map(r => `<li>${r.pregunta}: ${r.promedio_pregunta}</li>`).join('')}
            </ul>
            <p>Si deseas enviar comentarios o propuestas para mejorar, hazlo desde este formulario que puede o no ser anónimo 
            (<a href="${baseUrl}/comentario_anonimo.html">formulario anónimo es un link para que puedas escribir un comentario</a>). 
            Estos comentarios serán enviados a todas las consejeras.</p>
          `;
          await client.query(`UPDATE usuario SET strike = strike + 1 WHERE id_usuario = $1`,[id_objetivo]);
          
        } /*else if (valores.some(v => v < umbral_aceptacion)) {
          const debiles = respuestas.rows.filter(r => r.respuesta < umbral_aceptacion);
          mensaje = `
            <p>Gracias por tu labor en el consejo.</p>
            <p>Algunos aspectos pueden mejorar según la percepción de tus colegas:</p>
            <ul>${debiles.map(d => `<li>${d.pregunta}</li>`).join('')}</ul>
          `; }*/
        else {
          mensaje = `<p>Gracias por tu colaboración en el Consejo. Sabemos que juntas somos extraordinarias.</p>`;
        }

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: correo,
          subject: 'Resultado de tu Evaluación',
          html: mensaje
        });
      }
    }

    res.json({ mensaje: 'Evaluación completada, correos enviados y datos registrados.' });

  } catch (error) {
    console.error('Error en evaluación:', error);
    res.status(500).json({ mensaje: 'Error al ejecutar la evaluación' });
  }
});

//Endpoint para enviar correo de retroalimentacion
app.post('/comentario-anonimo', async (req, res) => {
  const { mensaje } = req.body;

  if (!mensaje) {
    return res.status(400).json({ mensaje: 'Mensaje vacío.' });
  }

  try {
    const fecha_envio = new Date();

    await client.query(`
      INSERT INTO comentario_anonimo (comentario, fecha_envio)
      VALUES ($1, $2)
    `, [mensaje, fecha_envio]);

    // Enviar el comentario por correo a todos los usuarios
    const usuarios = await client.query(`SELECT correo FROM usuario`);
    const destinatarios = usuarios.rows.map(u => u.correo);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      bcc: destinatarios, // lista de correos
      subject: 'Retroalimentación de la evaluación',
      html: `
        <p>Se ha recibido el siguiente mensaje anónimo relacionado con el proceso de evaluación:</p>
        <blockquote style="font-style: italic; color: #555;">${mensaje}</blockquote>
        <p>Gracias por contribuir a un ambiente más justo e incluyente.</p>
      `
    });
    res.json({ mensaje: 'Comentario enviado correctamente.' });
  } catch (error) {
    console.error("Error al guardar/enviar comentario:", error);
    res.status(500).json({ mensaje: 'Error del servidor.' });
  }
});

app.post('/mensaje-strike', async (req, res) => {
  //console.log("entra mensaje-strike end point");

  const { id_cuestionario } = req.body;

  if (!id_cuestionario) {
    return res.status(400).json({ mensaje: "Falta id_cuestionario" });
  }

  try {

    const sql = `
      WITH usuarios_strike AS (
          SELECT id_usuario, nombre, apellido, strike
          FROM usuario
          WHERE strike >= 2
      ),

      umbral_cte AS (
          SELECT umbral_aceptacion
          FROM cuestionario
          WHERE id_cuestionario = $1
      ),

      preguntas_falladas AS (
          SELECT 
              u.id_usuario,
              u.nombre,
              u.apellido,
              u.strike,
              pq.pregunta
          FROM usuarios_strike u
          JOIN resultado_cuant rc 
              ON rc.id_usuarioevaluado = u.id_usuario
          JOIN pregunta_cuant pq 
              ON rc.id_pregunta = pq.id_pregunta
          WHERE pq.tipo = 'matrix'
            AND pq.id_cuestionario = $1
          GROUP BY 
              u.id_usuario,
              u.nombre,
              u.apellido,
              u.strike,
              pq.pregunta
          HAVING AVG(rc.respuesta) < (
              SELECT umbral_aceptacion FROM umbral_cte
          )
      )

      SELECT 
          id_usuario,
          nombre,
          apellido,
          strike,
          ARRAY_AGG(pregunta) AS preguntas
      FROM preguntas_falladas
      GROUP BY id_usuario, nombre, apellido, strike
      ORDER BY id_usuario;
    `;

    const resultado = await client.query(sql, [id_cuestionario]);

    if (resultado.rows.length === 0) {
      return res.status(200).json({
        mensaje: "No hay usuarios con strikes y preguntas debajo del umbral."
      });
    }

    // 🔥 Construcción del HTML
    let mensaje = `<h3>Usuarios con 2 o más strikes:</h3>`;

    resultado.rows.forEach(user => {

      mensaje += `
        <p>
          <strong>${user.nombre} ${user.apellido}</strong>
          (Strikes: ${user.strike})
        </p>
        <ul>
      `;

      user.preguntas.forEach(pregunta => {
        mensaje += `<li>${pregunta}</li>`;
      });

      mensaje += `</ul>`;
    });

    // Obtener correos de supervisores (id_tipo = 1)
    const correoQuery = await client.query(`
      SELECT correo FROM usuario WHERE id_tipo = 1
    `);

    const correos = correoQuery.rows.map(r => r.correo);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      bcc: correos,
      subject: 'Usuarios con bajo desempeño',
      html: mensaje
    });

    res.status(200).json({ mensaje: "Correo enviado correctamente." });

  } catch (error) {
    console.error("Error en mensaje-strike:", error);
    res.status(500).json({ error: "Error del servidor." });
  }
});



// Iniciar el servidor

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${port}`);
});
