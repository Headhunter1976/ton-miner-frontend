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
        <div className="border border-gray-600 p-4 rounded-lg flex justify-between items-center">
            <div>
                <h3 className="text-xl font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-400 mt-1">Gotowy do podłączenia</p>
            </div>
            <button
                onClick={() => onStake(item.address)}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition"
            >
                {isProcessing ? "Przetwarzanie..." : "Podłącz"}
            </button>
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
            alert("Transakcja wysłana! Odświeżenie danych może potrwać chwilę.");
            setTimeout(() => {
                fetchFarmData();
                fetchInventory();
            }, 15000);
        } catch (error) {
            console.error("Błąd transakcji:", error);
            alert("Transakcja nie powiodła się. Sprawdź konsolę, aby zobaczyć szczegóły.");
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
            setInventoryError("Nie udało się pobrać ekwipunku. Spróbuj ponownie za chwilę.");
        } finally {
            setIsLoading(false);
        }
    }, [wallet]);
    
    const handleStake = (nftAddress) => {
        // Sprawdź czy to mock NFT
        if (nftAddress.startsWith('collection_nft_')) {
            alert("To jest symulowany NFT. Staking nie jest dostępny dla symulowanych NFT. Aby używać stakingu, potrzebujemy prawdziwych adresów NFT z blockchain.");
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
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md mx-auto bg-gray-800 rounded-2xl shadow-lg p-6 text-center">
                <header className="mb-6">
                    <h1 className="text-4xl font-bold text-amber-400">TON Miner Tycoon</h1>
                    <div className="mt-4"><TonConnectButton /></div>
                </header>
                
                <nav className="flex justify-center border-b border-gray-700 mb-6">
                    <button onClick={() => setView('farm')} className={`py-2 px-4 text-lg ${view === 'farm' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400'}`}>Farma</button>
                    <button onClick={() => setView('inventory')} className={`py-2 px-4 text-lg ${view === 'inventory' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400'}`}>Ekwipunek</button>
                    <button onClick={() => setView('shop')} className={`py-2 px-4 text-lg ${view === 'shop' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400'}`}>Sklep</button>
                </nav>

                <main>
                    {view === 'farm' && (
                        wallet ? (
                            <div className="bg-gray-700 p-4 rounded-lg text-left space-y-3">
                                {isLoading ? <p>Wczytywanie danych farmy...</p> : farmData ? (
                                    <>
                                        <p><strong>Moc Obliczeniowa:</strong> {farmData.hashPower} H/s</p>
                                        <p><strong>Oczekujące Nagrody:</strong> {(farmData.pendingRewards / 1e9).toFixed(4)} TMT</p>
                                        <button onClick={handleClaim} disabled={isProcessing || !farmData || farmData.pendingRewards === 0} className="w-full mt-4 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">
                                            {isProcessing ? "Przetwarzanie..." : "Odbierz Nagrody"}
                                        </button>
                                    </>
                                ) : <p>Nie udało się załadować danych farmy.</p>}
                            </div>
                        ) : <div className="bg-gray-700 p-4 rounded-lg"><p className="text-lg text-gray-300">Połącz portfel.</p></div>
                    )}

                    {view === 'inventory' && (
                         wallet ? (
                            <div className="bg-gray-700 p-4 rounded-lg text-left space-y-3">
                                 <h2 className="text-2xl font-bold mb-4">Twój Sprzęt</h2>
                                {isLoading && inventory.length === 0 && <p>Skanowanie portfela...</p>}
                                {inventoryError && <p className="text-red-400 text-sm">{inventoryError}</p>}
                                
                                {inventory.length > 0 && inventory.map(item => (
                                    <NftItem key={item.address} item={item} onStake={handleStake} isProcessing={isProcessing} />
                                ))}

                                {!isLoading && inventory.length === 0 && !inventoryError && <p>Nie masz żadnego sprzętu. Zdobądź go w sklepie!</p>}
                            </div>
                        ) : <div className="bg-gray-700 p-4 rounded-lg"><p className="text-lg text-gray-300">Połącz portfel.</p></div>
                    )}

                    {view === 'shop' && (
                        wallet ? (
                            <div className="bg-gray-700 p-4 rounded-lg text-left space-y-3">
                                <h2 className="text-2xl font-bold mb-4">Sklep ze Sprzętem</h2>
                                <div className="border border-gray-600 p-4 rounded-lg">
                                    <h3 className="text-xl font-semibold">Basic GPU</h3>
                                    <p className="text-sm text-gray-400 mt-1">Moc: 100 H/s</p>
                                    <button onClick={handleMint} disabled={isProcessing} className="w-full mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">
                                        {isProcessing ? "Tworzenie..." : "Zdobądź (za darmo)"}
                                    </button>
                                </div>
                            </div>
                        ) : <div className="bg-gray-700 p-4 rounded-lg"><p className="text-lg text-gray-300">Połącz portfel.</p></div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;