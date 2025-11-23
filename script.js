// FINAL script.js - network-safe, slang loading, event-listener, robust UX

const CONTRACT_ADDRESS = "0x3732Bcf0bf4E92356fc0DC19B6b373846f04c44b";
const DESIRED_CHAIN_ID = "0xaa36a7"; // Sepolia hex chain id

const ABI = [
  {
    "inputs":[{"internalType":"bytes","name":"ct","type":"bytes"}],
    "name":"setEncryptedAge","outputs":[], "stateMutability":"nonpayable","type":"function"
  },
  {
    "inputs":[{"internalType":"address","name":"user","type":"address"}],
    "name":"requestCheck","outputs":[], "stateMutability":"nonpayable","type":"function"
  },
  {
    "anonymous":false,
    "inputs":[
      {"indexed":true,"internalType":"address","name":"user","type":"address"},
      {"indexed":false,"internalType":"bytes","name":"ciphertext","type":"bytes"}
    ],
    "name":"AgeCheckRequested","type":"event"
  }
];

let provider, signer, contract;
let slangIntervalId = null;
const privacySlangs = [
  "Shh... encrypting your secrets 🤫",
  "Hiding data from nosy squirrels 🐿️",
  "Scrambling bytes like a secret recipe 🧪",
  "Putting your age in a velvet bag 👜",
  "Mixing in cryptographic glitter ✨",
  "Sealing your info in a tiny safe 🔐",
  "Masking details like a mystery novel 🕵️",
  "Whispering your age to the blockchain winds 🌬️",
  "Cooking privacy—low heat, high secrecy 🍳",
  "Wrapping data in a cloak of stealth 🦉"
];

// ensure user is on Sepolia and connected
async function ensureSepoliaAndConnect() {
  if (!window.ethereum) {
    updateStatus("MetaMask not detected. Install MetaMask and retry.", true);
    throw new Error("no metamask");
  }

  try {
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    document.getElementById("network-name").innerText = currentChainId || "unknown";

    if (currentChainId !== DESIRED_CHAIN_ID) {
      // Attempt to switch
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: DESIRED_CHAIN_ID }],
        });
        // update shown network
        document.getElementById("network-name").innerText = DESIRED_CHAIN_ID;
      } catch (switchErr) {
        // If the chain isn't added, optionally attempt to add (some wallets may reject)
        // We'll show a friendly message and throw to prevent any mainnet txs.
        console.warn("switch error", switchErr);
        updateStatus("Please switch your MetaMask network to Sepolia (testnet). Auto-switch failed.", true);
        throw new Error("network not sepolia");
      }
    }

    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    const addr = await signer.getAddress();
    document.getElementById("wallet").innerText = addr;
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    // Listen for AgeCheckRequested events and show result
    contract.on("AgeCheckRequested", (user, ciphertext, event) => {
      console.log("AgeCheckRequested event:", { user, ciphertext, txHash: event.transactionHash });
      handleAgeCheckEvent(user, ciphertext, event.transactionHash);
    });

    updateStatus("Connected to Sepolia and ready.");
    document.getElementById("network-name").innerText = "Sepolia";
    return true;
  } catch (err) {
    console.error("ensureSepoliaAndConnect error:", err);
    throw err;
  }
}

// initial connect attempt
(async function init() {
  try {
    await ensureSepoliaAndConnect();
  } catch (e) {
    // user must manually switch network - nothing else to do
    console.log("Init: waiting for user to switch networks.");
  }
})();

function updateStatus(text, isError = false, showSpinner = false) {
  const el = document.getElementById("status");
  el.innerHTML = "";
  if (showSpinner) {
    const s = document.createElement("div");
    s.className = "spinner";
    el.appendChild(s);
  }
  const span = document.createElement("div");
  span.className = "status-text";
  span.innerText = text;
  el.appendChild(span);
  el.style.color = isError ? "#ff9b9b" : "#fff";
}

