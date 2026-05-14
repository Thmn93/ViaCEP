# Documentação do Projeto — ViaCEP + Dual Database

## Visão Geral

O projeto é composto por **três partes independentes** que trabalham juntas:

| Parte | Diretório | Tecnologia | Função |
|---|---|---|---|
| **Frontend** | `ViaCEP/` | React Native + Expo | App mobile que consulta CEP e gerencia cadastros |
| **Backend SQLite** | `AppSqlite/` | Node.js + Express + SQLite | API REST que persiste dados em banco local SQLite |
| **Backend MongoDB** | `FrontBack/Server/` | Node.js + Express + MongoDB | API REST que persiste dados no MongoDB |

---

## Arquitetura

```
┌──────────────────────────────────────────────────────────┐
│                  App Mobile (ViaCEP)                     │
│              React Native / Expo — porta 8081            │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Seletor de banco (SegmentedButtons)               │  │
│  │  [ SQLite ]  [ MongoDB ]  [ Ambos ]                │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────┬─────────────────────┬─────────────────┘
                   │                     │
         (porta 3333)           (porta 3000)
                   │                     │
    ┌──────────────▼──────┐   ┌──────────▼──────────┐
    │  AppSqlite           │   │  FrontBack/Server    │
    │  Express + TypeScript│   │  Express + JavaScript│
    │  SQLite (arquivo     │   │  Mongoose + MongoDB  │
    │  fatec-local.db)     │   │  DSM2026.usuarios    │
    └─────────────────────┘   └─────────────────────┘
```

---

## Como Funciona a Seleção de Banco

### 1. O Seletor de Banco — `SegmentedButtons`

No modal de cadastro do frontend (`components/cep-search.tsx`), é utilizado o componente **`SegmentedButtons`** da biblioteca `react-native-paper`. Ele apresenta 3 opções ao usuário:

```tsx
<SegmentedButtons
  value={dbTarget}
  onValueChange={(v) => setDbTarget(v as DbTarget)}
  buttons={[
    { value: 'sqlite', label: 'SQLite',  icon: 'database'          },
    { value: 'mongo',  label: 'MongoDB', icon: 'leaf'               },
    { value: 'both',   label: 'Ambos',   icon: 'content-save-all'  },
  ]}
/>
```

O estado `dbTarget` pode ter um de três valores:

```ts
type DbTarget = 'sqlite' | 'mongo' | 'both';
```

---

### 2. Fluxo de Cadastro (CREATE)

Quando o usuário clica em **Salvar**, a função `handleCadastroSubmit` é chamada e decide para onde enviar os dados com base no valor de `dbTarget`:

```ts
if (dbTarget === 'sqlite') {
    // Envia APENAS para AppSqlite (porta 3333)
    await saveToSqlite(body);

} else if (dbTarget === 'mongo') {
    // Envia APENAS para FrontBack/Server (porta 3000)
    await saveToMongo(body);

} else {
    // Modo "Ambos" — envia para os DOIS ao mesmo tempo
    const [sqliteResult, mongoResult] = await Promise.allSettled([
        saveToSqlite(body),
        saveToMongo(body),
    ]);
    // ... tratamento de erros parciais
}
```

#### `Promise.allSettled` — A peça central do modo "Ambos"

A função nativa do JavaScript `Promise.allSettled()` recebe um array de Promises e **espera todas terminarem**, independente de sucesso ou falha. Diferente do `Promise.all()` (que cancela tudo se um falhar), o `allSettled` sempre completa e devolve o status de cada Promise individualmente:

```ts
// Cada resultado tem: { status: 'fulfilled' | 'rejected', value? / reason? }
const [sqliteResult, mongoResult] = await Promise.allSettled([...]);

const erros: string[] = [];
if (sqliteResult.status === 'rejected') erros.push(`SQLite: ${sqliteResult.reason.message}`);
if (mongoResult.status === 'rejected')  erros.push(`MongoDB: ${mongoResult.reason.message}`);

if (erros.length === 2) throw new Error(erros.join(' | ')); // ambos falharam
if (erros.length === 1) {
    // Salvo parcialmente — avisa o usuário mas fecha o modal
    setConsultaError(`Salvo parcialmente — ${erros[0]}`);
}
```

**Resultado para o usuário:**
- ✅ Ambos salvaram → sucesso silencioso
- ⚠️ Um falhou → mensagem "Salvo parcialmente — SQLite: ..." ou "... MongoDB: ..."
- ❌ Ambos falharam → erro exibido no modal, permanece aberto

---

### 3. Fluxo de Edição (UPDATE)

A função `saveToMongo` detecta automaticamente se está em **modo criação** ou **modo edição** com base no estado `editingUserId` e `originalCpf`:

```ts
const saveToMongo = async (body) => {
    const isEditing = editingUserId !== null && originalCpf !== "";

    const url = isEditing
        ? `${MONGO_API_URL}/usuarios/cpf/${originalCpf}` // PUT por CPF
        : `${MONGO_API_URL}/usuarios`;                    // POST novo

    const method = isEditing ? "PUT" : "POST";
    // ...
    // Se 404: usuário não existe no Mongo — ignorado silenciosamente
    if (isEditing && response.status === 404) return null;
};
```

