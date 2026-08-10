export type WorkflowUuid = string;

export class WorkflowDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowDomainError';
  }
}

export interface WorkflowState {
  workflowStateId: WorkflowUuid;
  workflowDefinitionId: WorkflowUuid;
  code: string;
  name: string;
  isInitial: boolean;
  isTerminal: boolean;
  version: number;
  deletedAt?: Date | null;
}

export interface WorkflowTransition {
  workflowTransitionId: WorkflowUuid;
  workflowDefinitionId: WorkflowUuid;
  fromStateId: WorkflowUuid;
  toStateId: WorkflowUuid;
  version: number;
  deletedAt?: Date | null;
}

export interface WorkflowDefinitionProps {
  workflowDefinitionId: WorkflowUuid;
  code: string;
  name: string;
  definitionVersion: number;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  version: number;
  deletedAt?: Date | null;
}

const active = (deletedAt?: Date | null): boolean => !deletedAt;
const normalized = (value: string): string => value.trim().toLocaleLowerCase();

/** Platform-governed aggregate that owns its State and Transition graph. */
export class WorkflowDefinition {
  private readonly states: WorkflowState[];
  private readonly transitions: WorkflowTransition[];

  private constructor(
    private readonly props: WorkflowDefinitionProps,
    states: WorkflowState[] = [],
    transitions: WorkflowTransition[] = [],
  ) {
    this.assertRootIsValid();
    this.states = states.map((state) => ({ ...state }));
    this.transitions = transitions.map((transition) => ({ ...transition }));
    this.assertGraphIsValid();
  }

  static create(props: WorkflowDefinitionProps): WorkflowDefinition {
    return new WorkflowDefinition(props);
  }

  static rehydrate(
    props: WorkflowDefinitionProps,
    states: WorkflowState[],
    transitions: WorkflowTransition[],
  ): WorkflowDefinition {
    return new WorkflowDefinition(props, states, transitions);
  }

  get id(): WorkflowUuid {
    return this.props.workflowDefinitionId;
  }

  get snapshot(): Readonly<WorkflowDefinitionProps> {
    return { ...this.props };
  }

  get workflowStates(): readonly WorkflowState[] {
    return this.states.map((state) => ({ ...state }));
  }

  get workflowTransitions(): readonly WorkflowTransition[] {
    return this.transitions.map((transition) => ({ ...transition }));
  }

  addState(state: WorkflowState): void {
    this.assertOwnedState(state);
    if (
      this.states.some((item) => item.workflowStateId === state.workflowStateId)
    ) {
      throw new WorkflowDomainError(
        'Workflow State already exists in this Definition.',
      );
    }
    if (
      active(state.deletedAt) &&
      this.states.some(
        (item) =>
          active(item.deletedAt) &&
          normalized(item.code) === normalized(state.code),
      )
    ) {
      throw new WorkflowDomainError(
        'An active Workflow State code must be unique within its Definition.',
      );
    }
    if (
      active(state.deletedAt) &&
      state.isInitial &&
      this.states.some((item) => active(item.deletedAt) && item.isInitial)
    ) {
      throw new WorkflowDomainError(
        'Only one active initial Workflow State may exist in a Definition.',
      );
    }
    this.states.push({ ...state });
  }

  addTransition(transition: WorkflowTransition): void {
    this.assertOwnedTransition(transition);
    if (transition.fromStateId === transition.toStateId) {
      throw new WorkflowDomainError(
        'A Workflow Transition cannot use the same source and target State.',
      );
    }
    if (
      this.transitions.some(
        (item) => item.workflowTransitionId === transition.workflowTransitionId,
      )
    ) {
      throw new WorkflowDomainError(
        'Workflow Transition already exists in this Definition.',
      );
    }
    const activeStates = new Set(
      this.states
        .filter((item) => active(item.deletedAt))
        .map((item) => item.workflowStateId),
    );
    if (
      !activeStates.has(transition.fromStateId) ||
      !activeStates.has(transition.toStateId)
    ) {
      throw new WorkflowDomainError(
        'A Workflow Transition must reference active States owned by the same Definition.',
      );
    }
    if (
      active(transition.deletedAt) &&
      this.transitions.some(
        (item) =>
          active(item.deletedAt) &&
          item.fromStateId === transition.fromStateId &&
          item.toStateId === transition.toStateId,
      )
    ) {
      throw new WorkflowDomainError(
        'An active Workflow Transition path must be unique within its Definition.',
      );
    }
    this.transitions.push({ ...transition });
  }

  assertCanStartInstances(): void {
    if (this.props.status !== 'ACTIVE' || this.props.deletedAt) {
      throw new WorkflowDomainError(
        'Only an active Workflow Definition can start new Instances.',
      );
    }
    if (
      !this.states.some((state) => active(state.deletedAt) && state.isInitial)
    ) {
      throw new WorkflowDomainError(
        'An active Workflow Definition requires exactly one active initial State.',
      );
    }
  }

  assertTransitionAllowed(
    fromStateId: WorkflowUuid,
    toStateId: WorkflowUuid,
  ): void {
    if (
      !this.transitions.some(
        (transition) =>
          active(transition.deletedAt) &&
          transition.fromStateId === fromStateId &&
          transition.toStateId === toStateId,
      )
    ) {
      throw new WorkflowDomainError(
        'The requested Workflow State transition is not approved by this Definition.',
      );
    }
  }

  private assertRootIsValid(): void {
    if (
      !this.props.workflowDefinitionId ||
      !this.props.code.trim() ||
      !this.props.name.trim()
    ) {
      throw new WorkflowDomainError(
        'Workflow Definition identifier, code, and name are required.',
      );
    }
    if (
      !Number.isInteger(this.props.definitionVersion) ||
      this.props.definitionVersion < 1 ||
      !Number.isInteger(this.props.version) ||
      this.props.version < 1
    ) {
      throw new WorkflowDomainError(
        'Workflow Definition versions must be integers greater than or equal to 1.',
      );
    }
  }

  private assertGraphIsValid(): void {
    this.states.forEach((state) => this.assertOwnedState(state));
    this.transitions.forEach((transition) =>
      this.assertOwnedTransition(transition),
    );
    const initialCount = this.states.filter(
      (state) => active(state.deletedAt) && state.isInitial,
    ).length;
    if (initialCount > 1)
      throw new WorkflowDomainError(
        'Only one active initial Workflow State may exist in a Definition.',
      );
    this.transitions
      .filter((transition) => active(transition.deletedAt))
      .forEach((transition) => this.addTransitionValidationOnly(transition));
  }

  private addTransitionValidationOnly(transition: WorkflowTransition): void {
    if (transition.fromStateId === transition.toStateId)
      throw new WorkflowDomainError(
        'A Workflow Transition cannot use the same source and target State.',
      );
    const activeStates = new Set(
      this.states
        .filter((state) => active(state.deletedAt))
        .map((state) => state.workflowStateId),
    );
    if (
      !activeStates.has(transition.fromStateId) ||
      !activeStates.has(transition.toStateId)
    )
      throw new WorkflowDomainError(
        'A Workflow Transition must reference active States owned by the same Definition.',
      );
  }

  private assertOwnedState(state: WorkflowState): void {
    if (state.workflowDefinitionId !== this.id)
      throw new WorkflowDomainError(
        'Workflow State cannot be reassigned to another Definition.',
      );
  }

  private assertOwnedTransition(transition: WorkflowTransition): void {
    if (transition.workflowDefinitionId !== this.id)
      throw new WorkflowDomainError(
        'Workflow Transition cannot be reassigned to another Definition.',
      );
  }
}
