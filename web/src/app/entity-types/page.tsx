'use client';

import { GET_ENTITY_TYPES, type EntityType } from '@/lib/queries/entity-types';
import { useQuery } from '@apollo/client/react';
import styles from './page.module.css';

export default function EntityTypesPage() {
  const { data, error } = useQuery<{ entityTypes: EntityType[] }>(
    GET_ENTITY_TYPES,
  );

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>
          <p className={styles.errorTitle}>Error loading entity types:</p>
          <p className={styles.errorMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  const entityTypes = data?.entityTypes || [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Entity Types</h1>
        <p className={styles.subtitle}>
          Manage your ontology definitions and schemas
        </p>
        <p className={styles.count}>
          [{entityTypes.length}] entity types found
        </p>
      </div>

      {entityTypes.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No entity types found</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {entityTypes.map((type: EntityType) => (
            <div key={type.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{type.name}</h3>
                  <div className={styles.cardMeta}>
                    <span>{type.namespace}</span>
                    <span>v{type.version}</span>
                  </div>
                  {type.description && (
                    <p className={styles.cardDescription}>{type.description}</p>
                  )}
                </div>
                <div className={styles.cardId}>
                  {type.id.substring(0, 8)}...
                </div>
              </div>

              {type.schemaJson?.properties && (
                <div className={styles.fieldsSection}>
                  <p className={styles.fieldsTitle}>
                    Fields [{Object.keys(type.schemaJson.properties).length}]
                  </p>
                  <div className={styles.fieldsList}>
                    {Object.keys(type.schemaJson.properties)
                      .slice(0, 5)
                      .map((field) => (
                        <span key={field} className={styles.fieldTag}>
                          {field}
                        </span>
                      ))}
                    {Object.keys(type.schemaJson.properties).length > 5 && (
                      <span className={styles.moreFields}>
                        +{Object.keys(type.schemaJson.properties).length - 5}{' '}
                        more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
