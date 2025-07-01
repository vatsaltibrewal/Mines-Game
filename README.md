# 💣 Mines Game

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A decentralized, provably fair version of the classic Mines game, built to run on Umi Blockchain. This dApp allows players to wager cryptocurrency on a grid of tiles, aiming to find diamonds while avoiding hidden mines. The entire game logic is managed by a Solidity smart contract, ensuring transparency and fairness in every move.

## 🎮 How to Play

The gameplay is designed to be simple, intuitive, and thrilling. The core objective is to reveal as many "diamond" tiles as possible without hitting a mine. Each safe tile you uncover increases your potential winnings.

1.  **Connect Your Wallet:** Start by connecting a web3 wallet like MetaMask, configured to the appropriate network (e.g., UMI Devnet, etc.).

2.  **Set Your Terms:** Before the game begins, you decide your risk and reward:
    *   **Bet Amount:** The amount of ETH (or the chain's native token) you wish to wager.
    *   **Number of Mines:** Choose how many mines (from 1 to 24) to hide on the 25-tile grid. More mines mean higher risk but a significantly larger payout multiplier for each diamond found.

3.  **Start the Game:** Click "Start Game" and approve the transaction in your wallet. This sends your bet to the smart contract, which locks it and generates the random mine locations for your session.

4.  **Find the Diamonds:** The grid is now active. Click on any tile to reveal what's underneath.
    *   **💎 Diamond:** Success! Your potential payout increases. You can now choose to either click another tile for a bigger reward or play it safe and cash out.
    *   **💣 Mine:** Game over! You've hit a mine, and your initial bet is forfeited to the house.

5.  **Cash Out:** At any point after finding at least one diamond, you can click the "Cash Out" button. This ends the game and transfers your original bet plus your accumulated winnings directly back to your wallet.

## ✨ Key Features

*   **Provably Fair:** All game logic, including the random placement of mines, is handled transparently on the blockchain. There is no possibility for the house or any player to cheat.
*   **Decentralized:** No central server controls the game's outcome. All bets and payouts are managed peer-to-peer via the smart contract.
*   **Player-Controlled Risk:** You decide the difficulty and potential reward by choosing the number of mines.
*   **Instant Payouts:** Winnings are transferred to your wallet the moment you cash out.

## 🛠️ Technology Stack

This project leverages a modern Web3 technology stack:

*   **Frontend:**
    *   **Framework:** [React](https://reactjs.org/)
    *   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
    *   **Blockchain Interaction:** [Viem](https://viem.sh/) & [Ethers.js](https://ethers.io/) for robust contract communication.
    *   **BCS Serialization:** [**@mysten/bcs**](https://github.com/MystenLabs/bcs) for transaction serialization on specific L2s like the UMI Network.

*   **Blockchain:**
    *   **Language:** [Solidity](https://soliditylang.org/)
    *   **Contract:** A custom `MinesGame.sol` contract managing all game logic.
    *   **Target Network:** Polygon, UMI Network, or any EVM-compatible chain.

*   **Development & Deployment:**
    *   **Environment:** [Node.js](https://nodejs.org/)
    *   **Hardhat:** For compiling, testing, and deploying the smart contract.

## 🚀 Getting Started: Local Development

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   [Node.js](https://nodejs.org/en/download/) (v18 or later recommended)
*   [Yarn](https://classic.yarnpkg.com/en/docs/install) or npm
*   A web3 wallet browser extension, such as [MetaMask](https://metamask.io/).

### Frontend Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/mines-game.git
    cd mines-game/frontend  # Or your frontend directory name
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Configure your contract address:**
    You must tell the frontend where your smart contract is deployed. Open `src/config.js` and update the placeholder:
    ```javascript
    const MINES_GAME_CONTRACT_ADDRESS = 'YOUR_CONTRACT_ADDRESS'; // <-- Replace with your deployed address
    ```

4.  **Start the development server:**
    ```sh
    npm start
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Smart Contract Deployment

The smart contract included in this repository is a **development version** that uses an insecure source of randomness (`block.timestamp`). **DO NOT USE IT IN PRODUCTION.**

1.  **Navigate to the contract directory:**
    ```sh
    cd ../contracts # Or your contract directory name
    ```

2.  **Install Hardhat dependencies:**
    ```sh
    npm install
    ```

3.  **Compile the contract:**
    ```sh
    npx hardhat compile
    ```

4.  **Deploy to a network:**
    Make sure your `hardhat.config.js` is configured with the RPC URL and private key for your target network. Then, run the deployment script:
    ```sh
    npx hardhat run scripts/deploy.js --network your_network_name
    ```
    After deployment, copy the contract address and ABI into the frontend as described above.

## 🧠 How It Works: The "Provably Fair" Mechanism

True fairness in a blockchain game comes from unpredictable randomness. This project is designed to be adaptable to different security models.

*   **Current (Development) Method:** The current contract uses `keccak256(abi.encodePacked(block.timestamp, msg.sender))` as a source of randomness. This is sufficient for testing as it's simple and requires no external setup. **WARNING: This method is not secure for production**, as miners can manipulate `block.timestamp` to influence the outcome.

*   **Production-Ready Options (Roadmap):**
    1.  **Chainlink VRF (Verifiable Random Function):** The gold standard for on-chain randomness. It provides cryptographically secure, verifiable random numbers from an oracle, making game outcomes impossible to predict.
    2.  **Commit-Reveal Scheme:** A cryptographic method where the player provides a secret hash (`commit`) to start the game. They later provide the secret (`reveal`), which is combined with an unpredictable on-chain value (like a future `blockhash`) to generate randomness. This prevents manipulation from both the player and the house.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.
