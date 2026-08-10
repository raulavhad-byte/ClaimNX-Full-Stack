export type Uuid = string;

export type ConfigurationValueType = 'BOOLEAN' | 'INTEGER' | 'STRING' | 'ENUM' | 'JSON';
export type ConfigurationStatus = 'ACTIVE' | 'INACTIVE';

export class TenantConfigurationDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantConfigurationDomainError';
  }
}

export interface ConfigurationValidationRule {
  allowedValues?: string[];
  validation?: string;
}

export interface ConfigurationDefinitionProps {
  configurationDefinitionId: Uuid;
  configurationKey: string;
  displayName: string;
  configurationCategory: string;
  valueType: ConfigurationValueType;
  defaultValue?: string | null;
  validationRule?: ConfigurationValidationRule | null;
  overrideAllowed: boolean;
  status: ConfigurationStatus;
  version: number;
  deletedAt?: Date | null;
}

export interface OrganizationConfigurationOverrideProps {
  organizationConfigurationId: Uuid;
  organizationId: Uuid;
  configurationDefinitionId: Uuid;
  configKey: string;
  configValue?: string | null;
  status: ConfigurationStatus;
  version: number;
  deletedAt?: Date | null;
}

export interface EffectiveConfiguration {
  configurationDefinitionId: Uuid;
  configurationKey: string;
  value: string | null;
  source: 'DEFAULT' | 'ORGANIZATION_OVERRIDE';
}

const isActive = (status: ConfigurationStatus, deletedAt?: Date | null): boolean =>
  status === 'ACTIVE' && !deletedAt;

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const allowedValueTypes: readonly ConfigurationValueType[] = [
  'BOOLEAN',
  'INTEGER',
  'STRING',
  'ENUM',
  'JSON',
];

/**
 * Platform-governed definition of a Tenant Configuration key. Definitions do
 * not belong to an Organization; only approved Organization overrides do.
 */
export class ConfigurationDefinition {
  private constructor(private readonly props: ConfigurationDefinitionProps) {
    this.assertValid();
  }

  static create(props: ConfigurationDefinitionProps): ConfigurationDefinition {
    return new ConfigurationDefinition({ ...props });
  }

  static rehydrate(props: ConfigurationDefinitionProps): ConfigurationDefinition {
    return new ConfigurationDefinition({ ...props });
  }

  get id(): Uuid {
    return this.props.configurationDefinitionId;
  }

  get snapshot(): Readonly<ConfigurationDefinitionProps> {
    return {
      ...this.props,
      validationRule: this.props.validationRule
        ? { ...this.props.validationRule, allowedValues: [...(this.props.validationRule.allowedValues ?? [])] }
        : this.props.validationRule,
    };
  }

  isActive(): boolean {
    return isActive(this.props.status, this.props.deletedAt);
  }

  assertOverrideAllowed(): void {
    if (!this.isActive()) {
      throw new TenantConfigurationDomainError('Configuration Definition must be active.');
    }
    if (!this.props.overrideAllowed) {
      throw new TenantConfigurationDomainError('This Configuration Definition cannot be overridden by an Organization.');
    }
  }

  assertValueIsValid(value: string | null | undefined): void {
    if (value === null || value === undefined) return;

    switch (this.props.valueType) {
      case 'BOOLEAN':
        if (value !== 'true' && value !== 'false') {
          throw new TenantConfigurationDomainError('Boolean Configuration values must be true or false.');
        }
        return;
      case 'INTEGER':
        if (!/^-?(0|[1-9]\d*)$/.test(value)) {
          throw new TenantConfigurationDomainError('Integer Configuration values must be whole numbers.');
        }
        return;
      case 'STRING':
        if (!hasText(value)) {
          throw new TenantConfigurationDomainError('String Configuration values cannot be blank.');
        }
        return;
      case 'ENUM': {
        const allowedValues = this.props.validationRule?.allowedValues;
        if (!allowedValues?.includes(value)) {
          throw new TenantConfigurationDomainError('Configuration value is not an approved enum value.');
        }
        return;
      }
      case 'JSON':
        throw new TenantConfigurationDomainError(
          'JSON Configuration values require approved schema validation before they can be written.',
        );
    }
  }

