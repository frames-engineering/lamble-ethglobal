## 1Overview

UsePaid turns a token's creator fees into dollars in someone's pocket. A deployer launches a token on a supported venue and points its creator fees at the UsePaid treasury. The token's description names an X account, and that account is who the fees are for.

Everything between the two is mechanical. Fees accrue to the treasury as the token trades, UsePaid claims them on chain, 80% is converted to dollars and paid to the recipient through X Money, and 20% buys $PAID and burns it. Every step is recorded against the claim that produced it, and every payout is confirmed in public.

The recipient is not asked to do anything first - there is no account to make and no wallet to connect, so a payout can arrive from a token they have never heard of. Control sits where it already did: X Money decides who is allowed to pay an account, and you can also ask us directly. Section 13 covers stopping payments.

1. 1
	A token directs its fees
	The deployer points 100% of creator fees at the UsePaid treasury, permanently. See section 3.
2. 2
	The description names a handle
	One line in the token description says who the fees belong to. See section 4.
3. 3
	The token registers itself
	The indexer sees the fee direction on chain and registers the token. There is no approval step.
4. 4
	Fees are claimed
	UsePaid claims accrued creator fees on a schedule and records each claim against its transaction signature.
5. 5
	The recipient is paid in dollars
	The recipient share is sent through Money from a pre-funded float, and a public reply confirms it.

## 2Supported venues

A token can direct fees to UsePaid from a supported launchpad. Which one it launched on changes how fees are directed and how the direction is made permanent, and nothing else: the split, the payout rail and the ledger are identical. pump.fun is live today; pons.family is not live yet.

pump.fun

Solana. Live. Fees directed after creation, from fee sharing. $PAID is issued here.

pons.family

Robinhood Chain. Not live yet. Fees will be directed at creation, as the fee wallet.

four.meme

BNB Chain. Being explored. Not supported, and may never be. See the disclosures page.

## 3Directing fees

Both venues end in the same place: UsePaid is the token's fee recipient, permanently, and it cannot be moved afterwards.

Two rules hold on both. It has to be the **whole** fee, because a partial share would mean the payout we publish is a fraction of what the token earned with no way for the recipient to tell which. And it has to be **permanent**, because a fee direction that can still be changed is a promise that can still be withdrawn.

On pump.fun

Directed **after** the coin is created, not during. The create form has no fee-recipient field. Fee sharing is a separate screen on the coin, where a creator can split fees across up to ten wallets; add the UsePaid treasury there at 100% and the token appears in its sharing config as a shareholder.

That config stays editable until its authority is revoked, so a token is detected but not payable until the revoke flag is set. Revoking is what makes it permanent.

When

After the coin exists, from fee sharing

What we watch

The Pump Fees sharing config, per mint

Made permanent by

Revoking the config's authority

### External UsePaid fee badge

If you launched elsewhere, the fee-sharing admin can publish a signed Solana Memo and submit its transaction signature from the Register tab. The v1 UTF-8 message is `usepaid:fees:v1:solana:<mint>:<UsePaid fee-sharing address>`. Use Memo program `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` and include the fee-sharing admin as a required signer of the instruction.

The memo alone never earns a badge. We also verify a finalized Pump Fees config for that mint with one 100% UsePaid shareholder and its revoke flag set. The badge links to the proof transaction. A read-only verification record is available at `/api/fee-proof?mint=<mint>`. This proves fee routing and fee-admin control, not original creator identity or an X Money payout. Axiom can check the on-chain fee destination and coin description itself; it does not need this memo or our API for its badge.

On pons.family

Not live yet. This is how it will work once it is; nothing on pons is being paid today.

Directed **at** creation. The fee wallet is one of the fields set when the token is launched, alongside its name and image, so pointing it at the UsePaid treasury is part of creating the coin rather than a second visit.

There is no separate revoke step, because the assignment is its own lock: pons' contract lets only the *current* recipient hand the fee wallet on. Once it is ours, the deployer cannot take it back.

When

At creation, as the fee wallet

What we watch

The creator fee recipient on the token

Made permanent by

Assignment itself. Only we can move it

On either venue there is no approval step and no queue. A token that meets both rules registers on its own.

