import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Plus, Copy, MoreHorizontal, Trash, Key, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { APIToken } from '../../types';
import { toast } from 'sonner';
import { useApiClient } from '../../lib/api-client';

interface ApiTokenResponse {
  id: string;
  token: string;
  name: string;
  user_id: string;
  created_at: string;
  last_used_at?: string | null;
  expires_at?: string | null;
}

const mapApiTokenToClient = (apiToken: ApiTokenResponse): APIToken => ({
  id: apiToken.id,
  token: apiToken.token,
  name: apiToken.name,
  userId: apiToken.user_id,
  createdAt: new Date(apiToken.created_at),
  lastUsed: apiToken.last_used_at ? new Date(apiToken.last_used_at) : undefined,
  expiresAt: apiToken.expires_at ? new Date(apiToken.expires_at) : undefined,
});

export function ApiTokens() {
  const [tokens, setTokens] = useState<APIToken[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const apiClient = useApiClient();
  const { user } = useUser();

  useEffect(() => {
    if (user?.id) {
      fetchTokens();
    }
  }, [user?.id]);

  const fetchTokens = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const response = await apiClient.get<{ success: boolean; data: ApiTokenResponse[] }>(`/settings/tokens/${user.id}`);
      const tokensData = response.data || [];
      setTokens(tokensData.map(mapApiTokenToClient));
    } catch (error) {
      console.error('Error fetching tokens:', error);
      toast.error('Failed to load tokens');
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async () => {
    if (!newTokenName.trim()) {
      toast.error('Token name is required');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post<{ success: boolean; data: ApiTokenResponse }>('/settings/tokens', {
        name: newTokenName.trim(),
        userId: user.id,
      });

      const tokenData = response.data;
      const newToken = mapApiTokenToClient(tokenData);
      setTokens(prev => [...prev, newToken]);
      setGeneratedToken(newToken.token);
      setNewTokenName('');
      toast.success('API token generated successfully');
    } catch (error) {
      console.error('Error generating token:', error);
      toast.error('Failed to generate token');
    } finally {
      setLoading(false);
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success('Token copied to clipboard');
  };

  const deleteToken = async (tokenId: string) => {
    try {
      setLoading(true);
      await apiClient.delete(`/settings/tokens/${tokenId}`);
      setTokens(prev => prev.filter(token => token.id !== tokenId));
      toast.success('Token deleted successfully');
    } catch (error) {
      console.error('Error deleting token:', error);
      toast.error('Failed to delete token');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDialogClose = () => {
    setIsCreateDialogOpen(false);
    setNewTokenName('');
    setGeneratedToken(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>API Tokens</h1>
          <p className="text-muted-foreground">
            Manage API tokens for accessing your content programmatically
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Generate Token
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate New API Token</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!generatedToken ? (
                <>
                  <div>
                    <Label htmlFor="tokenName">Token Name</Label>
                    <Input
                      id="tokenName"
                      placeholder="e.g., Production API, Mobile App"
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={generateToken} className="flex-1" disabled={loading}>
                      {loading ? 'Generating...' : 'Generate Token'}
                    </Button>
                    <Button variant="outline" onClick={handleCreateDialogClose} disabled={loading}>
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      Your new API token:
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-background rounded border">
                      <code className="flex-1 text-sm font-mono">{generatedToken}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToken(generatedToken)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-amber-600 mt-2">
                      ⚠️ Save this token now. You won't be able to see it again.
                    </p>
                  </div>
                  <Button onClick={handleCreateDialogClose} className="w-full">
                    Done
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            API Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Authentication</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Include your API token in the Authorization header:
            </p>
            <div className="bg-muted p-3 rounded-lg">
              <code className="text-sm">
                Authorization: Bearer YOUR_TOKEN_HERE
              </code>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Get All Posts</h4>
              <div className="bg-muted p-2 rounded text-xs">
                <code>GET /api/posts</code>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">Publish Post</h4>
              <div className="bg-muted p-2 rounded text-xs">
                <code>POST /api/posts</code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tokens List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Tokens</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell>
                    <div className="font-medium">{token.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {token.token.substring(0, 12)}...
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToken(token.token)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    {token.lastUsed ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {format(token.lastUsed, 'MMM dd, yyyy')}
                      </div>
                    ) : (
                      <Badge variant="secondary">Never used</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {format(token.createdAt, 'MMM dd, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => copyToken(token.token)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Token
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteToken(token.id)}
                          className="text-destructive"
                        >
                          <Trash className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {tokens.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">No API tokens yet</p>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Your First Token
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}