import { Image, StyleSheet, View } from 'react-native';
import { BRAND_PALETTE, invitationCard, inviteNameLayout, themeById, type Party } from '../core';
import { colors, fonts, images, radii, themeImages } from '../theme';
import { Text } from '../ui';

/**
 * The invitation card preview («Festen er klar»). With a theme, colours, picture, motif and headline
 * come from core/themes.ts; without one, the neutral brand look. The rest is the pre-written templates.
 */
/** `compact`: a wider, shorter picture, so «Festen er klar» on a phone shows its button without scrolling. */
export function InvitationCard({ party, compact }: { party: Party; compact?: boolean }) {
  // no theme chosen: the neutral brand card, our own picture and a neutral headline
  const theme = party.theme ? themeById(party.theme) : null;
  const { inviteTint, inviteInk } = theme ? theme.palette : BRAND_PALETTE;
  const art = party.theme ? themeImages[party.theme] : images.hero;
  const card = invitationCard(party);
  // long names (joint birthdays) wrap onto balanced lines and step down in size; never truncated
  const big = inviteNameLayout(`${card.name} ${card.line}`);
  const size = compact ? Math.round(big.fontSize * (36 / 44)) : big.fontSize;
  return (
    <View
      testID="invitation-card"
      style={[styles.card, { backgroundColor: inviteTint }]}
      accessible
      accessibilityLabel={`Invitasjon: ${card.headline} ${card.name} ${card.line}. ${card.when}. ${card.rsvp}.`}
    >
      <View style={[styles.art, compact && { aspectRatio: 2.2 }]}>
        <Image source={art} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        <View style={[styles.motif, { backgroundColor: inviteTint }]}>
          <Text style={styles.motifText}>{theme ? theme.emoji : '🎈'}</Text>
        </View>
      </View>
      <View style={[styles.text, compact && { paddingBottom: 20 }]}>
        <Text testID="invitation-headline" style={[styles.sub, { color: inviteInk }]}>
          {card.headline}
        </Text>
        <Text
          testID="invitation-name"
          style={[
            styles.big,
            {
              color: inviteInk,
              fontSize: size,
              lineHeight: Math.round(size * 1.08),
              letterSpacing: size >= 38 ? -1.2 : -0.6,
            },
          ]}
        >
          {big.text}
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
    textAlign: 'center',
    marginTop: 6,
    alignSelf: 'stretch',
    // let a single very long word break rather than run off the card
    overflowWrap: 'anywhere',
  } as object,
  sub: { fontFamily: fonts.displaySemi, fontSize: 19, color: colors.ink, textAlign: 'center', marginTop: 6 },
  meta: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, marginTop: 8, textAlign: 'center' },
});
