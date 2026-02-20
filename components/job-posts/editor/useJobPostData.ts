import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from '../../../lib/api-client';
import {
  JobCategory,
  JobTag,
  EmploymentType,
  ExperienceLevel,
  EducationLevel,
  LocationData,
} from './types';

interface UseJobPostDataOptions {
  provinceId: string;
  regencyId: string;
  districtId: string;
}

export function useJobPostData({ provinceId, regencyId, districtId }: UseJobPostDataOptions) {
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
  const [jobTags, setJobTags] = useState<JobTag[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [experienceLevels, setExperienceLevels] = useState<ExperienceLevel[]>([]);
  const [educationLevels, setEducationLevels] = useState<EducationLevel[]>([]);
  const [provinces, setProvinces] = useState<LocationData[]>([]);
  const [regencies, setRegencies] = useState<LocationData[]>([]);
  const [districts, setDistricts] = useState<LocationData[]>([]);
  const [villages, setVillages] = useState<LocationData[]>([]);

  const apiClient = useApiClient();

  const fetchData = useCallback(async <T>(url: string, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
    try {
      const result = await apiClient.get<T[] | { data: T[] }>(url);
      const data = 'data' in result && !Array.isArray(result) ? result.data : result;
      setter(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      setter([]);
    }
  }, [apiClient]);

  // Fetch all reference data on mount
  useEffect(() => {
    const fetchAll = async () => {
      const fetchers = [
        fetchData('/job-categories', setJobCategories),
        fetchData('/job-tags', setJobTags),
        fetchData('/job-data/employment-types', setEmploymentTypes),
        fetchData('/job-data/experience-levels', setExperienceLevels),
        fetchData('/job-data/education-levels', setEducationLevels),
        fetchData('/location/provinces', setProvinces),
      ];
      await Promise.allSettled(fetchers);
    };
    fetchAll();
  }, [fetchData]);

  // Cascading location: province → regencies
  useEffect(() => {
    if (provinceId) {
      fetchData(`/location/regencies/${provinceId}`, setRegencies);
    } else {
      setRegencies([]);
      setDistricts([]);
      setVillages([]);
    }
  }, [provinceId, fetchData]);

  // Cascading location: regency → districts
  useEffect(() => {
    if (regencyId) {
      fetchData(`/location/districts/${regencyId}`, setDistricts);
    } else {
      setDistricts([]);
      setVillages([]);
    }
  }, [regencyId, fetchData]);

  // Cascading location: district → villages
  useEffect(() => {
    if (districtId) {
      fetchData(`/location/villages/${districtId}`, setVillages);
    } else {
      setVillages([]);
    }
  }, [districtId, fetchData]);

  return {
    jobCategories,
    setJobCategories,
    jobTags,
    setJobTags,
    employmentTypes,
    experienceLevels,
    educationLevels,
    provinces,
    regencies,
    districts,
    villages,
  };
}
