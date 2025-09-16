"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layouts/sidebar"
import { Header } from "@/components/layouts/header"
import { createClient } from "@/lib/supabase/client"
import { useCompanyStore } from "@/stores/company"
import { apiClient } from "@/lib/api/client"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const supabase = createClient()
  const { setUserCompanies, setCurrentCompany, setLoading } = useCompanyStore()

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/auth/login")
        return
      }

      try {
        // Try to fetch user's companies, but use fallback if backend is not ready
        const companyUsers = await apiClient.getCompanyUsers()
        
        if (companyUsers.member && companyUsers.member.length > 0) {
          setUserCompanies(companyUsers.member)
          
          // Set first company as current if not already set
          const firstCompany = companyUsers.member[0]
          if (typeof firstCompany.company === 'object') {
            setCurrentCompany(firstCompany.company)
          } else {
            // Fetch full company details if needed
            const company = await apiClient.getCompany(firstCompany.company.replace('/api/companies/', ''))
            setCurrentCompany(company)
          }
        } else {
          // No companies - redirect to onboarding
          router.push("/onboarding")
        }
      } catch (error) {
        console.error("Error fetching companies, using fallback:", error)
        
        // Fallback: Create a mock company for development
        const mockCompany = {
          companyId: "dev-company-1",
          name: "Demo Company",
          createdAt: new Date().toISOString()
        }
        
        const mockCompanyUser = {
          company: mockCompany,
          user: user.id,
          role: 'owner' as const,
          addedAt: new Date().toISOString()
        }
        
        setUserCompanies([mockCompanyUser])
        setCurrentCompany(mockCompany)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, supabase, setUserCompanies, setCurrentCompany, setLoading])

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/10 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}