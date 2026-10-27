import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Screen, Text } from '../ui';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Screen narrow>
      <View style={{ padding: 22, paddingTop: 60, gap: 20 }}>
        <Text variant="h1Small">{t('notFound.title')}</Text>
        <Button label={t('notFound.cta')} onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}
