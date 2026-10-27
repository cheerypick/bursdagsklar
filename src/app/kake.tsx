import { Linking, Pressable, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { Button, Screen, Surface, Text, TopBar } from '../ui';
import { fonts, radii, TOUCH, useColors, useLayout, themedStyles } from '../theme';
import {
  CAKE_KINDS,
  cakePlan,
  cakeShopLines,
  MUFFINS_PER_PACK,
  scratchRecipe,
  themeById,
  toroGlazeName,
  toroMuffinsName,
  type CakeKind,
} from '../core';
import { adultsCount, kidsCount } from '../core/rules/units';

/**
 * Kake (from the Kake card on Planen and the cake to-dos). The default is the Toro chocolate langpanne with
 * Kremet Sjokoladeglasur; the parent can pick the TINE recipe from scratch, Toro muffins or a ready-made
 * cake. The amounts follow the party (rules/cake.ts: 1,5 pieces per child + 1 per adult who stays), and
 * whatever is picked goes to Handleliste («Til kaken»). Suggest, never restrict: every choice is soft, and
 * nothing here blocks. No prices: they move. The theme's decoration idea is shown when a theme is chosen.
 */
export default function KakeScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  const { ready, party, setCake } = useParty();
  const router = useRouter();
  const { isWide, gutter } = useLayout();

  if (!ready) return <Loading />;
  if (!party) return <Redirect href="/" />;

  const plan = cakePlan(party);
  const theme = party.theme ? themeById(party.theme) : null;
  const lines = cakeShopLines(party);
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/plan'));

  const pill = (testID: string, label: string, on: boolean, onPress: () => void) => (
    <Pressable
      key={testID}
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      aria-checked={on}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, on && styles.pillOn, pressed && { opacity: 0.85 }]}
    >
      <Text style={[styles.pillText, on && { color: colors.onPrimary }]}>{label}</Text>
    </Pressable>
  );

  const option = (kind: CakeKind) => {
    const on = plan.kind === kind;
    const label = t(`cake.kinds.${kind}.label`);
    const sub = t(`cake.kinds.${kind}.sub`);
    return (
      <Pressable
        key={kind}
        testID={`cake-kind-${kind}`}
        accessibilityRole="radio"
        accessibilityLabel={`${label}. ${sub}`}
        accessibilityState={{ checked: on }}
        aria-checked={on}
        onPress={() => setCake({ kind, chosen: true })}
        style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && { opacity: 0.9 }]}
      >
        <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
        <View style={{ flex: 1 }}>
          <View style={styles.optionHead}>
            <Text style={styles.optionLabel}>{label}</Text>
            {kind === 'toro' ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{t('cake.suggested')}</Text>
              </View>
            ) : null}
          </View>
          <Text variant="small">{sub}</Text>
        </View>
      </Pressable>
    );
  };

  const gluten = (
    <View style={styles.gluten} testID="cake-gluten">
      <Text style={styles.glutenText}>{t('rules.cake.gluten')}</Text>
    </View>
  );

  const toro = (
    <Surface testID="cake-details-toro" style={{ gap: 12 }}>
      <Text style={styles.sectionTitle}>{t('rules.cake.product.toro')}</Text>
      {gluten}
      <Text testID="cake-toro-need">{t('cake.toroNeed', { count: plan.langpanner })}</Text>
      <Text variant="small">{t('cake.toroHow')}</Text>
      {plan.severalPacks || plan.muffins ? (
        <View style={{ gap: 8 }}>
          {plan.severalPacks ? (
            <Text variant="small" testID="cake-several-hint" style={styles.hint}>
              {t('cake.severalHint')}
            </Text>
          ) : null}
          <View accessibilityRole="radiogroup" style={styles.pills}>
            {plan.severalPacks
              ? pill(
                  'cake-several-pans',
                  t('cake.severalPans', { count: Math.max(2, plan.langpanner + (plan.muffins ? 1 : 0)) }),
                  !plan.muffins,
                  () => setCake({ muffins: false, chosen: true }),
                )
              : pill('cake-muffins-off', t('cake.plusMuffinsOff'), !plan.muffins, () =>
                  setCake({ muffins: false, chosen: true }),
                )}
            {pill(
              'cake-plus-muffins',
              plan.severalPacks ? t('cake.onePlusMuffins') : t('cake.plusMuffinsOn'),
              plan.muffins,
              () => setCake({ muffins: true, chosen: true }),
            )}
          </View>
          {plan.muffins ? (
            <Text variant="small" testID="cake-plus-muffins-line">
              {`${toroMuffinsName(plan.muffinFlavour)}: ${t('cake.muffinsNeed', {
                count: plan.muffinPacks,
                n: plan.muffinPacks * MUFFINS_PER_PACK,
              })}`}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={{ gap: 8, marginTop: 4 }}>
        <Text style={styles.label}>{t('cake.glazeTitle')}</Text>
        <View accessibilityRole="radiogroup" style={styles.pills}>
          {pill('cake-glaze-kremet', t('cake.glazeKremet'), plan.glaze === 'kremet', () =>
            setCake({ glaze: 'kremet', chosen: true }),
          )}
          {pill('cake-glaze-langpanne', t('cake.glazeLangpanne'), plan.glaze === 'langpanne', () =>
            setCake({ glaze: 'langpanne', chosen: true }),
          )}
        </View>
        <Text style={styles.product} testID="cake-glaze-name">
          {toroGlazeName(plan.glaze)}
        </Text>
        <Text variant="small">{t(plan.glaze === 'kremet' ? 'cake.glazeKremetHow' : 'cake.glazeLangpanneHow')}</Text>
      </View>
    </Surface>
  );

  const recipe = scratchRecipe(plan.langpanner);
  const scratch = (
    <Surface testID="cake-recipe" style={{ gap: 12 }}>
      <Text style={styles.sectionTitle}>{t('cake.scratchTitle')}</Text>
      <Text variant="small" testID="cake-recipe-meta">
        {t('cake.scratchMeta', { count: recipe.langpanner })}
      </Text>
      {(
        [
          ['cake', t('cake.scratchCake'), recipe.cake],
          ['glaze', t('cake.scratchGlaze'), recipe.glaze],
        ] as const
      ).map(([id, title, list]) => (
        <View key={id} style={{ gap: 4 }} testID={`cake-recipe-${id}`}>
          <Text style={styles.label}>{title}</Text>
          {list.map((i) => (
            <View key={i.id} style={styles.ingredient}>
              <Text style={styles.amount}>{i.amount}</Text>
              <Text style={{ flex: 1 }}>{i.name}</Text>
            </View>
          ))}
        </View>
      ))}
      <View style={{ gap: 6 }}>
        <Text style={styles.label}>{t('cake.scratchHow')}</Text>
        {[...recipe.steps, ...recipe.glazeSteps].map((s, i) => (
          <View key={i} style={styles.step}>
            <Text style={styles.stepNo}>{i + 1}</Text>
            <Text style={{ flex: 1 }}>{s}</Text>
          </View>
        ))}
      </View>
      <Pressable
        testID="cake-recipe-source"
        accessibilityRole="link"
        accessibilityLabel={t('cake.source')}
        onPress={() => Linking.openURL(recipe.url)}
        style={({ pressed }) => [styles.source, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.sourceText}>{t('cake.source')}</Text>
      </Pressable>
    </Surface>
  );

  const muffins = (
    <Surface testID="cake-details-muffins" style={{ gap: 12 }}>
      <Text style={styles.sectionTitle}>{toroMuffinsName(plan.muffinFlavour)}</Text>
      {gluten}
      <View style={{ gap: 8 }}>
        <Text style={styles.label}>{t('cake.flavourTitle')}</Text>
        <View accessibilityRole="radiogroup" style={styles.pills}>
          {pill('cake-flavour-lyse', t('cake.flavourLyse'), plan.muffinFlavour === 'lyse', () =>
            setCake({ muffinFlavour: 'lyse', chosen: true }),
          )}
          {pill('cake-flavour-sjokolade', t('cake.flavourSjokolade'), plan.muffinFlavour === 'sjokolade', () =>
            setCake({ muffinFlavour: 'sjokolade', chosen: true }),
          )}
        </View>
      </View>
      <Text testID="cake-muffins-need">
        {t('cake.muffinsNeed', { count: plan.muffinPacks, n: plan.muffinPacks * MUFFINS_PER_PACK })}
      </Text>
      <Text variant="small">{t('cake.muffinsHow')}</Text>
    </Surface>
  );

  const buy = (
    <Surface testID="cake-details-buy" style={{ gap: 10 }}>
      <Text testID="cake-buy-text">{t('cake.buyText', { count: plan.pieces })}</Text>
      <Text variant="small">{t('cake.buyTodo')}</Text>
    </Surface>
  );

  const shop = (
    <Surface testID="cake-shopping" style={{ gap: 8 }}>
      <Text style={styles.label}>{t('cake.shopTitle')}</Text>
      {lines.length ? (
        lines.map((l) => (
          <Text key={l.id} variant="small" testID={`cake-shop-${l.id}`}>
            {`• ${l.text}`}
          </Text>
        ))
      ) : (
        <Text variant="small">{t('cake.shopNone')}</Text>
      )}
      <Button
        compact
        kind="light"
        testID="cake-shopping-link"
        label={t('cake.shopLink')}
        onPress={() => router.push('/handleliste')}
      />
    </Surface>
  );

  return (
    <Screen tab="plan" testID="screen-cake">
      {!isWide ? <TopBar onBack={back} /> : null}
      <View style={{ paddingHorizontal: gutter, paddingTop: isWide ? 28 : 10 }}>
        <Text variant="eyebrow">{t('cake.eyebrow')}</Text>
        <Text variant={isWide ? 'h1' : 'h1Small'} style={{ marginTop: 6, marginBottom: 8 }}>
          {t('cake.title')}
        </Text>
        <Text variant="lede" style={{ marginBottom: 6, maxWidth: 640 }}>
          {t('cake.lede')}
        </Text>
      </View>
      <View style={{ paddingHorizontal: gutter, marginTop: 18, gap: 18, maxWidth: isWide ? 720 : undefined }}>
        <Surface testID="cake-amount" style={styles.amountCard}>
          <Text style={styles.amountTitle}>{t('cake.amount', { count: plan.pieces })}</Text>
          <Text variant="small">
            {t('cake.amountWhy', { kids: kidsCount(plan.kids), adults: adultsCount(plan.adults) })}
          </Text>
        </Surface>
        <View style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>{t('cake.chooseTitle')}</Text>
          <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
            {CAKE_KINDS.map(option)}
          </View>
        </View>
        {plan.kind === 'toro' ? toro : plan.kind === 'scratch' ? scratch : plan.kind === 'muffins' ? muffins : buy}
        {theme ? (
          <Surface testID="cake-theme-idea" style={styles.themeIdea}>
            <Text>{t('cake.themeIdea', { idea: theme.copy.cakeIdea })}</Text>
          </Surface>
        ) : null}
        {shop}
        <Button
          testID="cake-done"
          label={t('cake.done')}
          onPress={() => {
            setCake({ chosen: true });
            router.navigate('/plan');
          }}
        />
        <Button kind="ghost" label={t('cake.backToPlan')} onPress={() => router.navigate('/plan')} />
      </View>
    </Screen>
  );
}

const useStyles = themedStyles((colors) => ({
  sectionTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  product: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  amountCard: { gap: 4, backgroundColor: colors.blush },
  amountTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
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
  optionOn: { borderColor: colors.green, backgroundColor: colors.card },
  optionHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
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
  tag: { backgroundColor: colors.sage, borderRadius: radii.pill, paddingVertical: 2, paddingHorizontal: 10 },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.green },
  gluten: {
    alignSelf: 'flex-start',
    backgroundColor: colors.sage,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  glutenText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.green },
  hint: { color: colors.ink },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    minHeight: TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  pillOn: { backgroundColor: colors.green, borderColor: colors.green },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  ingredient: { flexDirection: 'row', gap: 12 },
  amount: { width: 84, fontFamily: fonts.bodySemi, color: colors.ink },
  step: { flexDirection: 'row', gap: 10 },
  stepNo: { width: 20, fontFamily: fonts.bodyBold, color: colors.green },
  source: { minHeight: TOUCH, justifyContent: 'center', alignSelf: 'flex-start' },
  sourceText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.green, textDecorationLine: 'underline' },
  themeIdea: { backgroundColor: colors.butter },
}));