Directing a token's creator fees to the UsePaid treasury constitutes acceptance of the [Terms of Use](https://usepaid.app/legal/terms) by the deployer.

## 4Naming the recipient

The X account that gets paid is read from the token's description. Put this line in it, with the handle you want paid:

`Fees to @yourhandle via UsePaid`

Use the format exactly, substituting the handle you want paid, anywhere in the description. Write whatever else you like around it: the line is what we read, so the rest of the description is yours.

The wording matters more than it looks. A description can easily mention several accounts, and without a fixed line there is no way to tell which one is meant to be paid. “Fees to” and “via UsePaid” bracket the handle so only one reading is possible.

If the line is missing we fall back to the first handle in the description, and then to the X account the token is linked to. Both work, and neither is as reliable as the line.

Keep it inside the shorter of the two description limits. pons.family allows 256 characters and pump.fun allows considerably more, so a description written to fit pons will fit either.

The recipient does not need to agree, know in advance, or hold a wallet. That is the point of the design: a token can be launched for someone, and the first they hear of it is the money arriving and a public reply saying where it came from.

## 5The 80/20 split

Every claim divides the same way. There is no discretion in it, no schedule to negotiate, and no tier that changes it.

To the recipient

80%, paid in dollars through X Money

Protocol cut

20%, spent buying $PAID and burning it

Applied

Per claim, at claim time

Fees we add

None. The 20% is the whole of it

The one exception

$PAID itself does not split. All of its own fees are held as protocol treasury

## 6How claims work

Creator fees do not arrive continuously. They accrue to the treasury as a token trades and sit there until they are claimed, which UsePaid does on a schedule rather than on every trade. Claiming per trade would spend more in transaction fees than it collected on a quiet token.

Each claim is written to the ledger keyed on its own transaction signature, so a claim cannot be recorded twice and every obligation can be traced back to the on-chain event that created it. The recipient share and the protocol cut are both computed at that moment, from that claim, and neither is recalculated afterwards.

A claim can fail. Chains halt, RPC providers go down, and transactions revert. A failed claim creates no obligation and is retried; the fees stay accrued in the meantime and are not lost.

### Payout milestones

Payouts land at milestones. A creator's share builds until it crosses $5 — then $10, $20, $50, $100, $250, $500, $1,000, and every $1,000 after. Each crossing sends the full balance.

Balances below a milestone keep building; nothing expires for a resolved recipient. If the handle has not opened X Money yet, the payment is still sent, and the recipient usually has 14 days to claim it, under X Money's policy. See [Unclaimed payments](#held).

## 7Getting your fees

If a token has named your handle, the money is already yours. There is nothing to claim and no form to fill in. It is sent once the balance crosses a payout milestone, whether or not you have opened X Money yet.

1. 1
	A token names your handle
	Somebody launches a token and points its creator fees at your X account.
2. 2
	Fees accrue and are claimed
	Trading generates creator fees. We claim them on chain on a schedule.
3. 3
	80% is paid to you
	Sent through Money from a pre-funded float, so it does not wait on an off-ramp. No X Money account yet? The payment still arrives, as a claimable payment you usually have 14 days to accept, under X Money's policy.
4. 4
	A public reply confirms it
	@UsePaid replies so you and your audience can see where the money came from.

You are not required to do anything, acknowledge anything, or agree to anything. Receiving a payment does not make you a customer of UsePaid or a promoter of the token that named you.

Money you receive through UsePaid may be taxable to you. Nothing about a payout decides how it should be treated, UsePaid does not issue tax documents, and nothing on this site is tax advice. If the amounts become meaningful, put them in front of someone who does taxes for a living. Where the law requires us to collect information before paying, the payout waits as a held balance until we have it.

## 8X Money setup

Payments settle into X Money, so the only requirement on your side is an X Money account that is open to receiving. That is configured on X, not here, and UsePaid cannot open one for you or change its settings.

X Money is available to X Premium members, which covers a large share of the handles a token is likely to name. Where a handle can already receive, a payout simply lands.

