import { useState } from 'react';
import { Pressable, TextInput, View, type ImageSourcePropType } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { Button, CheckBox, ChoiceTile, Grid, Pill, PillRow, Screen, Stepper, Surface, Text, TopBar } from '../ui';
import { fonts, images, radii, useColors, useLayout, themedStyles } from '../theme';
import { nb } from '../i18n/nb';
import {
  DIET_LABELS,
  DIET_TAGS,
  PIZZA_TOPPINGS,
  VISIBLE_MENU_CARDS,
  dishOn,
  ALLOW_POLSER_AND_PIZZA,
  cardsExcludedBy,
  dishShare,
  pizzaToppings,
  withDishOn,
  celebrantNames,
  foodCounts,
  forWhom,
  guestBounds,
  headCount,
  helpingParents,
  partyFoodPlan,
  type Dish,
  type FoodLine,
  type FoodSection,
  type MenuCardId,
  type PizzaDough,
  type PizzaTopping,
} from '../core';

const CARD_IMAGES: Record<MenuCardId, ImageSourcePropType> = {
  polser: images.grill,
  pizza: images.menuPizza,
  taco: images.menuTaco,
  pasta: images.menuPasta,
  annet: images.menuAnnet,
};

type PizzaDish = Extract<Dish, { kind: 'pizza' }>;
/** Tapping the Pizza card picks the defaults Ekaterina chose: homemade in a langpanne, ready-made dough, skinke. */
const DEFAULT_PIZZA: PizzaDish = { kind: 'pizza', style: 'hjemmelaget' };
const SAUSAGE_OPTIONS: { id: 'grillpolser' | 'wienerpolser'; label: string }[] = [
  { id: 'grillpolser', label: nb.food.options.grillpolser },
  { id: 'wienerpolser', label: nb.food.options.wienerpolser },
];
/** The bases shown as pills; «Lag deigen selv» is a small text button under them. */
const DOUGH_PILLS: PizzaDough[] = ['ferdigdeig', 'ferdigstekt', 'miks'];

/**
 * Mat (from the Mat card on Planen). Step 1: the main dish from big picture cards: Pølser, Pizza and
 * Noe annet (taco and pasta are hidden for now, rules/dishes.ts). Nothing is pre-picked, and she can pick
 * several: pølser and pizza together each cover about half. Pølser needs one more tap (grill or kjele);
 * Pizza starts homemade with ready-made dough and skinke, with the base and topping chips right under it.
 * Step 2: amounts for N children + M adults, one section per dish, each line with a short reason. Every
 * number comes from src/core (rules/menu.ts); this screen only shows them.
 *
 * The guest count has ONE source of truth, the party: «For 13 barn og 4 voksne · Endre» edits the
 * party's own numbers (the same ones Planen and the to-dos read). Every quantity line has a tap toggle
 * (a checkbox): a deselected line stays visible, greyed and struck through, and is left out of the
 * Mat card on Planen and the shopping list (party.foodItems[id].included).
 */
