BEGIN;


create table tipo_usuario(
id_tipo serial primary key,
nombre varchar(30)
);

Create table usuario(
id_usuario serial primary key,
nombre varchar(50),
apellido varchar(50),
correo varchar(50),
password text,
id_tipo integer references tipo_usuario(id_tipo) ON DELETE CASCADE,
strike INTEGER DEFAULT 0
);

/* tabla para verificacion de codigo con correo */
CREATE TABLE restablecer_tokens (
    id_token SERIAL PRIMARY KEY,
    correo VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    fecha_expiracion TIMESTAMP NOT NULL
);

Create table cuestionario(
id_cuestionario serial primary key,
nombre varchar(50),
fecha_creacion date,
fecha_apertura date,
fecha_cierre date,
umbral_aceptacion real
);

Create table pregunta_cuant(
id_pregunta serial primary key,
pregunta text,
tipo varchar(50),
id_cuestionario integer references cuestionario(id_cuestionario) ON DELETE CASCADE,
orden int
);


CREATE table opcion_preguntas(
    id_opcionPregunta serial primary key,
    opcionPregunta varchar(100),
    id_pregunta integer references pregunta_cuant(id_pregunta) on DELETE CASCADE
);


Create table pregunta_cuali(
id_preguntac serial primary key,
pregunta_c text,
id_cuestionario integer references cuestionario(id_cuestionario) ON DELETE CASCADE,
orden int
);
/* Lo que esta comentado no esta implementado*/
/*
Create table resultado_cuant(
id_resultado serial primary key,
id_usuarioevaluado integer,
promedio double precision,
desv_est double precision,
fecha date,
strike integer,
id_usuario integer references usuario(id_usuario) ON DELETE CASCADE,
id_pregunta integer references pregunta_cuant(id_pregunta) ON DELETE CASCADE
);

Create table resultado_cuali(
id_resultadoc serial primary key,
id_usuarioevaluado integer,
fecha date,
id_preguntac integer references pregunta_cuali(id_preguntac) ON DELETE CASCADE
);
*/

Create table resultado_cuant(
id_resultado serial primary key,
id_usuarioevaluado integer,
respuesta integer,
id_usuario integer references usuario(id_usuario) ON DELETE CASCADE,
id_pregunta integer references pregunta_cuant(id_pregunta) ON DELETE CASCADE,
CONSTRAINT uq_resultado_unico UNIQUE (id_usuario, id_pregunta, id_usuarioevaluado)
);
/*Incorporar tabla exclusiva para resultados en tipo matrix*/

Create table resultado_cuali(
id_resultadoc serial primary key,
id_preguntac integer references pregunta_cuali(id_preguntac) ON DELETE CASCADE,
respuesta text,
id_usuario integer references usuario(id_usuario) ON DELETE CASCADE,
id_cuestionario integer references cuestionario(id_cuestionario) ON DELETE CASCADE,
CONSTRAINT uq_resultado_cuali_unico UNIQUE (id_usuario, id_preguntac)
);

CREATE TABLE promedio_matrix (
  id_prom SERIAL PRIMARY KEY,
  total_puntos INTEGER,
  promedio REAL,
  desviacion REAL,
  id_usuario INTEGER REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  id_cuestionario INTEGER REFERENCES cuestionario(id_cuestionario) ON DELETE CASCADE,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_usuario_cuestionario UNIQUE (id_usuario, id_cuestionario)
);

CREATE TABLE comentario_anonimo (
  id_comentario SERIAL PRIMARY KEY,
  comentario TEXT NOT NULL,
  fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

insert into tipo_usuario values (1, 'administrador');
insert into tipo_usuario values (2, 'usuario');
insert into usuario values (1,'Admin','root','vozexpertadm@gmail.com','$2b$10$NU80HsgxYQo/ZIDoOyu/A.xKitP5uld5mmX5PiibbtZQzr6wMUfCW',1);
insert into usuario values (2,'Tiare','Robles','trb@ier.unam.mx','$2b$10$K0QH1XDu0a4W0kYOBLvto.DT0O.7Ry6.xm/q68xf5R8DmnaPeBPa.',1);
insert into usuario values (3,'Enrique','Olguin','enriraul.rdz@gmail.com','$2b$10$sjnXzm0UfoTX7HubmaJpIesmZ/nNwUwqE5q8ql8R1h7Yl2Ses3MMu',1);



COMMIT;


