> ## Documentation Index
> Fetch the complete documentation index at: https://docs.codex.io/llms.txt
> Use this file to discover all available pages before exploring further.

# Launchpad Lifecycle

> Understand how tokens progress through launchpad stages — from creation to bonding curve to graduation and migration.

Launchpad tokens go through a series of stages before they become fully tradeable on a DEX. This guide explains each stage, how to detect them with the Codex API, and which events fire along the way.

This complements the [Launchpads recipe](/recipes/launchpads) which covers building a launchpad discovery UI.

## The Stages

Tokens on bonding-curve launchpads (Pump.fun, Four.meme, LaunchLab, etc.) progress through these stages:

```
Deployed → Created → Bonding (Updated) → Completed → Migrated
```

| Stage         | What's happening                                                | Key fields                                      |
| ------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| **Deployed**  | Token contract discovered on-chain                              | `eventType: Deployed`                           |
| **Created**   | Metadata populated (name, symbol, image)                        | `eventType: Created`                            |
| **Bonding**   | Trading on bonding curve, `graduationPercent` rising from 0→100 | `eventType: Updated`, `graduationPercent < 100` |
| **Completed** | Bonding curve filled — waiting for migration                    | `completed: true`, `migrated: false`            |
| **Migrated**  | Liquidity moved to DEX pool — fully tradeable                   | `migrated: true`, `migratedPoolAddress` set     |

<Info>
  **Completed vs Migrated:** `completed` means the bonding curve is full. `migrated` means liquidity has actually moved to a DEX. For monitoring graduations via subscriptions, use `Migrated` events — `Completed` events are a legacy state and will be deprecated.
</Info>

<Warning>
  **Not all launchpads have bonding curves.** Protocols like Zora, Clanker, and Baseapp skip the bonding curve entirely. Tokens on these protocols go straight to "Created" without progressing through completion or migration. Fields like `graduationPercent`, `completed`, `migrated`, and `migratedAt` will be absent for these tokens. Doppler-based protocols (like Bankr) are a related case. They manage liquidity along ticks on Uniswap pools rather than progressing through a traditional bonding curve, so `graduationPercent`, `completed`, and `completedAt` will be null. Migration is still tracked when it occurs, but is rare in practice.
</Warning>

## Detecting Token State

Use the `launchpad` field on the `token` query to check a token's current lifecycle stage.

<Accordion title="Check a token's launchpad state">
  [Test this query in the Explorer →](/explore)

  ```graphql theme={null} theme={null}
  query LaunchpadState {
    token(
      input: {
        address: "9wK8yN6iz1ie5kEJkvZCTxyN1x5sTdNfx8yeMY8Ebonk"
        networkId: 1399811149
      }
    ) {
      name
      symbol
      launchpad {
        launchpadName
        launchpadProtocol
        graduationPercent
        poolAddress
        completed
        completedAt
        migrated
        migratedAt
        migratedPoolAddress
      }
    }
  }
  ```
</Accordion>

Use this logic to determine the current stage:

```js theme={null}
function getTokenStage(launchpad) {
  if (!launchpad) return 'not-a-launchpad-token'
  if (launchpad.migrated) return 'migrated'
  if (launchpad.completed) return 'completed'
  if (launchpad.graduationPercent > 0) return 'bonding'
  return 'new'
}
```

## Filtering by Stage

Use `filterTokens` with launchpad filters to query tokens at each stage. These are the same filters that power the columns in the [Launchpads recipe](/recipes/launchpads).

