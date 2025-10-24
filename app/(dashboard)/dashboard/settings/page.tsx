"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useCompanyStore } from "@/stores/company"
import { apiClient } from "@/lib/api/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ApiKey } from "@/types/api"

// Password change schema
const passwordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type PasswordFormData = z.infer<typeof passwordSchema>

// API key creation schema
const apiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(191, "Name too long"),
})

type ApiKeyFormData = z.infer<typeof apiKeySchema>

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { userCompanies } = useCompanyStore()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // API key state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [apiKeyCreating, setApiKeyCreating] = useState(false)
  const [newPlainTextKey, setNewPlainTextKey] = useState<string | null>(null)
  const [apiKeyMessage, setApiKeyMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema)
  })

  const {
    register: registerApiKey,
    handleSubmit: handleSubmitApiKey,
    formState: { errors: apiKeyErrors },
    reset: resetApiKey
  } = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema)
  })

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    loadUser()
  }, [supabase])

  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        setApiKeysLoading(true)
        const response = await apiClient.getApiKeys()
        const keys = response.member || response['hydra:member'] || []
        setApiKeys(keys)
      } catch (error: any) {
        console.error('Failed to load API keys:', error)
        // Don't show error if user doesn't have permission - they might not be admin/owner
        if (error.message?.includes('403') || error.message?.includes('permission')) {
          setApiKeys([])
        }
      } finally {
        setApiKeysLoading(false)
      }
    }
    loadApiKeys()
  }, [])

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

  const onApiKeySubmit = async (data: ApiKeyFormData) => {
    setApiKeyCreating(true)
    setApiKeyMessage(null)
    setNewPlainTextKey(null)

    try {
      const response = await apiClient.createApiKey({
        name: data.name
      })

      // Store the plain text key to display it (only available once!)
      setNewPlainTextKey(response.plainTextKey)
      setApiKeyMessage({ type: 'success', text: 'API key created successfully! Copy it now - it will not be shown again.' })

      // Reload the API keys list
      const keysResponse = await apiClient.getApiKeys()
      const keys = keysResponse.member || keysResponse['hydra:member'] || []
      setApiKeys(keys)

      resetApiKey()
    } catch (error: any) {
      setApiKeyMessage({
        type: 'error',
        text: error.message || 'Failed to create API key. You may not have permission.'
      })
    } finally {
      setApiKeyCreating(false)
    }
  }

  const deleteApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key? This cannot be undone.')) {
      return
    }

    try {
      await apiClient.deleteApiKey(id)
      setApiKeyMessage({ type: 'success', text: 'API key deleted successfully' })

      // Remove from local state
      setApiKeys(prev => prev.filter(key => key.id !== id))

      // Clear the plain text key if it was just created
      setNewPlainTextKey(null)
    } catch (error: any) {
      setApiKeyMessage({
        type: 'error',
        text: error.message || 'Failed to delete API key'
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setApiKeyMessage({ type: 'success', text: 'API key copied to clipboard!' })
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

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Manage API keys for programmatic access (requires admin or owner role)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Create API Key Form */}
            <form onSubmit={handleSubmitApiKey(onApiKeySubmit)} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="apiKeyName">API Key Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="apiKeyName"
                    placeholder="e.g., Production API Key"
                    {...registerApiKey("name")}
                    disabled={apiKeyCreating}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={apiKeyCreating}>
                    {apiKeyCreating ? 'Creating...' : 'Generate Key'}
                  </Button>
                </div>
                {apiKeyErrors.name && (
                  <p className="text-sm text-destructive">{apiKeyErrors.name.message}</p>
                )}
              </div>
            </form>

            {/* Display newly created plain text key */}
            {newPlainTextKey && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
                <p className="font-medium text-yellow-900">Your new API key:</p>
                <div className="flex gap-2">
                  <Input
                    value={newPlainTextKey}
                    readOnly
                    className="font-mono text-xs bg-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copyToClipboard(newPlainTextKey)}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-yellow-800">
                  ⚠️ Make sure to copy this key now. You won&apos;t be able to see it again!
                </p>
              </div>
            )}

            {/* Messages */}
            {apiKeyMessage && (
              <div className={`p-3 rounded-lg text-sm ${
                apiKeyMessage.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {apiKeyMessage.text}
              </div>
            )}

            <Separator />

            {/* API Keys List */}
            <div className="space-y-2">
              <Label>Existing API Keys</Label>
              {apiKeysLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : apiKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No API keys found</p>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{key.name}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Created: {formatDate(key.createdAt)}</span>
                          {key.lastUsedAt && (
                            <span>Last used: {formatDate(key.lastUsedAt)}</span>
                          )}
                          {key.revokedAt && (
                            <span className="text-destructive">Revoked: {formatDate(key.revokedAt)}</span>
                          )}
                        </div>
                      </div>
                      {!key.revokedAt && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteApiKey(key.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
