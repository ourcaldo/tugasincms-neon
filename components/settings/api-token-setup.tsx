'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApiTokenClient } from '@/lib/api-token-client'
import { useToast } from '@/hooks/use-toast'
import { Key, Check, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function ApiTokenSetup() {
  const [token, setToken] = useState('')
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [testing, setTesting] = useState(false)
  const apiClient = useApiTokenClient()
  const { toast } = useToast()

  useEffect(() => {
    // Check if there's already a token
    const existingToken = apiClient.getToken()
    if (existingToken) {
      setToken(existingToken)
      testToken(existingToken)
    }
  }, [])

  const testToken = async (tokenToTest: string) => {
    if (!tokenToTest.trim()) {
      setIsValid(null)
      return
    }

    setTesting(true)
    try {
      // Temporarily set the token to test it
      const originalToken = apiClient.getToken()
      apiClient.setToken(tokenToTest)
      
      // Test the token by making a request to the settings endpoint
      await apiClient.get('/settings')
      setIsValid(true)
      
      // If we get here, the token is valid
      if (originalToken !== tokenToTest) {
        toast({
          title: 'Success',
          description: 'API token is valid and has been saved'
        })
      }
    } catch (error) {
      setIsValid(false)
      // Restore original token if test failed
      const originalToken = apiClient.getToken()
      if (originalToken && originalToken !== tokenToTest) {
        apiClient.setToken(originalToken)
      } else {
        apiClient.clearToken()
      }
      
      toast({
        title: 'Invalid Token',
        description: 'The API token is not valid or has expired',
        variant: 'destructive'
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSaveToken = () => {
    if (!token.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an API token',
        variant: 'destructive'
      })
      return
    }

    testToken(token.trim())
  }

  const handleClearToken = () => {
    setToken('')
    setIsValid(null)
    apiClient.clearToken()
    toast({
      title: 'Token Cleared',
      description: 'API token has been removed'
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          API Token Setup
        </CardTitle>
        <CardDescription>
          Configure your API token to access the v1 API endpoints from the admin interface
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-token">API Token</Label>
          <div className="flex gap-2">
            <Input
              id="api-token"
              type="password"
              placeholder="Enter your API token..."
              value={token}
              onChange={(e) => {
                setToken(e.target.value)
                setIsValid(null)
              }}
              className={
                isValid === true 
                  ? 'border-green-500' 
                  : isValid === false 
                  ? 'border-red-500' 
                  : ''
              }
            />
            <Button 
              onClick={handleSaveToken} 
              disabled={testing || !token.trim()}
              variant={isValid === true ? 'default' : 'outline'}
            >
              {testing ? 'Testing...' : isValid === true ? 'Valid' : 'Test'}
              {isValid === true && <Check className="w-4 h-4 ml-2" />}
            </Button>
          </div>
          
          {isValid === true && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                API token is valid and ready to use.
              </AlertDescription>
            </Alert>
          )}
          
          {isValid === false && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Invalid or expired API token. Please check your token and try again.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="mb-2">To get an API token:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to <strong>Settings → API Tokens</strong></li>
            <li>Click <strong>Generate Token</strong></li>
            <li>Copy the generated token</li>
            <li>Paste it here and click <strong>Test</strong></li>
          </ol>
        </div>

        {isValid === true && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClearToken}>
              Clear Token
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}