import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useParty } from '../../state/PartyProvider';
import { SetupStep } from '../../features/setup/SetupStep';
import { Icon, Pill, PillRow, Surface, Text } from '../../ui';
import { colors, fonts, radii, TOUCH } from '../../theme';
import { nb } from '../../i18n/nb';
import {
  DATE_ERRORS,
  defaultPartyTime,
  diffDays,
  formatLongCap,
  formatRange,
  fromMinutes,
  isWeekend,
  minutesOf,
  parseDateInput,
  SHORT_NOTICE_DAYS,
  weekendNudge,
  type ISODate,
} from '../../core';

export default function DateStep() {
  const { draft, updateDraft, today } = useParty();
  const router = useRouter();
  const [editTime, setEditTime] = useState(false);
  const [focused, setFocused] = useState(false);
  // «Nei» is only shown as chosen after the parent has actually tapped it
  const [saidNo, setSaidNo] = useState(false);
  const age = draft.age ?? 5;

  const parsed = parseDateInput(draft.dateText, today);
  const typed: ISODate | null = parsed.ok ? parsed.date : null;
  const nudge = typed ? weekendNudge(typed, today) : null;
  const chosen = draft.date;
  const why = chosen ? defaultPartyTime(age, isWeekend(chosen)).why : '';

  const setDate = (date: ISODate | null, text = draft.dateText) => {
    if (!date) return updateDraft({ dateText: text, date: null });
    const t = defaultPartyTime(age, isWeekend(date));
    updateDraft({ dateText: text, date, start: t.start, end: t.end });
  };

  const onType = (text: string) => {
    setSaidNo(false);
    const r = parseDateInput(text, today);
    setDate(r.ok ? r.date : null, text);
  };

  const shift = (which: 'start' | 'end', delta: number) => {
    if (!draft.start || !draft.end) return;
    let s = minutesOf(draft.start);
    let e = minutesOf(draft.end);
    if (which === 'start') {
      s = Math.min(Math.max(s + delta, 8 * 60), 20 * 60);
      if (e - s < 30) e = s + 30;
    } else {
      e = Math.min(Math.max(e + delta, s + 30), 22 * 60);
    }
    updateDraft({ start: fromMinutes(s), end: fromMinutes(e) });
  };

  const showError = !parsed.ok && parsed.reason !== 'empty' && draft.dateText.trim().length >= 3;
  const shortNotice = chosen ? diffDays(today, chosen) < SHORT_NOTICE_DAYS : false;

  return (
    <SetupStep
      step={3}
      title={nb.date.title}
      lede={nb.date.lede}
      onBack={() => router.back()}
      onNext={() => router.push('/ny/barn')}
      nextDisabled={!chosen}
      testID="step-date"
    >
      <TextInput
        testID="date-input"
        value={draft.dateText}
        onChangeText={onType}
        placeholder={nb.date.placeholder}
        placeholderTextColor="#B8B2A8"
        accessibilityLabel={nb.date.label}
        autoCorrect={false}
        autoFocus
        returnKeyType="done"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.field, focused && { borderBottomColor: colors.pink }]}
      />
      {showError ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {DATE_ERRORS[parsed.ok ? 'unparsed' : parsed.reason]}
        </Text>
      ) : null}

      {typed && chosen ? (
        <Surface style={{ marginTop: 22 }}>
          <Text variant="small">
            {nb.date.youWrote} «{draft.dateText.trim()}»
          </Text>
          <Text style={styles.typed} testID="date-result">
            {formatLongCap(chosen)}
          </Text>

          {nudge ? (
            <View style={styles.nudge} testID="weekend-nudge">
              <Text style={{ fontFamily: fonts.bodySemi }}>{nudge.question}</Text>
              <View style={{ marginTop: 12 }}>
                <PillRow>
                  <Pill
                    light
                    label={nudge.yes}
                    on={chosen === nudge.saturday}
                    onPress={() => {
                      setSaidNo(false);
                      setDate(nudge.saturday);
                    }}
                  />
                  <Pill
                    light
                    label={nudge.no}
                    on={saidNo && chosen === typed}
                    onPress={() => {
                      setSaidNo(true);
                      setDate(typed);
                    }}
                  />
                </PillRow>
              </View>
            </View>
          ) : null}

          {draft.start && draft.end ? (
            <View style={styles.timechip}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bodyBold }}>{nb.date.time(formatRange(draft.start, draft.end))}</Text>
                <Text variant="small">{nb.date.fits(age, why)}</Text>
              </View>
              <Pill
                light
                label={editTime ? nb.common.done : nb.common.change}
                onPress={() => setEditTime((v) => !v)}
                accessibilityLabel={editTime ? nb.common.done : `${nb.common.change} klokkeslett`}
              />
            </View>
          ) : null}

          {editTime && draft.start && draft.end ? (
            <View style={{ gap: 10, marginTop: 12 }}>
              <TimeShifter
                label={nb.date.start}
                value={draft.start}
                onMinus={() => shift('start', -15)}
                onPlus={() => shift('start', 15)}
              />
              <TimeShifter
                label={nb.date.end}
                value={draft.end}
                onMinus={() => shift('end', -15)}
                onPlus={() => shift('end', 15)}
              />
            </View>
          ) : null}

          {shortNotice ? <Text style={[styles.hint]}>{nb.date.shortNotice}</Text> : null}
        </Surface>
      ) : null}
    </SetupStep>
  );
}

function TimeShifter({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <View style={styles.shifter}>
      <Text style={{ fontFamily: fonts.bodySemi, width: 60 }}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} 15 minutter tidligere`}
        onPress={onMinus}
        style={styles.round}
      >
        <Icon name="minus" color={colors.green} />
      </Pressable>
      <Text style={styles.clock}>{value.replace(':', '.')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} 15 minutter senere`}
        onPress={onPlus}
        style={styles.round}
      >
        <Icon name="plus" color={colors.green} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.ink,
    borderBottomWidth: 3,
    borderBottomColor: colors.green,
    paddingVertical: 8,
    paddingHorizontal: 2,
    outlineStyle: 'none',
  } as object,
  error: { marginTop: 12, color: '#A23A4F', fontFamily: fonts.bodySemi, fontSize: 15 },
  typed: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.ink, marginTop: 4 },
  nudge: { marginTop: 16, backgroundColor: colors.butter, borderRadius: radii.md, padding: 18 },
  timechip: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    paddingLeft: 18,
    borderRadius: radii.md,
    backgroundColor: colors.sage,
  },
  hint: { marginTop: 16, padding: 16, borderRadius: radii.md, backgroundColor: colors.lilac, fontSize: 16 },
  shifter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  round: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: TOUCH / 2,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clock: { fontFamily: fonts.display, fontSize: 24, minWidth: 80, textAlign: 'center' },
});