<AccordionGroup>
  <Accordion title="Tokens currently bonding (not yet graduated)">
    [Test this query in the Explorer →](/explore)

    ```graphql theme={null} theme={null}
    query BondingTokens {
      filterTokens(
        filters: {
          launchpadCompleted: false
          launchpadMigrated: false
          launchpadGraduationPercent: { gt: 0 }
        }
        rankings: [{ attribute: graduationPercent, direction: DESC }]
        limit: 10
      ) {
        results {
          createdAt
          marketCap
          priceUSD
          token {
            name
            symbol
            address
            networkId
            launchpad {
              launchpadName
              graduationPercent
              completed
              migrated
            }
          }
        }
      }
    }
    ```
  </Accordion>

  <Accordion title="Recently migrated (graduated) tokens">
    [Test this query in the Explorer →](/explore)

    ```graphql theme={null} theme={null}
    query RecentlyMigrated {
      filterTokens(
        filters: { launchpadMigrated: true }
        rankings: [{ attribute: launchpadMigratedAt, direction: DESC }]
        limit: 10
      ) {
        results {
          createdAt
          marketCap
          priceUSD
          token {
            name
            symbol
            address
            networkId
            launchpad {
              launchpadName
              graduationPercent
              migrated
              migratedAt
              migratedPoolAddress
            }
          }
        }
      }
    }
    ```
  </Accordion>

  <Accordion title="Filter by specific launchpad">
    Use `launchpadName` or `launchpadProtocol` to narrow down to a specific launchpad.

    [Test this query in the Explorer →](/explore)

    ```graphql theme={null} theme={null}
    query PumpFunTokens {
      filterTokens(
        filters: {
          launchpadName: ["Pump.fun"]
          launchpadCompleted: false
          launchpadMigrated: false
        }
        rankings: [{ attribute: createdAt, direction: DESC }]
        limit: 10
      ) {
        results {
          createdAt
          marketCap
          priceUSD
          token {
            name
            symbol
            address
            networkId
            launchpad {
              launchpadName
              launchpadProtocol
              graduationPercent
            }
          }
        }
      }
    }
    ```
  </Accordion>
</AccordionGroup>

