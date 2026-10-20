import { Image, StyleSheet, View } from 'react-native';
import { BRAND_PALETTE, invitationCard, themeById, type Party } from '../core';
import { colors, fonts, images, radii, themeImages } from '../theme';
import { Text } from '../ui';

/**
 * The invitation card preview («Festen er klar»). With a theme, colours, picture, motif and headline
 * come from core/themes.ts; without one, the neutral brand look. The rest is the pre-written templates.
 */
export function InvitationCard({ party }: { party: Party }) {
  // no theme chosen: the neutral brand card, our own picture and a neutral headline
  const theme = party.theme ? themeById(party.theme) : null;
  const { inviteTint, inviteInk } = theme ? theme.palette : BRAND_PALETTE;
  const art = party.theme ? themeImages[party.theme] : images.hero;
  const card = invitationCard(party);
  return (
    <View
      testID="invitation-card"
      style={[styles.card, { backgroundColor: inviteTint }]}
      accessible
      accessibilityLabel={`Invitasjon: ${card.headline} ${card.name} ${card.line}. ${card.when}. ${card.rsvp}.`}
    >
      <View style={styles.art}>
        <Image source={art} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        <View style={[styles.motif, { backgroundColor: inviteTint }]}>
          <Text style={styles.motifText}>{theme ? theme.emoji : '🎈'}</Text>
        </View>
      </View>
      <View style={styles.text}>
        <Text testID="invitation-headline" style={[styles.sub, { color: inviteInk }]}>
          {card.headline}
        </Text>
        <Text style={[styles.big, { color: inviteInk }]} numberOfLines={1} adjustsFontSizeToFit>
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
  motif: {
    position: 'absolute',
    bottom: -22,
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motifText: { fontSize: 26, lineHeight: 32 },
  text: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 26, alignItems: 'center' },
  big: {
    fontFamily: fonts.displayHeavy,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.2,
    textAlign: 'center',
    marginTop: 6,
  },
  sub: { fontFamily: fonts.displaySemi, fontSize: 19, color: colors.ink, textAlign: 'center', marginTop: 6 },
  meta: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, marginTop: 8, textAlign: 'center' },
});
