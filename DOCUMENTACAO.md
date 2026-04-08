# Documentação - Aplicação ViaCEP com Backend AppSqlite

## Sumário

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Configuração de APIs](#configuração-de-apis)
4. [Chamadas HTTP](#chamadas-http)
5. [Paginação](#paginação)
6. [Cadastro e Validações](#cadastro-e-validações)
7. [Estados e Gerenciamento](#estados-e-gerenciamento)
8. [Como Executar](#como-executar)

---

## Visão Geral

A aplicação ViaCEP é um cliente React Native que integra:

- **API ViaCEP**: Consulta de endereços brasileiros por CEP (API pública)
- **Backend AppSqlite**: API local Express que persiste dados de usuários em SQLite

O fluxo típico:

1. Usuário digita um CEP
2. App consulta a API ViaCEP e obtém dados do endereço
3. Usuário preenche dados adicionais e confirma cadastro
4. App envia tudo para o backend AppSqlite, que salva no banco de dados
5. App exibe lista paginada de cadastros

---

## Arquitetura

### Estrutura de Tipos

```typescript
type ApiUser = {
  ID_US: number; // ID do banco de dados
  NOME_US: string; // Nome do usuário
  EMAIL_US: string; // Email
  CPF_US: string; // CPF (sem formatação)
  CEP_US: string; // CEP (com hífen)
  LOGRADOURO_US: string; // Rua/avenida
  BAIRRO_US: string; // Bairro
  CIDADE_US: string; // Cidade
  ESTADO_US: string; // UF (sigla)
  NUMERO_US: string; // Número da casa
  COMPLEMENTO_US: string; // Complemento (apto, bloco, etc)
};

type RegisteredUser = {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  cep: string;
  address: ViaCepResponse; // Dados do endereço da API ViaCEP
  numero: string;
  complemento: string;
  estado: string;
};

type ViaCepResponse = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // Ainda é 'cidade' mas ViaCEP chama assim
  uf: string; // Estado
  erro?: boolean;
};
```

### Componente Principal

**Arquivo**: `components/cep-search.tsx`

O componente `CepSearch()` é o responsável por toda a lógica da aplicação.

---

## Configuração de APIs

### URL da API Local

```typescript
const API_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:3333" // Emulador Android
    : "http://localhost:3333"; // Web/iOS/Celular físico na mesma rede
```

**Explicação**:

- **Emulador Android**: Usa `10.0.2.2` porque `localhost` do dispositivo não consegue acessar a máquina host. `10.0.2.2` é o alias que o Android fornece.
- **Web/iOS**: Usa `localhost` direto.
- **Celular físico na LAN**: Substitua por `http://<seu-ip>:3333`

---

## Chamadas HTTP

### 1. Buscar Todos os Cadastros

```typescript
const fetchAllCadastros = async () => {
  try {
    setConsultaError("");
    const response = await fetch(`${API_URL}/usuarios`);

    if (!response.ok) {
      throw new Error("Falha ao buscar cadastros");
    }

    const data: ApiUser[] = await response.json();
    setRegisteredUsers((data ?? []).map(mapApiUser));
  } catch {
    setConsultaError(
      "Sem conexao com API local. Inicie o backend AppSqlite na porta 3333.",
    );
  }
};
```

**O que faz**:

- Faz um GET para `/usuarios`
- Recebe array de usuários salvos no banco
- Converte cada item com `mapApiUser()` (que formata CPF e monta o objeto `RegisteredUser`)
- Se falhar, exibe mensagem de erro

**Endpoint correspondente no backend**:

```typescript
app.get("/usuarios", async (_req: Request, res: Response) => {
  const users = await selectUsuarios();
  res.json(users);
});
```

---

### 2. Buscar por CPF

```typescript
const handleConsultaCpf = async () => {
  const cpfDigits = consultaCpf.replace(/\D/g, "");

  if (cpfDigits.length !== 11) {
    setConsultaError("Informe um CPF valido para consulta.");
    return;
  }

  setConsultaLoading(true);
  setConsultaError("");

  try {
    const response = await fetch(`${API_URL}/usuarios/cpf/${cpfDigits}`);

    if (response.status === 404) {
      setRegisteredUsers([]);
      setConsultaError("Nenhum cadastro encontrado para esse CPF.");
      return;
    }

    if (!response.ok) {
      throw new Error("Erro ao consultar CPF");
    }

    const data: ApiUser = await response.json();
    setRegisteredUsers([mapApiUser(data)]);
  } catch {
    setConsultaError("Sem conexao com API local para consultar CPF.");
  } finally {
    setConsultaLoading(false);
  }
};
```

**O que faz**:

- Recebe o CPF formatado, remove a formatação
- Valida se tem 11 dígitos
- Faz GET para `/usuarios/cpf/{cpfDigits}`
- Se não acha (404), limpa a lista e exibe mensagem
- Se encontra, retorna um único usuário

**Estados usados**:

- `consultaLoading`: Mostra spinner enquanto carrega
- `consultaError`: Armazena mensagem de erro

---

### 3. Verificação do API ViaCEP (Consulta de CEP)

```typescript
const handleSearch = async () => {
  if (cepDigits.length !== 8) {
    setErrorMessage("Digite um CEP valido com 8 numeros.");
    return;
  }

  setLoading(true);
  setErrorMessage("");

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);

    if (!response.ok) {
      throw new Error("Falha na consulta do CEP.");
    }

    const data: ViaCepResponse = await response.json();

    if (data.erro) {
      setErrorMessage("CEP nao encontrado. Tente novamente.");
      return;
    }

    setLogradouro(data.logradouro || "");
    setBairro(data.bairro || "");
    setCidade(data.localidade || "");
    setEstado(data.uf || "");
    setComplemento(data.complemento || "");
  } catch {
    setErrorMessage(
      "Nao foi possivel consultar o CEP. Verifique a conexao e tente novamente.",
    );
  } finally {
    setLoading(false);
  }
};
```

**O que faz**:

- Valida se o CEP tem 8 dígitos
- Faz GET para API ViaCEP pública
- Se ViaCEP retorna erro (campo `erro: true`), mostra mensagem
- Se sucesso, preenche os campos de endereço automaticamente

**Estados usados**:

- `loading`: Mostra spinner enquanto consulta ViaCEP
- `errorMessage`: Armazena erros de validação ou consulta

---

### 4. Criar Cadastro (POST)

```typescript
const handleCadastroSubmit = async () => {
  // Validações...
  if (!nome.trim()) {
    setCpfError("Informe o nome do cadastro.");
    return;
  }
  // ... mais validações

  try {
    const body = {
      nome: nome.trim(),
      email: email.trim(),
      cpf: cpf.replace(/\D/g, ""),
      cep,
      logradouro,
      bairro,
      cidade,
      estado,
      numero,
      complemento,
    };

    const url = editingUserId
      ? `${API_URL}/usuarios/${editingUserId}`
      : `${API_URL}/usuarios`;

    const method = editingUserId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response
        .json()
        .catch(() => ({ message: "Erro ao salvar" }));
      throw new Error(err.message || "Erro ao salvar");
    }

    setCadastroModalVisible(false);
    resetForm();
    setCadastrosExpandidos(true);
    await fetchAllCadastros(); // Recarrega lista
  } catch (error) {
    setCpfError(error instanceof Error ? error.message : "Falha no cadastro");
  }
};
```

**O que faz**:

- Valida todos os campos (nome, email, CPF)
- Se é novo: POST para `/usuarios`
- Se é edição: PUT para `/usuarios/{id}`
- Em ambos os casos, envia o JSON com todos os dados
- Após sucesso, recarrega a lista de cadastros

**Payload enviado**:

```json
{
  "nome": "João Silva",
  "email": "joao@email.com",
  "cpf": "12345678900",
  "cep": "01001000",
  "logradouro": "Av Paulista",
  "bairro": "Bela Vista",
  "cidade": "São Paulo",
  "estado": "SP",
  "numero": "100",
  "complemento": "Apt 1001"
}
```

---

### 5. Deletar Cadastro (DELETE)

```typescript
const confirmDeleteUser = async () => {
  if (!deleteTargetId) {
    setDeleteDialogVisible(false);
    return;
  }

  try {
    await fetch(`${API_URL}/usuarios/${deleteTargetId}`, {
      method: "DELETE",
    });

    setDeleteDialogVisible(false);
    setDeleteTargetId(null);
    await fetchAllCadastros(); // Recarrega lista
  } catch {
    setConsultaError("Nao foi possivel excluir o cadastro.");
    setDeleteDialogVisible(false);
    setDeleteTargetId(null);
  }
};
```

**O que faz**:

- Faz DELETE para `/usuarios/{id}`
- Se sucesso, recarrega a lista
- Se erro, exibe mensagem

---

## Paginação

### Estados de Paginação

```typescript
const [currentPage, setCurrentPage] = useState(1);
const ITEMS_PER_PAGE = 2;

const totalPages = useMemo(() => {
  return Math.ceil(registeredUsers.length / ITEMS_PER_PAGE) || 1;
}, [registeredUsers.length]);

const paginatedUsers = useMemo(() => {
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  return registeredUsers.slice(startIndex, endIndex);
}, [registeredUsers, currentPage]);
```

**Explicação**:

- `currentPage`: Página atual (começa em 1)
- `ITEMS_PER_PAGE`: Constante que define 2 itens por página
- `totalPages`: Calcula quantas páginas são necessárias
- `paginatedUsers`: Array com apenas os itens da página atual

**Exemplo**:

- Se temos 5 cadastros e `ITEMS_PER_PAGE = 2`:
  - Página 1: itens 0-1 (índices 0, 1)
  - Página 2: itens 2-3 (índices 2, 3)
  - Página 3: item 4 (índice 4)
  - `totalPages = Math.ceil(5/2) = 3`

### Função de Navegação

```typescript
const handlePageChange = (page: number) => {
  if (page >= 1 && page <= totalPages) {
    setCurrentPage(page);
  }
};
```

**O que faz**:

- Valida se a página solicitada existe
- Se sim, atualiza `currentPage`
- Se não, ignora (não permite página inválida)

### Renderização da Paginação

```typescript
{paginatedUsers.map((user) => (
  <Card key={user.id} style={styles.registeredCard}>
    {/* Renderiza cada usuário */}
  </Card>
))}

<View style={styles.paginationContainer}>
  <Button
    mode="text"
    compact
    disabled={currentPage === 1}
    onPress={() => handlePageChange(currentPage - 1)}
  >
    Anterior
  </Button>

  <View style={styles.paginationNumbers}>
    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
      (page) => (
        <Pressable
          key={page}
          onPress={() => handlePageChange(page)}
          style={[
            styles.pageNumber,
            currentPage === page && styles.pageNumberActive,
          ]}
        >
          <Text
            style={[
              styles.pageNumberText,
              currentPage === page && styles.pageNumberActiveText,
            ]}
          >
            {page}
          </Text>
        </Pressable>
      ),
    )}
  </View>

  <Button
    mode="text"
    compact
    disabled={currentPage === totalPages}
    onPress={() => handlePageChange(currentPage + 1)}
  >
    Próxima
  </Button>
</View>
```

**O que faz**:

1. Renderiza apenas os usuários da página atual (`paginatedUsers`)
2. Cria botões "Anterior" e "Próxima"
3. Cria uma linha com números de páginas (1, 2, 3, etc)
4. A página ativa fica com fundo azul
5. Botões "Anterior"/"Próxima" ficam desabilitados nas extremidades

**Estilos**:

```typescript
pageNumber: {
  width: 32,
  height: 32,
  borderRadius: 4,
  borderWidth: 1,
  borderColor: "#787878",
  justifyContent: "center",
  alignItems: "center",
},
pageNumberActive: {
  backgroundColor: "#1f51ba",
  borderColor: "#1f51ba",
},
```

---

## Cadastro e Validações

### Validação de CPF

```typescript
const isValidCpf = (value: string) => {
  const digits = value.replace(/\D/g, "");

  // Deve ter 11 dígitos
  if (digits.length !== 11) return false;

  // Não pode ser sequência repetida (111.111.111-11)
  if (/^(\d)\1+$/.test(digits)) return false;

  const numbers = digits.split("").map(Number);

  // Validar primeiro dígito verificador
  const firstSum = numbers
    .slice(0, 9)
    .reduce((sum, num, idx) => sum + num * (10 - idx), 0);
  const firstCheck = ((firstSum * 10) % 11) % 10;
  if (firstCheck !== numbers[9]) return false;

  // Validar segundo dígito verificador
  const secondSum = numbers
    .slice(0, 10)
    .reduce((sum, num, idx) => sum + num * (11 - idx), 0);
  const secondCheck = ((secondSum * 10) % 11) % 10;
  return secondCheck === numbers[10];
};
```

**Valida**:

1. Se tem exatamente 11 dígitos
2. Se não é sequência repetida (111.111.111-11)
3. Se o primeiro dígito verificador está correto (algoritmo módulo 11)
4. Se o segundo dígito verificador está correto

### Validação de Email

```typescript
const isValidEmail = (value: string) => /.+@.+\..+/.test(value.trim());
```

**Valida**: Padrão básico de email (tem @, tem ponto, tem caracteres antes e depois)

### Formatação de CPF

```typescript
const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};
```

**Exemplos de formatação**:

- `123` → `123`
- `12345` → `123.45`
- `123456` → `123.456`
- `123456789` → `123.456.789`
- `12345678900` → `123.456.789-00`

---

## Estados e Gerenciamento

### Estados de Dados

| Estado            | Tipo             | Descrição                   |
| ----------------- | ---------------- | --------------------------- |
| `cep`             | string           | CEP digitado (formatado)    |
| `numero`          | string           | Número da casa              |
| `complemento`     | string           | Complemento do endereço     |
| `logradouro`      | string           | Rua/avenida (da API ViaCEP) |
| `bairro`          | string           | Bairro (da API ViaCEP)      |
| `cidade`          | string           | Cidade (da API ViaCEP)      |
| `estado`          | string           | UF (da API ViaCEP)          |
| `nome`            | string           | Nome do cadastro            |
| `email`           | string           | Email                       |
| `cpf`             | string           | CPF (formatado)             |
| `registeredUsers` | RegisteredUser[] | Lista de todos os cadastros |

### Estados de UI

| Estado                 | Tipo    | Descrição                      |
| ---------------------- | ------- | ------------------------------ |
| `loading`              | boolean | Carregando dados da API ViaCEP |
| `consultaLoading`      | boolean | Carregando consulta por CPF    |
| `errorMessage`         | string  | Erro na consulta de CEP        |
| `consultaError`        | string  | Erro na consulta geral/CPF     |
| `cpfError`             | string  | Erro de validação de CPF       |
| `cadastroModalVisible` | boolean | Modal de cadastro aberto?      |
| `deleteDialogVisible`  | boolean | Dialog de exclusão aberto?     |
| `cadastrosExpandidos`  | boolean | Lista de cadastros visível?    |
| `stateMenuVisible`     | boolean | Menu de estados aberto?        |

### Estados de Edição/Exclusão

| Estado           | Tipo           | Descrição                                   |
| ---------------- | -------------- | ------------------------------------------- |
| `editingUserId`  | number \| null | ID do cadastro sendo editado (null se novo) |
| `deleteTargetId` | number \| null | ID do cadastro a deletar                    |
| `currentPage`    | number         | Página atual da paginação                   |

### Função de Reset

```typescript
const resetForm = () => {
  setNome("");
  setEmail("");
  setCpf("");
  setCep("");
  setLogradouro("");
  setBairro("");
  setCidade("");
  setEstado("");
  setNumero("");
  setComplemento("");
  setEditingUserId(null);
  setCpfError("");
};
```

**O que faz**: Limpa todos os campos após salvar um cadastro com sucesso.

---

## Conversão de Dados

### `mapApiUser()`

```typescript
const mapApiUser = (apiUser: ApiUser): RegisteredUser => ({
  id: Number(apiUser.ID_US),
  nome: apiUser.NOME_US ?? "",
  email: apiUser.EMAIL_US ?? "",
  cpf: formatCpf(apiUser.CPF_US ?? ""), // Formata CPF
  cep: apiUser.CEP_US ?? "",
  address: {
    cep: apiUser.CEP_US ?? "",
    logradouro: apiUser.LOGRADOURO_US ?? "",
    complemento: apiUser.COMPLEMENTO_US ?? "",
    bairro: apiUser.BAIRRO_US ?? "",
    localidade: apiUser.CIDADE_US ?? "",
    uf: apiUser.ESTADO_US ?? "",
  },
  numero: apiUser.NUMERO_US ?? "",
  complemento: apiUser.COMPLEMENTO_US ?? "",
  estado: apiUser.ESTADO_US ?? "",
});
```

**O que faz**:

- Converte `ApiUser` (do banco) em `RegisteredUser` (para exibição)
- Formata o CPF automaticamente
- Estrutura o endereço no formato de `ViaCepResponse`
- Usa `??` para null-coalescing (valor padrão vazio se undefined)

---

## Como Executar

### 1. Iniciar o Backend (AppSqlite)

```bash
cd c:/Users/Alunos/Desktop/React-Native-Emerson/AppSqlite/AppSqlite
npm run dev  # Inicia API e banco de dados
```

**O que é inciado**:

- Servidor Express na porta 3333
- Banco SQLite em `./fatec-local.db`
- CORS habilitado para aceitar requisições locais

### 2. Iniciar o Frontend (ViaCEP)

```bash
cd c:/Users/Alunos/Desktop/React-Native-Emerson/Aula2-ViaCEP/ViaCEP
npm start
```

**Opções**:

- `w` para web
- `a` para Android
- `i` para iOS

### 3. Fluxo Típico de Uso

1. **Consultar CEP**:
   - Digite um CEP válido (ex: 01001000)
   - Clique em "Buscar CEP"
   - Campos de endereço preenchem automaticamente

2. **Cadastrar**:
   - Preencha Nome, Email, CPF, Número e Complemento
   - Clique em "Cadastrar"
   - Confirmação salva no backend

3. **Visualizar Cadastros**:
   - Clique em "Cadastros disponíveis" para expandir
   - Veja até 2 cadastros por página
   - Navegue usando botões e números de página

4. **Consultar por CPF**:
   - Digite um CPF válido
   - Clique em "Consultar"
   - Vê apenas esse cadastro

5. **Editar**:
   - Clique em "Editar" em um cadastro
   - Modal abre com dados
   - Modifique o que precisar
   - Clique em "Salvar alterações"

6. **Deletar**:
   - Clique em "Excluir" em um cadastro
   - Confirme na dialog
   - Cadastro é removido do banco

---

## Tratamento de Erros

### Erros de Conexão

```typescript
catch {
  setConsultaError(
    "Sem conexao com API local. Inicie o backend AppSqlite na porta 3333.",
  );
}
```

**Causa**: Backend não está rodando ou porta 3333 está bloqueada.

**Solução**:

1. Certifique-se que `npm run dev` está rodando no AppSqlite
2. Verifique porta 3333: `netstat -an | findstr 3333` (Windows)
3. Se necessário, mate o processo anterior e reinicie

### Erros de Validação

```typescript
if (!isValidCpf(cpf)) {
  setCpfError("CPF invalido. Verifique os numeros informados.");
  return;
}
```

**Mostra** em vermelho embaixo do campo.

### Erros de API

```typescript
if (!response.ok) {
  const err = await response.json();
  throw new Error(err.message || "Erro ao salvar");
}
```

**Propagado** para o estado de erro do componente.

---

## Performance e Otimizações

### `useMemo` para Cálculos

```typescript
const totalPages = useMemo(() => {
  return Math.ceil(registeredUsers.length / ITEMS_PER_PAGE) || 1;
}, [registeredUsers.length]);
```

**Por quê**: Evita recalcular página total a cada render se `registeredUsers.length` não mudou.

### Fetch com Estados

```typescript
try {
  // Operação
} catch {
  // Erro
} finally {
  setLoading(false); // Sempre remove loading ao final
}
```

**Por quê**: Garante que spinner desaparece mesmo com erro.

---

## Fluxo de Dados Resumido

```
┌─────────────────────────────────────────────────────────────┐
│                    ViaCEP App Frontend                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User digita CEP                                         │
│     ↓                                                        │
│  2. Chamada GET → https://viacep.com.br/ws/{cep}/json      │
│     ↓                                                        │
│  3. Preenche campos automaticamente                          │
│     ↓                                                        │
│  4. User completa form (nome, email, cpf, etc)             │
│     ↓                                                        │
│  5. Chamada POST/PUT → http://localhost:3333/usuarios       │
│     ↓                                                        │
│  6. Backend salva em SQLite                                 │
│     ↓                                                        │
│  7. App busca todos cadastros → GET /usuarios              │
│     ↓                                                        │
│  8. Renderiza lista paginada (2 itens por página)          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Contato e Suporte

Para dúvidas sobre implementação:

- Verificar console do navegador/emulador para logs
- Testar endpoints da API com Postman/Insomnia
- Resetar banco deletando `fatec-local.db` se corrupted
