// Chain mode turns on when a deployed program ID is configured (see docs/ROADMAP.md §6).
// Without it the app runs entirely on placeholder data in the browser.
export const CHAIN_MODE = !!process.env.NEXT_PUBLIC_PROGRAM_ID;
export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID ?? "";

// PLACEHOLDER[P18]: mock mode shows tUSDC amounts that are just numbers in the browser. Chain mode uses a real SPL token, but it's our own devnet test mint, not Circle USDC → REAL: Circle's devnet USDC, then mainnet USDC (see docs/ROADMAP.md §7)
export const UNIT = "tUSDC";
export const UNIT_LONG = "tUSDC (test USDC on devnet)";
