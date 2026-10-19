import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Screen, Text } from '../ui';
import { nb } from '../i18n/nb';

export default function NotFound() {
  const router = useRouter();
  return (
    <Screen narrow>
      <View style={{ padding: 22, paddingTop: 60, gap: 20 }}>
        <Text variant="h1Small">{nb.notFound.title}</Text>
        <Button label={nb.notFound.cta} onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}
