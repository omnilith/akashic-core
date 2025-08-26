/**
 * Omnilith Tracker - Quick helper for tracking creative sessions
 */

const fetch = require('node-fetch');

const API_URL = process.env.AKASHIC_API_URL || 'http://localhost:3000/graphql';
const NAMESPACE = 'personal.you';

// Track type ID (created earlier)
const TRACK_TYPE_ID = '6e463bc8-ec40-4b8f-b414-52be8173ef38';

async function graphql(query, variables = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (result.errors) {
    console.error('GraphQL Errors:', result.errors);
    throw new Error(result.errors[0].message);
  }
  return result.data;
}

async function createTrack(data) {
  const query = `
    mutation CreateTrack($namespace: String!, $entityTypeId: String!, $data: JSON!) {
      createEntity(input: { 
        namespace: $namespace, 
        entityTypeId: $entityTypeId, 
        data: $data 
      }) {
        id
        createdAt
      }
    }
  `;

  const result = await graphql(query, {
    namespace: NAMESPACE,
    entityTypeId: TRACK_TYPE_ID,
    data: JSON.stringify(data),
  });

  console.log(`✅ Track created: ${data.title}`);
  console.log(`   ID: ${result.createEntity.id}`);
  return result.createEntity;
}

async function createReleaseSession(data) {
  // Could create a ReleaseSession type and track here
  console.log('📝 Session logged:', data);
}

async function quickLog(title, status = 'unreleased', extras = {}) {
  return await createTrack({
    title,
    status,
    artist: 'Omnilith',
    ...extras,
  });
}

// Export functions for use by other scripts
module.exports = {
  graphql,
  createTrack,
  createReleaseSession,
  quickLog,
};

// CLI usage
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'track') {
    const title = process.argv[3];
    const status = process.argv[4] || 'unreleased';
    quickLog(title, status)
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  } else {
    console.log(`
Omnilith Tracker - Quick creative session logging

Usage:
  node omnilith-tracker.js track "Track Title" [status]

Examples:
  node omnilith-tracker.js track "Chaos Day 1" released
  node omnilith-tracker.js track "Vault Track 2015" unreleased
    `);
  }
}
