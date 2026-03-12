import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
} from 'react-native-paper';

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

function getBrazilianStates(): BrazilianState[] {
  return [
    { uf: 'AC', name: 'Acre' },
    { uf: 'AL', name: 'Alagoas' },
    { uf: 'AP', name: 'Amapa' },
    { uf: 'AM', name: 'Amazonas' },
    { uf: 'BA', name: 'Bahia' },
    { uf: 'CE', name: 'Ceara' },
    { uf: 'DF', name: 'Distrito Federal' },
    { uf: 'ES', name: 'Espirito Santo' },
    { uf: 'GO', name: 'Goias' },
    { uf: 'MA', name: 'Maranhao' },
    { uf: 'MT', name: 'Mato Grosso' },
    { uf: 'MS', name: 'Mato Grosso do Sul' },
    { uf: 'MG', name: 'Minas Gerais' },
    { uf: 'PA', name: 'Para' },
    { uf: 'PB', name: 'Paraiba' },
    { uf: 'PR', name: 'Parana' },
    { uf: 'PE', name: 'Pernambuco' },
    { uf: 'PI', name: 'Piaui' },
    { uf: 'RJ', name: 'Rio de Janeiro' },
    { uf: 'RN', name: 'Rio Grande do Norte' },
    { uf: 'RS', name: 'Rio Grande do Sul' },
    { uf: 'RO', name: 'Rondonia' },
    { uf: 'RR', name: 'Roraima' },
    { uf: 'SC', name: 'Santa Catarina' },
    { uf: 'SP', name: 'Sao Paulo' },
    { uf: 'SE', name: 'Sergipe' },
    { uf: 'TO', name: 'Tocantins' },
  ];
}

export function CepSearch() {
  const [cep, setCep] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [estado, setEstado] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [stateMenuVisible, setStateMenuVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [address, setAddress] = useState<ViaCepResponse | null>(null);

  const cepDigits = useMemo(() => cep.replace(/\D/g, ''), [cep]);

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);

    if (digits.length <= 5) {
      return digits;
    }

    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const selectedStateLabel = useMemo(() => {
    const selected = getBrazilianStates().find((item) => item.uf === estado);
    return selected ? `${selected.name} (${selected.uf})` : '';
  }, [estado]);

  const handleSearch = async () => {
    if (cepDigits.length !== 8) {
      setAddress(null);
      setErrorMessage('Digite um CEP valido com 8 numeros.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);

      if (!response.ok) {
        throw new Error('Falha na consulta do CEP.');
      }

      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        setAddress(null);
        setComplemento('');
        setEstado('');
        setErrorMessage('CEP nao encontrado. Tente novamente.');
        return;
      }

      setAddress(data);
      setComplemento(data.complemento || '');
      setEstado(data.uf || '');
    } catch {
      setAddress(null);
      setComplemento('');
      setEstado('');
      setErrorMessage('Nao foi possivel consultar o CEP. Verifique a conexao e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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

      <Button mode="contained" onPress={handleSearch} disabled={loading} style={styles.button}>
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

          <TextInput label="Logradouro" mode="outlined" value={address?.logradouro ?? ''} editable={false} style={styles.input} />
          <TextInput label="Bairro" mode="outlined" value={address?.bairro ?? ''} editable={false} style={styles.input} />
          <TextInput label="Cidade" mode="outlined" value={address?.localidade ?? ''} editable={false} style={styles.input} />
          <Menu
            visible={stateMenuVisible}
            onDismiss={() => setStateMenuVisible(false)}
            anchor={
              <Pressable style={styles.stateSelectTrigger} onPress={() => setStateMenuVisible(true)}>
                <Text style={styles.stateLabel}>Estado</Text>
                <Text>{selectedStateLabel || 'Selecionar estado'}</Text>
              </Pressable>
            }>
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
            <Button mode="contained" onPress={() => setDialogVisible(true)}>
              Cadastrar
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Aviso</Dialog.Title>
          <Dialog.Content>
            <Text>funcao a ser implementada</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
  },
  stateSelectTrigger: {
    borderWidth: 1,
    borderColor: '#787878',
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
});
