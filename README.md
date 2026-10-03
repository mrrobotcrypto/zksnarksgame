# ZERO → SHIELDED 🛡️⚡
### *The Ultimate Interactive Zcash Onboarding Experience + Retro Arcade Mini-Game*

> **Built for ZECATHON // 05 WILDCARD Bounty ($5,000 / $15,000 USD paid in $ZEC)**  
> **Submission for [@zksnarks_](https://x.com/zksnarks_)**  
> *"Take someone from zero to their first shielded transaction."*

---

## 🌟 Overview

Most crypto onboarding fails because it relies on dry technical documentation and passive reading. **ZERO → SHIELDED** takes the opposite approach: **a fully simulated, tactile, interactive web experience and retro arcade game** that teaches the fundamentals of Zcash financial privacy through hands-on gameplay.

From creating a wallet and dissecting Unified Addresses to shielding transparent funds and avoiding unshielding correlation traps, users learn by doing — culminating in a custom **26×26 pixel avatar**, a downloadable **Proof-of-Shielding Certificate**, and an unlocked retro arcade game: **SHIELD RUNNER // THE MEMPOOL**.

---

## 🎯 Key Innovation: "Dual Reality" Split-Screen Engine

At all times during the journey, the screen is split into two live reactive views:

1. **YOUR VIEW (Left Rail)**: Your simulated wallet state, private balances, transaction history, and encrypted memos.
2. **WHAT THE WORLD SEES (Right Rail)**: The real-time public blockchain observer view. Users watch transparent transactions expose addresses and amounts in plain text, while shielded transactions display as cryptographically indistinguishable noise with zero linkability.

---

## 🗺️ The 8-Chapter Interactive Journey

| Chapter | Title | Key Mechanics & Educational Takeaways |
|---|---|---|
| **00** | **INTRO** | Choose a handle, start the clock, and set your mission objectives. |
| **01** | **WHY PRIVACY?** | Interactive "Glass Wallet" simulator demonstrating why public blockchains leak everyday financial habits, salary, and location. |
| **02** | **GET A WALLET** | Real ecosystem wallet picker (Zodl, Zingo!, YWallet, Edge, Cake), interactive 24-word BIP-39 seed generation, scratchpad reveal, and an anti-phishing defense challenge. |
| **03** | **ADDRESS ANATOMY** | Color-coded visual breakdown of `u1` (Unified), `t1` (Transparent), and `zs1` (Sapling) addresses. Interactive prefix classifier. |
| **04** | **GETTING ZEC** | Simulated exchange (SimEx) fiat-to-crypto on-ramp, withdrawal constraints, and block confirmation counter. |
| **05** | **SHIELDING** | The core transition: moving public funds across the cryptographic wall into the shielded pool. Watch your balance disappear from the public ledger! |
| **06** | **SEND & RECEIVE** | Shielded-to-shielded transfer at full strength. Receive private funds from Ada, write encrypted memos, and hold-to-broadcast a payment to Café Nym. |
| **07** | **UNSHIELDING** | Navigating the correlation trap: learn why unshielding the exact same amount or making instant round-trips breaks anonymity sets, and how to stay safe. |
| **08** | **GRADUATION** | Journey summary stats, interactive checklist, downloadable high-res **Proof-of-Shielding Certificate**, and unique **26×26 procedural pixel identity** generation. |

---

## 🎮 BONUS: SHIELD RUNNER // THE MEMPOOL (Arcade Mini-Game)

Once users graduate, they unlock **SHIELD RUNNER**: a retro cyberpunk arcade game running on HTML5 Canvas and 8-bit Web Audio synthesizer!

- **Play as your character**: Your procedurally generated 26×26 pixel identity is imported directly as the playable game sprite.
- **The Surveillance Grid**: Run through the Mempool while dodging red surveillance lasers and KYC camera drones.
- **zk-SNARK Stealth Mode (`[SPACE]` / `[S]` / Mobile Button)**: Spend shield energy to enter zero-knowledge stealth mode, turning into an encrypted ghost that phases harmlessly through surveillance lasers!
- **Encrypted Memo Blaster (`[X]` / `[E]` / Mobile Button)**: Fire encrypted memos to decrypt and neutralize oncoming surveillance drones!
- **Collectibles**: Grab $ZEC coins to boost your score and refill shield energy; snatch Orchard leaves for 100% instant recharge.
- **Full Touch Support**: Built-in virtual D-pad and action buttons for seamless mobile play.

---

## 🛠️ Technology Stack & Architecture

- **100% Zero Dependencies**: Built strictly with Vanilla HTML5, CSS3, and ES6 JavaScript. No frameworks, no external build tools, no npm bloat.
- **Audio Synthesis**: Built-in procedural 8-bit sound effects using the native browser **Web Audio API** (jump, coin, shield pulse, memo blaster, hit, game over).
- **Procedural Pixel Avatar Engine**: Deterministic 26×26 hash-based avatar builder with distinct traits (headgear, eye visors, mouths, accessories).
- **Client-Side Security**: Runs entirely in the user's browser. Zero private keys, seed words, or data ever leave the machine.
- **Responsive & Accessible**: Fully adaptive across desktop monitors, laptops, tablets, and mobile devices.

---

## 🚀 Quick Start (Running Locally)

You can run the project locally with any static web server:

```bash
# Clone the repository
git clone https://github.com/mrrobotcrypto/zksnarksgame.git
cd zksnarksgame

# Start a local static server (using Python)
python -m http.server 5577

# Open in your browser
http://localhost:5577
```

Alternatively, simply double-click `index.html` to run it directly from your local filesystem!

---

## 🏆 ZECATHON Submission Details

- **Track**: 05 // WILDCARD ($5,000 / $15,000 USD paid in $ZEC)
- **Host / Judge**: [@zksnarks_](https://x.com/zksnarks_)
- **Repository**: [https://github.com/mrrobotcrypto/zksnarksgame](https://github.com/mrrobotcrypto/zksnarksgame)
- **License**: MIT
