import { View } from 'react-native';
import { Stepper, Text } from '../../ui';
import { radii, useColors } from '../../theme';
import { useTranslation } from 'react-i18next';
import { draftYoungest, MAX_CHILDREN, minChildren, type SetupDraft } from '../../core';

/**
 * How many children: the ONE children number, the birthday children included («Hvor mange barn blir det?»),
 * with the soft notes under it. Shared by setup step 3 and «Endre festen».
 */
export function KidsFields({ draft, onChange }: { draft: SetupDraft; onChange: (patch: Partial<SetupDraft>) => void }) {
  const { t } = useTranslation();
  const colors = useColors();
  const young = draftYoungest(draft) ?? 5;
  const hint = young <= 5 ? t('kids.hintSmall') : t('kids.hintSchool');
  const min = minChildren(draft.celebrants.length);
  return (
    <>
      <Stepper
        testID="kids-count"
        value={Math.max(min, draft.children)}
        min={min}
        max={MAX_CHILDREN}
        unit={t('kids.unit')}
        onChange={(children) => onChange({ children })}
        lessLabel={t('kids.fewer')}
        moreLabel={t('kids.more')}
      />
      <Text variant="small" style={{ marginTop: 10 }}>
        {young <= 4 ? t('kids.adultsHelp') : t('kids.adultsCounted')}
      </Text>
      <View
        style={{
          marginTop: 16,
          padding: 16,
          paddingHorizontal: 18,
          borderRadius: radii.md,
          backgroundColor: colors.lilac,
        }}
      >
        <Text style={{ fontSize: 16 }}>{hint}</Text>
      </View>
    </>
  );
}
