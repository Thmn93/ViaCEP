import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  HelperText,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';

type ViaCepResponse = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
};

export function CepSearch() {
  const [cep, setCep] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
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
        setErrorMessage('CEP nao encontrado. Tente novamente.');
        return;
      }

      setAddress(data);
      setComplemento(data.complemento || '');
    } catch {
      setAddress(null);
      setComplemento('');
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
          <TextInput label="Estado" mode="outlined" value={address?.uf ?? ''} editable={false} style={styles.input} />
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
});
