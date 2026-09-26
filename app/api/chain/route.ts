// Chain mode API: the browser posts { action, args }, the server signs with the
// demo keys and talks to Solana devnet (lib/chain/server.ts).
import { NextResponse } from "next/server";
import * as chain from "@/lib/chain/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ACTIONS = {
  state: () => chain.getState(),
  createTrade: (a: never) => chain.createTrade(a),
  submitDocument: (a: never) => chain.submitDocument(a),
  approveShipment: (a: never) => chain.approveShipment(a),
  rejectShipment: (a: never) => chain.rejectShipment(a),
  refundAfterDeadline: (a: never) => chain.refundAfterDeadline(a),
} as const;

export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_PROGRAM_ID) return NextResponse.json({ error: "Chain mode is off (no NEXT_PUBLIC_PROGRAM_ID)." }, { status: 400 });
  let body: { action?: string; args?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const fn = ACTIONS[body.action as keyof typeof ACTIONS];
  if (!fn) return NextResponse.json({ error: `Unknown action ${body.action}` }, { status: 400 });
  try {
    return NextResponse.json(await fn(body.args as never));
  } catch (e) {
    return NextResponse.json({ error: chain.explain(e) }, { status: 500 });
  }
}
