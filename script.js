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
  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();
  document.getElementById("wallet").innerText = await signer.getAddress();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
}
connect();

function fakeEncrypt(age) {
  return ethers.utils.hexlify(ethers.utils.toUtf8Bytes("encrypted:" + age));
}

async function encryptAndSubmit() {
  const age = document.getElementById("age").value;
  if (!age) { document.getElementById("status").innerText = "Enter an age first"; return; }
  const ct = fakeEncrypt(age);

  document.getElementById("status").innerText = "Sending encrypted age...";

  const tx = await contract.setEncryptedAge(ct);
  await tx.wait();

  document.getElementById("status").innerText = "Encrypted age submitted!";
}

async function requestCheck() {
  const user = await signer.getAddress();

  document.getElementById("status").innerText = "Requesting check...";

  const tx = await contract.requestCheck(user);
  await tx.wait();

  document.getElementById("status").innerText =
    "Request sent — FHE coprocessor would process this event.";
}
