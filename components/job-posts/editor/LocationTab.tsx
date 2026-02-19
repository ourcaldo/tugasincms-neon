import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import { MapPin } from 'lucide-react';
import { JobFormData, LocationData } from './types';

interface LocationTabProps {
  formData: JobFormData;
  handleJobChange: (field: string, value: JobFormData['job'][keyof JobFormData['job']]) => void;
  provinces: LocationData[];
  regencies: LocationData[];
  districts: LocationData[];
  villages: LocationData[];
}

export function LocationTab({
  formData,
  handleJobChange,
  provinces,
  regencies,
  districts,
  villages,
}: LocationTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Location Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="province">Province</Label>
            <Select
              value={formData.job.provinceId}
              onValueChange={(value) => {
                handleJobChange('provinceId', value);
                handleJobChange('regencyId', '');
                handleJobChange('districtId', '');
                handleJobChange('villageId', '');
              }}
            >
              <SelectTrigger id="province">
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map(province => (
                  <SelectItem key={province.id} value={province.id}>
                    {province.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="regency">Regency/City</Label>
            <Select
              value={formData.job.regencyId}
              onValueChange={(value) => {
                handleJobChange('regencyId', value);
                handleJobChange('districtId', '');
                handleJobChange('villageId', '');
              }}
              disabled={!formData.job.provinceId}
            >
              <SelectTrigger id="regency">
                <SelectValue placeholder="Select regency" />
              </SelectTrigger>
              <SelectContent>
                {regencies.map(regency => (
                  <SelectItem key={regency.id} value={regency.id}>
                    {regency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="district">District</Label>
            <Select
              value={formData.job.districtId}
              onValueChange={(value) => {
                handleJobChange('districtId', value);
                handleJobChange('villageId', '');
              }}
              disabled={!formData.job.regencyId}
            >
              <SelectTrigger id="district">
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                {districts.map(district => (
                  <SelectItem key={district.id} value={district.id}>
                    {district.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="village">Village</Label>
            <Select
              value={formData.job.villageId}
              onValueChange={(value) => handleJobChange('villageId', value)}
              disabled={!formData.job.districtId}
            >
              <SelectTrigger id="village">
                <SelectValue placeholder="Select village" />
              </SelectTrigger>
              <SelectContent>
                {villages.map(village => (
                  <SelectItem key={village.id} value={village.id}>
                    {village.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="addressDetail">Address Detail</Label>
          <Textarea
            id="addressDetail"
            value={formData.job.addressDetail}
            onChange={(e) => handleJobChange('addressDetail', e.target.value)}
            placeholder="Street address, building name, floor, etc."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remote"
              checked={formData.job.isRemote}
              onCheckedChange={(checked) => handleJobChange('isRemote', checked)}
            />
            <Label htmlFor="remote" className="cursor-pointer">
              Remote work available
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hybrid"
              checked={formData.job.isHybrid}
              onCheckedChange={(checked) => handleJobChange('isHybrid', checked)}
            />
            <Label htmlFor="hybrid" className="cursor-pointer">
              Hybrid work model
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
