import { sql } from '@/lib/database'

export interface LocationHierarchy {
  province_id: string | null
  regency_id: string | null
  district_id: string | null
  village_id: string | null
}

export interface LocationResolutionOptions {
  village_id?: string | null
  district_id?: string | null
  regency_id?: string | null
  province_id?: string | null
}

export async function resolveLocationHierarchy(
  options: LocationResolutionOptions
): Promise<LocationHierarchy> {
  const { village_id, district_id, regency_id, province_id } = options

  let canonicalProvinceId: string | null = null
  let canonicalRegencyId: string | null = null
  let canonicalDistrictId: string | null = null
  let canonicalVillageId: string | null = null

  try {
    if (village_id) {
      const villageResult = await sql`
        SELECT v.id, v.district_id, d.regency_id, r.province_id
        FROM reg_villages v
        LEFT JOIN reg_districts d ON v.district_id = d.id
        LEFT JOIN reg_regencies r ON d.regency_id = r.id
        WHERE v.id = ${village_id}
      `
      
      if (!villageResult || villageResult.length === 0) {
        throw new Error(`Village with ID ${village_id} not found`)
      }
      
      canonicalVillageId = villageResult[0].id
      canonicalDistrictId = villageResult[0].district_id
      canonicalRegencyId = villageResult[0].regency_id
      canonicalProvinceId = villageResult[0].province_id
      
      // Validate user-provided parent IDs match canonical hierarchy
      if (district_id && district_id !== canonicalDistrictId) {
        throw new Error(
          `District ID mismatch: village ${village_id} belongs to district ${canonicalDistrictId}, but you provided ${district_id}`
        )
      }
      if (regency_id && regency_id !== canonicalRegencyId) {
        throw new Error(
          `Regency ID mismatch: village ${village_id} belongs to regency ${canonicalRegencyId}, but you provided ${regency_id}`
        )
      }
      if (province_id && province_id !== canonicalProvinceId) {
        throw new Error(
          `Province ID mismatch: village ${village_id} belongs to province ${canonicalProvinceId}, but you provided ${province_id}`
        )
      }
    } else if (district_id && !village_id) {
      const districtResult = await sql`
        SELECT d.id, d.regency_id, r.province_id
        FROM reg_districts d
        LEFT JOIN reg_regencies r ON d.regency_id = r.id
        WHERE d.id = ${district_id}
      `
      
      if (!districtResult || districtResult.length === 0) {
        throw new Error(`District with ID ${district_id} not found`)
      }
      
      canonicalDistrictId = districtResult[0].id
      canonicalRegencyId = districtResult[0].regency_id
      canonicalProvinceId = districtResult[0].province_id
      
      // Validate user-provided parent IDs match canonical hierarchy
      if (regency_id && regency_id !== canonicalRegencyId) {
        throw new Error(
          `Regency ID mismatch: district ${district_id} belongs to regency ${canonicalRegencyId}, but you provided ${regency_id}`
        )
      }
      if (province_id && province_id !== canonicalProvinceId) {
        throw new Error(
          `Province ID mismatch: district ${district_id} belongs to province ${canonicalProvinceId}, but you provided ${province_id}`
        )
      }
    } else if (regency_id && !district_id && !village_id) {
      const regencyResult = await sql`
        SELECT id, province_id FROM reg_regencies WHERE id = ${regency_id}
      `
      
      if (!regencyResult || regencyResult.length === 0) {
        throw new Error(`Regency with ID ${regency_id} not found`)
      }
      
      canonicalRegencyId = regencyResult[0].id
      canonicalProvinceId = regencyResult[0].province_id
      
      // Validate user-provided parent ID matches canonical hierarchy
      if (province_id && province_id !== canonicalProvinceId) {
        throw new Error(
          `Province ID mismatch: regency ${regency_id} belongs to province ${canonicalProvinceId}, but you provided ${province_id}`
        )
      }
    } else if (province_id && !regency_id && !district_id && !village_id) {
      const provinceResult = await sql`
        SELECT id FROM reg_provinces WHERE id = ${province_id}
      `
      
      if (!provinceResult || provinceResult.length === 0) {
        throw new Error(`Province with ID ${province_id} not found`)
      }
      
      canonicalProvinceId = provinceResult[0].id
    }

    return {
      province_id: canonicalProvinceId,
      regency_id: canonicalRegencyId,
      district_id: canonicalDistrictId,
      village_id: canonicalVillageId,
    }
  } catch (error) {
    throw error
  }
}

