import { create } from 'zustand'
import { Company, CompanyUser } from '@/types/api'

interface CompanyState {
  currentCompany: Company | null
  userCompanies: CompanyUser[]
  isLoading: boolean
  setCurrentCompany: (company: Company | null) => void
  setUserCompanies: (companies: CompanyUser[]) => void
  setLoading: (loading: boolean) => void
  getUserRole: () => 'owner' | 'admin' | 'user' | null
  isAdmin: () => boolean
  isOwner: () => boolean
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  currentCompany: null,
  userCompanies: [],
  isLoading: false,
  
  setCurrentCompany: (company) => set({ currentCompany: company }),
  
  setUserCompanies: (companies) => set({ userCompanies: companies }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  getUserRole: () => {
    const { currentCompany, userCompanies } = get()
    if (!currentCompany) return null
    
    const companyUser = userCompanies.find(
      cu => (typeof cu.company === 'object' ? cu.company.companyId : cu.company) === currentCompany.companyId
    )
    return companyUser?.role || null
  },
  
  isAdmin: () => {
    const role = get().getUserRole()
    return role === 'admin' || role === 'owner'
  },
  
  isOwner: () => {
    const role = get().getUserRole()
    return role === 'owner'
  }
}))