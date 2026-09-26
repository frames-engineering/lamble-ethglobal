> ## Documentation Index
> Fetch the complete documentation index at: https://docs.allium.so/llms.txt
> Use this file to discover all available pages before exploring further.

# Endpoints & Pricing

> All payment-enabled endpoints, pricing, rate limits, and error codes.

All endpoints below are accessible via machine payments at `https://agents.allium.so`. No API key needed — pay with USDC using [Tempo MPP](/ai/machine-payments/tempo-mpp) or [x402](/ai/machine-payments/x402). All calls are priced individually. No subscription, no minimum spend.

## Install allium-cli

CLI commands require **[allium-cli](https://github.com/Allium-Science/allium-cli)**:

```bash theme={null}
curl -sSL https://agents.allium.so/cli/install.sh | sh
```

## Supported Chains Discovery

Check which chains each endpoint supports. **This endpoint is free** — no payment required.

```bash theme={null}
curl "https://agents.allium.so/api/v1/supported-chains/realtime-apis/simple"
```

Returns a map of endpoint path to supported chain names. Call once per session and cache the result.

***

## Realtime API

### Prices

| CLI Command                           | Method | Endpoint                                | Cost   | Description                         |
| ------------------------------------- | ------ | --------------------------------------- | ------ | ----------------------------------- |
| `allium realtime prices latest`       | POST   | `/api/v1/developer/prices`              | \$0.02 | Get latest token prices             |
| `allium realtime prices at-timestamp` | POST   | `/api/v1/developer/prices/at-timestamp` | \$0.02 | Get token prices at a specific time |
| `allium realtime prices history`      | POST   | `/api/v1/developer/prices/history`      | \$0.02 | Get historical token price series   |
| `allium realtime prices stats`        | POST   | `/api/v1/developer/prices/stats`        | \$0.02 | Get token price statistics          |

### Tokens

| CLI Command                            | Method | Endpoint                                 | Cost   | Description                         |
| -------------------------------------- | ------ | ---------------------------------------- | ------ | ----------------------------------- |
| `allium realtime tokens search`        | GET    | `/api/v1/developer/tokens/search`        | \$0.03 | Search tokens by name or symbol     |
| `allium realtime tokens chain-address` | POST   | `/api/v1/developer/tokens/chain-address` | \$0.02 | Look up tokens by chain and address |
| `allium realtime tokens list`          | GET    | `/api/v1/developer/tokens`               | \$0.03 | List all supported tokens           |

### Wallets

| CLI Command                        | Method | Endpoint                                    | Cost   | Description                       |
| ---------------------------------- | ------ | ------------------------------------------- | ------ | --------------------------------- |
| `allium realtime balances latest`  | POST   | `/api/v1/developer/wallet/balances`         | \$0.03 | Get current wallet token balances |
| `allium realtime balances history` | POST   | `/api/v1/developer/wallet/balances/history` | \$0.03 | Get historical wallet balances    |
| `allium realtime transactions`     | POST   | `/api/v1/developer/wallet/transactions`     | \$0.03 | Get wallet transaction history    |
| `allium realtime pnl`              | POST   | `/api/v1/developer/wallet/pnl`              | \$0.03 | Get wallet profit and loss        |

***

## Explorer API

The Explorer API is also available via machine payments. The `run-sql` endpoint uses machine payments auth directly. The remaining Explorer endpoints (`run`, `status`, `results`) require API key authentication.

| CLI Command               | Method | Endpoint                                        | Cost    | Auth             | Description                        |
| ------------------------- | ------ | ----------------------------------------------- | ------- | ---------------- | ---------------------------------- |
| `allium explorer run-sql` | POST   | `/api/v1/explorer/queries/run-async`            | \$0.01  | Machine payments | Submit raw SQL for async execution |
| `allium explorer run`     | POST   | `/api/v1/explorer/queries/{query_id}/run-async` | \$0.01  | API key          | Run a saved query asynchronously   |
| `allium explorer status`  | GET    | `/api/v1/explorer/query-runs/{run_id}/status`   | \$0.01  | API key          | Check status of a query run        |
| `allium explorer results` | GET    | `/api/v1/explorer/query-runs/{run_id}/results`  | dynamic | API key          | Fetch results of a completed query |

***

## Supported Networks

| Protocol      | Network           | USDC Address                                   |
| ------------- | ----------------- | ---------------------------------------------- |
| **Tempo MPP** | Tempo (mainnet)   | `0x20c000000000000000000000b9537d11c60e8b50`   |
| **x402**      | Base (mainnet)    | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`   |
| **x402**      | Polygon (mainnet) | `0x3c499c542cEF5E3811e1192ce70d8cc03d5c3359`   |
| **x402**      | Solana (mainnet)  | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| **x402**      | X Layer (mainnet) | `0x74b7f16337b8972027f6196a17a631ac6de26d22`   |

## Rate Limits

Two independent rate limit buckets per wallet. You can max out both simultaneously.

| Bucket   | Endpoints                   | Limit             |
| -------- | --------------------------- | ----------------- |
| **Data** | All `/developer/` endpoints | 3 requests/second |
| **Docs** | All `/docs/` endpoints      | 5 requests/second |

Exceeding either limit returns HTTP `429`. Wait 1 second before retrying.

***

## Error Codes

| Status | Meaning           | What to Do                                                                                        |
| ------ | ----------------- | ------------------------------------------------------------------------------------------------- |
| 400    | Bad request       | Check JSON syntax                                                                                 |
| 402    | Payment required  | Sign the payment and retry (handled automatically by [Tempo MPP](/ai/machine-payments/tempo-mpp)) |
| 422    | Validation failed | Check request format                                                                              |
| 429    | Rate limited      | Back off for 1 second                                                                             |
| 500    | Server error      | Retry with exponential backoff                                                                    |
