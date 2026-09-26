> ## Documentation Index
> Fetch the complete documentation index at: https://docs.codex.io/llms.txt
> Use this file to discover all available pages before exploring further.

# Supported Launchpads

> Track token launches in real-time across major launchpad protocols with the Codex API. Get launch data, bonding curve progress, trading activity, and live WebSocket updates.

Codex provides real-time data coverage for token launchpad protocols across multiple chains. Track new token launches, bonding curve progress, graduation events, and post-migration trading activity through a unified API.

<Tip>
  See the [Launchpads Recipe](/recipes/launchpads) for a full walkthrough of building a launchpad dashboard with filtering, sorting, and real-time updates.
</Tip>

<Info>
  Want your Launchpad added to Codex? Email [hello@codex.io](mailto:hello@codex.io?subject=Launchpad%20Indexing) or message [@CodexData](https://t.me/CodexData) on Telegram.
</Info>

## Featured Launchpads

<CardGroup cols={3}>
  <Card title="Pump.fun" icon="https://mintcdn.com/codex-dfdf2708/0bffrjT-5D5Prsjl/images/launchpads/pumpfun.png?fit=max&auto=format&n=0bffrjT-5D5Prsjl&q=85&s=531aa6f7e998e3b6f6bb4b1fde64cd41" href="/launchpads/pump-fun" width="64" height="64" data-path="images/launchpads/pumpfun.png">
    Leading Solana token launchpad with bonding curves.
  </Card>

  <Card title="Four.meme" icon="https://mintcdn.com/codex-dfdf2708/0bffrjT-5D5Prsjl/images/launchpads/fourmeme.png?fit=max&auto=format&n=0bffrjT-5D5Prsjl&q=85&s=b45d8c318fa005dd23d4159bf5851915" href="/launchpads/four-meme" width="400" height="400" data-path="images/launchpads/fourmeme.png">
    BNB Chain memecoin launchpad.
  </Card>

  <Card title="LaunchLab" icon="https://mintcdn.com/codex-dfdf2708/0bffrjT-5D5Prsjl/images/launchpads/launchlab.png?fit=max&auto=format&n=0bffrjT-5D5Prsjl&q=85&s=15ffefdfefab0e77389d8aa832fa6135" href="/launchpads/launchlab" width="256" height="256" data-path="images/launchpads/launchlab.png">
    Raydium's token launch platform on Solana.
  </Card>

  <Card title="Meteora" icon="https://mintcdn.com/codex-dfdf2708/0bffrjT-5D5Prsjl/images/launchpads/meteora.png?fit=max&auto=format&n=0bffrjT-5D5Prsjl&q=85&s=7562979a2ae834550b3a5784f7b712ed" href="/launchpads/meteora" width="256" height="256" data-path="images/launchpads/meteora.png">
    Dynamic bonding curve protocol on Solana.
  </Card>

  <Card title="Clanker" icon="https://mintcdn.com/codex-dfdf2708/0bffrjT-5D5Prsjl/images/launchpads/clanker.png?fit=max&auto=format&n=0bffrjT-5D5Prsjl&q=85&s=aa64aac4347b0b93cd5c054e5b465f84" href="/launchpads/clanker" width="500" height="500" data-path="images/launchpads/clanker.png">
    AI-powered token launcher on Base.
  </Card>

  <Card title="Virtuals" icon="https://mintcdn.com/codex-dfdf2708/0bffrjT-5D5Prsjl/images/launchpads/virtuals.png?fit=max&auto=format&n=0bffrjT-5D5Prsjl&q=85&s=d915920b4b2b00ed8b37ad7f5f134d0a" href="/launchpads/virtuals" width="400" height="400" data-path="images/launchpads/virtuals.png">
    AI agent token platform on Base.
  </Card>

  <Card title="Zora" icon="https://mintcdn.com/codex-dfdf2708/7w4fQJ0S9L8CNB96/images/launchpads/zora.svg?fit=max&auto=format&n=7w4fQJ0S9L8CNB96&q=85&s=62ba44ff4d6f4e45866fc05d8a72e1e4" href="/launchpads/zora" width="1001" height="1001" data-path="images/launchpads/zora.svg">
    Token and NFT creation protocol.
  </Card>

  <Card title="Zora Solana" icon="https://mintcdn.com/codex-dfdf2708/7w4fQJ0S9L8CNB96/images/launchpads/zora-solana.svg?fit=max&auto=format&n=7w4fQJ0S9L8CNB96&q=85&s=d6cc8e09ce170664aaa8b1e052475f65" href="/launchpads/zora-solana" width="48" height="48" data-path="images/launchpads/zora-solana.svg">
    Zora's token creation protocol on Solana.
  </Card>

  <Card title="Baseapp" icon="https://mintcdn.com/codex-dfdf2708/0bffrjT-5D5Prsjl/images/launchpads/baseapp.png?fit=max&auto=format&n=0bffrjT-5D5Prsjl&q=85&s=bed87e9c40795f0ddc7ce31abd59ee20" href="/launchpads/baseapp" width="168" height="168" data-path="images/launchpads/baseapp.png">
    Token creation platform on Base.
  </Card>
</CardGroup>

## All Supported Launchpads

Codex tracks launchpads along two independent axes:

* **Launchpad name** identifies the launchpad surface that minted the token (what users see), including third-party platforms (like Eitherway or Cooking.City) that wrap a shared protocol.
* **Launchpad protocol** identifies the on-chain machinery the launchpad runs on. A single protocol can power many launchpad names (e.g. `MeteoraDBC` powers Meteora plus a number of thin wrappers).

Everything below is generated automatically on every docs regeneration — the name and protocol lists from the schema, and the per-network groupings from the same mapping that powers the launchpad filters on [defined.fi](https://defined.fi) — so it stays in sync as new launchpads and networks come online.

<div data-generated>
  ### Launchpads by Network

  Every supported launchpad, grouped by the networks it operates on. This is the same network mapping that powers the per-network launchpad filters on [defined.fi](https://defined.fi), and it refreshes automatically as launchpads are added.

  #### Solana

  Pump.fun, Pump Mayhem, Bonk, Believe, Moonshot, Jupiter Studio, boop, Heaven, TokenMill V2, Virtuals, Moonit, LaunchLab, MeteoraDBC, Meteora Alpha Vault, Zora Solana, Cooking.City, time.fun, BAGS, Circus, Dealr, OhFuckFun, PrintFun, Trend, shout.fun, xApple, Sendshot, DubDub, cults, OpenGameProtocol, AMERICA.fun, Printr, Coinbarrel, Blowfish, MeMoo, Metaplex, Scale, Eitherway, EasyA Kickstart, Doppler, tren.ch, StonkFun, send.fun, hostile.xyz

  #### Base

  Baseapp, Baseapp Creator, Zora, Zora Creator, Virtuals, Clanker, Clanker V4, Printr, Bankr, Liquid, Noice, Flaunch, Flap, Feel.cash, o1.exchange, UniswapCCA

  #### Robinhood

  Virtuals, Clanker V4, BAGS, bow\.fun, Sushi Launch, Bankr, Trench, Flap, NOXA Fun, hood.fun, pons, LONG, Feel.cash, o1.exchange, UniswapCCA, Launchfair

  #### Arc

  Virtuals, Flap, Peach, Doppler, o1.exchange, minara.fun, UniswapCCA, Tolly, Argus, Faze, Lift

  #### Monad

  BONAD.fun, Nad.Fun, TokenMill V2, Printr, Flap

  #### BNB

  Four.meme, Four.meme Fair, Printr, Flap

  #### Ethereum

  Printr, Bankr, Livo, UniswapCCA

  #### Arbitrum

  Clanker V4, Printr, UniswapCCA

  #### Avalanche

  ArenaTrade, Printr, UniswapCCA

  #### Unichain

  Bankr, UniswapCCA

  #### X Layer

  Flap, o1.exchange

  #### Mantle

  Printr

  #### MegaETH

  Kumbaya

  #### Polygon

  Bankr

  <Info>
    Indexing sometimes lands before a launchpad is listed here for a network. If a launchpad you need isn't shown for a chain, [reach out](mailto:hello@codex.io?subject=Launchpad%20Coverage) — it may already be live.
  </Info>

  ### Launchpad Names

  Pass any of these values to `launchpadName` (or `launchpadNames`) when filtering [`filterTokens`](/api-reference/queries/filtertokens) or [launchpad subscriptions](/api-reference/subscriptions/onlaunchpadtokeneventbatch). Names attribute a token to a specific launchpad surface, which is useful for third-party wrappers that share a protocol with others.

  | Launchpad Name      | Networks                                                        |
  | ------------------- | --------------------------------------------------------------- |
  | Pump.fun            | Solana                                                          |
  | Pump Mayhem         | Solana                                                          |
  | Bonk                | Solana                                                          |
  | BONAD.fun           | Monad                                                           |
  | Nad.Fun             | Monad                                                           |
  | Baseapp             | Base                                                            |
  | Baseapp Creator     | Base                                                            |
  | Zora                | Base                                                            |
  | Zora Creator        | Base                                                            |
  | Four.meme           | BNB                                                             |
  | Four.meme Fair      | BNB                                                             |
  | Believe             | Solana                                                          |
  | Moonshot            | Solana                                                          |
  | Jupiter Studio      | Solana                                                          |
  | boop                | Solana                                                          |
  | Heaven              | Solana                                                          |
  | TokenMill V2        | Solana, Monad                                                   |
  | Virtuals            | Base, Solana, Robinhood, Arc                                    |
  | Clanker             | Base                                                            |
  | Clanker V4          | Base, Arbitrum, Robinhood                                       |
  | ArenaTrade          | Avalanche                                                       |
  | Moonit              | Solana                                                          |
  | LaunchLab           | Solana                                                          |
  | MeteoraDBC          | Solana                                                          |
  | Meteora Alpha Vault | Solana                                                          |
  | Zora Solana         | Solana                                                          |
  | Cooking.City        | Solana                                                          |
  | time.fun            | Solana                                                          |
  | BAGS                | Solana, Robinhood                                               |
  | Circus              | Solana                                                          |
  | Dealr               | Solana                                                          |
  | OhFuckFun           | Solana                                                          |
  | PrintFun            | Solana                                                          |
  | Trend               | Solana                                                          |
  | shout.fun           | Solana                                                          |
  | xApple              | Solana                                                          |
  | Sendshot            | Solana                                                          |
  | DubDub              | Solana                                                          |
  | cults               | Solana                                                          |
  | OpenGameProtocol    | Solana                                                          |
  | AMERICA.fun         | Solana                                                          |
  | Kumbaya             | MegaETH                                                         |
  | bow\.fun            | Robinhood                                                       |
  | Sushi Launch        | Robinhood                                                       |
  | Printr              | Solana, Arbitrum, Avalanche, Base, BNB, Ethereum, Mantle, Monad |
  | Bankr               | Base, Ethereum, Polygon, Unichain, Robinhood                    |
  | Liquid              | Base                                                            |
  | Noice               | Base                                                            |
  | Flaunch             | Base                                                            |
  | Coinbarrel          | Solana                                                          |
  | Blowfish            | Solana                                                          |
  | MeMoo               | Solana                                                          |
  | Metaplex            | Solana                                                          |
  | Scale               | Solana                                                          |
  | Eitherway           | Solana                                                          |
  | Livo                | Ethereum                                                        |
  | Trench              | Robinhood                                                       |
  | Flap                | BNB, X Layer, Monad, Base, Robinhood, Arc                       |
  | NOXA Fun            | Robinhood                                                       |
  | hood.fun            | Robinhood                                                       |
  | pons                | Robinhood                                                       |
  | Peach               | Arc                                                             |
  | LONG                | Robinhood                                                       |
  | Feel.cash           | Base, Robinhood                                                 |
  | EasyA Kickstart     | Solana                                                          |
  | Doppler             | Solana, Arc                                                     |
  | o1.exchange         | Base, Robinhood, Arc, X Layer                                   |
  | minara.fun          | Arc                                                             |
  | UniswapCCA          | Base, Robinhood, Ethereum, Unichain, Arbitrum, Avalanche, Arc   |
  | tren.ch             | Solana                                                          |
  | StonkFun            | Solana                                                          |
  | Tolly               | Arc                                                             |
  | Launchfair          | Robinhood                                                       |
  | send.fun            | Solana                                                          |
  | hostile.xyz         | Solana                                                          |
  | Argus               | Arc                                                             |
  | Faze                | Arc                                                             |
  | Lift                | Arc                                                             |

  ### Launchpad Protocols

  Pass any of these values to `protocol` (or `protocols`) when filtering [launchpad subscriptions](/api-reference/subscriptions/onlaunchpadtokeneventbatch). Protocols describe the on-chain machinery: a single protocol can power many launchpads (e.g. `MeteoraDBC` powers Meteora plus a number of thin wrappers).

  | Protocol           | Description                                                                                                                             |
  | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
  | `Pump`             | Protocol name for Pump.fun.                                                                                                             |
  | `PumpMayhem`       | Protocol Name for Pump Mayhem                                                                                                           |
  | `FourMeme`         | Protocol name for Four.meme.                                                                                                            |
  | `RaydiumLaunchpad` | Protocol name for LaunchLab and Bonk.                                                                                                   |
  | `BoopFun`          | Protocol name for boop.fun.                                                                                                             |
  | `Vertigo`          | Protocol name for Vertigo.                                                                                                              |
  | `Rainbow`          | Protocol name for Rainbow.                                                                                                              |
  | `EgoTech`          | Protocol name for EgoTech.                                                                                                              |
  | `ArenaTrade`       | Protocol name for ArenaTrade.                                                                                                           |
  | `Moonit`           | Protocol name for Moonit (formerly Moonshot).                                                                                           |
  | `MeteoraDBC`       | Protocol name for MeteoraDBC.                                                                                                           |
  | `Baseapp`          | Protocol name for Baseapp.                                                                                                              |
  | `BaseappCreator`   | Protocol Name for Baseapp Creator                                                                                                       |
  | `ZoraV4`           | Protocol name for Zora.                                                                                                                 |
  | `ZoraCreatorV4`    | Protocol name for ZoraCreator.                                                                                                          |
  | `Virtuals`         | Protocol name for Virtuals.                                                                                                             |
  | `Clanker`          | Protocol name for Clanker.                                                                                                              |
  | `HeavenAMM`        | Protocol name for Heaven.                                                                                                               |
  | `TokenMillV2`      | Protocol name for TokenMill V2 (SVM).                                                                                                   |
  | `TokenMillEVM`     | Protocol name for TokenMill V2 (EVM).                                                                                                   |
  | `ClankerV4`        | Protocol name for Clanker V4.                                                                                                           |
  | `Printr`           | Protocol name for Printr (EVM only - Printr tokens on Solana should be queried with launchpadName as Printr uses MeteoraDBC on Solana). |
  | `BonadFun`         | Protocol name for BONAD.fun.                                                                                                            |
  | `NadFun`           | Protocol name for NadFun.                                                                                                               |
  | `Kumbaya`          | Protocol name for Kumbaya.                                                                                                              |
  | `Doppler`          | Protocol name for Doppler.                                                                                                              |
  | `Flaunch`          | Protocol name for Flaunch.                                                                                                              |
  | `Liquid`           | Protocol name for Liquid.                                                                                                               |
</div>

## Launchpad Subscriptions

Codex offers real-time WebSocket subscriptions that stream every token launch, trade, and lifecycle event across all supported launchpad protocols. This powers live launchpad dashboards like the one on [defined.fi](https://defined.fi/tokens/launchpads).

Two subscription options are available:

* [`onLaunchpadTokenEventBatch`](/api-reference/subscriptions/onlaunchpadtokeneventbatch) — Stream all launchpad events across protocols and networks. Filter by `protocol`, `networkId`, or `launchpadName`.
* [`onLaunchpadTokenEvent`](/api-reference/subscriptions/onlaunchpadtokenevent) — Track events for a specific token by address and network.

Events include token creation, swaps, bonding curve progress updates, graduation, and migration. The subscription pushes data through the full bonding curve lifecycle and for 6 hours post-migration.

<Warning>
  Launchpad events are extremely high-frequency and will send a large number of requests. We offer a monthly flat-rate option with unlimited requests for this subscription. [Contact us](mailto:hello@codex.io?subject=Launchpad%20Events%20Subscription) for more information.
</Warning>

## Want your Launchpad added to Codex?

We add new launchpads every week. Email [hello@codex.io](mailto:hello@codex.io?subject=Launchpad%20Indexing) or message [@CodexData](https://t.me/CodexData) on Telegram and we'll send you the indexing form. Once indexed, your launchpad appears in `launchpadName` filters on [`filterTokens`](/api-reference/queries/filtertokens), in the launchpad subscriptions above, and, where the lock can be proven on chain, in [`liquidityLocksV2`](/api-reference/queries/liquiditylocksv2).
