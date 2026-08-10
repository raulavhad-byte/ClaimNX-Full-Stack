import { Injectable, OnModuleInit } from '@nestjs/common';
import { MetadataDefinition } from '../interfaces';
import { PermissionMetadataDefinition } from '../../../modules/iam/metadata';

@Injectable()
export class MetadataRegistryService implements OnModuleInit {
  private readonly metadata = new Map<string, MetadataDefinition>();

  constructor(
    private readonly permissionMetadata: PermissionMetadataDefinition,
  ) {}

  onModuleInit(): void {
    this.register(this.permissionMetadata);
  }

  register(definition: MetadataDefinition): void {
    this.metadata.set(definition.name, definition);
  }

  get(name: string): MetadataDefinition | undefined {
    return this.metadata.get(name);
  }

  getAll(): MetadataDefinition[] {
    return [...this.metadata.values()];
  }

  has(name: string): boolean {
    return this.metadata.has(name);
  }
}