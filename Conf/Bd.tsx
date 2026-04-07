import { open } from "sqlite";
import sqlite3 from "sqlite3";

export type UsuarioPayload = {
  nome: string;
  email: string;
  cpf: string;
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  numero: string;
  complemento: string;
};

const dbPromise = open({
  filename: "./viacep-local.db",
  driver: sqlite3.Database,
});

export async function Banco() {
  return dbPromise;
}

export async function createTable() {
  const db = await dbPromise;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS USUARIO(
      ID_US INTEGER PRIMARY KEY AUTOINCREMENT,
      NOME_US VARCHAR(100),
      EMAIL_US VARCHAR(100),
      CPF_US VARCHAR(11) UNIQUE,
      CEP_US VARCHAR(9),
      LOGRADOURO_US VARCHAR(120),
      BAIRRO_US VARCHAR(120),
      CIDADE_US VARCHAR(120),
      ESTADO_US VARCHAR(2),
      NUMERO_US VARCHAR(20),
      COMPLEMENTO_US VARCHAR(120)
    )
  `);
}

export async function InserirUsuario(payload: UsuarioPayload) {
  const db = await dbPromise;
  await db.run(
    `INSERT INTO USUARIO(
      NOME_US, EMAIL_US, CPF_US, CEP_US, LOGRADOURO_US,
      BAIRRO_US, CIDADE_US, ESTADO_US, NUMERO_US, COMPLEMENTO_US
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.nome,
    payload.email,
    payload.cpf,
    payload.cep,
    payload.logradouro,
    payload.bairro,
    payload.cidade,
    payload.estado,
    payload.numero,
    payload.complemento,
  );
}

export async function selectUsuarios() {
  const db = await dbPromise;
  return db.all("SELECT * FROM USUARIO ORDER BY ID_US DESC");
}

export async function SelectUsuariosId(cpf: string) {
  const db = await dbPromise;
  return db.get("SELECT * FROM USUARIO WHERE CPF_US = ?", cpf);
}

export async function AtualizaUsuario(id: number, payload: UsuarioPayload) {
  const db = await dbPromise;
  await db.run(
    `UPDATE USUARIO SET
      NOME_US = ?, EMAIL_US = ?, CPF_US = ?, CEP_US = ?, LOGRADOURO_US = ?,
      BAIRRO_US = ?, CIDADE_US = ?, ESTADO_US = ?, NUMERO_US = ?, COMPLEMENTO_US = ?
    WHERE ID_US = ?`,
    payload.nome,
    payload.email,
    payload.cpf,
    payload.cep,
    payload.logradouro,
    payload.bairro,
    payload.cidade,
    payload.estado,
    payload.numero,
    payload.complemento,
    id,
  );
}

export async function deletaUsuario(id: number) {
  const db = await dbPromise;
  await db.run("DELETE FROM USUARIO WHERE ID_US = ?", id);
}
