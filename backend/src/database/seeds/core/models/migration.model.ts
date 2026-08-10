export interface MigrationModel {
  name: string;
  sections: MigrationSection[];
}

export interface MigrationSection {
  title: string;
  statements: string[];
}