export async function findProvinceByNameOrId(input: string): Promise<string | null> {
  if (!input || input.trim() === '') return null;
  
  const trimmed = input.trim();
  
  if (trimmed.length === 2 && /^\d+$/.test(trimmed)) {
    const result = await sql`SELECT id FROM reg_provinces WHERE id = ${trimmed} LIMIT 1`;
    if (!result || result.length === 0) {
      throw new Error(`Province with ID "${input}" not found`);
    }
    return result[0].id;
  }
  
  const result = await sql`
    SELECT id FROM reg_provinces 
    WHERE UPPER(name) = UPPER(${trimmed})
    LIMIT 1
  `;
  
  if (!result || result.length === 0) {
    throw new Error(`Province "${input}" not found. Please use a valid 2-digit ID or province name`);
  }
  return result[0].id;
}

export async function findRegencyByNameOrId(input: string, provinceIdOrName?: string): Promise<string | null> {
  if (!input || input.trim() === '') return null;
  
  const trimmed = input.trim();
  
  if (trimmed.length === 4 && /^\d+$/.test(trimmed)) {
    const result = await sql`SELECT id FROM reg_regencies WHERE id = ${trimmed} LIMIT 1`;
    if (!result || result.length === 0) {
      throw new Error(`Regency with ID "${input}" not found`);
    }
    return result[0].id;
  }
  
  let provinceId: string | null = null;
  if (provinceIdOrName) {
    provinceId = await findProvinceByNameOrId(provinceIdOrName);
  }
  
  const exactMatch = provinceId
    ? await sql`
        SELECT id FROM reg_regencies 
        WHERE UPPER(name) = UPPER(${trimmed}) AND province_id = ${provinceId}
      `
    : await sql`
        SELECT id FROM reg_regencies 
        WHERE UPPER(name) = UPPER(${trimmed})
      `;
  
  if (exactMatch && exactMatch.length === 1) {
    return exactMatch[0].id;
  }
  
  if (exactMatch && exactMatch.length > 1 && !provinceId) {
    throw new Error(`Multiple regencies found with name "${input}". Please provide job_province_id to disambiguate`);
  }
  
  const partialMatch = provinceId
    ? await sql`
        SELECT id, name FROM reg_regencies 
        WHERE UPPER(name) LIKE UPPER(${`%${trimmed}%`}) AND province_id = ${provinceId}
      `
    : await sql`
        SELECT id, name FROM reg_regencies 
        WHERE UPPER(name) LIKE UPPER(${`%${trimmed}%`})
      `;
  
  if (!partialMatch || partialMatch.length === 0) {
    const hint = provinceId ? ` in province "${provinceIdOrName}"` : '';
    throw new Error(`Regency "${input}"${hint} not found. Please use a valid 4-digit ID or regency name (accepts partial match)`);
  }
  
  if (partialMatch.length > 1 && !provinceId) {
    const kotaMatches = partialMatch.filter(match => 
      match.name.toUpperCase().startsWith('KOTA ')
    );
    
    if (kotaMatches.length === 1) {
      return kotaMatches[0].id;
    }
    
    if (kotaMatches.length === 0) {
      const kabMatches = partialMatch.filter(match => 
        match.name.toUpperCase().startsWith('KAB.') || 
        match.name.toUpperCase().startsWith('KABUPATEN ')
      );
      
      if (kabMatches.length === 1) {
        return kabMatches[0].id;
      }
    }
    
    throw new Error(`Multiple regencies found matching "${input}". Please provide job_province_id to disambiguate`);
  }
  
  return partialMatch[0].id;
}

