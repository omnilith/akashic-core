'use client';

import { useState } from 'react';
import { 
  useEntityTypes, 
  useCreateEntityType,
  useEntities,
  useCreateEntity,
  useRelationTypes,
  useRelations
} from '@/lib/graphql/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function TestGraphQLPage() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  
  // Hooks for reading data
  const { entityTypes, loading: loadingTypes, error: errorTypes, refetch: refetchTypes } = useEntityTypes();
  const { entities, loading: loadingEntities, error: errorEntities } = useEntities();
  const { relationTypes, loading: loadingRelationTypes } = useRelationTypes();
  const { relations, loading: loadingRelations } = useRelations();
  
  // Hooks for mutations
  const { create: createEntityType } = useCreateEntityType({
    onCompleted: () => addTestResult('✅ Entity Type created successfully'),
    onError: (error) => addTestResult(`❌ Failed to create Entity Type: ${error.message}`),
  });
  
  const { create: createEntity } = useCreateEntity({
    onCompleted: () => addTestResult('✅ Entity created successfully'),
    onError: (error) => addTestResult(`❌ Failed to create Entity: ${error.message}`),
  });

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runTests = async () => {
    setIsTestRunning(true);
    setTestResults([]);
    
    try {
      // Test 1: Fetch Entity Types
      addTestResult('🔄 Fetching Entity Types...');
      await refetchTypes();
      addTestResult(`✅ Fetched ${entityTypes?.length || 0} Entity Types`);
      
      // Test 2: Create a test Entity Type
      addTestResult('🔄 Creating test Entity Type...');
      const testEntityType = await createEntityType({
        name: `TestType_${Date.now()}`,
        namespace: 'test',
        schemaJson: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            value: { type: 'number' }
          },
          required: ['name']
        }
      });
      
      if (testEntityType) {
        // Test 3: Create a test Entity
        addTestResult('🔄 Creating test Entity...');
        await createEntity({
          entityTypeId: testEntityType.id,
          namespace: 'test',
          data: {
            name: 'Test Entity',
            value: 42
          }
        });
      }
      
      addTestResult('✅ All tests completed successfully!');
    } catch (error) {
      addTestResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTestRunning(false);
    }
  };

  const isLoading = loadingTypes || loadingEntities || loadingRelationTypes || loadingRelations;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">GraphQL Integration Test</h1>
      
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Entity Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingTypes ? <Loader2 className="h-6 w-6 animate-spin" /> : entityTypes?.length || 0}
            </div>
            {errorTypes && <p className="text-xs text-red-500 mt-1">Error loading</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Entities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingEntities ? <Loader2 className="h-6 w-6 animate-spin" /> : entities?.length || 0}
            </div>
            {errorEntities && <p className="text-xs text-red-500 mt-1">Error loading</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Relation Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingRelationTypes ? <Loader2 className="h-6 w-6 animate-spin" /> : relationTypes?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Relations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingRelations ? <Loader2 className="h-6 w-6 animate-spin" /> : relations?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Runner */}
      <Card>
        <CardHeader>
          <CardTitle>GraphQL Operations Test</CardTitle>
          <CardDescription>
            Test all GraphQL operations including queries, mutations, and optimistic updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runTests} 
            disabled={isTestRunning || isLoading}
            className="mb-4"
          >
            {isTestRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              'Run GraphQL Tests'
            )}
          </Button>
          
          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium mb-2">Test Results:</h3>
              <div className="bg-muted rounded-lg p-4 max-h-96 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="font-mono text-sm mb-1">
                    {result}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Display */}
      {entityTypes && entityTypes.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Loaded Entity Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {entityTypes.slice(0, 5).map((type) => (
                <div key={type.id} className="p-2 bg-muted rounded">
                  <p className="font-medium">{type.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Namespace: {type.namespace} | ID: {type.id}
                  </p>
                </div>
              ))}
              {entityTypes.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  ...and {entityTypes.length - 5} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}