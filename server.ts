import cors from "cors";
import type { Request, Response } from "express";
import express from "express";
import {
    AtualizaUsuario,
    createTable,
    deletaUsuario,
    InserirUsuario,
    selectUsuarios,
    SelectUsuariosId,
    type UsuarioPayload,
} from "./Conf/Bd";

const app = express();
const PORT = 3333;

app.use(cors());
app.use(express.json());

app.get("/usuarios", async (_req: Request, res: Response) => {
  try {
    const usuarios = await selectUsuarios();
    res.json(usuarios);
  } catch {
    res.status(500).json({ message: "Erro ao consultar cadastros." });
  }
});

app.get("/usuarios/cpf/:cpf", async (req: Request, res: Response) => {
  try {
    const cpfParam = Array.isArray(req.params.cpf)
      ? req.params.cpf[0]
      : req.params.cpf;
    const usuario = await SelectUsuariosId(cpfParam ?? "");
    if (!usuario) {
      return res.status(404).json({ message: "Cadastro nao encontrado." });
    }
    res.json(usuario);
  } catch {
    res.status(500).json({ message: "Erro ao consultar CPF." });
  }
});

app.post("/usuarios", async (req: Request, res: Response) => {
  try {
    const payload = req.body as UsuarioPayload;
    await InserirUsuario(payload);
    res.status(201).json({ message: "Cadastro realizado com sucesso." });
  } catch (error) {
    const message = String(error);
    if (message.includes("UNIQUE")) {
      return res.status(409).json({ message: "CPF já cadastrado." });
    }
    res.status(500).json({ message: "Erro ao cadastrar usuario." });
  }
});

app.put("/usuarios/:id", async (req: Request, res: Response) => {
  try {
    const payload = req.body as UsuarioPayload;
    await AtualizaUsuario(Number(req.params.id), payload);
    res.json({ message: "Cadastro atualizado com sucesso." });
  } catch {
    res.status(500).json({ message: "Erro ao atualizar cadastro." });
  }
});

app.delete("/usuarios/:id", async (req: Request, res: Response) => {
  try {
    await deletaUsuario(Number(req.params.id));
    res.json({ message: "Cadastro excluido com sucesso." });
  } catch {
    res.status(500).json({ message: "Erro ao excluir cadastro." });
  }
});

createTable().then(() => {
  app.listen(PORT, () => {
    console.log(`API local em http://localhost:${PORT}`);
  });
});