export async function findDistrictByNameOrId(input: string, regencyIdOrName?: string, provinceIdOrName?: string): Promise<string | null> {
  if (!input || input.trim() === '') return null;
  
  const trimmed = input.trim();
  
  if (trimmed.length === 6 && /^\d+$/.test(trimmed)) {
    const result = await sql`SELECT id FROM reg_districts WHERE id = ${trimmed} LIMIT 1`;
    if (!result || result.length === 0) {
      throw new Error(`District with ID "${input}" not found`);
    }
    return result[0].id;
  }
  
  let regencyId: string | null = null;
  if (regencyIdOrName) {
    regencyId = await findRegencyByNameOrId(regencyIdOrName, provinceIdOrName);
  }
  
  const exactMatch = regencyId
    ? await sql`
        SELECT id FROM reg_districts 
        WHERE UPPER(name) = UPPER(${trimmed}) AND regency_id = ${regencyId}
      `
    : await sql`
        SELECT id FROM reg_districts 
        WHERE UPPER(name) = UPPER(${trimmed})
      `;
  
  if (exactMatch && exactMatch.length === 1) {
    return exactMatch[0].id;
  }
  
  if (exactMatch && exactMatch.length > 1 && !regencyId) {
    throw new Error(`Multiple districts found with name "${input}". Please provide job_regency_id to disambiguate`);
  }
  
  const partialMatch = regencyId
    ? await sql`
        SELECT id, name FROM reg_districts 
        WHERE UPPER(name) LIKE UPPER(${`%${trimmed}%`}) AND regency_id = ${regencyId}
      `
    : await sql`
        SELECT id, name FROM reg_districts 
        WHERE UPPER(name) LIKE UPPER(${`%${trimmed}%`})
      `;
  
  if (!partialMatch || partialMatch.length === 0) {
    const hint = regencyId ? ` in regency "${regencyIdOrName}"` : '';
    throw new Error(`District "${input}"${hint} not found. Please use a valid 6-digit ID or district name (accepts partial match)`);
  }
  
  if (partialMatch.length > 1 && !regencyId) {
    throw new Error(`Multiple districts found matching "${input}". Please provide job_regency_id to disambiguate`);
  }
  
  return partialMatch[0].id;
}

export async function findVillageByNameOrId(input: string, districtIdOrName?: string, regencyIdOrName?: string, provinceIdOrName?: string): Promise<string | null> {
  if (!input || input.trim() === '') return null;
  
  const trimmed = input.trim();
  
  if (trimmed.length === 10 && /^\d+$/.test(trimmed)) {
    const result = await sql`SELECT id FROM reg_villages WHERE id = ${trimmed} LIMIT 1`;
    if (!result || result.length === 0) {
      throw new Error(`Village with ID "${input}" not found`);
    }
    return result[0].id;
  }
  
  let districtId: string | null = null;
  if (districtIdOrName) {
    districtId = await findDistrictByNameOrId(districtIdOrName, regencyIdOrName, provinceIdOrName);
  }
  
  const exactMatch = districtId
    ? await sql`
        SELECT id FROM reg_villages 
        WHERE UPPER(name) = UPPER(${trimmed}) AND district_id = ${districtId}
      `
    : await sql`
        SELECT id FROM reg_villages 
        WHERE UPPER(name) = UPPER(${trimmed})
      `;
  
  if (exactMatch && exactMatch.length === 1) {
    return exactMatch[0].id;
  }
  
  if (exactMatch && exactMatch.length > 1 && !districtId) {
    throw new Error(`Multiple villages found with name "${input}". Please provide job_district_id to disambiguate`);
  }
  
  const partialMatch = districtId
    ? await sql`
        SELECT id, name FROM reg_villages 
        WHERE UPPER(name) LIKE UPPER(${`%${trimmed}%`}) AND district_id = ${districtId}
      `
    : await sql`
        SELECT id, name FROM reg_villages 
        WHERE UPPER(name) LIKE UPPER(${`%${trimmed}%`})
      `;
  
  if (!partialMatch || partialMatch.length === 0) {
    const hint = districtId ? ` in district "${districtIdOrName}"` : '';
    throw new Error(`Village "${input}"${hint} not found. Please use a valid 10-digit ID or village name (accepts partial match)`);
  }
  
  if (partialMatch.length > 1 && !districtId) {
    throw new Error(`Multiple villages found matching "${input}". Please provide job_district_id to disambiguate`);
  }
  
  return partialMatch[0].id;
}
