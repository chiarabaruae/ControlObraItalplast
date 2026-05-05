import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { loadEnv } from "../src/shared/config/env.js";
import { createPostgresPool } from "../src/infrastructure/postgres/postgres-pool.js";

const SALT_ROUNDS = 10;

const users = [
  admin(),
  person("6500067", "WALTER DARIO ALONSO MARTINEZ", "ITALPLAST", "Fabrica", "Horario Obra", "Operario Produccion PVC", "WALTER", "ALONSO"),
  person("5445798", "JUAN ESTEBAN CASCO SOSA", "ITALPLAST", "Fabrica", "Horario Obra", "Encargado Producc. PVC", "JUAN", "CASCO"),
  person("5017916", "OSCAR RUBEN CASCO SOSA", "ITALPLAST", "Obra", "Horario Obra", "Auxiliar de Obra", "OSCAR", "CASCO"),
  person("4045897", "NATANAHEL MARIA FALCON FIGUEREDO", "ITALPLAST-DOC", "Comercial", "Horario Oficina", "Jefe Comercial", "NATANAHEL", "FALCON"),
  person("2319471", "EMILIO JOSE FERNANDEZ TORRES", "ITALPLAST-DOC", "Gerencia", "Horario Oficina", "Gerencia General", "EMILIO", "FERNANDEZ"),
  person("5335822", "WILLIAMS SEBASTIAN FLECHA GIMENEZ", "ITALPLAST", "Fabrica", "Horario Obra", "Operario Produccion ALU", "WILLIAMS", "FLECHA"),
  person("5923833", "MARCELO RAMON FLEITAS MENDEZ", "ITALPLAST", "Obra", "Horario Obra", "Encargado de Cuadrillas", "MARCELO", "FLEITAS"),
  person("5960688", "VERONICA MABEL GAONA RISSO", "ITALPLAST", "Administracion", "Horario Oficina", "Asistente Administrativo", "VERONICA", "GAONA"),
  person("4123251", "CRISTIAN MIGUEL GOPALDAS DUARTE", "ITALPLAST", "Proyectos", "Horario Oficina", "Jefe de Proyectos", "CRISTIAN", "GOPALDAS"),
  person("7162241", "GUILLERMO DAVID LOPEZ AGUERO", "ITALPLAST", "Obra", "Horario Obra", "Auxiliar de Obra", "GUILLERMO", "LOPEZ"),
  person("6164367", "JULIO CESAR MENDEZ GAYOSO", "ITALPLAST", "Obra", "Horario Obra", "Auxiliar de Obra", "JULIO", "MENDEZ"),
  person("6164355", "VIDAL ANDRES MENDEZ GAYOSO", "ITALPLAST", "Fabrica", "Horario Obra", "Operario Produccion PVC", "VIDAL", "MENDEZ"),
  person("4352046", "VICTOR DAVID MENDEZ GAYOSO", "ITALPLAST", "Obra", "Horario Obra", "Auxiliar de Obra", "VICTOR", "MENDEZ"),
  person("2364745", "LILIAN CAROLINA MALDONADO IBANEZ", "ITALPLAST", "Administracion", "Horario Oficina", "Jefa Administrativa", "LILIAN", "MALDONADO"),
  person("4651015", "PAOLO KEN ORLANDO MURAYAMA", "ITALPLAST-DOC", "Operaciones", "Horario Oficina", "Gerencia de Operaciones", "PAOLO", "ORLANDO"),
  person("3748633", "MARIA BELEN ORTIZ IRUN", "ITALPLAST", "Obra", "Horario Obra", "Jefa de Obras", "MARIA", "ORTIZ"),
  person("4814946", "MARCELO DE JESUS ORUE", "ITALPLAST", "Obra", "Horario Obra", "Encargado de Cuadrillas", "MARCELO", "ORUE"),
  person("4410536", "MARCIAL PERALTA QUINONEZ", "ITALPLAST", "Fabrica", "Horario Obra", "Operario Produccion PVC", "MARCIAL", "PERALTA"),
  person("4363668", "JOSE FELIX PEREIRA MOREL", "ITALPLAST", "Fabrica", "Horario Obra", "Asistente Administrativo de fabrica", "JOSE", "PEREIRA"),
  person("4403049", "LUIS ALBERTO RAMOS LOPEZ", "ITALPLAST", "Obra", "Horario Obra", "Encargado de Cuadrillas", "LUIS", "RAMOS"),
  person("4860114", "JUAN DOMINGO RIVEROS", "ITALPLAST", "Obra", "Horario Obra", "Auxiliar de Obra", "JUAN", "RIVEROS"),
  person("7117759", "DAVID ROMERO DELVALLE", "ITALPLAST", "Obra", "Horario Oficina", "Encargado Tecnico", "DAVID", "ROMERO"),
  person("5445820", "CRISTHIAN ROMERO DELVALLE", "ITALPLAST", "Fabrica", "Horario Obra", "Encargado Producc. ALU", "CRISTHIAN", "ROMERO"),
  person("5010929", "IGNACIO RAMON ROMERO DELVALLE", "ITALPLAST", "Obra", "Horario Obra", "Auxiliar de Obra", "IGNACIO", "ROMERO"),
  person("4687060", "KATIA CAROLINA RECALDE CABANAS", "ITALPLAST", "Proyectos", "Horario Oficina", "Asistente Proyectos", "KATIA", "RECALDE"),
  person("4809655", "HEBER JOSE VILLALBA", "ITALPLAST", "Obra", "Horario Obra", "Encargado de Cuadrillas", "HEBER", "VILLALBA"),
  person("4837136", "JOSUE VELASTIQUI CENTURION", "ITALPLAST", "Obra", "Horario Obra", "Auxiliar de Obra", "JOSUE", "VELASTIQUI"),
  person("5934821", "MISAEL VELASTIQUI CENTURION", "ITALPLAST", "Fabrica", "Horario Obra", "Operario Produccion PVC", "MISAEL", "VELASTIQUI"),
  person("5069167", "BELEN MA. LORENA ESTIGARRIBIA RODRIGUEZ", "ITALPLAST", "Administracion", "Horario Oficina", "Recepcionista", "BELEN", "ESTIGARRIBIA"),
  person("4927175", "HERNAN ANDRES FERREIRA FRANCO", "ITALPLAST", "Obra", "Horario Obra", "Auxiliar de Obra", "HERNAN", "FERREIRA"),
  person("5723308", "JUAN CARLOS ORTIGOZA ORTIZ", "ITALPLAST", "Obra", "Horario Obra", "Auxiliar de Obra", "JUAN", "ORTIGOZA"),
  person("5081641", "SANTIAGO JULIAN VILLALBA SILVA", "ITALPLAST", "Obra", "Horario Obra", "Auxiliar de Obra", "SANTIAGO", "VILLALBA"),
  person("4808866", "MANUEL ALEJANDRO VARGAS MALDONADO", "ITALPLAST-DOC", "Comercial", "Horario Oficina", "Asesor Comercial", "MANUEL", "VARGAS"),
  person("5595918", "MICAELA SOLEDAD PEREZ", "ITALPLAST", "Administracion", "Horario Oficina", "Asistente Contable", "MICAELA", "PEREZ"),
  person("4673209", "ELIANE CORDS", "ITALPLAST-DOC", "Comercial", "Horario Oficina", "Asesor Comercial", "ELIANE", "CORDS"),
  person("1722801", "VICTOR RIVAS", "DOC", "Obra", "Horario Obra", "Auxiliar de Obra", "VICTOR", "RIVAS"),
  person("1479783", "VICTOR LOPEZ", "DOC", "Obra", "Horario Obra", "Auxiliar de Obra", "VICTOR", "LOPEZ")
];

