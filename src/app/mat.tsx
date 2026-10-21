import { useState } from 'react';
import { Image, Pressable, TextInput, View, type ImageSourcePropType } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { Button, ChoiceTile, Grid, Pill, PillRow, Screen, Stepper, Surface, Text, TopBar } from '../ui';
import { fonts, images, radii, useColors, useLayout, themedStyles } from '../theme';
import { nb } from '../i18n/nb';
import {
  DIET_LABELS,
  DIET_TAGS,
  FOOD_ADULTS_MAX,
  FOOD_ADULTS_MIN,
  FOOD_KIDS_MAX,
  FOOD_KIDS_MIN,
  MENU_CARDS,
  foodCounts,
  forWhom,
  headCount,
  menuCardOf,
  partyFoodPlan,
  type FoodLine,
  type FoodSection,
  type MenuCardId,
  type MenuChoice,
} from '../core';

const CARD_IMAGES: Record<MenuCardId, ImageSourcePropType> = {
  polser: images.grill,
  pizza: images.menuPizza,
  taco: images.menuTaco,
  pasta: images.menuPasta,
  annet: images.menuAnnet,
};

/** The second tap for the cards that need one: [label, menu] pairs. */
const HOW: Partial<Record<MenuCardId, { title: string; options: { id: string; label: string; menu: MenuChoice }[] }>> =
  {
    polser: {
      title: nb.food.how.polser,
      options: [
        { id: 'grillpolser', label: nb.food.options.grillpolser, menu: { kind: 'grillpolser' } },
        { id: 'wienerpolser', label: nb.food.options.wienerpolser, menu: { kind: 'wienerpolser' } },
      ],
    },
    pizza: {
      title: nb.food.how.pizza,
      options: [
        { id: 'hjemmelaget', label: nb.food.options.hjemmelaget, menu: { kind: 'pizza', style: 'hjemmelaget' } },
        { id: 'frossen', label: nb.food.options.frossen, menu: { kind: 'pizza', style: 'frossen' } },
      ],
    },
    pasta: {
      title: nb.food.how.pasta,
      options: [
        { id: 'salat', label: nb.food.options.salat, menu: { kind: 'pasta', style: 'salat' } },
        { id: 'varm', label: nb.food.options.varm, menu: { kind: 'pasta', style: 'varm' } },
      ],
    },
  };

const sameMenu = (a: MenuChoice | null, b: MenuChoice) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Mat (from the Mat card on Planen). Step 1: one main dish from big picture cards; nothing is
 * pre-picked. Step 2: amounts for N children + M adults, each with a short reason line. Every
 * number comes from src/core (rules/menu.ts); this screen only shows them.
 */
