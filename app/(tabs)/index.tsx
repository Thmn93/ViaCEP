import { SafeAreaView, StyleSheet } from 'react-native';

import { CepSearch } from '@/components/cep-search';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <CepSearch />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
