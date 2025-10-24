"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useCompanyStore } from "@/stores/company"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

// Password change schema
const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Password must be at least 6 characters"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type PasswordFormData = z.infer<typeof passwordSchema>

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { userCompanies } = useCompanyStore()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema)
  })

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    loadUser()
  }, [supabase])

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setPasswordLoading(true)
    setPasswordMessage(null)

    try {
      // Supabase requires reauthentication before password change
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword
      })

      if (updateError) throw updateError

      setPasswordMessage({ type: 'success', text: 'Password updated successfully!' })
      reset()
    } catch (error: any) {
      setPasswordMessage({
        type: 'error',
        text: error.message || 'Failed to update password'
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Your account information managed by Supabase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                Email is managed through your Supabase account
              </p>
            </div>

            <div className="grid gap-2">
              <Label>User ID</Label>
              <Input
                value={user?.id || ''}
                disabled
                className="bg-muted font-mono text-xs"
              />
            </div>

            <div className="grid gap-2">
              <Label>Account Created</Label>
              <Input
                value={formatDate(user?.created_at)}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid gap-2">
              <Label>Last Sign In</Label>
              <Input
                value={formatDate(user?.last_sign_in_at)}
                disabled
                className="bg-muted"
              />
            </div>
          </CardContent>
        </Card>

        {/* Company Memberships */}
        <Card>
          <CardHeader>
            <CardTitle>Company Memberships</CardTitle>
            <CardDescription>
              Companies you belong to and your roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No companies found</p>
            ) : (
              <div className="space-y-3">
                {userCompanies.map((companyUser, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {typeof companyUser.company === 'object'
                          ? companyUser.company.name
                          : 'Loading...'}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        Role: {companyUser.role}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Joined {formatDate(companyUser.addedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password for enhanced security
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...register("currentPassword")}
                  disabled={passwordLoading}
                />
                {errors.currentPassword && (
                  <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...register("newPassword")}
                  disabled={passwordLoading}
                />
                {errors.newPassword && (
                  <p className="text-sm text-destructive">{errors.newPassword.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register("confirmPassword")}
                  disabled={passwordLoading}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              {passwordMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  passwordMessage.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {passwordMessage.text}
                </div>
              )}

              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible account actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-muted-foreground">
                  Sign out of your current session
                </p>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/auth/login')
                }}
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
