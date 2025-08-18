#!/usr/bin/env tsx
/**
 * Test script to create a Product entity type
 */

const API_URL = process.env.AKASHIC_API_URL || 'http://localhost:3000/graphql';

async function graphqlRequest(query: string, variables: any = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

async function main() {
  console.log('🚀 Creating Product entity type...\n');

  // Define a simple Product schema
  const productSchema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
      },
      description: {
        type: 'string',
        maxLength: 1000,
      },
      price: {
        type: 'number',
        minimum: 0,
      },
      inStock: {
        type: 'boolean',
      },
      category: {
        type: 'string',
        enum: ['electronics', 'clothing', 'food', 'books', 'other'],
      },
      tags: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    },
    required: ['name', 'price', 'category'],
    additionalProperties: false,
  };

  try {
    const mutation = `
      mutation CreateEntityType($input: CreateEntityTypeInput!) {
        createEntityType(input: $input) {
          id
          name
          namespace
          version
        }
      }
    `;

    const result = await graphqlRequest(mutation, {
      input: {
        namespace: 'store',
        name: 'Product',
        schema: JSON.stringify(productSchema),
      },
    });

    const entityType = result.createEntityType;
    
    console.log('✅ Created Product entity type!');
    console.log(`   ID: ${entityType.id}`);
    console.log(`   Name: ${entityType.name}`);
    console.log(`   Namespace: ${entityType.namespace}`);
    console.log(`   Version: ${entityType.version}`);
    
    console.log('\n📝 To register an alias for easier access:');
    console.log(`   npm run akashic -- register product ${entityType.id}`);
    
    console.log('\n🎯 Example usage:');
    console.log('   npm run akashic -- create Product name="iPhone 15" price=999 category=electronics');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);