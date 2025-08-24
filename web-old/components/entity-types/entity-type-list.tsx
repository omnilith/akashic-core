'use client';

import { useState, useMemo } from 'react';
import { Search, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EntityType {
  id: string;
  name: string;
  namespace: string;
  schemaJson: any;
  entityCount?: number;
  createdAt: string;
  updatedAt?: string;
}

interface EntityTypeListProps {
  entityTypes: EntityType[];
  loading?: boolean;
  onView?: (entityType: EntityType) => void;
  onEdit?: (entityType: EntityType) => void;
  onDelete?: (entityType: EntityType) => void;
}

export function EntityTypeList({
  entityTypes,
  loading,
  onView,
  onEdit,
  onDelete,
}: EntityTypeListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [namespaceFilter, setNamespaceFilter] = useState<string>('all');

  // Get unique namespaces
  const namespaces = useMemo(() => {
    const uniqueNamespaces = new Set(entityTypes.map((et) => et.namespace));
    return Array.from(uniqueNamespaces).sort();
  }, [entityTypes]);

  // Filter entity types
  const filteredEntityTypes = useMemo(() => {
    let filtered = entityTypes;

    // Filter by namespace
    if (namespaceFilter !== 'all') {
      filtered = filtered.filter((et) => et.namespace === namespaceFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (et) =>
          et.name.toLowerCase().includes(term) ||
          et.namespace.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [entityTypes, searchTerm, namespaceFilter]);

  // Get namespace color
  const getNamespaceColor = (namespace: string) => {
    const colors: Record<string, string> = {
      global: 'bg-blue-100 text-blue-800',
      system: 'bg-purple-100 text-purple-800',
      test: 'bg-yellow-100 text-yellow-800',
      work: 'bg-green-100 text-green-800',
    };
    
    const prefix = namespace.split('.')[0];
    return colors[prefix] || 'bg-gray-100 text-gray-800';
  };

  // Count required fields in schema
  const getRequiredFieldsCount = (schemaJson: any) => {
    try {
      const required = schemaJson?.required || [];
      return required.length;
    } catch {
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading entity types...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search entity types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={namespaceFilter} onValueChange={setNamespaceFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by namespace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All namespaces</SelectItem>
            {namespaces.map((ns) => (
              <SelectItem key={ns} value={ns}>
                {ns}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entity Types Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Namespace</TableHead>
              <TableHead>Required Fields</TableHead>
              <TableHead>Entity Count</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntityTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-muted-foreground">
                    {searchTerm || namespaceFilter !== 'all'
                      ? 'No entity types found matching your filters.'
                      : 'No entity types found. Create your first entity type to get started.'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredEntityTypes.map((entityType) => (
                <TableRow key={entityType.id}>
                  <TableCell className="font-medium">
                    {entityType.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={getNamespaceColor(entityType.namespace)}
                    >
                      {entityType.namespace}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getRequiredFieldsCount(entityType.schemaJson)}
                  </TableCell>
                  <TableCell>{entityType.entityCount || 0}</TableCell>
                  <TableCell>
                    {entityType.updatedAt ? new Date(entityType.updatedAt).toLocaleDateString() : new Date(entityType.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView?.(entityType)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(entityType)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete?.(entityType)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary Stats */}
      {filteredEntityTypes.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredEntityTypes.length} of {entityTypes.length} entity types
        </div>
      )}
    </div>
  );
}