function startSlangRotation() {
  if (slangIntervalId) return;
  const el = document.getElementById("status");
  let slangSpan = el.querySelector(".privacy-slang");
  if (!slangSpan) {
    slangSpan = document.createElement("div");
    slangSpan.className = "privacy-slang";
    slangSpan.style.marginLeft = "12px";
    el.appendChild(slangSpan);
  }
  let idx = 0;
  slangSpan.innerText = privacySlangs[idx];
  slangIntervalId = setInterval(() => {
    idx = (idx + 1) % privacySlangs.length;
    slangSpan.innerText = privacySlangs[idx];
  }, 1200);
}

function stopSlangRotation() {
  if (slangIntervalId) {
    clearInterval(slangIntervalId);
    slangIntervalId = null;
    const el = document.getElementById("status");
    const slangSpan = el.querySelector(".privacy-slang");
    if (slangSpan) slangSpan.remove();
  }
}

function fakeEncrypt(age) {
  return ethers.utils.hexlify(ethers.utils.toUtf8Bytes("encrypted:" + age));
}

async function encryptAndSubmit() {
  try {
    // ensure Sepolia and connected
    try {
      await ensureSepoliaAndConnect();
    } catch (e) {
      // ensureSepoliaAndConnect will set status — stop here
      return;
    }

    const ageVal = document.getElementById("age").value;
    if (!ageVal) { updateStatus("Enter an age first", true); return; }
    const ct = fakeEncrypt(ageVal);

    updateStatus("Sending encrypted age... (confirm in MetaMask)", false, true);
    startSlangRotation();

    let tx;
    try {
      tx = await contract.setEncryptedAge(ct);
    } catch (sendErr) {
      console.error("transaction send error:", sendErr);
      stopSlangRotation();
      updateStatus("Transaction rejected or failed to send.", true);
      return;
    }

    updateStatus("Transaction sent. Waiting for confirmation... (tx: " + tx.hash + ")", false, true);
    const receipt = await tx.wait(1).catch(e => {
      console.error("wait error:", e);
      return null;
    });

    stopSlangRotation();

    if (!receipt) {
      updateStatus("Could not confirm transaction. Check console or Etherscan.", true);
      return;
    }

    updateStatus("Encrypted age submitted and confirmed! (tx: " + tx.hash + ")", false);
    console.log("submit receipt:", receipt);
  } catch (err) {
    console.error("encryptAndSubmit error:", err);
    stopSlangRotation();
    updateStatus("Unexpected error: " + (err.message || err), true);
  }
}

async function requestCheck() {
  try {
    try {
      await ensureSepoliaAndConnect();
    } catch (e) {
      return;
    }

    const user = await signer.getAddress();

    updateStatus("Requesting check... (confirm in MetaMask)", false, true);
    startSlangRotation();

    let tx;
    try {
      tx = await contract.requestCheck(user);
    } catch (sendErr) {
      console.error("request send error:", sendErr);
      stopSlangRotation();
      updateStatus("Transaction rejected or failed to send.", true);
      return;
    }

    updateStatus("Request tx sent. Waiting for confirmation... (tx: " + tx.hash + ")", false, true);
    const receipt = await tx.wait(1).catch(e => {
      console.error("wait error:", e);
      return null;
    });

    stopSlangRotation();

    if (!receipt) {
      updateStatus("Could not confirm request transaction. Check console or Etherscan.", true);
      return;
    }

    updateStatus("Request confirmed on-chain. Waiting for coprocessor (simulated) or event.", false);
    console.log("request receipt:", receipt);
  } catch (err) {
    console.error("requestCheck error:", err);
    stopSlangRotation();
    updateStatus("Unexpected error: " + (err.message || err), true);
  }
}

async function handleAgeCheckEvent(user, ciphertext, txHash) {
  try {
    let display = "";
    try {
      display = ethers.utils.toUtf8String(ciphertext);
    } catch (e) {
      display = "ciphertext (non-utf8)";
    }

    let isAdultMsg = "Result unknown";
    if (display.startsWith("encrypted:")) {
      const ageStr = display.split(":")[1];
      const num = parseInt(ageStr);
      if (!isNaN(num)) {
        isAdultMsg = (num >= 18) ? "User is an adult ✅" : "User is NOT an adult ❌";
      }
    }

    updateStatus(`Event seen (tx ${txHash}). ${isAdultMsg}`, false);
  } catch (err) {
    console.error("handleAgeCheckEvent error:", err);
    updateStatus("Received event but failed to parse result.", true);
  }
}
