// UPDATED script.js - robust with error handling + event listener
const CONTRACT_ADDRESS = "0x3732Bcf0bf4E92356fc0DC19B6b373846f04c44b";

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

async function connect() {
  try {
    if (!window.ethereum) {
      updateStatus("MetaMask not detected. Install MetaMask and retry.");
      return;
    }
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    const addr = await signer.getAddress();
    document.getElementById("wallet").innerText = addr;
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    // Listen for AgeCheckRequested events (any user)
    // We'll update UI when the event is seen on-chain.
    contract.on("AgeCheckRequested", (user, ciphertext, event) => {
      // event.transactionHash is available
      console.log("AgeCheckRequested event:", { user, ciphertext, txHash: event.transactionHash });
      handleAgeCheckEvent(user, ciphertext, event.transactionHash);
    });

    updateStatus("Connected to wallet. Ready.");
  } catch (err) {
    console.error("connect error:", err);
    updateStatus("Error connecting wallet: " + (err.message || err));
  }
}
connect();

function updateStatus(text, isError = false) {
  const el = document.getElementById("status");
  el.innerText = text;
  el.style.color = isError ? "#ffb3b3" : "#cce7ff";
}

function fakeEncrypt(age) {
  return ethers.utils.hexlify(ethers.utils.toUtf8Bytes("encrypted:" + age));
}

async function encryptAndSubmit() {
  try {
    if (!contract) {
      updateStatus("Wallet not connected or contract not ready.", true);
      await connect(); // try connecting again
      if (!contract) return;
    }

    const age = document.getElementById("age").value;
    if (!age) { updateStatus("Enter an age first", true); return; }
    const ct = fakeEncrypt(age);

    updateStatus("Sending encrypted age... (confirm MetaMask)");

    let tx;
    try {
      tx = await contract.setEncryptedAge(ct);
    } catch (sendErr) {
      console.error("transaction send error:", sendErr);
      updateStatus("Transaction rejected or failed to send.", true);
      return;
    }

    updateStatus("Transaction sent. Waiting for confirmation... Tx: " + tx.hash);

    // Wait for 1 confirmation
    const receipt = await tx.wait(1).catch(e => {
      console.error("wait error:", e);
      return null;
    });

    if (!receipt) {
      updateStatus("Could not confirm transaction. Check console or Etherscan.", true);
      return;
    }

    updateStatus("Encrypted age submitted and confirmed! (tx: " + tx.hash + ")");
    console.log("submit receipt:", receipt);
  } catch (err) {
    console.error("encryptAndSubmit error:", err);
    updateStatus("Unexpected error: " + (err.message || err), true);
  }
}

async function requestCheck() {
  try {
    if (!contract) {
      updateStatus("Wallet not connected or contract not ready.", true);
      await connect();
      if (!contract) return;
    }

    const user = await signer.getAddress();

    updateStatus("Requesting check... (confirm MetaMask)");

    let tx;
    try {
      tx = await contract.requestCheck(user);
    } catch (sendErr) {
      console.error("request send error:", sendErr);
      updateStatus("Transaction rejected or failed to send.", true);
      return;
    }

    updateStatus("Request transaction sent. Waiting for confirmation... Tx: " + tx.hash);

    const receipt = await tx.wait(1).catch(e => {
      console.error("wait error:", e);
      return null;
    });

    if (!receipt) {
      updateStatus("Could not confirm request transaction. Check console or Etherscan.", true);
      return;
    }

    updateStatus("Request confirmed on-chain. Waiting for coprocessor (simulated) or event.");
    console.log("request receipt:", receipt);
    // The event listener (contract.on) will catch the event and show result.
  } catch (err) {
    console.error("requestCheck error:", err);
    updateStatus("Unexpected error: " + (err.message || err), true);
  }
}

// Called when AgeCheckRequested event arrives
async function handleAgeCheckEvent(user, ciphertext, txHash) {
  try {
    // For demo: parse our fake ciphertext to get the age
    let display = "";
    try {
      const txt = ethers.utils.toUtf8String(ciphertext);
      display = txt; // "encrypted:25"
    } catch (e) {
      display = "ciphertext (non-utf8)";
    }

    // If ciphertext is in the "encrypted:AGE" format we used, extract number and compute age check
    let isAdultMsg = "Result unknown";
    if (display.startsWith("encrypted:")) {
      const yearOrAge = display.split(":")[1];
      const num = parseInt(yearOrAge);
      if (!isNaN(num)) {
        // we stored age directly in this demo
        isAdultMsg = (num >= 18) ? "User is an adult ✅" : "User is NOT an adult ❌";
      }
    }

    updateStatus(`Event seen (tx ${txHash}). ${isAdultMsg}`);
  } catch (err) {
    console.error("handleAgeCheckEvent error:", err);
    updateStatus("Received event but failed to parse result.", true);
  }
}
