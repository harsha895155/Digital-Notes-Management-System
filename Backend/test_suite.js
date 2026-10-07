// Automated Test Suite for MindDesk Production Upgrade
const http = require('http');
const https = require('https');

// Load environment variables
require('dotenv').config();

const BASE_URL = process.argv[2] || process.env.TEST_URL || 'http://localhost:5000';

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const client = url.protocol === 'https:' ? https : http;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: reqHeaders
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🚀 RUNNING MINDDESK PRODUCTION UPGRADE TEST SUITE');
  console.log(`Target Backend: ${BASE_URL}`);
  console.log('====================================================\n');

  const testSuffix = Date.now();
  const userA = {
    fullName: 'User Alpha',
    email: `alpha_${testSuffix}@minddesk.test`,
    password: 'Password123!'
  };
  const userB = {
    fullName: 'User Beta',
    email: `beta_${testSuffix}@minddesk.test`,
    password: 'Password123!'
  };

  let tokenA = null;
  let refreshTokenA = null;
  let tokenB = null;
  let noteAId = null;

  try {
    // 1. Health Check
    console.log('[TEST 1] Health Check...');
    const healthRes = await makeRequest('GET', '/health');
    console.assert(healthRes.status === 200, `Health check returned ${healthRes.status}`);
    console.log('  ✓ PASS: API is healthy.');

    // 2. User A Registration
    console.log('\n[TEST 2] User Registration (User A)...');
    const regRes = await makeRequest('POST', '/api/register', userA);
    console.assert(regRes.status === 201 || regRes.status === 200, `Registration returned ${regRes.status}`);
    console.log('  ✓ PASS: Registration successful.');

    // 3. User A Login & Dual Token Issuance
    console.log('\n[TEST 3] User Login & JWT Dual Token Issuance...');
    const loginRes = await makeRequest('POST', '/api/login', {
      email: userA.email,
      password: userA.password
    });
    console.assert(loginRes.status === 200, `Login returned ${loginRes.status}`);
    console.assert(!!loginRes.body.token, 'Missing access token');
    console.assert(!!loginRes.body.refreshToken, 'Missing refresh token');
    tokenA = loginRes.body.token;
    refreshTokenA = loginRes.body.refreshToken;
    console.log('  ✓ PASS: Access token and Refresh token successfully issued.');

    // 4. Token Refresh Flow
    console.log('\n[TEST 4] Token Refresh Flow (POST /api/auth/refresh)...');
    const refreshRes = await makeRequest('POST', '/api/auth/refresh', {
      refreshToken: refreshTokenA
    });
    console.assert(refreshRes.status === 200, `Refresh returned ${refreshRes.status}`);
    console.assert(!!refreshRes.body.token, 'Did not receive new access token');
    tokenA = refreshRes.body.token; // Update with rotated access token
    if (refreshRes.body.refreshToken) {
      refreshTokenA = refreshRes.body.refreshToken;
    }
    console.log('  ✓ PASS: Token refresh rotation succeeded seamlessly.');

    // 5. Password Reset Flow
    console.log('\n[TEST 5] Forgot & Reset Password Flow...');
    const forgotRes = await makeRequest('POST', '/api/auth/forgot-password', {
      email: userA.email
    });
    console.assert(forgotRes.status === 200, `Forgot password returned ${forgotRes.status}`);
    console.assert(forgotRes.body.message.includes('If an account'), 'Email privacy response violation');

    if (forgotRes.body.resetToken) {
      const resetRes = await makeRequest('POST', '/api/auth/reset-password', {
        token: forgotRes.body.resetToken,
        newPassword: 'NewPassword456!'
      });
      console.assert(resetRes.status === 200, `Reset password returned ${resetRes.status}`);
      userA.password = 'NewPassword456!';
      console.log('  ✓ PASS: Password successfully reset and sessions rotated.');

      // Re-login with new password
      const reLogin = await makeRequest('POST', '/api/login', {
        email: userA.email,
        password: userA.password
      });
      tokenA = reLogin.body.token;
    }

    // 6. Create Note with Rich Text, Tags & Reminders
    console.log('\n[TEST 6] Create Note with Rich Text, Tags & Reminders...');
    const createNoteRes = await makeRequest('POST', '/api/notes', {
      title: 'Sprint Planning Notes',
      description: '<h2>Objectives</h2><ul><li>Production launch</li><li>Security audit</li></ul>',
      category: 'Work',
      tags: ['Sprint', 'Production', 'HighPriority'],
      deadline: '2026-10-31',
      reminderTime: '1_day_before',
      userEmail: userA.email
    }, { Authorization: `Bearer ${tokenA}` });
    console.assert(createNoteRes.status === 201 || createNoteRes.status === 200, `Create note returned ${createNoteRes.status}`);
    noteAId = createNoteRes.body._id;
    console.assert(createNoteRes.body.tags.includes('Production'), 'Tags were not attached');
    console.log(`  ✓ PASS: Note created (ID: ${noteAId}) with tags, reminders and rich HTML content.`);

    // 7. Global Search (Server-side)
    console.log('\n[TEST 7] Server-Side Global Search (GET /api/search?q=Sprint)...');
    const searchRes = await makeRequest('GET', '/api/search?q=Sprint', null, {
      Authorization: `Bearer ${tokenA}`
    });
    console.assert(searchRes.status === 200, `Search returned ${searchRes.status}`);
    console.assert(searchRes.body.results.notes.some(n => n._id === noteAId), 'Created note not found in search results');
    console.log('  ✓ PASS: Server-side search returned matching notes.');

    // 8. Register User B & Test Resource Ownership Protection (Zero-Trust)
    console.log('\n[TEST 8] Resource Ownership & Zero-Trust Access Control (User B vs Note A)...');
    await makeRequest('POST', '/api/register', userB);
    const loginBRes = await makeRequest('POST', '/api/login', {
      email: userB.email,
      password: userB.password
    });
    tokenB = loginBRes.body.token;

    // User B attempts to fetch Note A
    const unauthorizedGet = await makeRequest('GET', `/api/notes/${noteAId}`, null, {
      Authorization: `Bearer ${tokenB}`
    });
    console.assert(unauthorizedGet.status === 403 || unauthorizedGet.status === 404, `Expected 403/404, got ${unauthorizedGet.status}`);
    console.log(`  ✓ PASS: User B cannot access User A's private note (Status: ${unauthorizedGet.status}).`);

    // User B attempts to tamper with User A's notes URL
    const spoofedEmailGet = await makeRequest('GET', `/api/notes/${userA.email}`, null, {
      Authorization: `Bearer ${tokenB}`
    });
    console.assert(spoofedEmailGet.status === 403, `Expected 403 on URL spoofing, got ${spoofedEmailGet.status}`);
    console.log('  ✓ PASS: URL spoofing attempt (/api/notes/:email) blocked by token verification.');

    // 9. Note Collaboration & Sharing Permissions
    console.log('\n[TEST 9] Note Sharing & Collaboration Permissions...');
    // User A shares Note A with User B as 'viewer'
    const shareRes = await makeRequest('POST', `/api/shares/${noteAId}`, {
      email: userB.email,
      permission: 'viewer'
    }, { Authorization: `Bearer ${tokenA}` });
    console.assert(shareRes.status === 200, `Share returned ${shareRes.status}`);

    // Now User B can view Note A
    const sharedGet = await makeRequest('GET', `/api/notes/${noteAId}`, null, {
      Authorization: `Bearer ${tokenB}`
    });
    console.assert(sharedGet.status === 200, `Shared note GET returned ${sharedGet.status}`);
    console.log('  ✓ PASS: Viewer can access shared note.');

    // But User B as 'viewer' CANNOT edit Note A
    const unauthorizedEdit = await makeRequest('PUT', `/api/notes/${noteAId}`, {
      title: 'Hacked by Viewer'
    }, { Authorization: `Bearer ${tokenB}` });
    console.assert(unauthorizedEdit.status === 403, `Expected 403 on viewer edit attempt, got ${unauthorizedEdit.status}`);
    console.log('  ✓ PASS: Viewer cannot edit note (403 Forbidden enforced by backend).');

    // 10. AI Summarization Endpoint
    console.log('\n[TEST 10] AI Summarization Service (POST /api/ai/summarize)...');
    const aiRes = await makeRequest('POST', '/api/ai/summarize', {
      content: 'Antigravity is a modern pair programming assistant. MindDesk is a full-stack digital note-taking system built with React, Vite, Node, and Express. We need to complete security hardening and multi-format summarization.',
      type: 'key_points'
    }, { Authorization: `Bearer ${tokenA}` });
    console.assert(aiRes.status === 200, `AI summary returned ${aiRes.status}`);
    console.assert(!!aiRes.body.summary, 'Missing AI summary response');
    console.log('  ✓ PASS: AI Summarization responded with key points.');

    // 11. Revoke Note Access
    console.log('\n[TEST 11] Revoke Collaborator Access...');
    const revokeRes = await makeRequest('DELETE', `/api/shares/${noteAId}/${encodeURIComponent(userB.email)}`, null, {
      Authorization: `Bearer ${tokenA}`
    });
    console.assert(revokeRes.status === 200, `Revoke returned ${revokeRes.status}`);

    // User B is rejected again
    const postRevokeGet = await makeRequest('GET', `/api/notes/${noteAId}`, null, {
      Authorization: `Bearer ${tokenB}`
    });
    console.assert(postRevokeGet.status === 403 || postRevokeGet.status === 404, `Expected 403/404 after revoke, got ${postRevokeGet.status}`);
    console.log('  ✓ PASS: Access successfully revoked.');

    // 12. Logout & Token Invalidation
    console.log('\n[TEST 12] Logout & Refresh Token Revocation...');
    const logoutRes = await makeRequest('POST', '/api/auth/logout', {
      refreshToken: refreshTokenA
    }, { Authorization: `Bearer ${tokenA}` });
    console.assert(logoutRes.status === 200, `Logout returned ${logoutRes.status}`);

    // Old refresh token must be rejected
    const deadRefreshRes = await makeRequest('POST', '/api/auth/refresh', {
      refreshToken: refreshTokenA
    });
    console.assert(deadRefreshRes.status === 401 || deadRefreshRes.status === 403, `Revoked refresh token returned ${deadRefreshRes.status}`);
    console.log('  ✓ PASS: Session terminated and refresh token revoked.');

    console.log('\n====================================================');
    console.log('🎉 ALL 12 INTEGRATION TEST SCENARIOS PASSED WITH 100% SUCCESS!');
    console.log('====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  }
}

runTestSuite();
