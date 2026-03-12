import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SettingsTabs } from '@/store/global/initialState';
import { ServerConfigStoreProvider } from '@/store/serverConfig/Provider';

import { useCategory } from '../features/useCategory';

const wrapperWithBusinessEnabled: React.JSXElementConstructor<{ children: React.ReactNode }> = ({
  children,
}) => (
  <ServerConfigStoreProvider serverConfig={{ enableBusinessFeatures: true } as any}>
    {children}
  </ServerConfigStoreProvider>
);

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: vi.fn(() => ({
    t: vi.fn((key) => key),
  })),
}));

afterEach(() => {
  mockNavigate.mockReset();
});

describe('mobile me settings useCategory', () => {
  it('should expose subscription entries when business features are enabled', () => {
    const { result } = renderHook(() => useCategory(), {
      wrapper: wrapperWithBusinessEnabled,
    });

    const keys = result.current.map((item) => item.key);

    expect(keys).toContain(SettingsTabs.Plans);
    expect(keys).toContain(SettingsTabs.Funds);
    expect(keys).toContain(SettingsTabs.Usage);
    expect(keys).toContain(SettingsTabs.Billing);
    expect(keys).toContain(SettingsTabs.Referral);
  });

  it('should navigate subscription entries to mobile subscription routes', () => {
    const { result } = renderHook(() => useCategory(), {
      wrapper: wrapperWithBusinessEnabled,
    });

    const billingItem = result.current.find((item) => item.key === SettingsTabs.Billing);
    const fundsItem = result.current.find((item) => item.key === SettingsTabs.Funds);

    act(() => {
      billingItem?.onClick?.();
      fundsItem?.onClick?.();
    });

    expect(mockNavigate).toHaveBeenNthCalledWith(1, '/subscription/billing');
    expect(mockNavigate).toHaveBeenNthCalledWith(2, '/subscription/funds');
  });
});
