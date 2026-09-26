// Tradelock: a programmable letter of credit on Solana.
//
// The buyer locks an SPL token (our devnet test USDC) in a vault owned by the
// Trade PDA. The seller records SHA-256 hashes of the shipping documents. The
// designated inspector approves, which pays the seller in the same instruction,
// or rejects so the seller can resubmit. After the deadline, anyone can send
// the escrow back to the buyer. Builds on Anchor 0.29 and 0.30.
//
// Account layout and instruction data are mirrored byte for byte by
// lib/chain/codec.ts (checked by `npm run check:layout`).

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

// Solana Playground replaces this with the program's own ID on Build.
declare_id!("11111111111111111111111111111111");

pub const MAX_TITLE: usize = 64;
pub const MAX_GOODS: usize = 128;
pub const DOC_COUNT: usize = 3; // 0 BillOfLading, 1 Invoice, 2 InspectionCertificate
pub const ALL_DOCS: u8 = 0b111;

pub mod status {
    pub const FUNDED: u8 = 0;
    pub const DOCUMENTS_SUBMITTED: u8 = 1;
    pub const PAID: u8 = 2;
    pub const REFUNDED: u8 = 3;
    pub const REJECTED: u8 = 4;
}

#[program]
pub mod tradelock {
    use super::*;

    /// Creates the trade and moves `amount` from the buyer into the vault.
    pub fn create_trade(
        ctx: Context<CreateTrade>,
        trade_id: u64,
        title: String,
        goods: String,
        amount: u64,
        deadline: i64,
        required_docs: u8,
    ) -> Result<()> {
        require!(title.len() <= MAX_TITLE && goods.len() <= MAX_GOODS, LocError::TextTooLong);
        require!(required_docs != 0 && required_docs & !ALL_DOCS == 0, LocError::InvalidDocType);
        require!(amount > 0, LocError::MathOverflow);
        let now = Clock::get()?.unix_timestamp;
        require!(deadline > now, LocError::DeadlinePassed);

        let trade = &mut ctx.accounts.trade;
        trade.buyer = ctx.accounts.buyer.key();
        trade.seller = ctx.accounts.seller.key();
        trade.inspector = ctx.accounts.inspector.key();
        trade.mint = ctx.accounts.mint.key();
        trade.trade_id = trade_id;
        trade.amount = amount;
        trade.deadline = deadline;
        trade.created_at = now;
        trade.status = status::FUNDED;
        trade.required_docs = required_docs;
        trade.submitted_docs = 0;
        trade.doc_hashes = [[0; 32]; DOC_COUNT];
        trade.doc_submitted_at = [0; DOC_COUNT];
        trade.doc_names = [[0; 32]; DOC_COUNT];
        trade.approved_at = 0;
        trade.bump = ctx.bumps.trade;
        trade.vault_bump = ctx.bumps.vault;
        trade.title = title;
        trade.goods = goods;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_token.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            amount,
        )
    }

    /// Seller records one document's SHA-256 hash (the file stays off-chain).
    /// A resubmission replaces that slot.
    pub fn submit_document(ctx: Context<SubmitDocument>, doc_type: u8, hash: [u8; 32], name: String) -> Result<()> {
        let trade = &mut ctx.accounts.trade;
        require!(
            trade.status == status::FUNDED || trade.status == status::DOCUMENTS_SUBMITTED || trade.status == status::REJECTED,
            LocError::InvalidStatus
        );
        let now = Clock::get()?.unix_timestamp;
        require!(now <= trade.deadline, LocError::DeadlinePassed);
        require!((doc_type as usize) < DOC_COUNT, LocError::InvalidDocType);
        let bit = 1u8 << doc_type;
        require!(trade.required_docs & bit != 0, LocError::InvalidDocType);
        require!(name.len() <= 32, LocError::TextTooLong);

        let i = doc_type as usize;
        trade.doc_hashes[i] = hash;
        trade.doc_submitted_at[i] = now;
        let mut padded = [0u8; 32];
        padded[..name.len()].copy_from_slice(name.as_bytes());
        trade.doc_names[i] = padded;
        trade.submitted_docs |= bit;

        if trade.submitted_docs & trade.required_docs == trade.required_docs {
            trade.status = status::DOCUMENTS_SUBMITTED;
        }
        Ok(())
    }

    /// Inspector approves: the vault pays the seller in the same instruction.
    pub fn approve_shipment(ctx: Context<ApproveShipment>) -> Result<()> {
        let trade = &ctx.accounts.trade;
        require!(trade.status == status::DOCUMENTS_SUBMITTED, LocError::InvalidStatus);
        require!(trade.submitted_docs & trade.required_docs == trade.required_docs, LocError::MissingDocuments);
        let amount = ctx.accounts.vault.amount;
        pay_out(&ctx.accounts.trade, &ctx.accounts.vault, &ctx.accounts.seller_token, &ctx.accounts.token_program, amount)?;

        let trade = &mut ctx.accounts.trade;
        trade.status = status::PAID;
        trade.approved_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Inspector rejects: nothing moves, the seller may resubmit.
    pub fn reject_shipment(ctx: Context<RejectShipment>) -> Result<()> {
        let trade = &mut ctx.accounts.trade;
        require!(trade.status == status::DOCUMENTS_SUBMITTED, LocError::InvalidStatus);
        trade.status = status::REJECTED;
        Ok(())
    }

    /// After the deadline anyone can return the escrow; it can only go to the buyer.
    pub fn refund_after_deadline(ctx: Context<RefundAfterDeadline>) -> Result<()> {
        let trade = &ctx.accounts.trade;
        require!(trade.status != status::PAID && trade.status != status::REFUNDED, LocError::InvalidStatus);
        require!(Clock::get()?.unix_timestamp > trade.deadline, LocError::DeadlineNotReached);
        let amount = ctx.accounts.vault.amount;
        pay_out(&ctx.accounts.trade, &ctx.accounts.vault, &ctx.accounts.buyer_token, &ctx.accounts.token_program, amount)?;

        ctx.accounts.trade.status = status::REFUNDED;
        Ok(())
    }
}