  private assertValid(): void {
    const props = this.props;
    if (!hasText(props.configurationDefinitionId)) {
      throw new TenantConfigurationDomainError('Configuration Definition identifier is required.');
    }
    if (!/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/.test(props.configurationKey)) {
      throw new TenantConfigurationDomainError('Configuration Key must be lowercase dot notation.');
    }
    if (!hasText(props.displayName) || !hasText(props.configurationCategory)) {
      throw new TenantConfigurationDomainError('Configuration Display Name and Category are required.');
    }
    if (!allowedValueTypes.includes(props.valueType)) {
      throw new TenantConfigurationDomainError('Configuration Value Type is not supported.');
    }
    if (props.valueType === 'ENUM' && !props.validationRule?.allowedValues?.length) {
      throw new TenantConfigurationDomainError('Enum Configuration Definitions require approved allowed values.');
    }
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new TenantConfigurationDomainError('Configuration Definition version must be an integer greater than or equal to 1.');
    }
    this.assertValueIsValid(props.defaultValue);
  }
}

/**
 * Organization-owned override. It is valid only for its governing Definition
 * and does not allow the Organization to create arbitrary configuration keys.
 */
export class OrganizationConfigurationOverride {
  private constructor(
    private readonly props: OrganizationConfigurationOverrideProps,
    private readonly definition: ConfigurationDefinition,
  ) {
    this.assertValid();
  }

  static create(
    props: OrganizationConfigurationOverrideProps,
    definition: ConfigurationDefinition,
  ): OrganizationConfigurationOverride {
    return new OrganizationConfigurationOverride({ ...props }, definition);
  }

  static rehydrate(
    props: OrganizationConfigurationOverrideProps,
    definition: ConfigurationDefinition,
  ): OrganizationConfigurationOverride {
    return new OrganizationConfigurationOverride({ ...props }, definition);
  }

  get snapshot(): Readonly<OrganizationConfigurationOverrideProps> {
    return { ...this.props };
  }

  isActive(): boolean {
    return isActive(this.props.status, this.props.deletedAt);
  }

  private assertValid(): void {
    const props = this.props;
    if (!hasText(props.organizationConfigurationId) || !hasText(props.organizationId)) {
      throw new TenantConfigurationDomainError('Organization Configuration and Organization identifiers are required.');
    }
    if (props.configurationDefinitionId !== this.definition.id) {
      throw new TenantConfigurationDomainError('Organization Configuration must reference its governing Configuration Definition.');
    }
    if (props.configKey !== this.definition.snapshot.configurationKey) {
      throw new TenantConfigurationDomainError('Organization Configuration key must mirror its governing Configuration Definition.');
    }
    if (!Number.isInteger(props.version) || props.version < 1) {
      throw new TenantConfigurationDomainError('Organization Configuration version must be an integer greater than or equal to 1.');
    }
    if (this.isActive()) {
      this.definition.assertOverrideAllowed();
      this.definition.assertValueIsValid(props.configValue);
    }
  }
}

export const resolveEffectiveConfiguration = (
  definition: ConfigurationDefinition,
  override?: OrganizationConfigurationOverride | null,
): EffectiveConfiguration => {
  if (!definition.isActive()) {
    throw new TenantConfigurationDomainError('Effective Configuration cannot be resolved from an inactive Definition.');
  }

  if (override?.isActive()) {
    const overrideSnapshot = override.snapshot;
    if (overrideSnapshot.configurationDefinitionId !== definition.id) {
      throw new TenantConfigurationDomainError('Organization Configuration override does not belong to this Definition.');
    }
    return {
      configurationDefinitionId: definition.id,
      configurationKey: definition.snapshot.configurationKey,
      value: overrideSnapshot.configValue ?? null,
      source: 'ORGANIZATION_OVERRIDE',
    };
  }

  return {
    configurationDefinitionId: definition.id,
    configurationKey: definition.snapshot.configurationKey,
    value: definition.snapshot.defaultValue ?? null,
    source: 'DEFAULT',
  };
};
