// Debug script to test environment variables
console.log('=== Environment Variable Debug ===');
console.log('VITE_CONGRESS_API_KEY:', import.meta.env.VITE_CONGRESS_API_KEY);
console.log('Length:', import.meta.env.VITE_CONGRESS_API_KEY?.length || 0);
console.log('Has key:', import.meta.env.VITE_CONGRESS_API_KEY?.length > 0);

// Test the API client
import { realCongressAPI } from './utils/realCongressApi';
console.log('API Client has key:', realCongressAPI.hasAPIKey());
console.log('Year range:', realCongressAPI.getYearRange());
console.log('Cache stats:', realCongressAPI.getCacheStats());

// Test a simple API call
realCongressAPI.getCurrentMembers('house')
  .then(members => {
    console.log('✅ API SUCCESS! Loaded', members.length, 'members');
    console.log('First member:', members[0]);
  })
  .catch(error => {
    console.error('❌ API FAILED:', error.message);
  });
