import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ProjectSnapshot, ProjectMeta, NodePosition } from '@/types/project';
import { PROJECT_SCHEMA_VERSION } from '@/types/project';
import { generateId } from '@/lib/utils';
import { useNetworkStore } from './networkStore';

const STORAGE_PREFIX = 'nexalab_project_';
const LAST_PROJECT_KEY = 'nexalab_last_project_id';

interface ProjectStoreState {
  currentProject: ProjectMeta;
  layout: Record<string, NodePosition>;
  saveStatus: 'saved' | 'unsaved' | 'saving' | 'error';
  history: ProjectSnapshot[];
  historyIndex: number;

  // Actions
  setNodePosition: (deviceId: string, pos: NodePosition) => void;
  updateProjectMeta: (patch: Partial<ProjectMeta>) => void;
  markUnsaved: () => void;
  pushHistorySnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  newProject: (name?: string) => void;
  saveProject: () => boolean;
  loadProject: (id: string) => boolean;
  exportProjectJson: () => string;
  importProjectJson: (jsonStr: string) => { success: boolean; error?: string };
  loadSnapshot: (snapshot: ProjectSnapshot) => void;
  listSavedProjects: () => ProjectMeta[];
}

const initialProjectId = generateId('proj');

export const useProjectStore = create<ProjectStoreState>()(
  immer((set, get) => ({
    currentProject: {
      id: initialProjectId,
      name: 'Default Topology',
      description: 'TopoSphere virtual network simulation project',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: 'Network Engineer',
    },
    layout: {},
    saveStatus: 'saved',
    history: [],
    historyIndex: -1,

    setNodePosition: (deviceId, pos) =>
      set((state) => {
        state.layout[deviceId] = pos;
        state.saveStatus = 'unsaved';
      }),

    updateProjectMeta: (patch) =>
      set((state) => {
        Object.assign(state.currentProject, patch);
        state.currentProject.updatedAt = Date.now();
        state.saveStatus = 'unsaved';
      }),

    markUnsaved: () =>
      set((state) => {
        state.saveStatus = 'unsaved';
      }),

    pushHistorySnapshot: () => {
      const topo = useNetworkStore.getState().topology;
      const layout = get().layout;
      const meta = get().currentProject;

      const snapshot: ProjectSnapshot = {
        version: PROJECT_SCHEMA_VERSION,
        id: meta.id,
        name: meta.name,
        description: meta.description,
        createdAt: meta.createdAt,
        updatedAt: Date.now(),
        author: meta.author,
        devices: JSON.parse(JSON.stringify(topo.devices)),
        links: JSON.parse(JSON.stringify(topo.links)),
        layout: JSON.parse(JSON.stringify(layout)),
      };

      set((state) => {
        // Discard forward redo history if we are in the middle
        const newHist = state.history.slice(0, state.historyIndex + 1);
        newHist.push(snapshot);
        // Retain max 40 snapshots
        if (newHist.length > 40) newHist.shift();
        state.history = newHist;
        state.historyIndex = newHist.length - 1;
      });
    },

    undo: () => {
      const idx = get().historyIndex;
      if (idx > 0) {
        const targetSnapshot = get().history[idx - 1];
        get().loadSnapshot(targetSnapshot);
        set((state) => {
          state.historyIndex = idx - 1;
        });
      }
    },

    redo: () => {
      const idx = get().historyIndex;
      if (idx < get().history.length - 1) {
        const targetSnapshot = get().history[idx + 1];
        get().loadSnapshot(targetSnapshot);
        set((state) => {
          state.historyIndex = idx + 1;
        });
      }
    },

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    newProject: (name = 'New Network Lab') => {
      const id = generateId('proj');
      useNetworkStore.getState().clearTopology();
      set((state) => {
        state.currentProject = {
          id,
          name,
          description: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          author: 'Network Engineer',
        };
        state.layout = {};
        state.history = [];
        state.historyIndex = -1;
        state.saveStatus = 'saved';
      });
      get().pushHistorySnapshot();
    },

    saveProject: () => {
      try {
        const topo = useNetworkStore.getState().topology;
        const meta = get().currentProject;
        const layout = get().layout;

        const snapshot: ProjectSnapshot = {
          version: PROJECT_SCHEMA_VERSION,
          id: meta.id,
          name: meta.name,
          description: meta.description,
          createdAt: meta.createdAt,
          updatedAt: Date.now(),
          author: meta.author,
          devices: topo.devices,
          links: topo.links,
          layout,
        };

        localStorage.setItem(`${STORAGE_PREFIX}${meta.id}`, JSON.stringify(snapshot));
        localStorage.setItem(LAST_PROJECT_KEY, meta.id);

        set((state) => {
          state.saveStatus = 'saved';
          state.currentProject.updatedAt = Date.now();
        });
        return true;
      } catch (err) {
        console.error('Failed to save project:', err);
        set((state) => {
          state.saveStatus = 'error';
        });
        return false;
      }
    },

    loadProject: (id: string) => {
      try {
        const dataStr = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
        if (!dataStr) return false;
        const snapshot = JSON.parse(dataStr) as ProjectSnapshot;
        get().loadSnapshot(snapshot);
        return true;
      } catch (err) {
        console.error('Failed to load project:', err);
        return false;
      }
    },

    exportProjectJson: () => {
      const topo = useNetworkStore.getState().topology;
      const meta = get().currentProject;
      const layout = get().layout;

      const snapshot: ProjectSnapshot = {
        version: PROJECT_SCHEMA_VERSION,
        id: meta.id,
        name: meta.name,
        description: meta.description,
        createdAt: meta.createdAt,
        updatedAt: Date.now(),
        author: meta.author,
        devices: topo.devices,
        links: topo.links,
        layout,
      };

      return JSON.stringify(snapshot, null, 2);
    },

    importProjectJson: (jsonStr: string) => {
      try {
        const snapshot = JSON.parse(jsonStr) as ProjectSnapshot;
        if (!snapshot.devices || !snapshot.links) {
          return { success: false, error: 'Invalid project format: missing devices or links' };
        }
        get().loadSnapshot(snapshot);
        return { success: true };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },

    loadSnapshot: (snapshot: ProjectSnapshot) => {
      useNetworkStore.getState().loadTopology({
        devices: snapshot.devices,
        links: snapshot.links,
      });

      set((state) => {
        state.currentProject = {
          id: snapshot.id,
          name: snapshot.name,
          description: snapshot.description || '',
          createdAt: snapshot.createdAt || Date.now(),
          updatedAt: snapshot.updatedAt || Date.now(),
          author: snapshot.author || 'Network Engineer',
          labId: snapshot.labId,
        };
        state.layout = snapshot.layout || {};
        state.saveStatus = 'saved';
      });
    },

    listSavedProjects: () => {
      const list: ProjectMeta[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            list.push({
              id: data.id,
              name: data.name,
              description: data.description,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              author: data.author,
              labId: data.labId,
            });
          } catch {
            // Ignore malformed localStorage items
          }
        }
      }
      return list;
    },
  }))
);

