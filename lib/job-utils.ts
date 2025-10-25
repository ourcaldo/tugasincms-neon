import { sql } from './database';

export function toTitleCase(str: string): string {
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function createSlug(str: string): string {
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function findOrCreateJobCategory(
  name: string
): Promise<{ id: string; name: string; slug: string }> {
  const normalizedName = toTitleCase(name);
  const slug = createSlug(name);

  const existing = await sql`
    SELECT id, name, slug 
    FROM job_categories 
    WHERE LOWER(name) = LOWER(${normalizedName})
  `;

  if (existing && existing.length > 0) {
    return {
      id: existing[0].id,
      name: existing[0].name,
      slug: existing[0].slug,
    };
  }

  const newCategory = await sql`
    INSERT INTO job_categories (name, slug)
    VALUES (${normalizedName}, ${slug})
    RETURNING id, name, slug
  `;

  return {
    id: newCategory[0].id,
    name: newCategory[0].name,
    slug: newCategory[0].slug,
  };
}

export async function findOrCreateJobTag(
  name: string
): Promise<{ id: string; name: string; slug: string }> {
  const normalizedName = toTitleCase(name);
  const slug = createSlug(name);

  const existing = await sql`
    SELECT id, name, slug 
    FROM job_tags 
    WHERE LOWER(name) = LOWER(${normalizedName})
  `;

  if (existing && existing.length > 0) {
    return {
      id: existing[0].id,
      name: existing[0].name,
      slug: existing[0].slug,
    };
  }

  const newTag = await sql`
    INSERT INTO job_tags (name, slug)
    VALUES (${normalizedName}, ${slug})
    RETURNING id, name, slug
  `;

  return {
    id: newTag[0].id,
    name: newTag[0].name,
    slug: newTag[0].slug,
  };
}

export function parseCommaSeparated(input: string | string[]): string[] {
  if (Array.isArray(input)) {
    return input.map(item => item.trim()).filter(item => item.length > 0);
  }
  
  if (typeof input === 'string') {
    return input
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }
  
  return [];
}

export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export async function processJobCategoriesInput(
  input: string | string[] | undefined
): Promise<string[]> {
  if (!input) return [];
  
  const values = parseCommaSeparated(input);
  const categoryIds: string[] = [];
  
  for (const value of values) {
    if (isUUID(value)) {
      categoryIds.push(value);
    } else {
      const category = await findOrCreateJobCategory(value);
      categoryIds.push(category.id);
    }
  }
  
  return categoryIds;
}

export async function processJobTagsInput(
  input: string | string[] | undefined
): Promise<string[]> {
  if (!input) return [];
  
  const values = parseCommaSeparated(input);
  const tagIds: string[] = [];
  
  for (const value of values) {
    if (isUUID(value)) {
      tagIds.push(value);
    } else {
      const tag = await findOrCreateJobTag(value);
      tagIds.push(tag.id);
    }
  }
  
  return tagIds;
}

export function processJobSkillsInput(
  input: string | string[] | undefined
): string[] {
  if (!input) return [];
  
  const values = parseCommaSeparated(input);
  return values.map(skill => toTitleCase(skill));
}