export default function MatScreen() {
  const styles = useStyles();
  const { ready, party, setMenu, toggleDiet, setFoodCounts } = useParty();
  const router = useRouter();
  const { isWide, gutter } = useLayout();
  const [card, setCard] = useState<MenuCardId | null>(() => menuCardOf(party?.menu ?? null));
  const [picking, setPicking] = useState(false);
  if (!ready) return <Loading />;
  if (!party) return <Redirect href="/" />;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/plan'));
  const menu = party.menu;
  const activeCard = card ?? menuCardOf(menu);
  const plan = partyFoodPlan(party);
  const dietSection = plan?.sections.find((s) => s.id === 'hensyn');
  const counts = foodCounts(party);
  const hc = headCount(party);
  // the grid until a card is tapped; then one compact row (with the «how» pills when the dish needs them)
  const showGrid = picking || !activeCard;

  const pickCard = (id: MenuCardId) => {
    setCard(id);
    if (id === 'taco') {
      setMenu({ kind: 'taco' });
      setPicking(false);
    } else if (id === 'annet') {
      setMenu({ kind: 'annet', text: menu?.kind === 'annet' ? menu.text : '' });
      setPicking(false);
    } else if (menuCardOf(menu) !== id) {
      // a new dish that needs one more tap (grill or wiener, which pizza …): nothing chosen until then
      setMenu(null);
    }
    setPicking(false);
  };
  const pickHow = (m: MenuChoice) => setMenu(m);

  const how = activeCard ? HOW[activeCard] : undefined;
  const howRow = how ? (
    <View style={{ marginTop: 16 }} testID="menu-how">
      <Text style={styles.howTitle}>{how.title}</Text>
      <PillRow>
        {how.options.map((o) => (
          <View key={o.id} testID={`menu-how-${o.id}`}>
            <Pill label={o.label} on={sameMenu(menu, o.menu)} onPress={() => pickHow(o.menu)} />
          </View>
        ))}
      </PillRow>
    </View>
  ) : null;

  const annetInput =
    activeCard === 'annet' && menu?.kind === 'annet' ? (
      <View style={{ marginTop: 16 }}>
        <Text style={styles.howTitle}>{nb.food.annetLabel}</Text>
        <TextInput
          testID="menu-annet-input"
          value={menu.text}
          onChangeText={(text) => setMenu({ kind: 'annet', text: text.replace(/\s+/g, ' ') })}
          placeholder={nb.food.annetPlaceholder}
          placeholderTextColor="#9B958B"
          accessibilityLabel={nb.food.annetLabel}
          maxLength={60}
          autoFocus={!menu.text}
          returnKeyType="done"
          style={styles.input}
        />
        <Text variant="small" style={{ marginTop: 6 }}>
          {nb.food.annetHelp}
        </Text>
      </View>
    ) : null;

  const grid = (
    <View accessibilityRole="radiogroup" accessibilityLabel={nb.food.step1}>
      <Grid
        items={[...MENU_CARDS]}
        columns={isWide ? 5 : 2}
        gap={isWide ? 16 : 12}
        keyOf={(id) => id}
        render={(id) => (
          <ChoiceTile
            testID={`menu-card-${id}`}
            image={CARD_IMAGES[id]}
            label={nb.food.cards[id].label}
            sub={nb.food.cards[id].sub}
            selected={activeCard === id && Boolean(menu)}
            onPress={() => pickCard(id)}
          />
        )}
      />
    </View>
  );

  const chosen = activeCard ? (
    <Surface testID="menu-chosen" style={{ padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={[styles.thumb, isWide && { width: 96, height: 96 }]}>
          <Image source={CARD_IMAGES[activeCard]} style={{ width: '100%', height: '100%' }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow">{nb.food.step1}</Text>
          <Text variant="h3" testID="menu-chosen-title" style={{ marginTop: 2 }}>
            {plan ? plan.title : nb.food.cards[activeCard].label}
          </Text>
        </View>
        <Pressable
          testID="menu-change"
          accessibilityRole="button"
          accessibilityLabel={nb.food.change}
          onPress={() => setPicking(true)}
          hitSlop={8}
          style={styles.changeBtn}
        >
          <Text style={styles.changeText}>{nb.food.changeShort}</Text>
        </Pressable>
      </View>
      {howRow}
      {annetInput}
      {how && !menu ? (
        <Text variant="small" style={{ marginTop: 10 }} testID="menu-pick-how">
          {nb.food.pickHow}
        </Text>
      ) : null}
    </Surface>
  ) : null;

  const countsBox = (
    <View testID="food-counts">
      <Text variant="h3" style={{ marginBottom: 10 }}>
        {nb.food.countsTitle}
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Stepper
            compact
            testID="food-kids"
            value={counts.kids}
            min={FOOD_KIDS_MIN}
            max={FOOD_KIDS_MAX}
            unit={nb.food.kids}
            lessLabel={nb.food.lessKids}
            moreLabel={nb.food.moreKids}
            onChange={(kids) => setFoodCounts({ ...counts, kids })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Stepper
            compact
            testID="food-adults"
            value={counts.adults}
            min={FOOD_ADULTS_MIN}
            max={FOOD_ADULTS_MAX}
            unit={counts.adults === 1 ? nb.food.adultsOne : nb.food.adults}
            lessLabel={nb.food.lessAdults}
            moreLabel={nb.food.moreAdults}
            onChange={(adults) => setFoodCounts({ ...counts, adults })}
          />
        </View>
      </View>
      <Text variant="small" style={{ marginTop: 8 }}>
        {nb.food.countsFromParty(hc.kidsComing, hc.adultsEating)}
        {party.foodCounts ? ' ' : ''}
      </Text>
      {party.foodCounts ? (
        <Pressable
          testID="food-counts-reset"
          accessibilityRole="button"
          onPress={() => setFoodCounts(null)}
          hitSlop={8}
          style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={styles.link}>{nb.food.countsReset}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const dietBox = (
    <View testID="food-diets">
      <Text variant="h3" style={{ marginBottom: 4 }}>
        {nb.food.dietTitle}
      </Text>
      <Text variant="small" style={{ marginBottom: 10 }}>
        {nb.food.dietLede}
      </Text>
      <PillRow>
        {DIET_TAGS.map((t) => {
          const on = party.diets.includes(t);
          return (
            <View key={t} testID={`diet-${t}`}>
              <Pill
                label={on ? `✓ ${DIET_LABELS[t]}` : DIET_LABELS[t]}
                accessibilityLabel={DIET_LABELS[t]}
                on={on}
                onPress={() => toggleDiet(t)}
              />
            </View>
          );
        })}
      </PillRow>
      {dietSection ? (
        <View style={{ marginTop: 14, gap: 10 }}>
          <SectionCard section={dietSection} />
          <Text variant="small" testID="diet-note">
            {nb.food.dietNote}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const amounts = plan ? (
    <View style={{ gap: 14 }} testID="food-amounts">
      <View>
        <Text variant="h2Small">{nb.food.amountsTitle}</Text>
        <Text variant="small" testID="food-for-whom" style={{ marginTop: 2 }}>
          {plan.title} {plan.forWhom}
        </Text>
      </View>
      {plan.sections
        .filter((s) => s.id !== 'hensyn')
        .map((s) => (
          <SectionCard key={s.id} section={s} />
        ))}
    </View>
  ) : null;

  return (
    <Screen tab="plan" testID="screen-mat">
      {!isWide ? <TopBar onBack={back} /> : null}
      <View style={{ paddingHorizontal: gutter, paddingTop: isWide ? 28 : 10 }}>
        <Text variant="eyebrow">{nb.food.eyebrow}</Text>
        <Text variant={isWide ? 'h1' : 'h1Small'} style={{ marginTop: 6, marginBottom: 8 }}>
          {nb.food.title}
        </Text>
        <Text variant="lede" style={{ marginBottom: 20, maxWidth: 640 }}>
          {nb.food.lede(forWhom(counts))}
        </Text>
        {showGrid ? grid : chosen}
      </View>

      {plan && !showGrid ? (
        isWide ? (
          <View
            style={{
              flexDirection: 'row',
              gap: 24,
              paddingHorizontal: gutter,
              marginTop: 24,
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1, gap: 24 }}>
              <Surface>{countsBox}</Surface>
              <Surface>{dietBox}</Surface>
            </View>
            <View style={{ flex: 1.5 }}>{amounts}</View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: gutter, marginTop: 22, gap: 22 }}>
            {countsBox}
            {amounts}
            {dietBox}
          </View>
        )
      ) : null}

      <View style={{ paddingHorizontal: gutter, marginTop: 28 }}>
        <Button
          kind="light"
          label={nb.food.backToPlan}
          onPress={() => router.navigate('/plan')}
          testID="mat-back-to-plan"
        />
      </View>
    </Screen>
  );
}

function SectionCard({ section }: { section: FoodSection }) {
  const styles = useStyles();
  const colors = useColors();
  const tint = section.id === 'hensyn' ? colors.butter : section.id === 'kake' ? colors.blush : colors.card;
  return (
    <Surface testID={`food-section-${section.id}`} style={{ backgroundColor: tint, paddingVertical: 8 }}>
      <Text variant="eyebrow" style={{ marginTop: 8, marginBottom: 2 }}>
        {section.title}
      </Text>
      {section.lines.map((l, i) =>
        section.id === 'hensyn' ? (
          <DietLine key={l.id} line={l} first={i === 0} styles={styles} />
        ) : (
          <Line key={l.id} line={l} first={i === 0} styles={styles} />
        ),
      )}
    </Surface>
  );
}

function Line({ line, first, styles }: { line: FoodLine; first: boolean; styles: ReturnType<typeof useStyles> }) {
  return (
    <View
      testID={`food-line-${line.id}`}
      accessible
      accessibilityLabel={`${line.name}: ${line.amount}${line.packs ? `, ${line.packs}` : ''}. ${line.why}`}
      style={[styles.line, !first && styles.lineBorder]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.lineName}>{line.name}</Text>
        <Text variant="small" style={{ marginTop: 2 }} testID={`food-why-${line.id}`}>
          {line.why}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', maxWidth: '46%' }}>
        <Text style={styles.amount} testID={`food-amount-${line.id}`}>
          {line.amount}
        </Text>
        {line.packs ? <Text style={styles.packs}>{line.packs}</Text> : null}
      </View>
    </View>
  );
}

/** A dietary note: the extra portion in bold, the note under it. */
function DietLine({ line, first, styles }: { line: FoodLine; first: boolean; styles: ReturnType<typeof useStyles> }) {
  return (
    <View
      testID={`food-line-${line.id}`}
      accessible
      accessibilityLabel={`${line.name}: ${line.amount}. ${line.why}`}
      style={[{ paddingVertical: 12 }, !first && styles.lineBorder]}
    >
      <Text style={styles.lineName}>{line.name}</Text>
      <Text style={styles.dietExtra}>+ {line.amount}</Text>
      <Text variant="small" style={{ marginTop: 2 }}>
        {line.why}
      </Text>
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  dietExtra: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink, marginTop: 4 },
  howTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink, marginBottom: 10 },
  input: {
    minHeight: 56,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    fontFamily: fonts.bodySemi,
    fontSize: 18,
    color: colors.ink,
  },
  thumb: { width: 72, height: 72, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.sage },
  changeBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.green },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.green, textDecorationLine: 'underline' },
  line: { flexDirection: 'row', gap: 14, paddingVertical: 12, alignItems: 'flex-start' },
  lineBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  lineName: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  amount: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: colors.ink, textAlign: 'right' },
  packs: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted, marginTop: 2, textAlign: 'right' },
}));
