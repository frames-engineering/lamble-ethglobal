## Is StonkFun dumping on its own holders? We followed the fee wallet's $56 million.

On 21 September an X account posted a Solana wallet tagged STONK FEE DRAIN and said it had sold almost $50 million of coins launched on StonkFun. The images spread fast, and so did the replies. We traced it on-chain for a month, sale by sale, and checked what StonkFun's backers said in its defence.

At a glance

StonkFun charges a 1% or 3% tax every time a reward coin moves. One wallet collects it in the coin itself, sells it, and pays holders in whatever the coin trades against. In 30 days it sold **$56.3M** of StonkFun coins and paid **$56.2M** back to holders. The selling is the tax at work, and it still hurts. On some of the busiest coins the tax has taken more than half the supply and sold it into the pool. At least **$1.41M** of the reward money went to wallets tied to StonkFun instead. And the buyback its backers put at $2.09M came to $1.23M.

$56.3M

StonkFun coins the fee wallet sold, 23 Aug to 22 Sep 2026

$56.2M

Paid back out to holders over the same 30 days

$1.41M

Reward money sent to wallets tied to StonkFun

1. $56.3M
	The wallet the viral posts called a fee drain sold **$56.3M** of StonkFun coins in 30 days, $8.47M of it ZCAT.
2. $56.2M
	It paid **$56.2M** back out to holders over the same 30 days, in each coin's pair asset. The selling is the reward tax, cashed out the way StonkFun says.
3. 69%
	A 3% tax took **69%** of BUDDY's supply and sold it into the pool. ZCAT lost 61%. 160 coins lost more than half their supply this way.
4. 20%
	ZCAT lost **20%** of its supply to tax in its first hour, as snipers flipped it. That slice sold for about $18,000. At ZCAT's peak it was worth roughly $30M.
5. 58%
	StonkFun did buy back **$1.23M** of STONK on 21 September, and the chain confirms it. That is 58% of the day's revenue. Its backers had cited $2.09M.
6. $1.41M
	At least **$1.41M** of reward money went to wallets tied to StonkFun, in single transfers its own reward ledger leaves out.

## 01 · The postA wallet tagged fee drain

On 21 September an X account called MidCurveMortal posted pictures of a Solana wallet that someone had tagged STONK FEE DRAIN. One showed it selling $25,000 of a tiny coin called BUDDY while buying none. The post said it had sold almost $50 million of coins launched on StonkFun, $8 million of it in ZCAT, and was running small caps into the ground on top of a 5% tax.

Other traders piled in. One said the wallet seemed to hold an infinite supply of every StonkFun coin, and dropped 80 SOL at a time into every breakout. Another posted that 60% of one coin's supply had been market dumped. Then came a Grok summary on X. It said MidCurveMortal had accused the wallet of "reverse market making". StonkFun's backers, it said, called the selling standard tax mechanics and pointed to $2.09 million of revenue that had gone into buybacks.

