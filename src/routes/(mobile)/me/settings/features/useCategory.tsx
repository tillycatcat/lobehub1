import {
  Brain,
  BrainCircuit,
  Coins,
  CreditCard,
  Gift,
  Info,
  Map,
  Mic2,
  PieChart,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { type CellProps } from '@/components/Cell';
import { SettingsTabs } from '@/store/global/initialState';
import { serverConfigSelectors, useServerConfigStore } from '@/store/serverConfig';

export const useCategory = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('setting');
  const { t: tSubscription } = useTranslation('subscription');
  const enableBusinessFeatures = useServerConfigStore(serverConfigSelectors.enableBusinessFeatures);

  const items: CellProps[] = [
    {
      icon: Settings2,
      key: SettingsTabs.Common,
      label: t('tab.common'),
    },
    {
      icon: Brain,
      key: SettingsTabs.Provider,
      label: t('tab.provider'),
    },
    {
      icon: Sparkles,
      key: SettingsTabs.Agent,
      label: t('tab.agent'),
    },
    {
      icon: BrainCircuit,
      key: SettingsTabs.Memory,
      label: t('tab.memory'),
    },
    enableBusinessFeatures && {
      icon: Map,
      key: SettingsTabs.Plans,
      label: tSubscription('tab.plans'),
    },
    enableBusinessFeatures && {
      icon: Coins,
      key: SettingsTabs.Funds,
      label: tSubscription('tab.funds'),
    },
    enableBusinessFeatures && {
      icon: PieChart,
      key: SettingsTabs.Usage,
      label: tSubscription('tab.usage'),
    },
    enableBusinessFeatures && {
      icon: CreditCard,
      key: SettingsTabs.Billing,
      label: tSubscription('tab.billing'),
    },
    enableBusinessFeatures && {
      icon: Gift,
      key: SettingsTabs.Referral,
      label: tSubscription('tab.referral'),
    },
    { icon: Mic2, key: SettingsTabs.TTS, label: t('tab.tts') },
    {
      icon: Info,
      key: SettingsTabs.About,
      label: t('tab.about'),
    },
  ].filter(Boolean) as CellProps[];

  return items.map((item) => ({
    ...item,
    onClick: () => {
      if (item.key === SettingsTabs.Provider) {
        navigate('/settings/provider/all');
      } else if (
        [
          SettingsTabs.Plans,
          SettingsTabs.Funds,
          SettingsTabs.Usage,
          SettingsTabs.Billing,
          SettingsTabs.Referral,
        ].includes(item.key as SettingsTabs)
      ) {
        navigate(`/subscription/${item.key}`);
      } else {
        navigate(`/settings/${item.key}`);
      }
    },
  }));
};
