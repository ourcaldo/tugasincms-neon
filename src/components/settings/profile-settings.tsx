import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { User, Upload, Save } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  bio?: string;
}

export function ProfileSettings() {
  const [profile, setProfile] = useState<ProfileData>({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    avatar: 'https://github.com/shadcn.png',
    bio: 'Content creator and developer passionate about technology and writing.',
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const handleProfileChange = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: keyof typeof passwords, value: string) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real implementation, this would upload to Appwrite
      const mockUrl = URL.createObjectURL(file);
      setProfile(prev => ({ ...prev, avatar: mockUrl }));
      toast.success('Avatar uploaded successfully');
    }
  };

  const handleProfileSave = () => {
    // In a real implementation, this would save to the database
    toast.success('Profile updated successfully');
  };

  const handlePasswordSave = () => {
    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwords.new.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    // In a real implementation, this would update the password
    toast.success('Password updated successfully');
    setPasswords({ current: '', new: '', confirm: '' });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1>Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal information and account settings
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.avatar} />
              <AvatarFallback>
                <User className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Change Avatar
                  </span>
                </Button>
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <p className="text-sm text-muted-foreground mt-1">
                JPG, PNG or GIF. Max size 2MB.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={profile.firstName}
                onChange={(e) => handleProfileChange('firstName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={profile.lastName}
                onChange={(e) => handleProfileChange('lastName', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) => handleProfileChange('email', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Input
              id="bio"
              value={profile.bio}
              onChange={(e) => handleProfileChange('bio', e.target.value)}
              placeholder="Tell us about yourself..."
            />
          </div>

          <Button onClick={handleProfileSave} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwords.current}
              onChange={(e) => handlePasswordChange('current', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwords.new}
              onChange={(e) => handlePasswordChange('new', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwords.confirm}
              onChange={(e) => handlePasswordChange('confirm', e.target.value)}
            />
          </div>

          <Button onClick={handlePasswordSave} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Account Created</p>
              <p className="text-sm text-muted-foreground">January 1, 2024</p>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Last Login</p>
              <p className="text-sm text-muted-foreground">2 hours ago</p>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">Not enabled</p>
            </div>
            <Button variant="outline" size="sm">
              Enable 2FA
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}