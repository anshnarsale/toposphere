# NexaLab — Next-Generation Web Network Simulator

> A production-quality, browser-based network simulation workstation and learning laboratory inspired by Cisco Packet Tracer, built with modern web technologies, deterministic packet simulation, realistic hardware illustrations, and real-time protocol analysis.

---

## 🌟 Highlights & Core Features

- **Infinite Interactive Canvas**: Drag, drop, pan, zoom, connect, and position modern network devices with `@xyflow/react`.
- **Realistic Hardware Vector Art**: Custom vector illustrations designed for modern routers, multilayer switches, 1U servers, PCs, firewalls, and access points.
- **Deterministic Simulation Engine**:
  - **Ethernet & Switching**: Full-duplex framing, dynamic MAC address learning table, unknown-unicast flooding, broadcast domains.
  - **VLANs & 802.1Q Trunking**: Access ports, 802.1Q tagged frames, native VLAN handling, inter-VLAN traffic isolation.
  - **IPv4 Networking**: Subnetting calculations, CIDR notation, network & broadcast address boundaries, local subnet matching.
  - **ARP Resolution**: Dynamic ARP cache table, simulated ARP Request broadcast and Unicast Reply.
  - **ICMP Echo Processing**: Full request/reply ping validation, TTL decrement, hop-by-hop traversal.
  - **Routing Engine**: Connected, local host /32, and static routes with Longest Prefix Matching (LPM).
  - **Network Services**: Dynamic DHCP address pool allocation and DNS A-record lookups.
- **Interactive Device Terminal (CLI)**:
  - Cisco-like command execution with modes (`exec`, `priv-exec`, `config`, `config-if`, `config-vlan`).
  - Supported commands: `enable`, `configure terminal`, `interface <if>`, `ip address <ip> <mask>`, `[no] shutdown`, `switchport mode [access|trunk]`, `switchport access vlan <id>`, `vlan <id>`, `ip route <net> <mask> <next-hop>`, `show ip interface brief`, `show interfaces`, `show mac address-table`, `show vlan brief`, `show ip route`, `show arp`, `show running-config`, and real `ping <ip>`.
- **Packet Visualization & Protocol Analyzer**:
  - Live animated packets traveling across link paths.
  - Event timeline with hop-by-hop forwarding decisions, MAC lookup hits, and drop reasons.
  - Packet Inspector drawer showing Layer 2 Ethernet frame headers (MAC, EtherType, 802.1Q tag) and Layer 3 IPv4 headers (IPs, TTL, Protocol).
- **Automated Network Diagnostics**:
  - Real-time audit detecting duplicate IP addresses, missing default gateways, subnet mismatches, link-down conditions, and access/trunk switchport conflicts with actionable suggestions.
- **Interactive Learning Center**:
  - Built-in hands-on CCNA guided labs with live automated validation of objectives against actual network state.
- **Project Management**:
  - Save to browser storage, undo/redo (40-step history), JSON project file export and validation-protected import.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ or v24+ recommended)
- `npm`

### Installation

```bash
# Clone or navigate to repository
cd nexalab

# Install dependencies
npm install

# Start development server
npm run dev
```

Open your browser at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

### Running the Test Suite

```bash
npm test
```

All 25 automated unit and end-to-end integration tests execute via Vitest.

---

## 📁 System Architecture

```
src/
├── app/               # Application shell
├── components/
│   ├── features/
│   │   ├── device-library/      # Searchable device palette with vector hardware art
│   │   ├── diagnostics/         # Automated topology audit and troubleshooting
│   │   ├── inspector/           # Contextual device configuration panel and tabs
│   │   ├── labs/                # Interactive CCNA guided labs modal
│   │   ├── packet-inspector/    # Wireshark-inspired frame analyzer drawer
│   │   ├── simulation/          # Bottom timeline, flow tracker, and kernel console
│   │   ├── terminal/            # Interactive Cisco-like CLI terminal
│   │   └── topology/            # React Flow canvas, custom device nodes & link edges
│   ├── layout/                  # Workspace layout, command topbar
│   └── ui/                      # Base UI design system components
├── engine/
│   ├── cli/                     # Cisco-like command parser and mode state machine
│   ├── core/                    # NetworkModel graph and TypedEventEmitter
│   ├── diagnostics/             # Problem detection rules and recommendations
│   ├── protocols/               # Ethernet, ARP, IPv4, ICMP, DHCP, DNS implementations
│   ├── routing/                 # Longest-prefix matching and route table generation
│   ├── simulation/              # End-to-end hop-by-hop packet traversal simulation
│   └── switching/               # MAC address learning and 802.1Q VLAN logic
├── lib/                         # IP calculations, MAC generators, utility functions
├── store/                       # Zustand stores (network, simulation, UI, project)
├── test/                        # Vitest unit and integration test suite
└── types/                       # TypeScript models (network, simulation, project, UI)
```

---

## 🧪 Automated Testing Verification

The project includes unit and end-to-end integration tests covering:
1. **IP Subnetting**: Bitwise address conversions, network/broadcast calculations, host ranges, and Longest Prefix Match.
2. **Layer 2 Switching**: MAC learning, unknown unicast flooding, 802.1Q trunk tagging, and VLAN isolation.
3. **Routing**: Connected, local /32, and static routes with LPM forwarding.
4. **ARP**: Simulated request/reply framing and dynamic cache aging.
5. **Network Services**: Sequential DHCP pool address allocation and DNS A-record lookup.
6. **CLI Parser**: Mode transitions, Cisco-compatible syntax, show commands, and configuration mutation.
7. **Diagnostics**: Real-time detection of duplicate IPs, missing gateways, and switchport mismatches.
8. **End-to-End Integration Scenario**: Complete 5-device topology (`PC-A -> Switch-1 -> Router-1 -> Switch-2 -> PC-B`), verifying ping success, hop events, route removal failure, and route restoration recovery.

---

## 🗺️ Roadmap for Future Releases

- [ ] Dynamic routing protocols: OSPF area configuration and Dijkstra SPF calculation
- [ ] Spanning Tree Protocol (STP / RSTP 802.1w) root bridge election and blocked port states
- [ ] Extended Access Control Lists (ACLs) with permit/deny packet filtering
- [ ] Network Address Translation (NAT / PAT overload)
- [ ] IPv6 Neighbor Discovery Protocol (NDP) and dual-stack addressing
- [ ] Export topology as vector SVG / high-resolution PNG

---

## 📄 License

MIT © NexaLab Contributors
