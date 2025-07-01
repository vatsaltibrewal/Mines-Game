import { bcs, fromHex } from '@mysten/bcs';
import { ethers } from 'ethers';
import { createPublicClient, createWalletClient, custom, defineChain, parseEther } from 'viem';
import { publicActionsL2, walletActionsL2 } from 'viem/op-stack';
import MinesGameContract from './MinesGame.json';


const MINES_GAME_CONTRACT_ADDRESS = '0x9B4952cFF0B26010427d8BcF19E8b52043B87A74';

// --- UMI Network Configuration ---
export const umiDevnet = defineChain({
  id: 42069,
  sourceId: 42069,
  name: 'Umi Devnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://devnet.uminetwork.com'] },
  },
});

// --- BCS Serialization Setup using @mysten/bcs ---
const SerializableTransactionData = bcs.enum('SerializableTransactionData', {
    EoaBaseTokenTransfer: null,
    ScriptOrDeployment: null,
    EntryFunction: null,
    L2Contract: null,
    EvmContract: bcs.vector(bcs.u8()),
});

const serializeEvmTransaction = (data) => {
  const codeBytes = fromHex(data.replace(/^0x/, ''));
  const serialized = SerializableTransactionData.serialize({ EvmContract: codeBytes });
  return `0x${serialized.toHex()}`;
};

// --- Viem Clients ---
export const publicClient = () =>
  createPublicClient({
    chain: umiDevnet,
    transport: custom(window.ethereum),
  }).extend(publicActionsL2());

export const walletClient = () =>
  createWalletClient({
    chain: umiDevnet,
    transport: custom(window.ethereum),
  }).extend(walletActionsL2());

export const getAccount = async () => {
  const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
  return account;
};

// --- Contract Interaction Helpers ---
const getContract = () => new ethers.Contract(MINES_GAME_CONTRACT_ADDRESS, MinesGameContract.abi);

export const createStartGameTransaction = async (numberOfMines, betAmountInEth) => {
  const contract = getContract();
  const tx = await contract.startGame.populateTransaction(numberOfMines, {
    value: parseEther(betAmountInEth),
  });
  return { to: tx.to, data: serializeEvmTransaction(tx.data), value: parseEther(betAmountInEth) };
};

export const createRevealTileTransaction = async (tileIndex) => {
  const contract = getContract();
  const tx = await contract.revealTile.populateTransaction(tileIndex);
  return { to: tx.to, data: serializeEvmTransaction(tx.data) };
};

export const createCashOutTransaction = async () => {
  const contract = getContract();
  const tx = await contract.cashOut.populateTransaction();
  return { to: tx.to, data: serializeEvmTransaction(tx.data) };
};

/**
 * Reads the current game status for a given player.
 */
export const readGameStatus = async (playerAddress) => {
  const contract = getContract();
  const tx = await contract.getGameStatus.populateTransaction(playerAddress);

  const response = await publicClient().call({
    to: tx.to,
    data: serializeEvmTransaction(tx.data),
  });

  if (response.data) {
    // --- FIX: Convert the byte array from the RPC response to a Uint8Array ---
    // The UMI RPC returns an array of numbers, not a hex string. Ethers needs a Uint8Array to decode it.
    const responseBytes = new Uint8Array(response.data);
    const decodedResult = contract.interface.decodeFunctionResult("getGameStatus", responseBytes);
    // --- END FIX ---

    const game = decodedResult[0];

    return {
      player: game.player,
      betAmount: game.betAmount.toString(),
      totalMines: Number(game.totalMines),
      revealedSafeTiles: Number(game.revealedSafeTiles),
      revealedTiles: game.revealedTiles,
      mineLocations: game.mineLocations.map(loc => Number(loc)),
      isActive: game.isActive,
    };
  }
  return null;
};