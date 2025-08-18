#!/usr/bin/env tsx
/**
 * Test script to create an Order entity type with field descriptions
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
  console.log('🚀 Creating Order entity type with descriptions...\n');

  // Define an Order schema with descriptions
  const orderSchema = {
    type: 'object',
    properties: {
      orderNumber: {
        type: 'string',
        description: 'Unique identifier for the order',
        minLength: 8,
        maxLength: 20,
      },
      customerId: {
        type: 'string',
        description: 'Reference to the customer who placed the order',
      },
      items: {
        type: 'array',
        description: 'List of product IDs in this order',
        items: {
          type: 'string',
        },
      },
      totalAmount: {
        type: 'number',
        description: 'Total order amount in USD',
        minimum: 0,
      },
      status: {
        type: 'string',
        description: 'Current status of the order',
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      },
      orderDate: {
        type: 'string',
        description: 'Date when the order was placed',
        format: 'date-time',
      },
      notes: {
        type: 'string',
        description: 'Optional notes or special instructions for the order',
        maxLength: 500,
      },
    },
    required: ['orderNumber', 'customerId', 'items', 'totalAmount', 'status', 'orderDate'],
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
          schemaJson
        }
      }
    `;

    const result = await graphqlRequest(mutation, {
      input: {
        namespace: 'store',
        name: 'Order',
        schema: JSON.stringify(orderSchema),
      },
    });

    const entityType = result.createEntityType;
    
    console.log('✅ Created Order entity type with descriptions!');
    console.log(`   ID: ${entityType.id}`);
    console.log(`   Name: ${entityType.name}`);
    console.log(`   Namespace: ${entityType.namespace}`);
    
    console.log('\n📋 Schema with descriptions:');
    console.log(JSON.stringify(entityType.schemaJson, null, 2));
    
    console.log('\n📝 To register an alias:');
    console.log(`   npm run akashic -- register order ${entityType.id}`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);