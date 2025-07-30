import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CompanyInfo {
  name: string
  postalCode: string
  address: string
  phone: string
  fax?: string
  email?: string
  representative?: string
  license?: string
}

interface SettingsState {
  companyInfo: CompanyInfo
  updateCompanyInfo: (info: Partial<CompanyInfo>) => void
}

const defaultCompanyInfo: CompanyInfo = {
  name: 'スマート・ビルディング・プランナー',
  postalCode: '000-0000',
  address: '東京都〇〇区〇〇 1-2-3',
  phone: '03-0000-0000',
  fax: '03-0000-0001',
  email: 'info@smart-building.jp',
  representative: '代表取締役 山田太郎',
  license: '建設業許可 東京都知事許可（般-00）第00000号'
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      companyInfo: defaultCompanyInfo,
      updateCompanyInfo: (info) =>
        set((state) => ({
          companyInfo: { ...state.companyInfo, ...info }
        }))
    }),
    {
      name: 'smart-building-settings'
    }
  )
)