import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Grid, Icon, Text } from '../../ui';
import { fonts, radii, shadow, useColors, themedStyles } from '../../theme';
import { useTranslation } from 'react-i18next';
import {
  AGES,
  draftAddCelebrant,
  draftRemoveCelebrant,
  draftWithCelebrant,
  MAX_CELEBRANTS,
  type DraftCelebrant,
  type SetupDraft,
} from '../../core';

/**
 * Who has a birthday: a name and an age (3–10) per child, «+ Legg til et barn til» up to three, × on the
 * extra ones. Shared by setup step 1 and «Endre festen» (the same controls, the same test ids).
 */
export function CelebrantFields({
  draft,
  onChange,
  autoFocusFirst = false,
}: {
  draft: SetupDraft;
  onChange: (patch: Partial<SetupDraft>) => void;
  autoFocusFirst?: boolean;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const joint = draft.celebrants.length > 1;
  return (
    <>
      <View style={{ gap: 16 }}>
        {draft.celebrants.map((c, i) => (
          <ChildCard
            key={c.id}
            child={c}
            index={i + 1}
            joint={joint}
            autoFocus={autoFocusFirst && i === 0 && !c.name}
            onChange={(patch) => onChange(draftWithCelebrant(draft, c.id, patch))}
            onRemove={i > 0 ? () => onChange(draftRemoveCelebrant(draft, c.id)) : undefined}
          />
        ))}
      </View>
      {draft.celebrants.length < MAX_CELEBRANTS ? (
        <Pressable
          testID="add-child"
          accessibilityRole="button"
          onPress={() => onChange(draftAddCelebrant(draft))}
          style={({ pressed }) => [styles.add, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.addText}>{t('who.add')}</Text>
        </Pressable>
      ) : null}
    </>
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
  const { t } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const who = child.name.trim() || (joint ? t('who.child', { n: index }) : 'barnet');
  const suffix = index === 1 ? '' : `-${index}`;
  const body = (
    <>
      {joint ? (
        <View style={styles.cardHead}>
          <Text variant="eyebrow">{t('who.child', { n: index })}</Text>
          {onRemove ? (
            <Pressable
              testID={`remove-child${suffix}`}
              accessibilityRole="button"
              accessibilityLabel={t('who.remove', {
                navn: child.name.trim() || t('who.child', { n: index }).toLowerCase(),
              })}
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
        placeholder={t('who.placeholder')}
        placeholderTextColor="#B8B2A8"
        accessibilityLabel={index === 1 ? t('who.nameLabelFirst') : t('who.nameLabel', { n: index })}
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
      <Text style={styles.ageQ}>{t('who.ageQuestion', { navn: who })}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('who.ageGroup', { navn: who })}>
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
                accessibilityLabel={t('who.ageLabel', { count: age })}
                accessibilityState={{ checked: on, selected: on }}
                aria-checked={on}
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