<Tip>
  For the complete list of supported launchpads with their `launchpadName` and `protocol` filter values, see [Supported Launchpads](https://docs.codex.io/launchpads).
</Tip>

## Real-Time Lifecycle Events

Subscribe to `onLaunchpadTokenEventBatch` to receive events as tokens progress through each stage. Filter by `eventType` to listen for specific transitions.

<AccordionGroup>
  <Accordion title="New token creations">
    [Test this query in the Explorer →](/explore)

    ```graphql theme={null} theme={null}
    subscription NewLaunchpadTokens {
      onLaunchpadTokenEventBatch(input: { eventType: Created }) {
        eventType
        address
        networkId
        launchpadName
        marketCap
        price
        holders
        token {
          name
          symbol
          address
          networkId
          createdAt
          launchpad {
            graduationPercent
            poolAddress
          }
        }
      }
    }
    ```
  </Accordion>

  <Accordion title="Token stat updates (bonding curve activity)">
    `Updated` events fire as tokens trade on the bonding curve. These include statistics like price, volume, and holder counts — fields that aren't available on `Created` or `Migrated` events.

    [Test this query in the Explorer →](/explore)

    ```graphql theme={null} theme={null}
    subscription BondingCurveUpdates {
      onLaunchpadTokenEventBatch(input: { eventType: Updated }) {
        eventType
        address
        networkId
        launchpadName
        marketCap
        price
        holders
        volume1
        buyCount1
        sellCount1
        sniperCount
        sniperHeldPercentage
        bundlerCount
        bundlerHeldPercentage
        devHeldPercentage
        top10HoldersPercent
        token {
          name
          symbol
          launchpad {
            graduationPercent
          }
        }
      }
    }
    ```
  </Accordion>

  <Accordion title="Token graduations (migrations)">
    Subscribe to `Migrated` events to detect when a token graduates from its bonding curve and moves to a DEX pool.

    [Test this query in the Explorer →](/explore)

    ```graphql theme={null} theme={null}
    subscription TokenGraduations {
      onLaunchpadTokenEventBatch(input: { eventType: Migrated }) {
        eventType
        address
        networkId
        launchpadName
        marketCap
        price
        liquidity
        token {
          name
          symbol
          address
          networkId
          launchpad {
            graduationPercent
            migrated
            migratedAt
            migratedPoolAddress
          }
        }
      }
    }
    ```
  </Accordion>

  <Accordion title="Track a specific token's lifecycle">
    Use `onLaunchpadTokenEvent` with an `address` to follow a single token through all its stages.

    [Test this query in the Explorer →](/explore)

    ```graphql theme={null} theme={null}
    subscription TrackToken {
      onLaunchpadTokenEvent(
        input: {
          address: "9wK8yN6iz1ie5kEJkvZCTxyN1x5sTdNfx8yeMY8Ebonk"
          networkId: 1399811149
        }
      ) {
        eventType
        marketCap
        price
        holders
        token {
          name
          symbol
          launchpad {
            graduationPercent
            completed
            migrated
            migratedAt
            migratedPoolAddress
          }
        }
      }
    }
    ```
  </Accordion>
</AccordionGroup>

<Warning>
  Launchpad events are extremely high-frequency. You must proxy this data through your backend to serve multiple users from a single subscription. We offer a monthly flat-rate option with unlimited requests. [Contact us](mailto:hello@codex.io?subject=Launchpad%20Events%20Subscription) for more information.
</Warning>

## Event Types Reference

<div className="nowrap-code-table">
  | Event Type            | When it fires                                  | Stats available?                                    |
  | --------------------- | ---------------------------------------------- | --------------------------------------------------- |
  | `Deployed`            | Token contract discovered on-chain             | No                                                  |
  | `Created`             | Token metadata populated                       | No                                                  |
  | `Updated`             | Token stats change (trades, price, holders)    | Yes — price, volume, holders, sniper/bundler counts |
  | `Completed`           | Bonding curve filled (legacy — use `Migrated`) | No                                                  |
  | `Migrated`            | Liquidity moved to DEX pool                    | No                                                  |
  | `UnconfirmedDeployed` | Token discovered before finalization           | No                                                  |
  | `UnconfirmedMetadata` | Metadata processed before finalization         | No                                                  |
</div>

<Info>
  Statistics fields (`price`, `volume1`, `holders`, `sniperCount`, etc.) are only populated on `Updated` events. Other event types signal a state change but don't include these metrics.
</Info>

## After Migration

Once a token migrates, it behaves like any other DEX token. You can switch from launchpad subscriptions to the standard Codex endpoints:

| Data           | Endpoint                                                                              |
| -------------- | ------------------------------------------------------------------------------------- |
| Price & volume | [`pairMetadata`](/api-reference/queries/pairmetadata) using the `migratedPoolAddress` |
| Live price     | [`onPairMetadataUpdated`](/api-reference/subscriptions/onpairmetadataupdated)         |
| Trades         | [`getTokenEvents`](/api-reference/queries/gettokenevents)                             |
| Live trades    | [`onTokenEventsCreated`](/api-reference/subscriptions/ontokeneventscreated)           |
| Chart          | [`getTokenBars`](/api-reference/queries/gettokenbars)                                 |
| Live chart     | [`onTokenBarsUpdated`](/api-reference/subscriptions/ontokenbarsupdated)               |

See the [Detailed Token Page recipe](/recipes/detailed-token-page) for the full post-migration data flow.

## Protocols Without Bonding Curves

Some launchpad protocols don't use bonding curves. Tokens on these protocols are created and immediately tradeable — they skip the bonding, completed, and migrated stages entirely.

| Protocol    | Has bonding curve? |
| ----------- | ------------------ |
| Pump.fun    | Yes                |
| Four.meme   | Yes                |
| LaunchLab   | Yes                |
| Meteora DBC | Yes                |
| boop.fun    | Yes                |
| Zora        | No                 |
| Clanker     | No                 |
| Baseapp     | No                 |
| Virtuals    | No                 |

For tokens without bonding curves, the `launchpad` fields `graduationPercent`, `completed`, `completedAt`, `migrated`, `migratedAt`, and `migratedPoolAddress` will be absent. These tokens will only emit `Created` and `Updated` events.

Check out the related endpoints and types:

* [filterTokens](/api-reference/queries/filtertokens) — query tokens by launchpad stage
* [token](/api-reference/queries/token) — get a token's launchpad data
* [onLaunchpadTokenEvent](/api-reference/subscriptions/onlaunchpadtokenevent) — single token lifecycle events
* [onLaunchpadTokenEventBatch](/api-reference/subscriptions/onlaunchpadtokeneventbatch) — batched lifecycle events
* [LaunchpadTokenProtocol](/api-reference/enums/launchpadtokenprotocol) — supported protocols
* [Launchpads recipe](/recipes/launchpads) — building a launchpad discovery UI
