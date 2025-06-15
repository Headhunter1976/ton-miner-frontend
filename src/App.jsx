import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { TonClient, Address } from "@ton/ton";
import { toNano, beginCell } from '@ton/core';

// Zaktualizowane adresy z Twojego ostatniego wdrożenia
const STAKING_FARM_ADDRESS = "EQC8MN1ykQZtHHHrWHGSOFyMB7tihHyL3paweoV8DFcJ7V3g";
const NFT_COLLECTION_ADDRESS = "EQA1W7wNN-dwYQIcfUZXk8BEZsNGlGiWB3sskFrYLPZis36m";

// Komponent dla pojedynczego przedmiotu w ekwipunku
function NftItem({ item, onStake, isProcessing }) {
    return (
        <div className="border border-blue-500/30 bg-gradient-to-r from-gray-700/50 to-gray-600/50 p-4 rounded-xl backdrop-blur-sm hover:border-blue-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-105">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        ⛏️ {item.name}
                    </h3>
                    <p className="text-sm text-blue-300 mt-1">✨ Gotowy do podłączenia</p>
                </div>
                <button
                    onClick={() => onStake(item.address)}
                    disabled={isProcessing}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95"
                >
                    {isProcessing ? "⏳ Przetwarzanie..." : "🔌 Podłącz"}
                </button>
            </div>
        </div>
    );
}

