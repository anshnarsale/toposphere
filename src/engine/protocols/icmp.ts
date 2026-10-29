export interface IcmpPayload {
  type: number;
  code: number;
  identifier: number;
  sequence: number;
  data?: string;
}

export const IcmpType = {
  ECHO_REQUEST: 8,
  ECHO_REPLY: 0,
  DEST_UNREACHABLE: 3,
  TIME_EXCEEDED: 11,
} as const;

export const IcmpCode = {
  NET_UNREACHABLE: 0,
  HOST_UNREACHABLE: 1,
  PORT_UNREACHABLE: 3,
  TTL_EXCEEDED_IN_TRANSIT: 0,
} as const;

export function createEchoRequest(identifier: number, sequence: number): IcmpPayload {
  return { type: IcmpType.ECHO_REQUEST, code: 0, identifier, sequence };
}

export function createEchoReply(req: IcmpPayload): IcmpPayload {
  return { type: IcmpType.ECHO_REPLY, code: 0, identifier: req.identifier, sequence: req.sequence };
}

export function createDestUnreachable(code: number): IcmpPayload {
  return { type: IcmpType.DEST_UNREACHABLE, code, identifier: 0, sequence: 0 };
}

export function createTimeExceeded(): IcmpPayload {
  return { type: IcmpType.TIME_EXCEEDED, code: IcmpCode.TTL_EXCEEDED_IN_TRANSIT, identifier: 0, sequence: 0 };
}
