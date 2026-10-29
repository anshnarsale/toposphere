import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  SimulationMode,
  SimulationStatus,
  PacketEvent,
  AnimatedPacket,
} from '@/types/simulation';

interface SimulationStoreState {
  mode: SimulationMode;
  status: SimulationStatus;
  speed: number;
  simTime: number;
  events: PacketEvent[];
  animatedPackets: AnimatedPacket[];
  selectedEventId: string | null;

  // Actions
  setMode: (mode: SimulationMode) => void;
  setStatus: (status: SimulationStatus) => void;
  setSpeed: (speed: number) => void;
  setEvents: (events: PacketEvent[]) => void;
  addEvent: (event: PacketEvent) => void;
  clearEvents: () => void;
  setAnimatedPackets: (packets: AnimatedPacket[]) => void;
  addAnimatedPacket: (packet: AnimatedPacket) => void;
  removeAnimatedPacket: (id: string) => void;
  setSelectedEventId: (id: string | null) => void;
  advanceSimTime: (deltaMs: number) => void;
  resetSimulation: () => void;
}

export const useSimulationStore = create<SimulationStoreState>()(
  immer((set) => ({
    mode: 'design',
    status: 'idle',
    speed: 1,
    simTime: 0,
    events: [],
    animatedPackets: [],
    selectedEventId: null,

    setMode: (mode) =>
      set((state) => {
        state.mode = mode;
      }),

    setStatus: (status) =>
      set((state) => {
        state.status = status;
      }),

    setSpeed: (speed) =>
      set((state) => {
        state.speed = speed;
      }),

    setEvents: (events) =>
      set((state) => {
        state.events = events;
      }),

    addEvent: (event) =>
      set((state) => {
        state.events.push(event);
      }),

    clearEvents: () =>
      set((state) => {
        state.events = [];
        state.animatedPackets = [];
        state.simTime = 0;
        state.selectedEventId = null;
      }),

    setAnimatedPackets: (packets) =>
      set((state) => {
        state.animatedPackets = packets;
      }),

    addAnimatedPacket: (packet) =>
      set((state) => {
        state.animatedPackets.push(packet);
      }),

    removeAnimatedPacket: (id) =>
      set((state) => {
        state.animatedPackets = state.animatedPackets.filter((p) => p.id !== id);
      }),

    setSelectedEventId: (id) =>
      set((state) => {
        state.selectedEventId = id;
      }),

    advanceSimTime: (deltaMs) =>
      set((state) => {
        state.simTime += deltaMs;
      }),

    resetSimulation: () =>
      set((state) => {
        state.status = 'idle';
        state.simTime = 0;
        state.events = [];
        state.animatedPackets = [];
        state.selectedEventId = null;
      }),
  }))
);