function admin() {
  return {
    username: "admin",
    displayName: "Admin",
    password: "Admin12345",
    role: "administrator",
    documentNumber: null,
    businessUnit: null,
    department: null,
    scheduleType: null,
    positionTitle: null
  };
}

function person(username, displayName, businessUnit, department, scheduleType, positionTitle, firstName, firstSurname) {
  return {
    username,
    displayName,
    password: `${firstName}${firstSurname}12345`,
    role: "viewer",
    documentNumber: username,
    businessUnit,
    department,
    scheduleType,
    positionTitle
  };
}

async function run() {
  const env = loadEnv();
  const pool = createPostgresPool(env);

  try {
    for (const account of users) {
      const passwordHash = await bcrypt.hash(account.password, SALT_ROUNDS);

      await pool.query(
        `
          insert into app_users (
            id,
            username,
            display_name,
            password_hash,
            role,
            is_active,
            document_number,
            business_unit,
            department,
            schedule_type,
            position_title
          )
          values ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10)
          on conflict (username) do update set
            display_name = excluded.display_name,
            password_hash = excluded.password_hash,
            role = excluded.role,
            is_active = true,
            document_number = excluded.document_number,
            business_unit = excluded.business_unit,
            department = excluded.department,
            schedule_type = excluded.schedule_type,
            position_title = excluded.position_title,
            updated_at = now()
        `,
        [
          randomUUID(),
          account.username,
          account.displayName,
          passwordHash,
          account.role,
          account.documentNumber,
          account.businessUnit,
          account.department,
          account.scheduleType,
          account.positionTitle
        ]
      );
    }

    console.log(`Usuarios sincronizados: ${users.length}`);
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
