import { Image, StyleSheet, View } from 'react-native';
import { invitationCard, themeById, type Party } from '../core';
import { fonts, radii, themeImages } from '../theme';
import { Text } from '../ui';

/** The themed invitation card preview («Festen er klar»). Text comes from the pre-written templates. */
export function InvitationCard({ party }: { party: Party }) {
  const theme = themeById(party.theme);
  const card = invitationCard(party);
  return (
    <View
      style={[styles.card, { backgroundColor: theme.tint }]}
      accessible
      accessibilityLabel={`Invitasjon: ${card.headline} ${card.name} ${card.line}. ${card.when}. ${card.rsvp}.`}
    >
      <View style={styles.art}>
        <Image source={themeImages[party.theme]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
      <View style={styles.text}>
        <Text style={[styles.sub, { color: theme.accent }]}>{card.headline}</Text>
        <Text style={[styles.big, { color: theme.accent }]} numberOfLines={1} adjustsFontSizeToFit>
          {card.name} {card.line}
        </Text>
        <Text style={styles.sub}>{card.when}</Text>
        <Text style={styles.meta}>{card.rsvp}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' } as object,
  art: { width: '100%', aspectRatio: 1.15, overflow: 'hidden' },
  text: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 26, alignItems: 'center' },
  big: {
    fontFamily: fonts.displayHeavy,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.2,
    textAlign: 'center',
    marginTop: 6,
  },
  sub: { fontFamily: fonts.displaySemi, fontSize: 19, color: '#3A2B36', textAlign: 'center', marginTop: 6 },
  meta: { fontFamily: fonts.body, fontSize: 15, color: '#5c4b57', marginTop: 8, textAlign: 'center' },
});
