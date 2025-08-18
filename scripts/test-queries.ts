#!/usr/bin/env tsx
// Script to test various GraphQL queries

const API_URL = 'http://localhost:3000/graphql';

async function graphqlRequest(query: string, variables: any = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (result.errors) {
    console.error('GraphQL Error:', result.errors);
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

async function main() {
  console.log('🔍 Testing GraphQL Queries...\n');

  try {
    // 1. Get all entities with their relationships
    const entitiesQuery = `
      query GetEntitiesWithRelations {
        entities(namespace: "example") {
          id
          entityTypeId
          data
        }
        relations(namespace: "example") {
          id
          relationTypeId
          fromEntityId
          toEntityId
          metadata
        }
      }
    `;

    const entitiesData = await graphqlRequest(entitiesQuery);

    // Parse and display users
    console.log('👤 Users:');
    const users = entitiesData.entities.filter(
      (e: any) => e.data.username !== undefined,
    );
    users.forEach((user: any) => {
      const data = user.data;
      console.log(`  - ${data.fullName} (@${data.username}) - ${data.email}`);
    });

    // Parse and display posts
    console.log('\n📝 Posts:');
    const posts = entitiesData.entities.filter(
      (e: any) => e.data.title !== undefined && e.data.content !== undefined,
    );
    posts.forEach((post: any) => {
      const data = post.data;
      console.log(
        `  - "${data.title}" ${data.published ? '(published)' : '(draft)'}`,
      );
    });

    // Parse and display comments
    console.log('\n💬 Comments:');
    const comments = entitiesData.entities.filter((e: any) => {
      const data = e.data;
      return data.content !== undefined && data.createdAt !== undefined;
    });
    comments.forEach((comment: any) => {
      const data = comment.data;
      console.log(
        `  - "${data.content.substring(0, 50)}${data.content.length > 50 ? '...' : ''}" ${data.edited ? '(edited)' : ''}`,
      );
    });

    // 2. Get relation types
    const relationTypesQuery = `
      query GetRelationTypes {
        relationTypes(namespace: "example") {
          id
          name
          cardinality
          fromEntityTypeId
          toEntityTypeId
        }
      }
    `;

    const relationTypesData = await graphqlRequest(relationTypesQuery);
    console.log('\n🔗 Relation Types:');
    relationTypesData.relationTypes.forEach((rt: any) => {
      console.log(`  - ${rt.name}: ${rt.cardinality}`);
    });

    // 3. Count relations by type
    console.log('\n📊 Relations Summary:');
    const relationsMap = new Map<string, number>();
    entitiesData.relations.forEach((rel: any) => {
      const rtName =
        relationTypesData.relationTypes.find(
          (rt: any) => rt.id === rel.relationTypeId,
        )?.name || 'unknown';
      relationsMap.set(rtName, (relationsMap.get(rtName) || 0) + 1);
    });
    relationsMap.forEach((count, name) => {
      console.log(`  - ${name}: ${count} relation(s)`);
    });

    // 4. Get events summary
    const eventsQuery = `
      query GetEventsSummary {
        events(namespace: "example") {
          eventType
          resourceType
          timestamp
        }
      }
    `;

    const eventsData = await graphqlRequest(eventsQuery);
    const eventCounts = new Map<string, number>();
    eventsData.events.forEach((event: any) => {
      eventCounts.set(
        event.eventType,
        (eventCounts.get(event.eventType) || 0) + 1,
      );
    });

    console.log('\n📝 Event Log Summary:');
    console.log(`  Total events: ${eventsData.events.length}`);
    eventCounts.forEach((count, type) => {
      console.log(`  - ${type}: ${count}`);
    });

    // 5. Test a complex query - find all posts with their authors and comments
    console.log('\n📚 Posts with Authors and Comments:');

    const authorRelations = entitiesData.relations.filter((r: any) => {
      const rt = relationTypesData.relationTypes.find(
        (rt: any) => rt.id === r.relationTypeId,
      );
      return rt?.name === 'author';
    });

    const commentRelations = entitiesData.relations.filter((r: any) => {
      const rt = relationTypesData.relationTypes.find(
        (rt: any) => rt.id === r.relationTypeId,
      );
      return rt?.name === 'comments';
    });

    posts.forEach((post: any) => {
      const postData = post.data;

      // Find author
      const authorRel = authorRelations.find(
        (r: any) => r.toEntityId === post.id,
      );
      const author = authorRel
        ? users.find((u: any) => u.id === authorRel.fromEntityId)
        : null;
      const authorData = author ? author.data : null;

      // Find comments
      const postComments = commentRelations
        .filter((r: any) => r.fromEntityId === post.id)
        .map((r: any) => comments.find((c: any) => c.id === r.toEntityId))
        .filter(Boolean);

      console.log(`\n  📖 "${postData.title}"`);
      console.log(
        `     Author: ${authorData ? authorData.fullName : 'Unknown'}`,
      );
      console.log(`     Comments: ${postComments.length}`);
      if (postComments.length > 0) {
        postComments.forEach((comment: any) => {
          const commentData = comment.data;
          console.log(`       - "${commentData.content.substring(0, 40)}..."`);
        });
      }
    });

    console.log('\n✅ All queries executed successfully!');
    console.log('🎮 Visit http://localhost:3000/graphql to explore more');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
