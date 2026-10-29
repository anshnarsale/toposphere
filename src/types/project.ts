import type { Device, Link } from './network';

export const PROJECT_SCHEMA_VERSION = '1.0.0';

export interface NodePosition {
  x: number;
  y: number;
}

export interface ProjectDevice {
  deviceId: string;
  position: NodePosition;
  label?: string;
  color?: string;
  group?: string;
}

export interface LabObjective {
  id: string;
  description: string;
  completed: boolean;
  validator: string; // JSON-serialized validator spec
}

export interface LabDefinition {
  id: string;
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  description: string;
  objectives: LabObjective[];
  instructions: string[];
  hints: string[];
  starterTopology?: ProjectSnapshot;
  tags: string[];
}

export interface ProjectSnapshot {
  version: string;
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  author: string;
  devices: Record<string, Device>;
  links: Record<string, Link>;
  layout: Record<string, NodePosition>;
  labId?: string;
}

export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  author: string;
  labId?: string;
}
