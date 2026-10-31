import { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { CelebrantFields } from '../features/setup/CelebrantFields';
import { DateTimeFields } from '../features/setup/DateTimeFields';
import { KidsFields } from '../features/setup/KidsFields';
import { PlaceFields } from '../features/setup/PlaceFields';
import { Button, Screen, Surface, Text, TopBar, useToast } from '../ui';
import { useLayout } from '../theme';
import { useTranslation } from 'react-i18next';
import {
  celebrantsComplete,
  draftFromParty,
  draftNames,
  editDateBounds,
  setupEditChanges,
  setupEditValid,
  type Party,
  type SetupDraft,
} from '../core';

/**
 * «Endre festen» (from Planen): the setup answers on one page, prefilled, with the same controls as setup
 * (our own calendar, the time steps, the children stepper, the place tiles). «Lagre endringene» writes them
 * onto the same party: everything derived follows, nothing she ticked or chose is lost (rules/setupEdit.ts).
 * «Avbryt» (or back) leaves the party exactly as it was. The theme stays on its own card on Planen.
 */
export default function EditPartyScreen() {
  const { ready, party } = useParty();
  if (!ready) return <Loading />;
  if (!party) return <Redirect href="/" />;
  return <EditPartyForm party={party} />;
}

function EditPartyForm({ party }: { party: Party }) {
  const { t } = useTranslation();
  const toast = useToast();
  const router = useRouter();
  const { today, saveSetupEdit } = useParty();
  const { gutter } = useLayout();
  // a local copy: nothing is saved until «Lagre endringene», and the unfinished-setup draft is never touched
  const [draft, setDraft] = useState<SetupDraft>(() => draftFromParty(party));
  const change = (patch: Partial<SetupDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const { min, max } = editDateBounds(today, party.date);
  const valid = setupEditValid(draft);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/plan'));
  const save = () => {
    if (!valid) return;
    if (setupEditChanges(party, draft).any) {
      saveSetupEdit(draft);
      toast(t('editParty.saved'));
    }
    close();
  };

  return (
    <Screen
      narrow
      testID="screen-edit-party"
      footer={<Button label={t('editParty.save')} onPress={save} disabled={!valid} testID="edit-party-save" />}
    >
      <TopBar onBack={close} />
      <View style={{ paddingHorizontal: gutter, paddingTop: 10 }}>
        <Text variant="h1Small" style={{ marginBottom: 8 }}>
          {t('editParty.title')}
        </Text>
        <Text variant="lede" style={{ marginBottom: 18 }}>
          {t('editParty.lede')}
        </Text>
      </View>
      <View style={{ paddingHorizontal: gutter, gap: 18 }}>
        <Surface testID="edit-party-who">
          <Text variant="h2Small" style={{ marginBottom: 10 }}>
            {t('who.title')}
          </Text>
          <CelebrantFields draft={draft} onChange={change} />
          {!celebrantsComplete(draft) ? (
            <Text variant="small" style={{ marginTop: 10 }} testID="edit-party-incomplete">
              {t('editParty.incomplete')}
            </Text>
          ) : null}
        </Surface>
        <Surface testID="edit-party-when">
          <Text variant="h2Small" style={{ marginBottom: 10 }}>
            {t('date.title')}
          </Text>
          <DateTimeFields draft={draft} onChange={change} today={today} min={min} max={max} initiallyOpen={false} />
        </Surface>
        <Surface testID="edit-party-kids">
          <Text variant="h2Small">{t('kids.title')}</Text>
          <Text variant="small" style={{ marginTop: 4, marginBottom: 12 }}>
            {t('kids.lede', { navn: draftNames(draft) || party.celebrants[0].name })}
          </Text>
          <KidsFields draft={draft} onChange={change} />
        </Surface>
        <Surface testID="edit-party-place">
          <Text variant="h2Small" style={{ marginBottom: 12 }}>
            {t('place.title')}
          </Text>
          <PlaceFields draft={draft} onChange={change} />
        </Surface>
        <Text variant="small" testID="edit-party-keep-note">
          {t('editParty.keepNote')}
        </Text>
        <Button kind="ghost" label={t('editParty.cancel')} onPress={close} testID="edit-party-cancel" />
      </View>
    </Screen>
  );
}
