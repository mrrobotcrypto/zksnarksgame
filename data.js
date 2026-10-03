/* ZERO → SHIELDED — static content */
window.ZDATA = {
  // A slice of the real BIP-39 English wordlist (for the simulated seed only).
  words: ("abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual adapt add addict address adjust admit adult advance advice aerobic affair afford afraid again age agent agree ahead aim air airport aisle alarm album alcohol alert alien all alley allow almost alone alpha already also alter always amateur amazing among amount amused analyst anchor ancient anger angle angry animal ankle announce annual another answer antenna antique anxiety any apart apology appear apple approve april arch arctic area arena argue arm armed armor army around arrange arrest arrive arrow art artefact artist artwork ask aspect assault asset assist assume asthma athlete atom attack attend attitude attract auction audit august aunt author auto autumn average avocado avoid awake aware away awesome awful awkward axis baby bachelor bacon badge bag balance balcony ball bamboo banana banner bar barely bargain barrel base basic basket battle beach bean beauty because become beef before begin behave behind believe below belt bench benefit best betray better between beyond bicycle bid bike bind biology bird birth bitter black blade blame blanket blast bleak bless blind blood blossom blouse blue blur blush board boat body boil bomb bone bonus book boost border boring borrow boss bottom bounce box boy bracket brain brand brass brave bread breeze brick bridge brief bright bring brisk broccoli broken bronze broom brother brown brush bubble buddy budget buffalo build bulb bulk bullet bundle bunker burden burger burst bus business busy butter buyer buzz cabbage cabin cable cactus cage cake call calm camera camp canal cancel candy cannon canoe canvas canyon capable capital captain car carbon card cargo carpet carry cart case cash casino castle casual cat catalog catch category cattle caught cause caution cave ceiling celery cement census century cereal certain chair chalk champion change chaos chapter charge chase chat cheap check cheese chef cherry chest chicken chief child chimney choice choose chronic chuckle chunk churn cigar cinnamon circle citizen city civil claim clap clarify claw clay clean clerk clever click client cliff climb clinic clip clock clog close cloth cloud clown club clump cluster clutch coach coast coconut code coffee coil coin collect color column combine come comfort comic common company concert conduct confirm congress connect consider control convince cook cool copper copy coral core corn correct cost cotton couch country couple course cousin cover coyote crack cradle craft cram crane crash crater crawl crazy cream credit creek crew cricket crime crisp critic crop cross crouch crowd crucial cruel cruise crumble crunch crush cry crystal cube culture cup cupboard curious current curtain curve cushion custom cute cycle").split(" "),

  wallets: [
    { id: "zodl", name: "Zodl", platform: "iOS · ANDROID", desc: "Mobile, shielded-by-default. Formerly Zashi. Pairs with Keystone hardware.", tags: ["SHIELDED DEFAULT", "BEGINNER"] },
    { id: "zingo", name: "Zingo!", platform: "iOS · ANDROID · DESKTOP", desc: "Open-source, shielded-first. Memo-friendly. View-key import.", tags: ["OPEN SOURCE", "MEMOS"] },
    { id: "ywallet", name: "YWallet", platform: "MOBILE · DESKTOP", desc: "Fast sync, power-user controls, multi-account.", tags: ["ADVANCED", "FAST SYNC"] },
    { id: "edge", name: "Edge", platform: "iOS · ANDROID", desc: "Multi-coin wallet with shielded ZEC support and built-in exchange.", tags: ["MULTI-ASSET"] },
    { id: "cake", name: "Cake Wallet", platform: "iOS · ANDROID · DESKTOP", desc: "Privacy-focused multi-coin wallet with shielded ZEC.", tags: ["MULTI-ASSET", "PRIVACY"] }
  ],

  contacts: [
    { id: "ada", name: "Ada", role: "your friend · already shielded", seed: "ada-lovelace" },
    { id: "cafe", name: "Café Nym", role: "coffee shop · accepts shielded ZEC", seed: "cafe-nym" },
    { id: "rex", name: "Rex", role: "artist · sells pixel prints", seed: "rex-artist" }
  ],

  chapters: [
    { id: "intro", short: "START", title: "Zero" },
    { id: "why", short: "01 WHY", title: "The Glass House" },
    { id: "wallet", short: "02 WALLET", title: "Wallet Setup" },
    { id: "address", short: "03 ADDRESS", title: "Your Addresses" },
    { id: "get", short: "04 GET ZEC", title: "Getting ZEC" },
    { id: "shield", short: "05 SHIELD", title: "Shielding" },
    { id: "send", short: "06 SEND/RECV", title: "Send & Receive" },
    { id: "unshield", short: "07 UNSHIELD", title: "Unshielding" },
    { id: "grad", short: "◆ SHIELDED", title: "Graduation" },
    { id: "game", short: "🎮 GAME", title: "Shield Runner" }
  ],

  glossary: [
    ["ZEC", "The currency of the Zcash network. 1 ZEC = 100,000,000 zatoshis."],
    ["Shielded", "Funds and transactions protected by zero-knowledge proofs. Sender, receiver and amount are encrypted on-chain."],
    ["Transparent", "Bitcoin-style funds. Addresses start with t1 / t3. Every amount and address is public, forever."],
    ["Shielded pool", "The encrypted part of Zcash (today: Orchard and Sapling). Notes inside it are unlinkable to their owners."],
    ["Unified Address (UA)", "A single address starting with u1 that bundles receivers for several pools. Wallets pick the most private receiver the sender supports."],
    ["Shielding", "Moving funds from a transparent address into the shielded pool. The transparent side (address and amount going in) is visible."],
    ["Unshielding", "Moving funds out of the shielded pool to a transparent address. The amount and destination become visible; the source does not."],
    ["Seed phrase", "24 words that ARE your wallet. Anyone with them controls your funds. Write on paper, never type into websites, never share."],
    ["Birthday height", "The block height when your wallet was created. Restoring with it makes syncing much faster."],
    ["Memo", "An encrypted message (up to 512 bytes) attached to a shielded transaction. Only the recipient can read it."],
    ["Viewing key", "A key that lets someone see (but not spend) your shielded activity. Useful for audits or accountants."],
    ["zk-SNARK", "Zero-Knowledge Succinct Non-interactive ARgument of Knowledge. The math proving a transaction is valid without revealing its contents."],
    ["Confirmation", "A new block on top of the block containing your transaction. Zcash targets a block about every 75 seconds."],
    ["Fee (ZIP-317)", "Zcash fees scale with transaction size; a simple transaction costs roughly 0.0001 – 0.00015 ZEC."]
  ]
};
