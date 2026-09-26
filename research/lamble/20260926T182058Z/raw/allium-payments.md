> ## Documentation Index
> Fetch the complete documentation index at: https://docs.allium.so/llms.txt
> Use this file to discover all available pages before exploring further.

# Overview

> Machine payment protocols for AI agents and developers to access Allium's blockchain data with USDC.

Machine payments enable AI agents and developers to pay for blockchain data per request using USDC — no API key, no subscription, no human in the loop.

Allium supports two machine payment protocols:

|                | **Tempo MPP**             | **x402**                     |
| -------------- | ------------------------- | ---------------------------- |
| **Complexity** | One function call         | Manual 402 flow              |
| **Best for**   | Quick integration, agents | Full control, custom signing |
| **Setup**      | Install SDK + private key | Privy wallet + signing logic |

## Protocols

<CardGroup cols={2}>
  <Card title="Tempo MPP" icon="bolt" href="/ai/machine-payments/tempo-mpp">
    The simplest path — one function call handles the entire payment flow
  </Card>

  <Card title="x402" icon="credit-card" href="/ai/machine-payments/x402">
    Full manual control over 402 negotiation, EIP-712 signing, and payment
  </Card>
</CardGroup>

## Agent Skills

Don't want to manage payment code? Install pre-built agent skills and let your AI agent query blockchain data with automatic payment.

<Card title="Agent Skills" icon="wand-magic-sparkles" href="/ai/machine-payments/agent-skills">
  Set up machine payments with AI agents in one command
</Card>

## Endpoints & Pricing

<Card title="Endpoints & Pricing" icon="code" href="/ai/machine-payments/endpoints-pricing">
  All payment-enabled endpoints, pricing, rate limits, and error codes
</Card>
