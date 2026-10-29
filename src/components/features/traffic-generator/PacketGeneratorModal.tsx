import { useState } from 'react';
import { useUiStore } from '@/store/uiStore';
import { useNetworkStore } from '@/store/networkStore';
import { useSimulationStore } from '@/store/simulationStore';
import { SimulationEngine } from '@/engine/simulation/SimulationEngine';
import { X, Send, Radio, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';
import { isValidIp } from '@/lib/ip';

export function PacketGeneratorModal() {
  const { isPacketGeneratorOpen, setPacketGeneratorOpen, addToast } = useUiStore();
  const { topology, model } = useNetworkStore();
  const { setEvents, setAnimatedPackets, setMode, setStatus } = useSimulationStore();

  const devices = Object.values(topology.devices);
  const [srcDeviceId, setSrcDeviceId] = useState<string>(devices[0]?.id || '');
  const [dstDeviceId, setDstDeviceId] = useState<string>(devices[1]?.id || '');
  const [customIp, setCustomIp] = useState<string>('');
  const [protocol, setProtocol] = useState<'icmp' | 'arp' | 'dns'>('icmp');
  const [ttl, setTtl] = useState<number>(64);

  if (!isPacketGeneratorOpen) return null;

  const srcDev = topology.devices[srcDeviceId] || devices[0];
  const dstDev = topology.devices[dstDeviceId] || devices[1];

  const handleSendTraffic = (e: React.FormEvent) => {
    e.preventDefault();

    if (!srcDev) {
      addToast({ type: 'warning', title: 'Traffic Error', message: 'No source device selected.' });
      return;
    }

    // Determine target IP: either custom IP or IP of destination device
    let targetIp = customIp.trim();
    if (!targetIp && dstDev) {
      const dstIfWithIp = Object.values(dstDev.interfaces).find((i) => i.ipv4?.address);
      if (dstIfWithIp?.ipv4) {
        targetIp = dstIfWithIp.ipv4.address;
      }
    }

    if (!targetIp) {
      addToast({
        type: 'warning',
        title: 'Missing Destination IP',
        message: 'Destination device must have an assigned IPv4 address or enter a target IP.',
      });
      return;
    }

    if (!isValidIp(targetIp)) {
      addToast({ type: 'error', title: 'Invalid IP', message: 'Enter a valid IPv4 address.' });
      return;
    }

    const simEngine = new SimulationEngine(model);
    const result = simEngine.runPing(srcDev.id, targetIp);

    setEvents(simEngine.getEvents());
    setAnimatedPackets(simEngine.generateAnimatedPackets());
    setMode('simulation');
    setStatus('running');

    addToast({
      type: result.success ? 'success' : 'error',
      title: result.success ? 'Packet Delivered Successfully' : 'Packet Dropped',
      message: `${srcDev.hostname} &rarr; ${targetIp}: ${
        result.success ? '5/5 Packets Delivered' : result.errorMessage || 'Dropped in transit'
      }`,
    });

    setPacketGeneratorOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans text-xs">
        {/* Header */}
        <div className="p-4 border-b border-[#21262d] flex items-center justify-between bg-[#161b22]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#1f6feb]/20 text-[#58a6ff]">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#e6edf3]">Traffic Generator (Packet PDU Injector)</h2>
              <p className="text-xs text-[#8b949e]">Simulate packets between devices like Cisco Packet Tracer PDU tool</p>
            </div>
          </div>

          <button
            onClick={() => setPacketGeneratorOpen(false)}
            className="text-[#8b949e] hover:text-[#e6edf3] p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSendTraffic} className="p-5 space-y-4 bg-[#0d1117]">
          {/* Source Device Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#8b949e] uppercase">Source Node</label>
            <select
              value={srcDeviceId}
              onChange={(e) => setSrcDeviceId(e.target.value)}
              className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.hostname} ({d.model}) —{' '}
                  {Object.values(d.interfaces).find((i) => i.ipv4)?.ipv4?.address || 'No IP'}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Device or Custom Target IP */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#8b949e] uppercase">Destination Node</label>
            <select
              value={dstDeviceId}
              onChange={(e) => {
                setDstDeviceId(e.target.value);
                const dev = topology.devices[e.target.value];
                const ip = Object.values(dev?.interfaces || {}).find((i) => i.ipv4)?.ipv4?.address;
                if (ip) setCustomIp(ip);
              }}
              className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.hostname} ({d.model}) —{' '}
                  {Object.values(d.interfaces).find((i) => i.ipv4)?.ipv4?.address || 'No IP'}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#8b949e] uppercase">Destination IPv4 Address</label>
            <input
              type="text"
              placeholder="e.g. 192.168.1.20"
              value={customIp}
              onChange={(e) => setCustomIp(e.target.value)}
              className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          {/* Protocol Type & TTL */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#8b949e] uppercase">Protocol</label>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as any)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
              >
                <option value="icmp">ICMP Echo Request (Ping)</option>
                <option value="arp">ARP Address Resolution</option>
                <option value="dns">DNS Query</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#8b949e] uppercase">Time-To-Live (TTL)</label>
              <input
                type="number"
                min="1"
                max="255"
                value={ttl}
                onChange={(e) => setTtl(parseInt(e.target.value, 10) || 64)}
                className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-xs text-[#e6edf3] font-mono focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-[#21262d] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPacketGeneratorOpen(false)}
              className="px-4 py-2 rounded-md bg-[#21262d] hover:bg-[#2d333b] text-xs font-semibold text-[#8b949e] hover:text-[#e6edf3] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-semibold cursor-pointer shadow-md transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Packet (Inject PDU)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
