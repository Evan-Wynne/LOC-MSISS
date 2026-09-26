// Prints the exact bytes of every instruction and of a Trade account for a
// fixed fixture. scripts/check-layout.ts encodes the same fixture with
// lib/chain/codec.ts and compares (npm run check:layout).

use anchor_lang::{AccountSerialize, InstructionData, Space};
use std::fmt::Write as _;
use tradelock::{instruction as ix, Trade};

fn hex(b: &[u8]) -> String {
    b.iter().fold(String::new(), |mut s, x| {
        let _ = write!(s, "{x:02x}");
        s
    })
}

fn key(n: u8) -> anchor_lang::prelude::Pubkey {
    anchor_lang::prelude::Pubkey::new_from_array([n; 32])
}

#[test]
fn layout() {
    let create = ix::CreateTrade {
        trade_id: 1_790_000_000_123,
        title: "Cocoa beans, 200 bags".into(),
        goods: "200 bags × 60 kg cocoa, FOB Tema".into(),
        amount: 36_000_000_000,
        deadline: 1_790_600_000,
        required_docs: 0b111,
    }
    .data();
    let submit = ix::SubmitDocument { doc_type: 1, hash: [0xab; 32], name: "commercial-invoice.pdf".into() }.data();
    let approve = ix::ApproveShipment {}.data();
    let reject = ix::RejectShipment {}.data();
    let refund = ix::RefundAfterDeadline {}.data();

    let mut names = [[0u8; 32]; 3];
    names[0][..18].copy_from_slice(b"bill-of-lading.pdf");
    let trade = Trade {
        buyer: key(1),
        seller: key(2),
        inspector: key(3),
        mint: key(4),
        trade_id: 1_790_000_000_123,
        amount: 36_000_000_000,
        deadline: 1_790_600_000,
        created_at: 1_790_000_000,
        status: 1,
        required_docs: 0b111,
        submitted_docs: 0b101,
        doc_hashes: [[0x11; 32], [0; 32], [0x33; 32]],
        doc_submitted_at: [1_790_000_100, 0, 1_790_000_300],
        doc_names: names,
        approved_at: 0,
        bump: 254,
        vault_bump: 253,
        title: "Cocoa beans, 200 bags".into(),
        goods: "200 bags × 60 kg cocoa, FOB Tema".into(),
    };
    let mut acc = Vec::new();
    trade.try_serialize(&mut acc).unwrap();

    let json = format!(
        "{{\"createTrade\":\"{}\",\"submitDocument\":\"{}\",\"approveShipment\":\"{}\",\"rejectShipment\":\"{}\",\"refundAfterDeadline\":\"{}\",\"trade\":\"{}\",\"tradeSpace\":{}}}",
        hex(&create),
        hex(&submit),
        hex(&approve),
        hex(&reject),
        hex(&refund),
        hex(&acc),
        8 + Trade::INIT_SPACE
    );
    std::fs::write(concat!(env!("CARGO_MANIFEST_DIR"), "/target/layout.json"), &json).unwrap();
    println!("{json}");
}
