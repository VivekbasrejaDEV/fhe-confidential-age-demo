# Confidential Age Checker (FHE Prototype)

This is a simple demo dApp built for the Zama Developer Program – Builder Track.
It demonstrates the flow of a confidential computation using an FHE-style pattern:

- User enters age (frontend)
- Age is "encrypted" client-side (mock encryption for prototype)
- The encrypted value is stored on-chain
- A check request emits an event that would normally be processed by an FHE coprocessor

Files:
- index.html — frontend UI
- script.js  — blockchain logic + mock encryption
- ConfidentialAge.sol — smart contract (deployed on Sepolia)

Deployed contract address: 0x3732Bcf0bf4E92356fc0DC19B6b373846f04c44b

How to run locally:
1. Open the site (deployed on Vercel) and connect MetaMask (Sepolia).
2. Enter age -> Encrypt & Submit -> approve tx.
3. Request Check -> approve tx. Contract emits event.

Notes:
This prototype uses mock ciphertexts to model FHE flows. In a real integration you would replace the `fakeEncrypt` call with Zama FHE SDK encryption and rely on Zama coprocessors to compute and return results.
