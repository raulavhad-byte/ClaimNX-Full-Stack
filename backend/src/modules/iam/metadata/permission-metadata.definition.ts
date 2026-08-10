import { Injectable } from '@nestjs/common';
import { MetadataDefinition } from '../../../platform/metadata/interfaces';

@Injectable()
export class PermissionMetadataDefinition implements MetadataDefinition {
  readonly name = 'permissions';

  readonly version = '1.0.0';
}