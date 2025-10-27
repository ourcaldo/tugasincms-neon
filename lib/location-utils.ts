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
