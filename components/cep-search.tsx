import { useMemo, useState } from "react";
import {
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import {
    ActivityIndicator,
    Button,
    Card,
    Dialog,
    HelperText,
    Menu,
    Portal,
    Text,
    TextInput,
} from "react-native-paper";

type BrazilianState = {
  uf: string;
  name: string;
};

type ViaCepResponse = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
};

type ApiUser = {
  ID_US: number;
  NOME_US: string;
  EMAIL_US: string;
  CPF_US: string;
  CEP_US: string;
  LOGRADOURO_US: string;
  BAIRRO_US: string;
  CIDADE_US: string;
  ESTADO_US: string;
  NUMERO_US: string;
  COMPLEMENTO_US: string;
};

type RegisteredUser = {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  cep: string;
  address: ViaCepResponse;
  numero: string;
  complemento: string;
  estado: string;
};

const API_URL =
  Platform.OS === "android" ? "http://10.0.2.2:3333" : "http://localhost:3333";

function getBrazilianStates(): BrazilianState[] {
  return [
    { uf: "AC", name: "Acre" },
    { uf: "AL", name: "Alagoas" },
    { uf: "AP", name: "Amapa" },
    { uf: "AM", name: "Amazonas" },
    { uf: "BA", name: "Bahia" },
    { uf: "CE", name: "Ceara" },
    { uf: "DF", name: "Distrito Federal" },
    { uf: "ES", name: "Espirito Santo" },
    { uf: "GO", name: "Goias" },
    { uf: "MA", name: "Maranhao" },
    { uf: "MT", name: "Mato Grosso" },
    { uf: "MS", name: "Mato Grosso do Sul" },
    { uf: "MG", name: "Minas Gerais" },
    { uf: "PA", name: "Para" },
    { uf: "PB", name: "Paraiba" },
    { uf: "PR", name: "Parana" },
    { uf: "PE", name: "Pernambuco" },
    { uf: "PI", name: "Piaui" },
    { uf: "RJ", name: "Rio de Janeiro" },
    { uf: "RN", name: "Rio Grande do Norte" },
    { uf: "RS", name: "Rio Grande do Sul" },
    { uf: "RO", name: "Rondonia" },
    { uf: "RR", name: "Roraima" },
    { uf: "SC", name: "Santa Catarina" },
    { uf: "SP", name: "Sao Paulo" },
    { uf: "SE", name: "Sergipe" },
    { uf: "TO", name: "Tocantins" },
  ];
}

