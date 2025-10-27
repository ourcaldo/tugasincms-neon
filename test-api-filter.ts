// Test file to debug job posts filtering
// This file will be deleted after debugging

async function testJobPostsFilter() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('base.tugasin.me', '283fba58-f4f1-44d3-b969-42e7241f416c-00-fgysbngzghzu.janeway.replit.dev') || 'http://localhost:5000';
  const token = 'cms_4iL1SEEXB7oQoiYDEfNJBTpeHeFVLP3k';

  console.log('Testing Job Posts API Filters\n');
  console.log('=====================================\n');

  // Test 1: Get all job posts (no filter)
  console.log('Test 1: Get all job posts (no filter)');
  const response1 = await fetch(`${baseUrl}/api/v1/job-posts`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data1 = await response1.json();
  console.log('Total posts:', data1.data?.pagination?.total);
  console.log('Posts returned:', data1.data?.posts?.length);
  if (data1.data?.posts?.[0]) {
    console.log('First post salary:', {
      min: data1.data.posts[0].job_salary_min,
      max: data1.data.posts[0].job_salary_max,
      minType: typeof data1.data.posts[0].job_salary_min,
      maxType: typeof data1.data.posts[0].job_salary_max
    });
  }
  console.log('\n');

  // Test 2: Filter with salary_min=1000000 (should NOT return job with min salary 5000000)
  console.log('Test 2: Filter with job_salary_min=1000000');
  const response2 = await fetch(`${baseUrl}/api/v1/job-posts?job_salary_min=1000000`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data2 = await response2.json();
  console.log('Total posts:', data2.data?.pagination?.total);
  console.log('Posts returned:', data2.data?.posts?.length);
  console.log('Filter applied:', data2.data?.filters?.job_salary_min);
  console.log('\n');

  // Test 3: Filter with salary_min=6000000 (should NOT return job with max salary 8000000 since min is 5M)
  console.log('Test 3: Filter with job_salary_min=6000000');
  const response3 = await fetch(`${baseUrl}/api/v1/job-posts?job_salary_min=6000000`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data3 = await response3.json();
  console.log('Total posts:', data3.data?.pagination?.total);
  console.log('Posts returned:', data3.data?.posts?.length);
  console.log('Filter applied:', data3.data?.filters?.job_salary_min);
  console.log('\n');

  // Test 4: Filter with salary_min=10000000 (should return empty since job max is 8M)
  console.log('Test 4: Filter with job_salary_min=10000000');
  const response4 = await fetch(`${baseUrl}/api/v1/job-posts?job_salary_min=10000000`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data4 = await response4.json();
  console.log('Total posts:', data4.data?.pagination?.total);
  console.log('Posts returned:', data4.data?.posts?.length);
  console.log('Filter applied:', data4.data?.filters?.job_salary_min);
  console.log('\n');

  console.log('=====================================\n');
  console.log('Expected behavior:');
  console.log('- job_salary_min=X should return jobs where job_salary_min >= X');
  console.log('- job_salary_max=X should return jobs where job_salary_max <= X');
  console.log('\n');
  console.log('Current behavior (from code):');
  console.log('- job_salary_min=X returns jobs where job_salary_max >= X (WRONG!)');
  console.log('- job_salary_max=X returns jobs where job_salary_min <= X (WRONG!)');
}

testJobPostsFilter().catch(console.error);
