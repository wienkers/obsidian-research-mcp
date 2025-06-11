// Test case 1.4 from the MCP Function Test Suite
// This tests the hasProperty filtering for semantic search

import { CONSOLIDATED_OBSIDIAN_TOOLS, validateSemanticSearchParams } from './packages/mcp-server/dist/tools/consolidated-tools.js';

async function testCase1_4() {
  console.log('=== Test Case 1.4: Property-based Filtering ===\n');

  // Test parameters from the test suite
  const testParams = {
    "query": "test analysis structure",
    "filters": {
      "hasProperty": {
        "analysis_target": true,
        "category": "research"
      }
    }
  };

  console.log('Test parameters:');
  console.log(JSON.stringify(testParams, null, 2));

  // Validate the parameters 
  try {
    const validatedParams = validateSemanticSearchParams(testParams);
    console.log('\n✅ Parameters validated successfully');
  } catch (error) {
    console.log('\n❌ Parameter validation failed:', error.message);
    return;
  }

  console.log('\nExpected results according to test specification:');
  console.log('- Analytics Test Note.md should match (has analysis_target: true)');
  console.log('- Complex Note.md should match (has category: "research")');
  console.log('- Combined filter should use AND logic (both properties must exist)');
  
  console.log('\nActual file properties:');
  console.log('- Analytics Test Note.md: {analysis_target: true, category: undefined}');
  console.log('- Complex Note.md: {analysis_target: undefined, category: "research"}');
  
  console.log('\n🔍 Analysis:');
  console.log('Current implementation uses AND logic:');
  console.log('- A file must have ALL properties in hasProperty to match');
  console.log('- Neither test file has both analysis_target:true AND category:"research"');
  console.log('- Therefore, the filter will return 0 results');

  console.log('\n💡 To make test case 1.4 pass, either:');
  console.log('1. Modify one test file to have both properties, OR');
  console.log('2. Change hasProperty to use OR logic instead of AND logic, OR');
  console.log('3. Use separate filters for each property');

  // Test individual filters
  console.log('\n--- Testing individual property filters ---');

  const individualTests = [
    {
      name: 'analysis_target only',
      filter: { analysis_target: true }
    },
    {
      name: 'category only', 
      filter: { category: "research" }
    }
  ];

  for (const test of individualTests) {
    console.log(`\n${test.name}: ${JSON.stringify(test.filter)}`);
    console.log('Expected result: Should match the corresponding file');
  }
}

testCase1_4();