// Vault → destination, signed by the Trade PDA.
fn pay_out<'info>(
    trade: &Account<'info, Trade>,
    vault: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
    amount: u64,
) -> Result<()> {
    let id = trade.trade_id.to_le_bytes();
    let seeds: &[&[u8]] = &[b"trade", trade.buyer.as_ref(), &id, &[trade.bump]];
    token::transfer(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            Transfer { from: vault.to_account_info(), to: to.to_account_info(), authority: trade.to_account_info() },
            &[seeds],
        ),
        amount,
    )
}

#[derive(Accounts)]
#[instruction(trade_id: u64)]
pub struct CreateTrade<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: only stored; the seller signs submit_document and receives payment.
    pub seller: UncheckedAccount<'info>,
    /// CHECK: only stored; the inspector signs approve/reject.
    pub inspector: UncheckedAccount<'info>,
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut, token::mint = mint, token::authority = buyer)]
    pub buyer_token: Box<Account<'info, TokenAccount>>,
    #[account(
        init,
        payer = buyer,
        space = 8 + Trade::INIT_SPACE,
        seeds = [b"trade", buyer.key().as_ref(), &trade_id.to_le_bytes()],
        bump
    )]
    pub trade: Box<Account<'info, Trade>>,
    #[account(
        init,
        payer = buyer,
        seeds = [b"vault", trade.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = trade
    )]
    pub vault: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitDocument<'info> {
    pub seller: Signer<'info>,
    #[account(mut, has_one = seller @ LocError::Unauthorized)]
    pub trade: Box<Account<'info, Trade>>,
}

#[derive(Accounts)]
pub struct ApproveShipment<'info> {
    pub inspector: Signer<'info>,
    #[account(mut, has_one = inspector @ LocError::Unauthorized)]
    pub trade: Box<Account<'info, Trade>>,
    #[account(mut, seeds = [b"vault", trade.key().as_ref()], bump = trade.vault_bump)]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = seller_token.mint == trade.mint @ LocError::Unauthorized,
        constraint = seller_token.owner == trade.seller @ LocError::Unauthorized
    )]
    pub seller_token: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RejectShipment<'info> {
    pub inspector: Signer<'info>,
    #[account(mut, has_one = inspector @ LocError::Unauthorized)]
    pub trade: Box<Account<'info, Trade>>,
}

#[derive(Accounts)]
pub struct RefundAfterDeadline<'info> {
    pub caller: Signer<'info>,
    #[account(mut)]
    pub trade: Box<Account<'info, Trade>>,
    #[account(mut, seeds = [b"vault", trade.key().as_ref()], bump = trade.vault_bump)]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = buyer_token.mint == trade.mint @ LocError::Unauthorized,
        constraint = buyer_token.owner == trade.buyer @ LocError::Unauthorized
    )]
    pub buyer_token: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct Trade {
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub inspector: Pubkey,
    pub mint: Pubkey,
    pub trade_id: u64,
    pub amount: u64,
    pub deadline: i64,
    pub created_at: i64,
    pub status: u8,
    pub required_docs: u8,
    pub submitted_docs: u8,
    pub doc_hashes: [[u8; 32]; 3],
    pub doc_submitted_at: [i64; 3],
    pub doc_names: [[u8; 32]; 3], // UTF-8, zero-padded
    pub approved_at: i64,
    pub bump: u8,
    pub vault_bump: u8,
    #[max_len(64)]
    pub title: String,
    #[max_len(128)]
    pub goods: String,
}

#[error_code]
pub enum LocError {
    #[msg("Only the designated party can do this")]
    Unauthorized,
    #[msg("The trade isn't in the right state for this")]
    InvalidStatus,
    #[msg("The deadline hasn't passed yet")]
    DeadlineNotReached,
    #[msg("The deadline has passed")]
    DeadlinePassed,
    #[msg("That document type isn't required for this trade")]
    InvalidDocType,
    #[msg("Not every required document has been submitted")]
    MissingDocuments,
    #[msg("Text is too long")]
    TextTooLong,
    #[msg("Invalid amount")]
    MathOverflow,
}
