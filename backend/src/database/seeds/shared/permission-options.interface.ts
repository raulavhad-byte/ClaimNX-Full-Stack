import { PermissionCategory } from './permission-category.enum';

export interface PermissionOptions {
  module: string;
  subModule: string;
  resource: string;
  code: string;
  name: string;
  description: string;

  category: PermissionCategory;

  displayOrder: number;

  scopeRequired?: boolean;

  isSystem?: boolean;

  isActive?: boolean;
}