StonkFun is a Solana launchpad, a site where anyone can launch a meme coin in a few clicks. The wallet in those posts is real. It runs the platform's reward system, and StonkFun's own API names it as the address that collects tax on reward coins and pays holders. Bitquery indexes the trades and transfers on [Solana](https://www.bitquery.io/blockchains/solana-blockchain-api), so we could follow it for a month, from 23 August to 22 September. We counted every sale, every payout and every payment that went anywhere else. Then we checked the buyback claim against the chain.

The sales are real, and a little bigger than the post said. Almost all of the money went back out to holders. But the tax behind the selling still hurts charts, and a slice of the money went where StonkFun's own ledger does not show it.

## 02 · The platformA launchpad that pays you in the pair

StonkFun opened in late July and works a lot like pump.fun, with one twist. A new coin doesn't have to trade against SOL. It can trade against a [tokenized stock](https://www.bitquery.io/investigations/solana-tokenized-stocks-xstocks) such as SPYx, against ZEC, or against another StonkFun coin. By its own count the platform has launched more than 105,000 coins, most of them through [Raydium's](https://www.bitquery.io/products/raydium-api) launch tools. On 9 September pump.fun switched on the same kind of stock pairs, and we have [measured that market too](https://www.bitquery.io/investigations/pump-fun-stock-tokens-meme-coins).

The platform has its own coin, STONK. StonkFun takes a cut of the trading fees on its pools and says about 60% of that money buys STONK on the open market to burn it. So far 17% of STONK's supply is gone.

Most coins on StonkFun are what it calls reward coins. Every time a reward coin moves, whether in a buy, a sell or a plain send, 1% or 3% of it is held back as tax, at a rate set at launch. StonkFun collects and sells it, and pays each holder a share in whatever the coin is paired with. Hold ZCAT, which trades against ZEC, and you get paid in ZEC.

## 03 · The machineEvery trade feeds one wallet

At first the tax goes nowhere. It sits in the account of whoever received the coins, locked, where they can't spend it, until one wallet sweeps it up, the same one for every StonkFun reward coin. It is the one in the posts.

It sweeps around the clock. What it sweeps gets sold back into each coin's own pool, and the money goes out to holders in batches. Nothing is minted along the way, and these coins can't mint new supply at all, so the "infinite supply" people saw is simply the tax, pulled in from tens of thousands of coins at the same time.

The path of a reward coin's taxTrade, sweep, sell, pay

<svg viewBox="0 0 860 250" style="width:100%;min-width:720px;height:auto" role="img" aria-label="Diagram in four steps: a trade holds back 1% or 3% of the coins as tax, StonkFun's reward wallet sweeps it up, sells it into the coin's own pool for the paired asset, and pays that asset to holders pro rata."><rect x="0" y="0" width="860" height="250" fill="#12161f"></rect><text x="16.0" y="24.0" fill="#e6e9f0" font-size="13" font-weight="600" text-anchor="start">How a reward coin's tax turns into selling</text> <rect x="16.0" y="48.0" width="188.0" height="150.0" fill="#1a2030" stroke="#e0a23b" stroke-width="1" rx="6"></rect><text x="28.0" y="70.0" fill="#e0a23b" font-size="11" font-weight="700" text-anchor="start">1 · THE TRADE</text> <text x="28.0" y="94.0" fill="#e6e9f0" font-size="10.5" text-anchor="start">Someone buys, sells or</text> <text x="28.0" y="111.0" fill="#e6e9f0" font-size="10.5" text-anchor="start">sends a reward coin.</text><text x="28.0" y="128.0" fill="#e6e9f0" font-size="10.5" text-anchor="start">1% or 3% of the coins</text> <text x="28.0" y="145.0" fill="#e6e9f0" font-size="10.5" text-anchor="start">moved is held back.</text><line x1="206.0" y1="123.0" x2="224.0" y2="123.0" stroke="#8b93a7" stroke-width="1"></line> <path d="M218.0,119.0 L224.0,123.0 L218.0,127.0" stroke="#8b93a7" fill="none"></path><rect x="226.0" y="48.0" width="188.0" height="150.0" fill="#1a2030" stroke="#2ec4a6" stroke-width="1" rx="6"></rect><text x="238.0" y="70.0" fill="#2ec4a6" font-size="11" font-weight="700" text-anchor="start">2 · THE SWEEP</text> <text x="238.0" y="94.0" fill="#e6e9f0" font-size="10.5" text-anchor="start">StonkFun's reward wallet</text> <text x="238.0" y="111.0" fill="#e6e9f0" font-size="10.5" text-anchor="start">collects the tax from every</text> <text x="238.0" y="128.0" fill="#e6e9f0" font-size="10.5" text-anchor="start">reward coin, around the</text> <text x="238.0" y="145.0" fill="#e6e9f0" font-size="10.5" text-anchor="start">clock.</text><line x1="416.0" y1="123.0" x2="434.0" y2="123.0" stroke="#8b93a7" stroke-width="1"></line> <path d="M428.0,119.0 L434.0,123.0 L428.0,127.0" stroke="#8b93a7" fill="none"></path><rect x="436.0" y="48.0" width="188.0" height="150.0" fill="#1a2030" stroke="#f93f9c" stroke-width="1" rx="6"></rect><text x="448.0" y="70.0" fill="#f93f9c" font-size="11" font-weight="700" text-anchor="start">3 · THE SALE</text> <text x="448.0" y="94.0" fill="#e6e9f0" font-size="10.5" text-anchor="start">It sells those coins back</text> <text x="448.0" y="111.0" fill="#e6e9f0" font-size="10.5" text-anchor="start">into the coin's own pool,</text><text x="448.0" y="128.0" fill="#e6e9f0" font-size="10.5" text-anchor="start">for the asset the coin</text> <text x="448.0" y="145.0" fill="#e6e9f0" font-size="10.5" text-anchor="start">is paired with.</text><line x1="626.0" y1="123.0" x2="644.0" y2="123.0" stroke="#8b93a7" stroke-width="1"></line> <path d="M638.0,119.0 L644.0,123.0 L638.0,127.0" stroke="#8b93a7" fill="none"></path><rect x="646.0" y="48.0" width="188.0" height="150.0" fill="#1a2030" stroke="#5aa9ff" stroke-width="1" rx="6"></rect><text x="658.0" y="70.0" fill="#5aa9ff" font-size="11" font-weight="700" text-anchor="start">4 · THE PAYOUT</text> <text x="658.0" y="94.0" fill="#e6e9f0" font-size="10.5" text-anchor="start">Holders get that asset,</text><text x="658.0" y="111.0" fill="#e6e9f0" font-size="10.5" text-anchor="start">pro rata, in batches.</text><text x="658.0" y="128.0" fill="#e6e9f0" font-size="10.5" text-anchor="start">ZCAT holders get ZEC,</text><text x="658.0" y="145.0" fill="#e6e9f0" font-size="10.5" text-anchor="start">KNOTS holders get STONK.</text><text x="16.0" y="228.0" fill="#8b93a7" font-size="10" text-anchor="start">Nothing gets minted. None of these coins can mint new supply, so the only stock is tax already swept up.</text></svg>

A buyer of a 3% coin gets 97% of what they paid for. A seller's coins reach the pool 3% light. The missing coins pile up until StonkFun sweeps them up, sells them and pays holders. Every step is on-chain.

## 04 · The selling$56 million in 30 days

The critics had the size right. Across the 30 days we tracked, the reward wallet sold $56.3 million of StonkFun coins, spread over tens of thousands of them. ZCAT alone came to $8.47 million, a little above the $8 million in the post.

Treat that as a floor. A few hundred small coins traded on venues our [trade data](https://www.bitquery.io/products/solana-dex-api) does not price, and the selling started before our window opened.

The pace jumped on 6 September, as StonkFun's new launches moved onto Raydium's LaunchLab. From then on sales ran between $1.6 million and $5.7 million per day, each sale priced at the moment it happened using our [price data](https://www.bitquery.io/products/crypto-price-api).

| Coin | Tax | Sold | Supply lost to tax |
| --- | --- | --- | --- |
| ZCAT | 3% | $8.47M | 61% |
| KNOTS | 3% | $2.35M | 35% |
| PURR | 3% | $1.86M | 81% |
| GP | 3% | $1.27M | 71% |
| RAYCAT | 3% | $968K | 91% |
| LEVERCAT | 3% | $927K | 56% |
| ALLINU | 1% | $830K | 27% |
| BUDDY | 3% | $41K | 69% |

Sold: Aug 23 to Sep 22, 2026, in US dollars at the time of each sale. Supply lost to tax: all tax swept up since launch, through Sep 21, as a share of the coin's launch supply.

## 05 · The payoutsAlmost all of it went back out

Selling is only half the job. Over the same 30 days the wallet paid holders $56.2 million in ZEC, STONK, tokenized stocks, SOL and a few hundred other assets, which is almost exactly what it sold.

Day by day, selling and payouts rise and fall together. Some days it paid out more than it sold and some days less, but the gap never grows.

Money in, money outPer day, 23 Aug to 22 Sep 2026

<svg viewBox="0 0 860 330" style="width:100%;min-width:720px;height:auto" role="img" aria-label="Paired daily bars from Aug 23 to Sep 22, 2026. Tax sold and payouts to holders track each other; both jump on Sep 6 and then run between about 1.6 and 5.7 million dollars per day. Totals: $56.3M sold, $56.2M paid out."><rect x="0" y="0" width="860" height="330" fill="#12161f"></rect><text x="16.0" y="24.0" fill="#e6e9f0" font-size="13" font-weight="600" text-anchor="start">Tax sold vs paid to holders, per day</text> <path d="M16.0 35.0h10.0v10.0h-10.0z" fill="#f93f9c"></path><text x="31.0" y="44.0" fill="#8b93a7" font-size="11" text-anchor="start">Tax sold</text> <path d="M102.3 35.0h10.0v10.0h-10.0z" fill="#2ec4a6"></path><text x="117.3" y="44.0" fill="#8b93a7" font-size="11" text-anchor="start">Paid out to holders</text> <line x1="56.0" y1="290.0" x2="844.0" y2="290.0" stroke="#8b93a7" stroke-width="1"></line><text x="48.0" y="294.0" fill="#8b93a7" font-size="10" text-anchor="end">$0M</text> <line x1="56.0" y1="251.0" x2="844.0" y2="251.0" stroke="#394054" stroke-width="1" stroke-dasharray="3 3"></line><text x="48.0" y="255.0" fill="#8b93a7" font-size="10" text-anchor="end">$1M</text> <line x1="56.0" y1="212.0" x2="844.0" y2="212.0" stroke="#394054" stroke-width="1" stroke-dasharray="3 3"></line><text x="48.0" y="216.0" fill="#8b93a7" font-size="10" text-anchor="end">$2M</text> <line x1="56.0" y1="173.0" x2="844.0" y2="173.0" stroke="#394054" stroke-width="1" stroke-dasharray="3 3"></line><text x="48.0" y="177.0" fill="#8b93a7" font-size="10" text-anchor="end">$3M</text> <line x1="56.0" y1="134.0" x2="844.0" y2="134.0" stroke="#394054" stroke-width="1" stroke-dasharray="3 3"></line><text x="48.0" y="138.0" fill="#8b93a7" font-size="10" text-anchor="end">$4M</text> <line x1="56.0" y1="95.0" x2="844.0" y2="95.0" stroke="#394054" stroke-width="1" stroke-dasharray="3 3"></line><text x="48.0" y="99.0" fill="#8b93a7" font-size="10" text-anchor="end">$5M</text> <line x1="56.0" y1="56.0" x2="844.0" y2="56.0" stroke="#394054" stroke-width="1" stroke-dasharray="3 3"></line><text x="48.0" y="60.0" fill="#8b93a7" font-size="10" text-anchor="end">$6M</text> <text x="68.2" y="306.0" fill="#8b93a7" font-size="10" text-anchor="middle">Aug 23</text> <text x="297.0" y="306.0" fill="#8b93a7" font-size="10" text-anchor="middle">Sep 1</text> <text x="424.1" y="306.0" fill="#8b93a7" font-size="10" text-anchor="middle">Sep 6</text> <text x="551.2" y="306.0" fill="#8b93a7" font-size="10" text-anchor="middle">Sep 11</text> <text x="678.3" y="306.0" fill="#8b93a7" font-size="10" text-anchor="middle">Sep 16</text> <text x="805.4" y="306.0" fill="#8b93a7" font-size="10" text-anchor="middle">Sep 21</text> <path d="M59.1 286.3h9.2v3.7h-9.2zM84.5 288.1h9.2v1.9h-9.2zM109.9 287.7h9.2v2.3h-9.2zM135.3 283.8h9.2v6.2h-9.2zM160.7 285.7h9.2v4.3h-9.2zM186.1 288.3h9.2v1.7h-9.2zM211.6 285.6h9.2v4.4h-9.2zM237.0 287.4h9.2v2.6h-9.2zM262.4 283.2h9.2v6.8h-9.2zM287.8 274.2h9.2v15.8h-9.2zM313.2 285.2h9.2v4.8h-9.2zM338.7 284.2h9.2v5.8h-9.2zM364.1 280.0h9.2v10.0h-9.2zM389.5 264.6h9.2v25.4h-9.2zM414.9 97.2h9.2v192.8h-9.2zM440.3 135.9h9.2v154.1h-9.2zM465.8 155.5h9.2v134.5h-9.2zM491.2 140.6h9.2v149.4h-9.2zM516.6 148.4h9.2v141.6h-9.2zM542.0 69.4h9.2v220.6h-9.2zM567.4 171.7h9.2v118.3h-9.2zM592.9 204.6h9.2v85.4h-9.2zM618.3 198.6h9.2v91.4h-9.2zM643.7 227.9h9.2v62.1h-9.2zM669.1 224.7h9.2v65.3h-9.2zM694.5 185.2h9.2v104.8h-9.2zM720.0 164.8h9.2v125.2h-9.2zM745.4 164.9h9.2v125.1h-9.2zM770.8 183.9h9.2v106.1h-9.2zM796.2 116.0h9.2v174.0h-9.2zM821.6 239.4h9.2v50.6h-9.2z" fill="#f93f9c"></path><path d="M69.2 285.7h9.2v4.3h-9.2zM94.6 286.8h9.2v3.2h-9.2zM120.0 287.2h9.2v2.8h-9.2zM145.5 283.6h9.2v6.4h-9.2zM170.9 284.7h9.2v5.3h-9.2zM196.3 287.6h9.2v2.4h-9.2zM221.7 285.8h9.2v4.2h-9.2zM247.1 285.8h9.2v4.2h-9.2zM272.6 282.6h9.2v7.4h-9.2zM298.0 275.1h9.2v14.9h-9.2zM323.4 284.8h9.2v5.2h-9.2zM348.8 283.6h9.2v6.4h-9.2zM374.2 280.0h9.2v10.0h-9.2zM399.7 261.9h9.2v28.1h-9.2zM425.1 86.3h9.2v203.7h-9.2zM450.5 135.4h9.2v154.6h-9.2zM475.9 156.9h9.2v133.1h-9.2zM501.3 141.1h9.2v148.9h-9.2zM526.7 150.6h9.2v139.4h-9.2zM552.2 70.7h9.2v219.3h-9.2zM577.6 174.3h9.2v115.7h-9.2zM603.0 206.4h9.2v83.6h-9.2zM628.4 202.0h9.2v88.0h-9.2zM653.8 229.0h9.2v61.0h-9.2zM679.3 227.3h9.2v62.7h-9.2zM704.7 187.3h9.2v102.7h-9.2zM730.1 168.4h9.2v121.6h-9.2zM755.5 160.5h9.2v129.5h-9.2zM780.9 195.9h9.2v94.1h-9.2zM806.4 109.2h9.2v180.8h-9.2zM831.8 241.1h9.2v48.9h-9.2z" fill="#2ec4a6"></path><line x1="409.9" y1="52.0" x2="409.9" y2="290.0" stroke="#8b93a7" stroke-width="1" stroke-dasharray="3 3"></line><text x="415.9" y="64.0" fill="#8b93a7" font-size="10" text-anchor="start">Sep 6: launches move to LaunchLab</text></svg>

Pink is the tax the wallet sold, in dollars at the time of each sale. Teal is what it paid to holders, priced on the day it was paid. The payouts leave out money sent to StonkFun's own wallets, covered in section 09. The last bar covers 22 September only up to 06:57 UTC.

StonkFun also publishes a ledger of its reward payouts, so we checked it against the chain, one payout asset at a time. More than nine in ten agree within 10%, and overall our count runs about 4% above StonkFun's. The money goes out in batches, to about 14 to 19 [holders](https://www.bitquery.io/products/token-holder-api) at a time. Since 20 September a second wallet, topped up by the first, has sent them.

So the wallet is not quietly keeping the tax. It does what StonkFun says it does.

## 06 · The dragThe tax is the seller

None of this means the critics imagined the damage. A 3% tax on every buy and every sell turns trading into a steady stream of selling, and the wallet is where that stream comes out. On ZCAT, KNOTS and BUDDY it made about 6% of all the selling, twice the tax rate, because it hits both sides of every trade. On ALLINU, which has a 1% tax, it made 2.2%. Other traders still do almost all of the selling. The wallet's share is small, but it comes out of every trade.

The drain is worst on the coins people churn hardest. BUDDY, a small coin paired with a token called AMC, lost 69% of its supply to tax in about two weeks, and ZCAT lost 61%. The median coin, the one in the middle of the pack, lost 2.5%. But 160 coins lost more than half their supply, and nearly all of it was sold back into the pool.

How much supply the tax tookEvery taxed StonkFun coin

<svg viewBox="0 0 860 300" style="width:100%;min-width:720px;height:auto" role="img" aria-label="Bar chart of 28,810 StonkFun reward coins grouped by the share of their supply taken as tax. Most lost under 5%; 160 lost more than half, including BUDDY at 69% and ZCAT at 61%."><rect x="0" y="0" width="860" height="300" fill="#12161f"></rect><text x="16.0" y="24.0" fill="#e6e9f0" font-size="13" font-weight="600" text-anchor="start">How much of each coin's supply the tax took</text> <text x="16.0" y="42.0" fill="#8b93a7" font-size="11" text-anchor="start">All 28,810 StonkFun reward coins that paid tax, by the share of their supply taken, Aug 10 to Sep 21</text> <line x1="60.0" y1="250.0" x2="844.0" y2="250.0" stroke="#8b93a7" stroke-width="1"></line><text x="52.0" y="254.0" fill="#8b93a7" font-size="10" text-anchor="end">0</text> <line x1="60.0" y1="218.7" x2="844.0" y2="218.7" stroke="#394054" stroke-width="1" stroke-dasharray="3 3"></line><text x="52.0" y="222.7" fill="#8b93a7" font-size="10" text-anchor="end">2,000</text> <line x1="60.0" y1="187.3" x2="844.0" y2="187.3" stroke="#394054" stroke-width="1" stroke-dasharray="3 3"></line><text x="52.0" y="191.3" fill="#8b93a7" font-size="10" text-anchor="end">4,000</text> <line x1="60.0" y1="156.0" x2="844.0" y2="156.0" stroke="#394054" stroke-width="1" stroke-dasharray="3 3"></line><text x="52.0" y="160.0" fill="#8b93a7" font-size="10" text-anchor="end">6,000</text> <line x1="60.0" y1="124.7" x2="844.0" y2="124.7" stroke="#394054" stroke-width="1" stroke-dasharray="3 3"></line><text x="52.0" y="128.7" fill="#8b93a7" font-size="10" text-anchor="end">8,000</text> <line x1="60.0" y1="93.3" x2="844.0" y2="93.3" stroke="#394054" stroke-width="1" stroke-dasharray="3 3"></line><text x="52.0" y="97.3" fill="#8b93a7" font-size="10" text-anchor="end">10,000</text> <line x1="60.0" y1="62.0" x2="844.0" y2="62.0" stroke="#394054" stroke-width="1" stroke-dasharray="3 3"></line><text x="52.0" y="66.0" fill="#8b93a7" font-size="10" text-anchor="end">12,000</text> <text x="116.0" y="195.8" fill="#e6e9f0" font-size="10.5" text-anchor="middle">3,079</text> <text x="116.0" y="266.0" fill="#8b93a7" font-size="10" text-anchor="middle">under 1%</text> <text x="228.0" y="67.6" fill="#e6e9f0" font-size="10.5" text-anchor="middle">11,260</text> <text x="228.0" y="266.0" fill="#8b93a7" font-size="10" text-anchor="middle">1 to 2.5%</text> <text x="340.0" y="132.7" fill="#e6e9f0" font-size="10.5" text-anchor="middle">7,107</text> <text x="340.0" y="266.0" fill="#8b93a7" font-size="10" text-anchor="middle">2.5 to 5%</text> <text x="452.0" y="176.7" fill="#e6e9f0" font-size="10.5" text-anchor="middle">4,296</text> <text x="452.0" y="266.0" fill="#8b93a7" font-size="10" text-anchor="middle">5 to 10%</text> <text x="564.0" y="207.0" fill="#e6e9f0" font-size="10.5" text-anchor="middle">2,363</text> <text x="564.0" y="266.0" fill="#8b93a7" font-size="10" text-anchor="middle">10 to 25%</text> <text x="676.0" y="235.5" fill="#e6e9f0" font-size="10.5" text-anchor="middle">545</text> <text x="676.0" y="266.0" fill="#8b93a7" font-size="10" text-anchor="middle">25 to 50%</text> <text x="788.0" y="241.5" fill="#e6e9f0" font-size="10.5" text-anchor="middle">160</text> <text x="788.0" y="266.0" fill="#8b93a7" font-size="10" text-anchor="middle">over 50%</text> <path d="M81.3 201.8h69.4v48.2h-69.4zM193.3 73.6h69.4v176.4h-69.4zM305.3 138.7h69.4v111.3h-69.4zM417.3 182.7h69.4v67.3h-69.4zM529.3 213.0h69.4v37.0h-69.4zM641.3 241.5h69.4v8.5h-69.4z" fill="#5b6478"></path><path d="M753.3 247.5h69.4v2.5h-69.4z" fill="#f93f9c"></path><text x="788.0" y="223.5" fill="#f93f9c" font-size="10.5" text-anchor="middle">BUDDY 69%, ZCAT 61%</text> <text x="844.0" y="288.0" fill="#8b93a7" font-size="10" text-anchor="end">Median coin: 2.5% of supply</text></svg>

Each bar counts coins by the share of their launch supply swept up as tax, from launch to 21 September. Most lost a sliver. The pink bar is the coins that lost more than half.

Holders are paid for all this, in the pair asset. The price still takes every one of those sales. Anyone who held reward tokens on BNB Chain in 2021 will know the deal.

## 07 · The first hourSnipers pay the most tax

The heaviest tax lands right after launch. Sniper bots buy in the first seconds, flip, and buy again. Every flip pays. Within a minute of one launch on 20 September, 522 wallets had traded 3.4 times the coin's entire supply between them. The reward wallet swept up its first 149 million coins of tax and sold them 45 seconds later.

ZCAT shows what that costs. It lost 20% of its supply to tax in its first hour and 39% by the end of its first day. The 17.5% of supply sold as tax in that first hour fetched about $18,000, and at ZCAT's peak, going by StonkFun's own figures, the same slice was worth roughly $30 million.

Grey bars are the tax taken in each hour after launch. The pink line is the running total. Most of it came in the first hour, when ZCAT was worth a tiny fraction of what it reached later.

This is where the "80 SOL clips on every breakout" come from. The wallet sold in at least 662 fills of 80 SOL or more, and its biggest fill was $130,000. What it does not do is sit on tax and dump it into pumps. On every day we measured, what it held unsold was never more than 1.6% of all it had swept up. It sells as it collects, usually within seconds, so when trading spikes its sales spike too.

The payouts go to whoever holds when they are sent, snipers included. One wallet that bought ZCAT in its very first second has since been paid in 281 different assets.

## 08 · The defenceWhat the backers got right and wrong

StonkFun's backers made two points. The first was that this is standard tax mechanics from earlier meme cycles. That one holds. In 2021, reward tokens on BNB Chain took a tax in their own coin, sold it, and paid holders in BNB, BUSD or CAKE. StonkFun runs the same machine on Solana.

The second was that StonkFun put $2.09 million of its 21 September revenue into STONK buybacks and burns. StonkFun's own ledger says otherwise. It booked $2.11 million of revenue that day and spent $1.23 million of it, or 58%, buying STONK. The rest it kept, which matches the platform's stated policy.

The buybacks themselves are real. That day the platform wallet bought about $1.23 million of STONK through Jupiter, and burned a little more than it bought, topping up with STONK it had taken in pool fees. [DefiLlama](https://defillama.com/protocol/stonkfun) shows only $0.43 million of buybacks for the same day.

Where September 21 revenue wentThe claim, the ledger and the chain

<svg viewBox="0 0 860 280" style="width:100%;min-width:720px;height:auto" role="img" aria-label="Horizontal bars for September 21. Defenders said $2.09 million went to buybacks. StonkFun's ledger shows $2.11 million of revenue, $1.23 million spent buying STONK and $0.88 million kept. The chain confirms $1.23 million of buys; DefiLlama shows $0.43 million."><rect x="0" y="0" width="860" height="280" fill="#12161f"></rect><text x="16.0" y="24.0" fill="#e6e9f0" font-size="13" font-weight="600" text-anchor="start">September 21: revenue and buybacks, three ways</text> <text x="250.0" y="67.0" fill="#e6e9f0" font-size="11" text-anchor="end">Defenders: into buybacks</text> <path d="M262.0 52.0h501.6v22.0h-501.6z" fill="#e0a23b"></path><text x="771.6" y="67.0" fill="#e6e9f0" font-size="11" font-family="JetBrains Mono, monospace" text-anchor="start">$2.09M</text> <text x="250.0" y="102.0" fill="#e6e9f0" font-size="11" text-anchor="end">StonkFun's revenue</text> <path d="M262.0 87.0h507.3v22.0h-507.3z" fill="#5b6478"></path><text x="777.3" y="102.0" fill="#e6e9f0" font-size="11" font-family="JetBrains Mono, monospace" text-anchor="start">$2.11M</text> <text x="250.0" y="137.0" fill="#e6e9f0" font-size="11" text-anchor="end">Bought back, its ledger</text> <path d="M262.0 122.0h294.6v22.0h-294.6z" fill="#2ec4a6"></path><text x="564.6" y="137.0" fill="#e6e9f0" font-size="11" font-family="JetBrains Mono, monospace" text-anchor="start">$1.23M</text> <text x="250.0" y="172.0" fill="#e6e9f0" font-size="11" text-anchor="end">Bought back, on-chain</text> <path d="M262.0 157.0h295.9v22.0h-295.9z" fill="#2ec4a6"></path><text x="565.9" y="172.0" fill="#e6e9f0" font-size="11" font-family="JetBrains Mono, monospace" text-anchor="start">$1.23M</text> <text x="250.0" y="207.0" fill="#e6e9f0" font-size="11" text-anchor="end">Kept, its ledger</text> <path d="M262.0 192.0h212.7v22.0h-212.7z" fill="#5b6478"></path><text x="482.7" y="207.0" fill="#e6e9f0" font-size="11" font-family="JetBrains Mono, monospace" text-anchor="start">$0.89M</text> <text x="250.0" y="242.0" fill="#e6e9f0" font-size="11" text-anchor="end">Bought back, DefiLlama</text> <path d="M262.0 227.0h104.0v22.0h-104.0z" fill="#5aa9ff"></path><text x="374.0" y="242.0" fill="#e6e9f0" font-size="11" font-family="JetBrains Mono, monospace" text-anchor="start">$0.43M</text></svg>

StonkFun's ledger as of 22 September. On-chain buys are the STONK StonkFun bought through Jupiter that day, at the day's average price.

The defence also blurs two pots of money. Revenue is StonkFun's cut of trading fees, and that is what pays for the buyback. The $4.5 million of tax sold that day is a separate pot. It went to each coin's holders in the pair asset, and none of it was burned.

## 09 · The side doorPayments outside the batches

Most payouts go out in batches to many holders at once. A few went somewhere else. Between 6 August and 5 September, single payments went again and again to the wallet StonkFun's API lists as STONK's creator. From 5 September the same kind of payment went to a treasury instead. The treasury also takes in SOL and STONK from StonkFun's platform wallet, and passes STONK on to the creator. And on 8 August, 1,000 SOL went to a third wallet, which swapped it for USDC and sent it on.

Together that comes to at least $1.41 million. Over our 30 days, payments like these were about 2% of everything paid out. StonkFun's reward ledger leaves them out, and we found no stated reason for them. The chain shows where the money went. It cannot tell us why.

The reward wallet also holds a power it has never used. On 2,178 reward coins launched through LaunchLab, KNOTS among them, it can still change the tax rate, as high as 100%. A change would take a few days to kick in, and none has ever been made. On older coins such as ZCAT the rate is locked for good.

| Wallet | Address |
| --- | --- |
| Reward wallet ("fee drain") | [5KXDF6…K6tD](https://explorer.bitquery.io/solana/address/5KXDF6QnqhBj72hDtJNkkpFaQVUfbFXNybMsp3DiK6tD) |
| Payout wallet, from Sep 20 | [HuBMeY…i8Ga](https://explorer.bitquery.io/solana/address/HuBMeYW3aDn8BH65fo8xxbP4oiexyup8udzKyccgi8Ga) |
| Platform wallet | [5CEbue…SPAG](https://explorer.bitquery.io/solana/address/5CEbueQnq1Ym2uSSx2xXds3jQAqT1BDnkA59RZobSPAG) |
| Treasury | [458aGt…Ukre](https://explorer.bitquery.io/solana/address/458aGtmE9UzRhA94hz743NyRv8p7zxNbjcgxV1m8Ukre) |
| STONK's creator wallet | [H6qoWz…acRQ](https://explorer.bitquery.io/solana/address/H6qoWz4hxRb9a65nMXv1ERZWHmbG3foFZoK6CEm7acRQ) |
| Got 1,000 SOL on Aug 8 | [4GwDmF…LSWg](https://explorer.bitquery.io/solana/address/4GwDmFcK3rXWL8r5ob4g5JShpTjRZ7nauimHJrWWLSWg) |

## 10 · The answerSo, is StonkFun dumping on its holders?

Not in the way the viral posts meant. The "fee drain" is StonkFun's reward wallet. It sells what the tax hands it, pays that money back to holders, and holds no hidden stack. It could not mint one if it tried.

| Claim | What the chain shows |
| --- | --- |
| Sold almost $50M | True. $56.3M in 30 days |
| $8M of it in ZCAT | True. $8.47M |
| A 5% tax | No. It is 1% or 3% |
| Holds infinite supply | False. These coins cannot mint more |
| 80 SOL clips on breakouts | True. The tax spikes with trading |
| Dumped 60% of a coin | True. BUDDY 69%, ZCAT 61% |
| Reverse market making | Mostly false. $56.2M went back out |
| Standard tax mechanics | True. Same as 2021 reward tokens |
| $2.09M into buybacks | No. $1.23M, 58% of revenue |

The design still sells into every chart, all day long. A 3% tax on a coin that trades many times its supply hands a big share of that supply back to the pool, and while holders get paid in something else, the price takes the hit. On the busiest coins, and in the first hour after a launch, that drag is heavy.

Two questions came up in none of the posts. Why do some reward payments go to a treasury and to STONK's creator? And will the tax switch on those LaunchLab coins ever be flipped? Both can be followed on-chain with the [Bitquery MCP](https://mcp.bitquery.io/).

### Follow the money in plain English

Most figures above come from Bitquery's Solana data. The Bitquery MCP server puts that data behind an AI assistant, so you can ask what a wallet sold, who it paid, and where the money went next, without writing the query yourself.

List every sale a wallet made, by coin and by dayShow who got paid, how much, and in which tokenFollow a payment hop by hopRank the coins a wallet sold by dollar value

Figures measured September 22, 2026, against Bitquery's Solana trade and transfer data, StonkFun's public API and the Solana chain. Written by Bitquery Research; AI tools ran the queries and drafted the text, and every figure was worked out again from the raw data and checked before we published.

Scope, limits and attribution

This article describes on-chain activity and does not claim that StonkFun, its team or any holder broke a law or a promise. Each wallet is described by what it did on-chain. The reward wallet's link to StonkFun rests on StonkFun's own API, which names it; the others are tied to the platform only by the payments shown. The sales cover 23 August to 22 September 2026 and are a floor, because a few hundred small coins traded on venues we do not price. Payouts are counted from transfers and valued at each asset's price on the day, so they carry some pricing error, and our count runs about 4% above StonkFun's own ledger. We make no claim about why the payments outside the batches were made, or who knew of them. Market caps are StonkFun's own figures. The social media posts quoted are summarised, and their figures are theirs.

This article is provided for informational and educational purposes only. It reflects analysis of publicly available on-chain data as of the dates given, and does not constitute legal, financial, compliance, tax or investment advice, nor a recommendation or offer to buy, sell or hold any asset. Blockchain addresses are pseudonymous: a transaction between two addresses does not by itself establish the identity, intent or knowledge of any party, and every entity attribution here is an inference that may be incomplete or wrong. Readers should verify independently before acting on anything above, and Bitquery accepts no liability for loss arising from reliance on this material. All trademarks and company names are the property of their respective owners. Corrections and right-of-reply requests go to support@bitquery.io.