export default function MatScreen() {
  const styles = useStyles();
  const colors = useColors();
  const { ready, party, setMenu, toggleDiet, setFoodItem, setGuestCounts } = useParty();
  const router = useRouter();
  const { isWide, gutter } = useLayout();
  // Pølser tapped, grill or kjele not picked yet (nothing is assumed until she picks one)
  const [polserPending, setPolserPending] = useState(false);
  const [editingGuests, setEditingGuests] = useState(false);
  if (!ready) return <Loading />;
  if (!party) return <Redirect href="/" />;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/plan'));
  const menu = party.menu;
  const plan = partyFoodPlan(party);
  const dietSection = plan?.sections.find((s) => s.id === 'hensyn');
  const counts = foodCounts(party);
  const hc = headCount(party);
  const bounds = guestBounds(party);
  const polser = dishOn(menu, 'polser');
  const pizza = dishOn(menu, 'pizza') as PizzaDish | undefined;
  const annet = dishOn(menu, 'annet');
  const picked: Record<string, boolean> = {
    polser: Boolean(polser) || polserPending,
    pizza: Boolean(pizza),
    annet: Boolean(annet),
  };
  const setDish = (card: MenuCardId, dish: Dish | null) => setMenu(withDishOn(menu, card, dish));
  // «Halvparten pølser, halvparten pizza» only when both may be picked (off for the MVP)
  const shared = ALLOW_POLSER_AND_PIZZA && dishShare(menu) < 1;

  // Pølser and Pizza work like a radio (cardsExcludedBy): picking one unpicks the other; Noe annet goes with either
  const toggleCard = (id: MenuCardId) => {
    if (id === 'polser') {
      if (picked.polser) {
        setPolserPending(false);
        setDish('polser', null);
      } else {
        setPolserPending(true);
        if (pizza && cardsExcludedBy('polser').includes('pizza')) setDish('pizza', null);
      }
    } else if (id === 'pizza') {
      if (!pizza && cardsExcludedBy('pizza').includes('polser')) setPolserPending(false);
      setDish('pizza', pizza ? null : DEFAULT_PIZZA);
    } else if (id === 'annet') setDish('annet', annet ? null : { kind: 'annet', text: '' });
  };
  const setPizza = (patch: Partial<PizzaDish>) => pizza && setDish('pizza', { ...pizza, ...patch });
  const toppings = pizza ? pizzaToppings(pizza.toppings) : [];
  const toggleTopping = (t: PizzaTopping) =>
    setPizza({ toppings: toppings.includes(t) ? toppings.filter((x) => x !== t) : [...toppings, t] });
  const dough = pizza?.dough ?? 'ferdigdeig';

  const grid = (
    <View accessibilityRole="list" accessibilityLabel={nb.food.step1}>
      <Grid
        items={[...VISIBLE_MENU_CARDS]}
        columns={3}
        gap={isWide ? 16 : 10}
        keyOf={(id) => id}
        render={(id) => (
          <ChoiceTile
            multi
            testID={`menu-card-${id}`}
            image={CARD_IMAGES[id]}
            label={nb.food.cards[id].label}
            sub={nb.food.cards[id].sub}
            selected={Boolean(picked[id])}
            onPress={() => toggleCard(id)}
          />
        )}
      />
      {shared ? (
        <Text variant="small" testID="menu-share-note" style={{ marginTop: 12, color: colors.ink }}>
          {nb.food.shareNote}
        </Text>
      ) : null}
    </View>
  );

  const polserBox = picked.polser ? (
    <Surface testID="menu-polser" style={{ padding: 16 }}>
      <Text style={styles.howTitle}>{nb.food.how.polser}</Text>
      <PillRow>
        {SAUSAGE_OPTIONS.map((o) => (
          <View key={o.id} testID={`menu-how-${o.id}`}>
            <Pill
              label={o.label}
              on={polser?.kind === o.id}
              onPress={() => {
                setPolserPending(false);
                setDish('polser', { kind: o.id });
              }}
            />
          </View>
        ))}
      </PillRow>
      {!polser ? (
        <Text variant="small" style={{ marginTop: 10 }} testID="menu-pick-how">
          {nb.food.pickHow}
        </Text>
      ) : null}
    </Surface>
  ) : null;

  const pizzaBox = pizza ? (
    <Surface testID="menu-pizza" style={{ padding: 16, gap: 18 }}>
      <View>
        <Text style={styles.howTitle}>{nb.food.how.pizza}</Text>
        <PillRow>
          {(['hjemmelaget', 'frossen'] as const).map((style) => (
            <View key={style} testID={`menu-how-${style}`}>
              <Pill label={nb.food.options[style]} on={pizza.style === style} onPress={() => setPizza({ style })} />
            </View>
          ))}
        </PillRow>
      </View>
      {pizza.style === 'hjemmelaget' ? (
        <>
          <View testID="pizza-dough">
            <Text style={styles.howTitle}>{nb.food.pizza.doughTitle}</Text>
            <PillRow>
              {DOUGH_PILLS.map((d) => (
                <View key={d} testID={`pizza-dough-${d}`}>
                  <Pill label={nb.food.pizza.dough[d]} on={dough === d} onPress={() => setPizza({ dough: d })} />
                </View>
              ))}
            </PillRow>
            <Pressable
              testID="pizza-dough-selv"
              accessibilityRole="button"
              accessibilityState={{ selected: dough === 'selv' }}
              accessibilityLabel={nb.food.pizza.dough.selv}
              onPress={() => setPizza({ dough: dough === 'selv' ? 'ferdigdeig' : 'selv' })}
              hitSlop={6}
              style={styles.smallOption}
            >
              <Text style={[styles.smallOptionText, dough === 'selv' && { color: colors.green }]}>
                {dough === 'selv' ? `✓ ${nb.food.pizza.dough.selv}` : nb.food.pizza.doughSelfSmall}
              </Text>
            </Pressable>
          </View>
          <View testID="pizza-toppings">
            <Text style={styles.howTitle}>{nb.food.pizza.toppingsTitle}</Text>
            <Text variant="small" style={{ marginTop: -6, marginBottom: 10 }}>
              {nb.food.pizza.toppingsLede}
            </Text>
            <PillRow>
              {PIZZA_TOPPINGS.map((t) => {
                const on = toppings.includes(t);
                const label = nb.food.pizza.toppings[t];
                return (
                  <View key={t} testID={`topping-${t}`}>
                    <Pill
                      label={on ? `✓ ${label}` : label}
                      accessibilityLabel={label}
                      on={on}
                      onPress={() => toggleTopping(t)}
                    />
                  </View>
                );
              })}
            </PillRow>
          </View>
        </>
      ) : null}
    </Surface>
  ) : null;

  const annetBox =
    annet && annet.kind === 'annet' ? (
      <Surface testID="menu-annet" style={{ padding: 16 }}>
        <Text style={styles.howTitle}>{nb.food.annetLabel}</Text>
        <TextInput
          testID="menu-annet-input"
          value={annet.text}
          onChangeText={(text) => setDish('annet', { kind: 'annet', text: text.replace(/\s+/g, ' ') })}
          placeholder={nb.food.annetPlaceholder}
          placeholderTextColor="#9B958B"
          accessibilityLabel={nb.food.annetLabel}
          maxLength={60}
          autoFocus={!annet.text}
          returnKeyType="done"
          style={styles.input}
        />
        <Text variant="small" style={{ marginTop: 6 }}>
          {nb.food.annetHelp}
        </Text>
      </Surface>
    ) : null;

  const choices = (
    <View style={{ gap: 14, marginTop: polserBox || pizzaBox || annetBox ? 16 : 0 }}>
      {polserBox}
      {pizzaBox}
      {annetBox}
    </View>
  );

  const guestBox = (
    <View testID="food-guests">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text variant="h3" testID="food-for-whom">
            {nb.food.guests.forWhom(counts.kids, counts.adults)}
          </Text>
          <Text variant="small" style={{ marginTop: 2 }}>
            {nb.food.guests.sub}
          </Text>
        </View>
        {editingGuests ? null : (
          <Pressable
            testID="food-guests-edit"
            accessibilityRole="button"
            accessibilityLabel={nb.food.guests.editLabel}
            accessibilityState={{ expanded: false }}
            onPress={() => setEditingGuests(true)}
            hitSlop={8}
            style={styles.changeBtn}
          >
            <Text style={styles.changeText}>{nb.food.guests.edit}</Text>
          </Pressable>
        )}
      </View>
      {editingGuests ? (
        <View testID="food-guests-editor" style={styles.guestEditor}>
          <View style={{ gap: 6 }}>
            <Text style={styles.howTitle}>{nb.food.guests.kidsTitle}</Text>
            <Stepper
              compact
              testID="guest-kids"
              value={party.children}
              min={bounds.kidsMin}
              max={bounds.kidsMax}
              unit={nb.food.guests.kidsUnit}
              lessLabel={nb.food.guests.lessKids}
              moreLabel={nb.food.guests.moreKids}
              onChange={(children) => setGuestCounts({ children })}
            />
            <Text variant="small" testID="guest-kids-with">
              {nb.food.guests.kidsWith(celebrantNames(party.celebrants))}
            </Text>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={styles.howTitle}>{nb.food.guests.adultsTitle}</Text>
            <Stepper
              compact
              testID="guest-adults"
              value={hc.adultsEating}
              min={bounds.adultsMin}
              max={bounds.adultsMax}
              unit={hc.adultsEating === 1 ? nb.food.guests.adultsUnitOne : nb.food.guests.adultsUnit}
              lessLabel={nb.food.guests.lessAdults}
              moreLabel={nb.food.guests.moreAdults}
              onChange={(adults) => setGuestCounts({ adults })}
            />
            <Text variant="small">{nb.food.guests.adultsHint}</Text>
            {helpingParents(party) > 0 ? (
              <Text variant="small" testID="guest-adults-helpers">
                {nb.invitation.parentsHelpFood(helpingParents(party))}
              </Text>
            ) : null}
          </View>
          <Text variant="small" style={{ color: colors.ink }}>
            {nb.food.guests.appliesToParty}
          </Text>
          <Button
            compact
            kind="light"
            testID="food-guests-done"
            label={nb.food.guests.done}
            onPress={() => setEditingGuests(false)}
          />
        </View>
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
          <SectionCard section={dietSection} hideTitle />
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
        <Text variant="h3" testID="menu-chosen-title" style={{ marginTop: 2 }}>
          {plan.title}
        </Text>
        <Text variant="small" testID="food-toggle-hint" style={{ marginTop: 2 }}>
          {nb.food.toggleHint}
        </Text>
      </View>
      {plan.sections
        .filter((s) => s.id !== 'hensyn')
        .map((s) => (
          <SectionCard key={s.id} section={s} onToggle={setFoodItem} />
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
        {grid}
        {choices}
      </View>

      {plan ? (
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
              <Surface>{guestBox}</Surface>
              <Surface>{dietBox}</Surface>
            </View>
            <View style={{ flex: 1.5 }}>{amounts}</View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: gutter, marginTop: 22, gap: 22 }}>
            <Surface>{guestBox}</Surface>
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

function SectionCard({
  section,
  hideTitle,
  onToggle,
}: {
  section: FoodSection;
  hideTitle?: boolean;
  onToggle?: (id: string, included: boolean) => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const tint = section.id === 'hensyn' ? colors.butter : section.id === 'kake' ? colors.blush : colors.card;
  return (
    <Surface testID={`food-section-${section.id}`} style={{ backgroundColor: tint, paddingVertical: 8 }}>
      {hideTitle ? null : (
        <Text variant="eyebrow" style={{ marginTop: 8, marginBottom: 2 }}>
          {section.title}
        </Text>
      )}
      {section.lines.map((l, i) =>
        section.id === 'hensyn' ? (
          <DietLine key={l.id} line={l} first={i === 0} styles={styles} />
        ) : (
          <Line key={l.id} line={l} first={i === 0} styles={styles} onToggle={onToggle} />
        ),
      )}
    </Surface>
  );
}

/**
 * One quantity line. A toggleable line is a checkbox: tap anywhere on it to leave it out (greyed, struck
 * through, «Ikke med på handlelista») or to take it back in. Works the same on web, iOS and Android.
 */
function Line({
  line,
  first,
  styles,
  onToggle,
}: {
  line: FoodLine;
  first: boolean;
  styles: ReturnType<typeof useStyles>;
  onToggle?: (id: string, included: boolean) => void;
}) {
  const off = !line.included;
  const label = `${line.name}: ${line.amount}${line.packs ? `, ${line.packs}` : ''}. ${off ? nb.food.excluded : line.why}`;
  const body = (
    <>
      {line.toggleable && onToggle ? (
        <View style={{ paddingTop: 1 }}>
          <CheckBox checked={line.included} size={26} />
        </View>
      ) : null}
      <View style={[{ flex: 1 }, off && styles.off]}>
        <Text style={[styles.lineName, off && styles.struck]}>{line.name}</Text>
        <Text variant="small" style={{ marginTop: 2 }} testID={`food-why-${line.id}`}>
          {off ? nb.food.excluded : line.why}
        </Text>
      </View>
      <View style={[{ alignItems: 'flex-end', maxWidth: '42%' }, off && styles.off]}>
        <Text style={[styles.amount, off && styles.struck]} testID={`food-amount-${line.id}`}>
          {line.amount}
        </Text>
        {line.packs ? <Text style={[styles.packs, off && styles.struck]}>{line.packs}</Text> : null}
      </View>
    </>
  );
  if (!line.toggleable || !onToggle)
    return (
      <View
        testID={`food-line-${line.id}`}
        accessible
        accessibilityLabel={label}
        style={[styles.line, !first && styles.lineBorder]}
      >
        {body}
      </View>
    );
  return (
    <Pressable
      testID={`food-line-${line.id}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: line.included }}
      aria-checked={line.included}
      accessibilityLabel={label}
      accessibilityHint={line.included ? undefined : nb.food.includeLabel(line.name)}
      onPress={() => onToggle(line.id, !line.included)}
      style={({ pressed }) => [styles.line, !first && styles.lineBorder, pressed && { opacity: 0.7 }]}
    >
      {body}
    </Pressable>
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
  smallOption: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginTop: 4 },
  smallOptionText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.muted, textDecorationLine: 'underline' },
  line: { flexDirection: 'row', gap: 12, paddingVertical: 12, alignItems: 'flex-start', minHeight: 44 },
  off: { opacity: 0.45 },
  struck: { textDecorationLine: 'line-through' },
  guestEditor: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 16,
  },
  lineBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  lineName: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  amount: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, color: colors.ink, textAlign: 'right' },
  packs: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted, marginTop: 2, textAlign: 'right' },
}));