function App() {
    // 🚀 TELEGRAM WEBAPP INTEGRATION
    useEffect(() => {
        // Sprawdź czy aplikacja działa w Telegram
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            
            // Opcjonalnie: pobierz dane użytkownika Telegram
            const user = window.Telegram.WebApp.initDataUnsafe?.user;
            if (user) {
                console.log('🎮 Telegram user:', user.first_name);
            }
            
            console.log('✅ Telegram WebApp activated!');
        } else {
            console.log('🌐 Running in browser mode');
        }
    }, []);

    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();
    
    const [view, setView] = useState('farm');
    const [farmData, setFarmData] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [inventoryError, setInventoryError] = useState(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const client = useMemo(() => new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC'
    }), []);

    const handleTransaction = async (address, amount, payload) => {
        if (!wallet) return;
        setIsProcessing(true);
        try {
            const transaction = {
                validUntil: Math.floor(Date.now() / 1000) + 60,
                messages: [{ address, amount, payload }]
            };
            await tonConnectUI.sendTransaction(transaction);
            alert("✅ Transakcja wysłana! Odświeżenie danych może potrwać chwilę.");
            setTimeout(() => {
                fetchFarmData();
                fetchInventory();
            }, 15000);
        } catch (error) {
            console.error("Błąd transakcji:", error);
            alert("❌ Transakcja nie powiodła się. Sprawdź konsolę, aby zobaczyć szczegóły.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const fetchFarmData = useCallback(async () => {
        if (!wallet) return;
        setIsLoading(true);
        try {
            const result = await client.runMethod(
                Address.parse(STAKING_FARM_ADDRESS), 
                "get_player_info", 
                [{ type: 'slice', cell: beginCell().storeAddress(Address.parse(wallet.account.address)).endCell() }]
            );
            const hashPower = result.stack.readBigNumber();
            const pendingRewards = result.stack.readBigNumber();
            setFarmData({ hashPower: Number(hashPower), pendingRewards: Number(pendingRewards) });
        } catch (error) { 
            console.error("Błąd pobierania danych z farmy:", error); 
        } finally {
            setIsLoading(false);
        }
    }, [wallet, client]);

    const handleClaim = () => {
        // POPRAWIONY OpCode dla ClaimRewards
        const claimOpCode = 1906195048; // ✅ Poprawny z sources/output/staking_farm_StakingFarm.ts
        
        const body = beginCell()
            .storeUint(claimOpCode, 32)
            .storeUint(BigInt(Date.now()), 64)
            .endCell();
        handleTransaction(STAKING_FARM_ADDRESS, toNano('0.05').toString(), body.toBoc().toString("base64"));
    };

    const fetchInventory = useCallback(async () => {
        if (!wallet) return;
        setIsLoading(true);
        setInventory([]);
        setInventoryError(null);
        try {
            const playerAddress = Address.parse(wallet.account.address);
            const collectionAddress = Address.parse(NFT_COLLECTION_ADDRESS);

            console.log("Fetching NFTs for address:", playerAddress.toString());
            console.log("From collection:", collectionAddress.toString());

            // NAJPIERW spróbuj przez TonAPI
            const rawAddress = playerAddress.toRawString();
            const apiUrl = `https://testnet.tonapi.io/v2/accounts/${rawAddress}/nfts?collection=${collectionAddress.toString()}&limit=100&offset=0&indirect_ownership=false`;
            console.log("API URL:", apiUrl);
            
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const data = await response.json();
                console.log("API response data:", data);

                if (data.nft_items && data.nft_items.length > 0) {
                    console.log("Found NFTs via API:", data.nft_items.length);
                    const items = data.nft_items.map(item => ({
                        address: item.address,
                        name: item.metadata?.name || "Mining Rig Basic",
                        description: item.metadata?.description || "Sprzęt górniczy"
                    }));
                    setInventory(items);
                    return; // Kończymy tutaj jeśli znaleźliśmy NFT
                }
            }

            // JEŚLI TonAPI nie znalazł NFT, sprawdź stan kolekcji
            console.log("TonAPI didn't find NFTs, checking collection state...");
            
            const collectionUrl = `https://testnet.tonapi.io/v2/nfts/collections/${collectionAddress.toString()}`;
            const collectionResponse = await fetch(collectionUrl);
            
            if (collectionResponse.ok) {
                const collectionData = await collectionResponse.json();
                console.log("Collection data:", collectionData);
                
                const nextItemIndex = collectionData.next_item_index || 0;
                console.log("Collection has", nextItemIndex, "NFTs");
                
                if (nextItemIndex > 0) {
                    // Utwórz NFT na podstawie stanu kolekcji
                    const mockNFTs = [];
                    for (let i = 0; i < nextItemIndex; i++) {
                        mockNFTs.push({
                            address: `collection_nft_${i}`,
                            name: "Mining Rig Basic",
                            description: "Sprzęt górniczy (symulowany - staking niedostępny)"
                        });
                    }
                    console.log("Created mock NFTs based on collection state:", mockNFTs);
                    setInventory(mockNFTs);
                } else {
                    console.log("Collection is empty");
                    setInventory([]);
                }
            } else {
                console.log("Failed to fetch collection data");
                setInventory([]);
            }
        } catch (error) {
            console.error("Błąd pobierania ekwipunku:", error);
            setInventoryError("❌ Nie udało się pobrać ekwipunku. Spróbuj ponownie za chwilę.");
        } finally {
            setIsLoading(false);
        }
    }, [wallet]);
    
    const handleStake = (nftAddress) => {
        // Sprawdź czy to mock NFT
        if (nftAddress.startsWith('collection_nft_')) {
            alert("⚠️ To jest symulowany NFT. Staking nie jest dostępny dla symulowanych NFT. Aby używać stakingu, potrzebujemy prawdziwych adresów NFT z blockchain.");
            return;
        }
        
        const body = beginCell()
            .storeUint(0x5fcc3d14, 32) // Standardowy OpCode dla NftTransfer
            .storeUint(BigInt(Date.now()), 64)
            .storeAddress(Address.parse(STAKING_FARM_ADDRESS))
            .storeAddress(Address.parse(wallet.account.address))
            .storeBit(false)
            .storeCoins(toNano('0.01'))
            .storeBit(false)
            .endCell();
        handleTransaction(nftAddress, toNano('0.1').toString(), body.toBoc().toString("base64"));
    };

    const handleMint = () => {
        // DOKŁADNIE taka sama metadatabase jak w skrypcie (skomplikowana z ref)
        const metadataCell = beginCell()
            .storeStringTail("Mining Rig Basic")
            .storeRef(
                beginCell()
                    .storeStringTail("https://example.com/nft/1.json")
                    .endCell()
            )
            .endCell();
        
        // POPRAWIONY OpCode dla Mint
        const mintOpCode = 3871065451; // ✅ Poprawny z sources/output/nft_collection_NftCollection.ts
        
        const body = beginCell()
            .storeUint(mintOpCode, 32)
            .storeUint(BigInt(Date.now()), 64)
            .storeAddress(Address.parse(wallet.account.address))
            .storeRef(metadataCell)
            .endCell();
        
        // DOKŁADNIE taki sam gas jak skrypt: 0.1 TON
        handleTransaction(NFT_COLLECTION_ADDRESS, toNano('0.1').toString(), body.toBoc().toString("base64"));
    };
    
    useEffect(() => {
        if (wallet) {
            fetchFarmData();
            fetchInventory();
        } else {
            setFarmData(null);
            setInventory([]);
        }
    }, [wallet, fetchFarmData, fetchInventory]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md mx-auto bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl shadow-blue-500/20 border border-blue-500/20 p-6 text-center">
                <header className="mb-6">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent drop-shadow-lg">
                        ⛏️ TON Miner Tycoon 💎
                    </h1>
                    <div className="mt-4">
                        <TonConnectButton className="hover:scale-105 transition-transform duration-200" />
                    </div>
                </header>
                
                <nav className="flex justify-center border-b border-gray-700/50 mb-6">
                    <button 
                        onClick={() => setView('farm')} 
                        className={`py-3 px-5 text-lg font-semibold transition-all duration-300 rounded-t-lg ${
                            view === 'farm' 
                                ? 'text-amber-400 border-b-2 border-amber-400 bg-gradient-to-t from-amber-400/10 to-transparent' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                        }`}
                    >
                        🏭 Farma
                    </button>
                    <button 
                        onClick={() => setView('inventory')} 
                        className={`py-3 px-5 text-lg font-semibold transition-all duration-300 rounded-t-lg ${
                            view === 'inventory' 
                                ? 'text-amber-400 border-b-2 border-amber-400 bg-gradient-to-t from-amber-400/10 to-transparent' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                        }`}
                    >
                        🎒 Ekwipunek
                    </button>
                    <button 
                        onClick={() => setView('shop')} 
                        className={`py-3 px-5 text-lg font-semibold transition-all duration-300 rounded-t-lg ${
                            view === 'shop' 
                                ? 'text-amber-400 border-b-2 border-amber-400 bg-gradient-to-t from-amber-400/10 to-transparent' 
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                        }`}
                    >
                        🏪 Sklep
                    </button>
                </nav>

                <main>
                    {view === 'farm' && (
                        wallet ? (
                            <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl text-left space-y-4 border border-gray-600/30">
                                {isLoading ? (
                                    <div className="text-center">
                                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                        <p className="text-blue-300">⚡ Wczytywanie danych farmy...</p>
                                    </div>
                                ) : farmData ? (
                                    <>
                                        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 rounded-xl border border-blue-500/30">
                                            <p className="text-lg"><strong className="text-blue-300">⚡ Moc Obliczeniowa:</strong> <span className="text-yellow-400 font-bold">{farmData.hashPower} H/s</span></p>
                                        </div>
                                        <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 p-4 rounded-xl border border-green-500/30">
                                            <p className="text-lg"><strong className="text-green-300">💰 Oczekujące Nagrody:</strong> <span className="text-yellow-400 font-bold">{(farmData.pendingRewards / 1e9).toFixed(4)} TMT</span></p>
                                        </div>
                                        <button 
                                            onClick={handleClaim} 
                                            disabled={isProcessing || !farmData || farmData.pendingRewards === 0} 
                                            className={`w-full mt-4 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                                                isProcessing 
                                                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                                                    : farmData && farmData.pendingRewards > 0
                                                        ? 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 active:scale-95 animate-pulse'
                                                        : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                                            }`}
                                        >
                                            {isProcessing ? "⏳ Przetwarzanie..." : "💰 Odbierz Nagrody"}
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-center p-4">
                                        <p className="text-red-400">❌ Nie udało się załadować danych farmy.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl border border-gray-600/30">
                                <div className="text-center">
                                    <p className="text-xl text-gray-300 mb-4">🔐 Połącz portfel, aby rozpocząć mining!</p>
                                    <div className="text-6xl mb-4">⛏️</div>
                                </div>
                            </div>
                        )
                    )}

                    {view === 'inventory' && (
                         wallet ? (
                            <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl text-left space-y-4 border border-gray-600/30">
                                 <h2 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                    🎒 Twój Sprzęt
                                 </h2>
                                {isLoading && inventory.length === 0 && (
                                    <div className="text-center">
                                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                        <p className="text-blue-300">🔍 Skanowanie portfela...</p>
                                    </div>
                                )}
                                {inventoryError && <p className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/30">{inventoryError}</p>}
                                
                                {inventory.length > 0 && inventory.map(item => (
                                    <NftItem key={item.address} item={item} onStake={handleStake} isProcessing={isProcessing} />
                                ))}

                                {!isLoading && inventory.length === 0 && !inventoryError && (
                                    <div className="text-center p-6">
                                        <div className="text-6xl mb-4">📦</div>
                                        <p className="text-gray-300">Nie masz żadnego sprzętu.</p>
                                        <p className="text-blue-400 mt-2">🏪 Zdobądź go w sklepie!</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl border border-gray-600/30">
                                <div className="text-center">
                                    <p className="text-xl text-gray-300 mb-4">🔐 Połącz portfel, aby zobaczyć ekwipunek!</p>
                                    <div className="text-6xl mb-4">🎒</div>
                                </div>
                            </div>
                        )
                    )}

                    {view === 'shop' && (
                        wallet ? (
                            <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl text-left space-y-4 border border-gray-600/30">
                                <h2 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                                    🏪 Sklep ze Sprzętem
                                </h2>
                                <div className="border border-green-500/30 bg-gradient-to-r from-green-600/20 to-emerald-600/20 p-6 rounded-2xl hover:border-green-400/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
                                    <div className="text-center mb-4">
                                        <div className="text-4xl mb-2">🖥️</div>
                                        <h3 className="text-xl font-semibold text-green-300">Basic GPU</h3>
                                        <p className="text-sm text-gray-300 mt-2">⚡ Moc: <span className="text-yellow-400 font-bold">100 H/s</span></p>
                                    </div>
                                    <button 
                                        onClick={handleMint} 
                                        disabled={isProcessing} 
                                        className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                                            isProcessing 
                                                ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                                                : 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 active:scale-95'
                                        }`}
                                    >
                                        {isProcessing ? "⏳ Tworzenie..." : "🎁 Zdobądź (za darmo)"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm p-6 rounded-2xl border border-gray-600/30">
                                <div className="text-center">
                                    <p className="text-xl text-gray-300 mb-4">🔐 Połącz portfel, aby robić zakupy!</p>
                                    <div className="text-6xl mb-4">🏪</div>
                                </div>
                            </div>
                        )
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;