We do not check first and we do not wait. When a balance crosses a milestone the payment is sent, and if the handle has not opened X Money it arrives as a claimable payment with a claim window that is usually 14 days. X Money requires being at least 18 and a U.S. resident, and access is currently rolling out to X Premium subscribers, so a handle that cannot meet X's requirements will not be able to claim and its payments will expire. Section 9 covers what happens then.

## 9Unclaimed payments

Any X account can be named, whether or not it has X Money, and the payment is sent either way. If the handle already has X Money, it deposits automatically. If it does not, X Money holds the payment as claimable and notifies the recipient.

The claim window is X Money's, not ours. Under X's policy an unclaimed payment expires and the funds return to the sender, usually within 14 days. Open an X Money account and claim inside that window and the money is yours, with nothing else to do. If the payment expires, the funds return to our X Money account and are split in half: 50% goes to the protocol treasury wallet, and 50% is spent buying $PAID and burning it. That is the only thing that ever happens to an expired payment, and it is why the split is published rather than decided case by case. A handle that has asked not to be paid is covered in [section 13](#stop).

Who can be named

Any X account

Claim window

Usually 14 days, set by X Money's policy

If they claim in time

The money is theirs

If it expires

Returns to us and is split in half: 50% to the protocol treasury wallet, 50% to the $PAID buyback and burn

## 10The public confirmation

Every payout is announced. @UsePaid replies to the recipient with the amount and the token it came from, so the recipient and their audience can both see it.

We do this so the recipient can find out at all. Most were not asked before their handle was named, so the payment is usually the first they hear of it, and the reply is what they and their audience can check it against.

## 11The treasury and cross-chain

A token earns its fees on whatever chain it launched on. The payout rail and the $PAID market are not on all of those chains, so the treasury is where they meet. Fees are claimed on the chain that earned them and arrive at the treasury as one balance.

$PAID lives on Solana, so a protocol cut earned anywhere else has to cross before it can be spent. That crossing happens at the treasury, once, and it is the only bridge in the path.

Payouts do not cross that bridge. The recipient share settles in dollars through X Money from a pre-funded float, whichever chain the fee came from.

## 12$PAID and the buyback

The protocol cut is spent buying $PAID on the open market and burning it. The protocol buys from the same market as everyone else, at whatever the price is when it buys, and the tokens are sent to a burn address. Both halves are on chain and can be checked by anyone.

$PAID gates nothing. Holding it does not change the split, does not change who can launch, and does not change who gets paid. The $PAID page sets out the mechanism in full, and the disclosures page sets out what the token is not.

## 13Stopping payments

Who may pay you is a setting on your X Money account. Turning off incoming payments there stops UsePaid paying you, the same as it stops anyone else.

You can also ask us directly. Send a request from your handle, or with reasonable proof you control it, to @UsePaid on X or to [admin@usepaid.app](mailto:admin@usepaid.app). We honor removal within 7 days: your handle comes off the site, it goes on a do-not-pay list, and we stop claiming the creator fees of tokens that name it, leaving those fees unclaimed on chain. A payment already sent stays claimable for the rest of its window; if it expires unclaimed it is split like any other expired payment, half to the protocol treasury wallet and half to the $PAID buyback and burn. Any balance accrued for your handle but not yet sent is split the same way when your removal takes effect.

## 15Glossary

Creator fees

The fees a launchpad pays to a token's creator wallet in respect of trading in that token.

Fee sharing

pump.fun's screen for splitting creator fees across up to ten wallets. Where a pump.fun token directs fees to UsePaid.

Fee wallet

pons.family's field for the address that receives creator fees. Set at creation.

Claim

An on-chain transaction in which UsePaid collects accrued creator fees for a registered token.

Recipient share

80% of a claim, payable to the named X account.

Protocol cut

20% of a claim, spent on $PAID buybacks.

Unclaimed payment

A payment sent through X Money that the recipient has not yet claimed. Expires under X Money's policy, usually within 14 days, then returns to us and is split in half: 50% to the protocol treasury wallet, 50% to the $PAID buyback and burn.

Held balance

A recipient share withheld under the reserved rights or taxes provisions of the Terms, held until that provision resolves it.

Float

The pre-funded X Money balance payouts are sent from, so a payment does not wait on an off-ramp.

Treasury

The address a token's creator fees are directed to, and where every chain's balance meets.