**Por que usar CPF como chave no MongoDB?**
O SQLite identifica registros por `ID_US` (inteiro auto-incremento), que não existe no MongoDB. O CPF é o único campo comum e único entre os dois bancos, tornando-o o identificador natural para operações cross-database.

Quando o modal de edição é aberto, o CPF original é salvo:
```ts
setOriginalCpf(user.cpf.replace(/\D/g, "")); // ex: "03250594032"
```

Isso garante que, mesmo que o usuário altere o CPF no formulário, a busca no MongoDB ainda encontre o documento correto.

---

### 4. Fluxo de Exclusão (DELETE)

A função `confirmDeleteUser` utiliza `Promise.allSettled` para tentar excluir nos dois bancos ao mesmo tempo:

```ts
const [sqliteResult, mongoResult] = await Promise.allSettled([
    // SQLite: exclui por ID numérico
    fetch(`${API_URL}/usuarios/${deleteTargetId}`, { method: "DELETE" }),

    // MongoDB: exclui por CPF
    fetch(`${MONGO_API_URL}/usuarios/cpf/${deleteTargetCpf}`, { method: "DELETE" }),
]);
```

- Se o usuário **não existia no MongoDB** → o backend retorna `200` com mensagem neutra (sem erro), tornando a operação idempotente
- Se o **MongoDB estiver offline** → a exclusão do SQLite ainda ocorre, e uma mensagem de aviso é exibida

---

## Rotas dos Backends

### AppSqlite — porta 3333

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/usuarios` | Lista todos os usuários |
| `GET` | `/usuarios/cpf/:cpf` | Busca usuário por CPF |
| `POST` | `/usuarios` | Cria novo usuário |
| `PUT` | `/usuarios/:id` | Atualiza usuário por ID |
| `DELETE` | `/usuarios/:id` | Remove usuário por ID |

### FrontBack/Server — porta 3000

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/` ou `/usuarios` | Lista todos os usuários |
| `POST` | `/add` ou `/usuarios` | Cria novo usuário |
| `PUT` | `/:id` | Atualiza por ObjectId do Mongo |
| `PUT` | `/usuarios/cpf/:cpf` | **Atualiza por CPF** ← usado pelo frontend |
| `DELETE` | `/:id` | Remove por ObjectId do Mongo |
| `DELETE` | `/usuarios/cpf/:cpf` | **Remove por CPF** ← usado pelo frontend |

---

## Configuração de URLs — `api-config.ts`

As URLs dos dois backends são centralizadas em `ViaCEP/api-config.ts`:

```ts
// Backend SQLite (AppSqlite)
export const API_URL =
    Platform.OS === 'android'
        ? 'http://10.0.2.2:3333'   // emulador Android
        : 'http://localhost:3333'; // web/iOS

// Backend MongoDB (FrontBack/Server)
export const MONGO_API_URL =
    Platform.OS === 'android'
        ? 'http://10.0.2.2:3000'
        : 'http://localhost:3000';
```

> **Nota:** No emulador Android, `localhost` refere-se ao próprio emulador, não à máquina host. Por isso usa-se `10.0.2.2` para acessar o host.

---

## Banco de Dados

### SQLite (`fatec-local.db`)
- Arquivo local gerado automaticamente em `AppSqlite/fatec-local.db`
- Tabela `USUARIO` com colunas: `ID_US`, `NOME_US`, `EMAIL_US`, `CPF_US`, `CEP_US`, `LOGRADOURO_US`, `BAIRRO_US`, `CIDADE_US`, `ESTADO_US`, `NUMERO_US`, `COMPLEMENTO_US`
- CPF com índice único (`idx_usuario_cpf`)

### MongoDB (`DSM2026.usuarios`)
- Banco local em `mongodb://localhost:27017/DSM2026`
- Coleção `usuarios` com schema Mongoose
- Campos: `nome`, `email`, `cpf` (único + sparse), `cep`, `logradouro`, `bairro`, `cidade`, `estado`, `numero`, `complemento`, `createdAt`, `updatedAt`

---

## Como Iniciar o Projeto

```bash
# Terminal 1 — Backend SQLite
cd AppSqlite
npm run dev          # porta 3333

# Terminal 2 — Backend MongoDB (MongoDB deve estar rodando)
cd FrontBack/Server
node index.js        # porta 3000

# Terminal 3 — Frontend mobile
cd ViaCEP
npx expo start       # porta 8081
```

---

## Resumo das Tecnologias-Chave

| Tecnologia | Onde | Para quê |
|---|---|---|
| `Promise.allSettled()` | Frontend (`cep-search.tsx`) | Salvar/excluir nos dois bancos simultaneamente sem cancelar em caso de falha parcial |
| `SegmentedButtons` | Frontend (`cep-search.tsx`) | UI de seleção do banco de dados (react-native-paper) |
| `mongoose` | Backend MongoDB | ODM para modelar e operar documentos no MongoDB |
| `sqlite` + `sqlite3` | Backend SQLite | Driver para operar o banco relacional local |
| CPF como chave universal | Frontend + Backend Mongo | Identificador comum entre SQLite (ID numérico) e MongoDB (ObjectId) |
