import { Pressable, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { Button, Icon, Screen, Surface, Text, TopBar } from '../ui';
import { fonts, radii, TOUCH, useColors, useLayout, themedStyles } from '../theme';
import {
  candyPerBag,
  GOODIE_BAG_STYLES,
  goodieBagCount,
  goodieChips,
  goodieShopLines,
  goodieStatus,
  goodieStyle,
  isPicked,
  smallPartsHidden,
  type GoodieBagStyle,
} from '../core';

/**
 * Godteposer (optional, from the Godteposer card on Planen and the to-do «Pakk godteposene»). Three styles
 * (klassisk godteri, uten godteri, litt av begge) or «Vi dropper godteposer»; nothing is chosen for her. A
 * style only shows suggestion chips (rules/goodieBags.ts: adapted to the age and the theme); what she taps
 * goes on Handleliste, one per child, with the bags themselves. The chips live here only: Handleliste links
 * here (one source of truth, party.goodieBags). Suggest, never restrict. No prices, no brand names.
 */
export default function GodteposerScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  const { ready, party, setGoodieStyle, setGoodieSkip, setGoodieBagItem } = useParty();
  const router = useRouter();
  const { isWide, gutter } = useLayout();

  if (!ready) return <Loading />;
  if (!party) return <Redirect href="/" />;

  const status = goodieStatus(party);
  const style = goodieStyle(party);
  const bags = goodieBagCount(party);
  const chips = goodieChips(party);
  const lines = goodieShopLines(party);
  const candy = style === 'klassisk' || style === 'begge';
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/plan'));

  const option = (id: GoodieBagStyle | 'skip') => {
    const on = id === 'skip' ? status === 'skip' : status !== 'skip' && style === id;
    const label = id === 'skip' ? t('goodie.skip') : t(`goodie.styles.${id}.label`);
    const sub = id === 'skip' ? t('goodie.skipSub') : t(`goodie.styles.${id}.sub`);
    return (
      <Pressable
        key={id}
        testID={`goodie-style-${id}`}
        accessibilityRole="radio"
        accessibilityLabel={`${label}. ${sub}`}
        accessibilityState={{ checked: on }}
        aria-checked={on}
        onPress={() => (id === 'skip' ? setGoodieSkip(true) : setGoodieStyle(id))}
        style={({ pressed }) => [
          styles.option,
          id === 'skip' && styles.optionSkip,
          on && styles.optionOn,
          pressed && { opacity: 0.9 },
        ]}
      >
        <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.optionLabel}>{label}</Text>
          <Text variant="small">{sub}</Text>
        </View>
      </Pressable>
    );
  };

  const chipList = (
    <Surface testID="goodie-chips" style={{ gap: 10 }}>
      <Text style={styles.sectionTitle}>{t('goodie.chipsTitle')}</Text>
      {style ? (
        <>
          <Text variant="small">{t('goodie.chipsLede')}</Text>
          <View style={styles.chips}>
            {chips.map((c) => (
              <Pressable
                key={c.id}
                testID={`goodie-${c.id}`}
                accessibilityRole="button"
                accessibilityLabel={
                  c.picked
                    ? t('goodie.remove', { item: c.label.toLowerCase() })
                    : t('goodie.add', { item: c.label.toLowerCase() })
                }
                accessibilityState={{ selected: c.picked }}
                aria-pressed={c.picked}
                onPress={() => setGoodieBagItem(c.id, !c.picked)}
                style={({ pressed }) => [styles.chip, c.picked && styles.chipOn, pressed && { opacity: 0.8 }]}
              >
                <Icon
                  name={c.picked ? 'check' : 'plus'}
                  size={16}
                  strokeWidth={2.6}
                  color={c.picked ? colors.onPrimary : colors.green}
                />
                <Text style={[styles.chipText, c.picked && { color: colors.onPrimary }]}>
                  {c.label}
                  {c.minAge ? (
                    <Text style={[styles.chipAge, c.picked && { color: colors.onPrimary }]}>
                      {` · ${t('goodie.fromAge', { n: c.minAge })}`}
                    </Text>
                  ) : null}
                </Text>
              </Pressable>
            ))}
          </View>
          {smallPartsHidden(party) ? (
            <Text variant="small" testID="goodie-small-parts">
              {t('goodie.smallParts')}
            </Text>
          ) : null}
          {candy ? (
            <Text variant="small" testID="goodie-allergy">
              {t('goodie.allergy')}
            </Text>
          ) : null}
        </>
      ) : (
        <Text variant="small" testID="goodie-choose-style">
          {t('goodie.chooseStyleFirst')}
        </Text>
      )}
    </Surface>
  );

  const skipped = (
    <Surface testID="goodie-skipped" style={{ gap: 8 }}>
      <Text>{t('goodie.skipDone')}</Text>
      {isPicked(party, 'skattejakt') ? (
        <Text variant="small" testID="goodie-skip-treasure">
          {t('goodie.skipTreasure')}
        </Text>
      ) : null}
    </Surface>
  );

  const shop = (
    <Surface testID="goodie-shopping" style={{ gap: 8 }}>
      <Text style={styles.label}>{t('goodie.shopTitle')}</Text>
      {lines.map((l) => (
        <Text key={l.id} variant="small" testID={`goodie-shop-${l.id}`}>
          {`• ${l.text}`}
        </Text>
      ))}
      {lines.length === 1 ? <Text variant="small">{t('goodie.shopNone')}</Text> : null}
      <Button
        compact
        kind="light"
        testID="goodie-shopping-link"
        label={t('goodie.shopLink')}
        onPress={() => router.push('/handleliste')}
      />
    </Surface>
  );

  return (
    <Screen tab="plan" testID="screen-goodie">
      {!isWide ? <TopBar onBack={back} /> : null}
      <View style={{ paddingHorizontal: gutter, paddingTop: isWide ? 28 : 10 }}>
        <Text variant="eyebrow">{t('goodie.eyebrow')}</Text>
        <Text variant={isWide ? 'h1' : 'h1Small'} style={{ marginTop: 6, marginBottom: 8 }}>
          {t('goodie.title')}
        </Text>
        <Text variant="lede" style={{ marginBottom: 6, maxWidth: 640 }}>
          {t('goodie.lede')}
        </Text>
      </View>
      <View style={{ paddingHorizontal: gutter, marginTop: 18, gap: 18, maxWidth: isWide ? 720 : undefined }}>
        {status !== 'skip' ? (
          <Surface testID="goodie-amount" style={styles.amountCard}>
            <Text style={styles.amountTitle}>{t('goodie.amount', { count: bags })}</Text>
            {candy ? (
              <Text variant="small" testID="goodie-candy-per-bag">
                {t(style === 'begge' ? 'goodie.candyPerBagBoth' : 'goodie.candyPerBag', { g: candyPerBag(style) })}
              </Text>
            ) : null}
          </Surface>
        ) : null}
        <View style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>{t('goodie.styleTitle')}</Text>
          <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
            {GOODIE_BAG_STYLES.map(option)}
            {option('skip')}
          </View>
          {status !== 'skip' && style !== 'uten' ? (
            <Text variant="small" testID="goodie-gentle" style={{ marginTop: 2 }}>
              {t('goodie.gentle')}
            </Text>
          ) : null}
        </View>
        {status === 'skip' ? skipped : chipList}
        {status !== 'skip' ? shop : null}
        <Button testID="goodie-done" label={t('goodie.done')} onPress={() => router.navigate('/plan')} />
        <Button kind="ghost" label={t('goodie.backToPlan')} onPress={() => router.navigate('/plan')} />
      </View>
    </Screen>
  );
}

const useStyles = themedStyles((colors) => ({
  sectionTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  amountCard: { gap: 4, backgroundColor: colors.blush },
  amountTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: TOUCH + 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  optionSkip: { borderStyle: 'dashed' },
  optionOn: { borderColor: colors.green, backgroundColor: colors.card, borderStyle: 'solid' },
  optionLabel: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 22, color: colors.ink },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.green },
  radioDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.green },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: TOUCH,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    maxWidth: '100%',
  },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink, flexShrink: 1 },
  chipAge: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
}));
