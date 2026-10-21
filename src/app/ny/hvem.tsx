import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useParty } from '../../state/PartyProvider';
import { SetupStep } from '../../features/setup/SetupStep';
import { Grid, Icon, Text } from '../../ui';
import { fonts, radii, shadow, useColors, themedStyles } from '../../theme';
import { nb } from '../../i18n/nb';
import {
  AGES,
  celebrantsComplete,
  draftAddCelebrant,
  draftRemoveCelebrant,
  draftWithCelebrant,
  MAX_CELEBRANTS,
  type DraftCelebrant,
} from '../../core';

/**
 * Step 1: who has a birthday. One child by default; «+ Legg til et barn til» for siblings or
 * friends who celebrate together (up to three). Each child: first name and age (3–10).
 */
export default function WhoStep() {
  const styles = useStyles();
  const { draft, updateDraft } = useParty();
  const router = useRouter();
  const valid = celebrantsComplete(draft);
  const joint = draft.celebrants.length > 1;
  return (
    <SetupStep
      step={1}
      title={nb.who.title}
      lede={nb.who.lede}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onNext={() => valid && router.push('/ny/dato')}
      nextDisabled={!valid}
      testID="step-who"
    >
      <View style={{ gap: 16 }}>
        {draft.celebrants.map((c, i) => (
          <ChildCard
            key={c.id}
            child={c}
            index={i + 1}
            joint={joint}
            autoFocus={i === 0 && !c.name}
            onChange={(patch) => updateDraft(draftWithCelebrant(draft, c.id, patch))}
            onRemove={i > 0 ? () => updateDraft(draftRemoveCelebrant(draft, c.id)) : undefined}
          />
        ))}
      </View>
      {draft.celebrants.length < MAX_CELEBRANTS ? (
        <Pressable
          testID="add-child"
          accessibilityRole="button"
          onPress={() => updateDraft(draftAddCelebrant(draft))}
          style={({ pressed }) => [styles.add, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.addText}>{nb.who.add}</Text>
        </Pressable>
      ) : null}
    </SetupStep>
  );
}

function ChildCard({
  child,
  index,
  joint,
  autoFocus,
  onChange,
  onRemove,
}: {
  child: DraftCelebrant;
  index: number;
  joint: boolean;
  autoFocus: boolean;
  onChange: (patch: Partial<Omit<DraftCelebrant, 'id'>>) => void;
  onRemove?: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const who = child.name.trim() || (joint ? nb.who.child(index) : 'barnet');
  const suffix = index === 1 ? '' : `-${index}`;
  const body = (
    <>
      {joint ? (
        <View style={styles.cardHead}>
          <Text variant="eyebrow">{nb.who.child(index)}</Text>
          {onRemove ? (
            <Pressable
              testID={`remove-child${suffix}`}
              accessibilityRole="button"
              accessibilityLabel={nb.who.remove(child.name.trim() || nb.who.child(index).toLowerCase())}
              onPress={onRemove}
              hitSlop={8}
              style={styles.remove}
            >
              <Icon name="close" size={20} strokeWidth={2.6} color={colors.ink} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <TextInput
        testID={`name-input${suffix}`}
        value={child.name}
        onChangeText={(name) => onChange({ name: name.replace(/\s+/g, ' ').slice(0, 20) })}
        placeholder={nb.who.placeholder}
        placeholderTextColor="#B8B2A8"
        accessibilityLabel={nb.who.nameLabel(index)}
        autoCapitalize="words"
        autoComplete="off"
        autoCorrect={false}
        autoFocus={autoFocus}
        maxLength={20}
        returnKeyType="done"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.field, joint && styles.fieldJoint, focused && { borderBottomColor: colors.pink }]}
      />
      <Text style={styles.ageQ}>{nb.who.ageQuestion(who)}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={nb.who.ageGroup(who)}>
        <Grid
          items={AGES}
          columns={4}
          gap={10}
          keyOf={(a) => String(a)}
          render={(age) => {
            const on = child.age === age;
            return (
              <Pressable
                testID={`age${suffix}-${age}`}
                accessibilityRole="radio"
                accessibilityLabel={nb.who.ageLabel(age)}
                accessibilityState={{ checked: on, selected: on }}
                onPress={() => onChange({ age })}
                style={[styles.age, on && { backgroundColor: colors.green }]}
              >
                <Text style={[styles.ageText, on && { color: colors.onPrimary }]}>{age}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </>
  );
  // one child: no card around it, just the big name field and the ages (as before)
  return <View style={joint ? styles.jointCard : null}>{body}</View>;
}

const useStyles = themedStyles((colors) => ({
  field: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.ink,
    borderBottomWidth: 3,
    borderBottomColor: colors.green,
    paddingVertical: 8,
    paddingHorizontal: 2,
    outlineStyle: 'none',
  } as object,
  jointCard: { borderWidth: 2, borderColor: colors.line, borderRadius: radii.lg, padding: 16 },
  fieldJoint: { fontSize: 30, paddingVertical: 4 },
  ageQ: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink, marginTop: 20, marginBottom: 12 },
  age: {
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  ageText: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    minHeight: 44,
  },
  remove: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: { marginTop: 18, minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  addText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.green2, textDecorationLine: 'underline' },
}));
