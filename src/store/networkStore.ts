import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  NetworkTopology,
  Device,
  DeviceType,
  DeviceVendor,
  Interface,
  Link,
  StaticRoute,
  Vlan,
  AdminState,
  InterfaceMode,
  FirewallPolicyRule,
} from '@/types/network';
import { NetworkModel } from '@/engine/core/NetworkModel';

interface NetworkStoreState {
  topology: NetworkTopology;
  model: NetworkModel;

  // Actions
  addDevice: (type: DeviceType, hostname?: string, vendor?: DeviceVendor, customModel?: string) => Device;
  removeDevice: (deviceId: string) => void;
  addLink: (srcDevId: string, srcIfId: string, dstDevId: string, dstIfId: string) => Link | null;
  removeLink: (linkId: string) => void;
  updateInterface: (deviceId: string, ifId: string, patch: Partial<Interface>) => Interface | null;
  setInterfaceAdminState: (deviceId: string, ifId: string, state: AdminState) => void;
  addStaticRoute: (deviceId: string, route: Omit<StaticRoute, 'id'>) => StaticRoute | null;
  removeStaticRoute: (deviceId: string, routeId: string) => void;
  updateHostname: (deviceId: string, hostname: string) => void;
  addVlan: (deviceId: string, vlan: Vlan) => void;
  removeVlan: (deviceId: string, vlanId: number) => void;
  setSwitchportMode: (deviceId: string, ifId: string, mode: InterfaceMode) => void;
  setAccessVlan: (deviceId: string, ifId: string, vlanId: number) => void;
  setTrunkAllowedVlans: (deviceId: string, ifId: string, vlans: number[]) => void;
  addFirewallPolicy: (deviceId: string, rule: Omit<FirewallPolicyRule, 'id'>) => FirewallPolicyRule | null;
  updateFirewallPolicy: (deviceId: string, ruleId: string, patch: Partial<FirewallPolicyRule>) => void;
  deleteFirewallPolicy: (deviceId: string, ruleId: string) => void;
  loadTopology: (topology: NetworkTopology) => void;
  clearTopology: () => void;
  rebuildRoutingTable: (deviceId: string) => void;
}

const initialModel = new NetworkModel();

export const useNetworkStore = create<NetworkStoreState>()(
  immer((set, get) => {
    // Sync model events to Zustand state
    initialModel.on('topology-changed', (newTopo) => {
      set((state) => {
        state.topology = JSON.parse(JSON.stringify(newTopo));
      });
    });

    return {
      topology: initialModel.getTopology(),
      model: initialModel,

      addDevice: (type, hostname, vendor, customModel) => {
        const dev = get().model.addDevice(type, hostname, vendor, customModel);
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
        return dev;
      },

      removeDevice: (deviceId) => {
        get().model.removeDevice(deviceId);
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
      },

      addLink: (srcDevId, srcIfId, dstDevId, dstIfId) => {
        const link = get().model.addLink(srcDevId, srcIfId, dstDevId, dstIfId);
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
        return link;
      },

      removeLink: (linkId) => {
        get().model.removeLink(linkId);
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
      },

      updateInterface: (deviceId, ifId, patch) => {
        const iface = get().model.updateInterface(deviceId, ifId, patch);
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
        return iface;
      },

      setInterfaceAdminState: (deviceId, ifId, state) => {
        get().model.setInterfaceAdminState(deviceId, ifId, state);
        set((s) => {
          s.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
      },

      addStaticRoute: (deviceId, route) => {
        const sr = get().model.addStaticRoute(deviceId, route);
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
        return sr;
      },

      removeStaticRoute: (deviceId, routeId) => {
        get().model.removeStaticRoute(deviceId, routeId);
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
      },

      updateHostname: (deviceId, hostname) => {
        get().model.updateHostname(deviceId, hostname);
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
      },

      addVlan: (deviceId, vlan) => {
        get().model.addVlan(deviceId, vlan);
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
      },

      removeVlan: (deviceId, vlanId) => {
        get().model.removeVlan(deviceId, vlanId);
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
      },

      setSwitchportMode: (deviceId, ifId, mode) => {
        get().model.updateInterface(deviceId, ifId, { vlanMode: mode });
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
      },

      setAccessVlan: (deviceId, ifId, vlanId) => {
        get().model.updateInterface(deviceId, ifId, { accessVlan: vlanId });
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
      },

      setTrunkAllowedVlans: (deviceId, ifId, vlans) => {
        get().model.updateInterface(deviceId, ifId, { trunkAllowedVlans: vlans });
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
      },

      addFirewallPolicy: (deviceId, rule) => {
        const res = get().model.addFirewallPolicy(deviceId, rule);
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
        return res;
      },

      updateFirewallPolicy: (deviceId, ruleId, patch) => {
        get().model.updateFirewallPolicy(deviceId, ruleId, patch);
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
      },

      deleteFirewallPolicy: (deviceId, ruleId) => {
        get().model.deleteFirewallPolicy(deviceId, ruleId);
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
      },

      loadTopology: (topology) => {
        get().model.setTopology(topology);
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(topology));
        });
      },

      clearTopology: () => {
        const empty = { devices: {}, links: {} };
        get().model.setTopology(empty);
        set((state) => {
          state.topology = empty;
        });
      },

      rebuildRoutingTable: (deviceId) => {
        get().model.rebuildRoutingTable(deviceId);
        set((state) => {
          state.topology = JSON.parse(JSON.stringify(get().model.getTopology()));
        });
      },
    };
  })
);

