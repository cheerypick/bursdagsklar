import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { DateField } from './DateField';
import { Calendar, Icon, Pill, Surface, Text } from '../../ui';
import { fonts, radii, TOUCH, useColors, useLayout, themedStyles } from '../../theme';
import { useTranslation } from 'react-i18next';
import {
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
  type SetupDraft,
} from '../../core';

/**
 * When: the date card with our own Norwegian calendar, the party time with «Endre» (15-minute steps) and
 * the soft notes under it. Shared by setup step 2 and «Endre festen» (the same controls, the same test ids).
 * A day that has already been can only be picked in «Endre festen»; it gets one soft note, never a block.
 */
export function DateTimeFields({
  draft,
  onChange,
  today,
  min,
  max,
  initiallyOpen = true,
}: {
  draft: SetupDraft;
  onChange: (patch: Partial<SetupDraft>) => void;
  today: ISODate;
  min: ISODate;
  max: ISODate;
  initiallyOpen?: boolean;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { isShort } = useLayout();
  const [editTime, setEditTime] = useState(false);
  const [open, setOpen] = useState(initiallyOpen);
  // the time reason follows the youngest birthday child
  const age = draftYoungest(draft) ?? 5;
  const joint = draft.celebrants.length > 1;

  const chosen = draft.date;
  // a neutral picker: any day is fine. The default time follows the day (weekday 17.00–19.00,
  // weekend 12.00–14.00 or 14.00–16.00 by the youngest age) until the parent changes the time by hand.
  const why = chosen && !draft.timeEdited ? defaultPartyTime(age, isWeekend(chosen)).why : '';
  const pick = (date: ISODate) => onChange(draftWithDate(draft, date));

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
    onChange({ start: fromMinutes(s), end: fromMinutes(e), timeEdited: true });
  };

  // a day before today (only reachable in «Endre festen»): one soft note instead of the usual ones
  const pastDay = Boolean(chosen && chosen < today);
  // the notes look at the time of day too: today at 17.00 when it is 21.01 has already been.
  // At most two, the urgent one first; the tips are soft suggestions, never rules.
  const notes = chosen && !pastDay ? dateNotes(chosen, draft.start, age, today, nowMinutesOslo()) : [];
  // the barnehage hint in the time editor: weekdays, barnehage age (a suggestion, never a rule)
  const editHint = chosen && !isWeekend(chosen) && age <= BARNEHAGE_MAX_AGE;

  return (
    <>
      <Pressable
        testID="date-card"
        accessibilityRole="button"
        accessibilityLabel={`${t('date.label')}: ${chosen ? formatLongCap(chosen) : t('date.placeholder')}. ${open ? t('date.hide') : t('date.show')}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
      >
        <DateField value={chosen} placeholder={t('date.placeholder')} />
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
                <Text style={{ fontFamily: fonts.bodyBold }}>
                  {t('date.time', { range: formatRange(draft.start, draft.end) })}
                </Text>
                {why ? (
                  <Text variant="small">
                    {joint
                      ? t('date.fitsJoint', { alder: age, tekst: why })
                      : t('date.fits', { alder: age, tekst: why })}
                  </Text>
                ) : null}
              </View>
              <Pill
                light
                label={editTime ? t('common.done') : t('common.change')}
                onPress={() => setEditTime((v) => !v)}
                accessibilityLabel={editTime ? t('common.done') : `${t('common.change')} klokkeslett`}
              />
            </View>
          ) : null}

          {editTime && draft.start && draft.end ? (
            <View style={{ gap: 10, marginTop: 12 }}>
              <TimeShifter
                label={t('date.start')}
                value={draft.start}
                onMinus={() => shift('start', -15)}
                onPlus={() => shift('start', 15)}
              />
              <TimeShifter
                label={t('date.end')}
                value={draft.end}
                onMinus={() => shift('end', -15)}
                onPlus={() => shift('end', 15)}
              />
            </View>
          ) : null}

          {editTime && editHint ? (
            <Text variant="small" style={styles.tip} testID="time-hint">
              {t('date.editHint')}
            </Text>
          ) : null}

          {pastDay ? (
            <Text style={styles.hint} testID="date-past-day">
              {t('editParty.pastDate')}
            </Text>
          ) : null}

          {notes.map((n) =>
            n === 'pickup' || n === 'busy' ? (
              <Text key={n} variant="small" style={styles.tip} testID={`date-tip-${n}`}>
                {n === 'pickup' ? t('date.tipPickup') : t('date.tipBusy')}
              </Text>
            ) : (
              <Text key={n} style={styles.hint} testID="date-notice">
                {t(NOTICE_TEXT[n])}
              </Text>
            ),
          )}
        </Surface>
      ) : null}
    </>
  );
}

const NOTICE_TEXT = {
  past: 'date.pastTime',
  soon: 'date.soonTime',
  short: 'date.shortNotice',
} as const satisfies Record<Exclude<DateNote, 'pickup' | 'busy'>, string>;

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
  const { t } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.shifter}>
      <Text style={{ fontFamily: fonts.bodySemi, width: 60 }}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('date.earlier', { label })}
        onPress={onMinus}
        style={styles.round}
      >
        <Icon name="minus" color={colors.green} />
      </Pressable>
      <Text style={styles.clock}>{value.replace(':', '.')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('date.later', { label })}
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
