import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useParty } from '../../state/PartyProvider';
import { SetupStep } from '../../features/setup/SetupStep';
import { DatePicker } from '../../features/setup/DatePicker';
import { Icon, Pill, Surface, Text } from '../../ui';
import { fonts, radii, TOUCH, useColors, themedStyles } from '../../theme';
import { nb } from '../../i18n/nb';
import {
  dateBounds,
  defaultPartyTime,
  diffDays,
  draftWithDate,
  formatRange,
  fromMinutes,
  isWeekend,
  minutesOf,
  SHORT_NOTICE_DAYS,
  type ISODate,
} from '../../core';

export default function DateStep() {
  const styles = useStyles();
  const { draft, updateDraft, today } = useParty();
  const router = useRouter();
  const [editTime, setEditTime] = useState(false);
  const age = draft.age ?? 5;
  const { min, max } = dateBounds(today);

  const chosen = draft.date;
  // a neutral picker: any day is fine. The default time follows the day (weekday 16.30–18.30,
  // weekend 12.00–14.00) until the parent changes the time by hand.
  const why = chosen && !draft.timeEdited ? defaultPartyTime(age, isWeekend(chosen)).why : '';
  const pick = (date: ISODate) => updateDraft(draftWithDate(draft, date));

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
    updateDraft({ start: fromMinutes(s), end: fromMinutes(e), timeEdited: true });
  };

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
      <DatePicker
        testID="date-input"
        value={chosen}
        min={min}
        max={max}
        onChange={pick}
        label={nb.date.label}
        placeholder={nb.date.placeholder}
      />

      {chosen ? (
        <Surface style={{ marginTop: 22 }}>
          {draft.start && draft.end ? (
            <View style={styles.timechip} testID="party-time">
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bodyBold }}>{nb.date.time(formatRange(draft.start, draft.end))}</Text>
                {why ? <Text variant="small">{nb.date.fits(age, why)}</Text> : null}
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
  const styles = useStyles();
  const colors = useColors();
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

const useStyles = themedStyles((colors) => ({
  timechip: {
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
}));
