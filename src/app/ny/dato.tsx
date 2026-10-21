import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useParty } from '../../state/PartyProvider';
import { SetupStep } from '../../features/setup/SetupStep';
import { DateField } from '../../features/setup/DateField';
import { Calendar, Icon, Pill, Surface, Text } from '../../ui';
import { fonts, radii, TOUCH, useColors, useLayout, themedStyles } from '../../theme';
import { nb } from '../../i18n/nb';
import {
  dateBounds,
  defaultPartyTime,
  formatLongCap,
  draftWithDate,
  draftYoungest,
  formatRange,
  fromMinutes,
  BARNEHAGE_MAX_AGE,
  dateNotes,
  isWeekend,
  minutesOf,
  nowMinutesOslo,
  type DateNote,
  type ISODate,
} from '../../core';

export default function DateStep() {
  const styles = useStyles();
  const { draft, updateDraft, today } = useParty();
  const router = useRouter();
  const { isShort } = useLayout();
  const [editTime, setEditTime] = useState(false);
  const [open, setOpen] = useState(true);
  // the time reason follows the youngest birthday child
  const age = draftYoungest(draft) ?? 5;
  const joint = draft.celebrants.length > 1;
  const { min, max } = dateBounds(today);

  const chosen = draft.date;
  // a neutral picker: any day is fine. The default time follows the day (weekday 17.00–19.00,
  // weekend 12.00–14.00 or 14.00–16.00 by the youngest age) until the parent changes the time by hand.
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

  // the notes look at the time of day too: today at 17.00 when it is 21.01 has already been.
  // At most two, the urgent one first; the tips are soft suggestions, never rules.
  const notes = chosen ? dateNotes(chosen, draft.start, age, today, nowMinutesOslo()) : [];
  // the barnehage hint in the time editor: weekdays, barnehage age (a suggestion, never a rule)
  const editHint = chosen && !isWeekend(chosen) && age <= BARNEHAGE_MAX_AGE;

  return (
    <SetupStep
      step={2}
      title={nb.date.title}
      lede={nb.date.lede}
      onBack={() => router.back()}
      onNext={() => router.push('/ny/barn')}
      nextDisabled={!chosen}
      testID="step-date"
    >
      <Pressable
        testID="date-card"
        accessibilityRole="button"
        accessibilityLabel={`${nb.date.label}: ${chosen ? formatLongCap(chosen) : nb.date.placeholder}. ${open ? nb.date.hide : nb.date.show}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
      >
        <DateField value={chosen} placeholder={nb.date.placeholder} />
      </Pressable>
      {open ? (
        <View style={{ marginTop: isShort ? 4 : 12 }}>
          <Calendar testID="calendar" value={chosen} min={min} max={max} today={today} onChange={pick} />
        </View>
      ) : null}

      {chosen ? (
        <Surface style={{ marginTop: 22 }}>
          {draft.start && draft.end ? (
            <View style={styles.timechip} testID="party-time">
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bodyBold }}>{nb.date.time(formatRange(draft.start, draft.end))}</Text>
                {why ? (
                  <Text variant="small">{joint ? nb.date.fitsJoint(age, why) : nb.date.fits(age, why)}</Text>
                ) : null}
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

          {editTime && editHint ? (
            <Text variant="small" style={styles.tip} testID="time-hint">
              {nb.date.editHint}
            </Text>
          ) : null}

          {notes.map((n) =>
            n === 'pickup' || n === 'busy' ? (
              <Text key={n} variant="small" style={styles.tip} testID={`date-tip-${n}`}>
                {n === 'pickup' ? nb.date.tipPickup : nb.date.tipBusy}
              </Text>
            ) : (
              <Text key={n} style={styles.hint} testID="date-notice">
                {NOTICE_TEXT[n]}
              </Text>
            ),
          )}
        </Surface>
      ) : null}
    </SetupStep>
  );
}

const NOTICE_TEXT: Record<Exclude<DateNote, 'pickup' | 'busy'>, string> = {
  past: nb.date.pastTime,
  soon: nb.date.soonTime,
  short: nb.date.shortNotice,
};

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
  tip: { marginTop: 12, paddingHorizontal: 4 },
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