export function CepSearch() {
  const [cep, setCep] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [loading, setLoading] = useState(false);
  const [cadastroModalVisible, setCadastroModalVisible] = useState(false);
  const [cadastrosExpandidos, setCadastrosExpandidos] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState("");
  const [stateMenuVisible, setStateMenuVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [consultaCpf, setConsultaCpf] = useState("");
  const [consultaError, setConsultaError] = useState("");
  const [consultaLoading, setConsultaLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 2;

  const cepDigits = useMemo(() => cep.replace(/\D/g, ""), [cep]);

  const totalPages = useMemo(() => {
    return Math.ceil(registeredUsers.length / ITEMS_PER_PAGE) || 1;
  }, [registeredUsers.length]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return registeredUsers.slice(startIndex, endIndex);
  }, [registeredUsers, currentPage]);

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 5) {
      return digits;
    }
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const isValidCpf = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 11) return false;
    if (/^(\d)\1+$/.test(digits)) return false;

    const numbers = digits.split("").map(Number);
    const firstSum = numbers
      .slice(0, 9)
      .reduce((sum, num, idx) => sum + num * (10 - idx), 0);
    const firstCheck = ((firstSum * 10) % 11) % 10;
    if (firstCheck !== numbers[9]) return false;

    const secondSum = numbers
      .slice(0, 10)
      .reduce((sum, num, idx) => sum + num * (11 - idx), 0);
    const secondCheck = ((secondSum * 10) % 11) % 10;
    return secondCheck === numbers[10];
  };

  const isValidEmail = (value: string) => /.+@.+\..+/.test(value.trim());

  const selectedStateLabel = useMemo(() => {
    const selected = getBrazilianStates().find((item) => item.uf === estado);
    return selected ? `${selected.name} (${selected.uf})` : "";
  }, [estado]);

  const mapApiUser = (apiUser: ApiUser): RegisteredUser => ({
    id: Number(apiUser.ID_US),
    nome: apiUser.NOME_US ?? "",
    email: apiUser.EMAIL_US ?? "",
    cpf: formatCpf(apiUser.CPF_US ?? ""),
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

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSearch = async () => {
    if (cepDigits.length !== 8) {
      setErrorMessage("Digite um CEP valido com 8 numeros.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cepDigits}/json/`,
      );
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

  const openCadastroModal = (user?: RegisteredUser) => {
    setCpfError("");
    if (user) {
      setEditingUserId(user.id);
      setNome(user.nome);
      setEmail(user.email);
      setCpf(user.cpf);
      setCep(formatCep(user.cep));
      setLogradouro(user.address.logradouro);
      setBairro(user.address.bairro);
      setCidade(user.address.localidade);
      setEstado(user.estado || user.address.uf);
      setNumero(user.numero);
      setComplemento(user.complemento);
    } else {
      setEditingUserId(null);
      setNome("");
      setEmail("");
      setCpf("");
    }
    setCadastroModalVisible(true);
  };

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

  const handleCadastroSubmit = async () => {
    if (!nome.trim()) {
      setCpfError("Informe o nome do cadastro.");
      return;
    }
    if (!isValidEmail(email)) {
      setCpfError("Informe um e-mail valido.");
      return;
    }
    if (!isValidCpf(cpf)) {
      setCpfError("CPF invalido. Verifique os numeros informados.");
      return;
    }
    if (cep.replace(/\D/g, "").length !== 8) {
      setCpfError("Informe um CEP valido.");
      return;
    }

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
      await fetchAllCadastros();
    } catch (error) {
      setCpfError(error instanceof Error ? error.message : "Falha no cadastro");
    }
  };

  const handleDeleteUser = (userId: number) => {
    setDeleteTargetId(userId);
    setDeleteDialogVisible(true);
  };

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
      await fetchAllCadastros();
    } catch {
      setConsultaError("Nao foi possivel excluir o cadastro.");
      setDeleteDialogVisible(false);
      setDeleteTargetId(null);
    }
  };

  const handleExpandToggle = async () => {
    const next = !cadastrosExpandidos;
    setCadastrosExpandidos(next);
    if (next) {
      await fetchAllCadastros();
    }
  };

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

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text variant="headlineSmall" style={styles.title}>
        Consulta ViaCEP
      </Text>

      <TextInput
        label="Digite o CEP"
        mode="outlined"
        keyboardType="number-pad"
        value={cep}
        onChangeText={(value) => setCep(formatCep(value))}
        maxLength={9}
        placeholder="Ex: 01001000"
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={handleSearch}
        disabled={loading}
        style={styles.button}
      >
        Buscar CEP
      </Button>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator animating size="small" />
          <Text>Carregando dados...</Text>
        </View>
      )}

      <HelperText type="error" visible={Boolean(errorMessage)}>
        {errorMessage}
      </HelperText>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Dados do endereco
          </Text>

          <TextInput
            label="Logradouro"
            mode="outlined"
            value={logradouro}
            editable={false}
            style={styles.input}
          />
          <TextInput
            label="Bairro"
            mode="outlined"
            value={bairro}
            editable={false}
            style={styles.input}
          />
          <TextInput
            label="Cidade"
            mode="outlined"
            value={cidade}
            editable={false}
            style={styles.input}
          />

          <Menu
            visible={stateMenuVisible}
            onDismiss={() => setStateMenuVisible(false)}
            anchor={
              <Pressable
                style={styles.stateSelectTrigger}
                onPress={() => setStateMenuVisible(true)}
              >
                <Text style={styles.stateLabel}>Estado</Text>
                <Text>{selectedStateLabel || "Selecionar estado"}</Text>
              </Pressable>
            }
          >
            <ScrollView style={styles.menuScroll}>
              {getBrazilianStates().map((item) => (
                <Menu.Item
                  key={item.uf}
                  title={`${item.name} (${item.uf})`}
                  onPress={() => {
                    setEstado(item.uf);
                    setStateMenuVisible(false);
                  }}
                />
              ))}
            </ScrollView>
          </Menu>

          <TextInput
            label="Numero"
            mode="outlined"
            keyboardType="number-pad"
            value={numero}
            onChangeText={setNumero}
            placeholder="Digite o numero"
            style={styles.input}
          />

          <TextInput
            label="Complemento"
            mode="outlined"
            value={complemento}
            onChangeText={setComplemento}
            placeholder="Digite o complemento"
            style={styles.input}
          />

          <View style={styles.buttonWrapper}>
            <Button mode="contained" onPress={() => openCadastroModal()}>
              Cadastrar
            </Button>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.dividerSection}>
        <View style={styles.dividerLine} />
        <Pressable style={styles.dividerToggle} onPress={handleExpandToggle}>
          <Text style={styles.dividerLabel}>Cadastros disponíveis</Text>
          <View style={styles.dividerCountWrapper}>
            <Text style={styles.dividerCount}>{registeredUsers.length}</Text>
            <Text style={styles.dividerExpandIcon}>
              {cadastrosExpandidos ? "−" : "+"}
            </Text>
          </View>
        </Pressable>
        <View style={styles.dividerLine} />
      </View>

      {cadastrosExpandidos && (
        <View style={styles.registeredList}>
          <Card style={styles.registeredCard}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                Consulta
              </Text>
              <TextInput
                label="Consultar por CPF"
                mode="outlined"
                keyboardType="number-pad"
                value={consultaCpf}
                onChangeText={(value) => setConsultaCpf(formatCpf(value))}
                placeholder="000.000.000-00"
                style={styles.input}
                maxLength={14}
              />
              <View style={styles.cardActionsLeft}>
                <Button
                  mode="contained-tonal"
                  onPress={handleConsultaCpf}
                  loading={consultaLoading}
                >
                  Consultar
                </Button>
                <Button mode="text" onPress={fetchAllCadastros}>
                  Limpar
                </Button>
              </View>
              <HelperText type="error" visible={Boolean(consultaError)}>
                {consultaError}
              </HelperText>
            </Card.Content>
          </Card>

          {registeredUsers.length === 0 ? (
            <Card style={styles.registeredCard}>
              <Card.Content>
                <Text>Nenhum cadastro encontrado.</Text>
              </Card.Content>
            </Card>
          ) : (
            <>
              {paginatedUsers.map((user) => (
                <Card key={user.id} style={styles.registeredCard}>
                  <Card.Content>
                    <Text variant="titleMedium" style={styles.registeredName}>
                      {user.nome}
                    </Text>
                    <Text style={styles.registeredInfo}>
                      Email: {user.email || "-"}
                    </Text>
                    <Text style={styles.registeredInfo}>CPF: {user.cpf}</Text>
                    <Text style={styles.registeredInfo}>CEP: {user.cep}</Text>
                    <Text style={styles.registeredInfo}>
                      Endereco: {user.address.logradouro}
                    </Text>
                    <Text style={styles.registeredInfo}>
                      Bairro: {user.address.bairro}
                    </Text>
                    <Text style={styles.registeredInfo}>
                      Cidade: {user.address.localidade}
                    </Text>
                    <Text style={styles.registeredInfo}>
                      Estado: {user.estado || user.address.uf}
                    </Text>
                    <Text style={styles.registeredInfo}>
                      Numero: {user.numero || "-"}
                    </Text>
                    <Text style={styles.registeredInfo}>
                      Complemento: {user.complemento || "-"}
                    </Text>
                    <View style={styles.cardActions}>
                      <Button
                        mode="outlined"
                        compact
                        onPress={() => openCadastroModal(user)}
                      >
                        Editar
                      </Button>
                      <Button
                        mode="text"
                        compact
                        textColor="#b00020"
                        onPress={() => handleDeleteUser(user.id)}
                      >
                        Excluir
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              ))}

              <View style={styles.paginationContainer}>
                <Button
                  mode="text"
                  compact
                  disabled={currentPage === 1}
                  onPress={() => handlePageChange(currentPage - 1)}
                  style={styles.paginationButton}
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
                  style={styles.paginationButton}
                >
                  Próxima
                </Button>
              </View>
            </>
          )}
        </View>
      )}

      <Portal>
        <Dialog
          visible={cadastroModalVisible}
          onDismiss={() => setCadastroModalVisible(false)}
        >
          <Dialog.Title>
            {editingUserId ? "Editar cadastro" : "Dados do cadastro"}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nome"
              mode="outlined"
              value={nome}
              onChangeText={setNome}
              style={styles.input}
            />
            <TextInput
              label="E-mail"
              mode="outlined"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              label="CPF"
              mode="outlined"
              keyboardType="number-pad"
              value={cpf}
              onChangeText={(value) => {
                setCpf(formatCpf(value));
                setCpfError("");
              }}
              placeholder="000.000.000-00"
              style={styles.input}
              maxLength={14}
            />
            <TextInput
              label="CEP"
              mode="outlined"
              keyboardType="number-pad"
              value={cep}
              onChangeText={(value) => setCep(formatCep(value))}
              placeholder="00000-000"
              style={styles.input}
              maxLength={9}
            />
            <TextInput
              label="Logradouro"
              mode="outlined"
              value={logradouro}
              onChangeText={setLogradouro}
              style={styles.input}
            />
            <TextInput
              label="Bairro"
              mode="outlined"
              value={bairro}
              onChangeText={setBairro}
              style={styles.input}
            />
            <TextInput
              label="Cidade"
              mode="outlined"
              value={cidade}
              onChangeText={setCidade}
              style={styles.input}
            />
            <TextInput
              label="Estado (UF)"
              mode="outlined"
              value={estado}
              onChangeText={(value) =>
                setEstado(value.toUpperCase().slice(0, 2))
              }
              placeholder="SP"
              autoCapitalize="characters"
              style={styles.input}
              maxLength={2}
            />
            <TextInput
              label="Numero"
              mode="outlined"
              keyboardType="number-pad"
              value={numero}
              onChangeText={setNumero}
              style={styles.input}
            />
            <TextInput
              label="Complemento"
              mode="outlined"
              value={complemento}
              onChangeText={setComplemento}
              style={styles.input}
            />
            <HelperText type="error" visible={Boolean(cpfError)}>
              {cpfError}
            </HelperText>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setCadastroModalVisible(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button mode="contained" onPress={handleCadastroSubmit}>
              {editingUserId ? "Salvar alterações" : "Salvar"}
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => {
            setDeleteDialogVisible(false);
            setDeleteTargetId(null);
          }}
        >
          <Dialog.Title>Excluir cadastro</Dialog.Title>
          <Dialog.Content>
            <Text>Deseja realmente excluir este cadastro?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setDeleteDialogVisible(false);
                setDeleteTargetId(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              buttonColor="#b00020"
              onPress={confirmDeleteUser}
            >
              Excluir
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 28,
  },
  title: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 10,
  },
  button: {
    marginTop: 2,
  },
  loadingBox: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  card: {
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  buttonWrapper: {
    marginTop: 8,
    alignItems: "center",
  },
  dividerSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(120, 120, 120, 0.28)",
  },
  dividerToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dividerLabel: {
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "#6b6b6b",
  },
  dividerCount: {
    fontSize: 12,
    color: "#6b6b6b",
    backgroundColor: "rgba(120, 120, 120, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  dividerCountWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dividerExpandIcon: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6b6b6b",
  },
  registeredList: {
    gap: 10,
  },
  registeredCard: {
    marginBottom: 2,
  },
  cardActions: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  cardActionsLeft: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 8,
  },
  registeredName: {
    marginBottom: 6,
  },
  registeredInfo: {
    marginBottom: 2,
  },
  stateSelectTrigger: {
    borderWidth: 1,
    borderColor: "#787878",
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  stateLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  menuScroll: {
    maxHeight: 260,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  paginationButton: {
    minWidth: 60,
  },
  paginationNumbers: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
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
  pageNumberText: {
    fontSize: 14,
    color: "#787878",
    fontWeight: "500",
  },
  pageNumberActiveText: {
    color: "#ffffff",
  },
});
