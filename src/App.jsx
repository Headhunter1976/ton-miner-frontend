import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { TonClient, Address } from "@ton/ton";
import { toNano, beginCell } from '@ton/core';

// --- Konfiguracja Gry ---

const STAKING_FARM_ADDRESS = "EQC8MN1ykQZtHHHrWHGSOFyMB7tihHyL3paweoV8DFcJ7V3g";
const NFT_COLLECTION_ADDRESS = "EQA1W7wNN-dwYQIcfUZXk8BEZsNGlGiWB3sskFrYLPZis36m";

const MINING_FARMS = {
    earth: { name: "Earth Base", emoji: "🌍", description: "Podstawowa farma na Ziemi", efficiency: 1.0, energyCost: 0.5, temperature: "20°C", unlockLevel: 1, background: "from-green-900/30 to-blue-900/30", border: "border-green-500/30" },
    arctic: { name: "Arctic Mine", emoji: "🌨️", description: "Zimna kopalnia z naturalnym chłodzeniem", efficiency: 1.2, energyCost: 0.3, temperature: "-40°C", unlockLevel: 2, background: "from-cyan-900/30 to-blue-900/30", border: "border-cyan-500/30" },
    desert: { name: "Desert Solar", emoji: "🏜️", description: "Pustynna farma solarna", efficiency: 1.5, energyCost: 0.1, temperature: "45°C", unlockLevel: 3, background: "from-yellow-900/30 to-orange-900/30", border: "border-yellow-500/30" },
    space: { name: "Space Station", emoji: "🚀", description: "Kosmiczna stacja mining", efficiency: 2.0, energyCost: 0.8, temperature: "-270°C", unlockLevel: 4, background: "from-purple-900/30 to-indigo-900/30", border: "border-purple-500/30" }
};

const EQUIPMENT_TYPES = {
    basic: { name: "Basic GPU", emoji: "🖥️", hashPower: 100, price: 0, level: 1, description: "Podstawowy sprzęt do kopania", coinsPerSecond: 0.01 },
    advanced: { name: "Advanced ASIC", emoji: "⚡", hashPower: 500, price: 0.5, level: 2, description: "Profesjonalny miner ASIC", coinsPerSecond: 0.05 },
    quantum: { name: "Quantum Miner", emoji: "⚛️", hashPower: 2000, price: 2.0, level: 3, description: "Futurystyczny quantum processor", coinsPerSecond: 0.2 },
    fusion: { name: "Fusion Core", emoji: "🌟", hashPower: 10000, price: 10.0, level: 4, description: "Najlepszy sprzęt w galaktyce", coinsPerSecond: 1.0 }
};

const ACHIEVEMENTS = {
    firstMiner: { name: "First Steps", emoji: "👶", description: "Kup swój pierwszy sprzęt", requirement: 1 },
    powerUser: { name: "Power User", emoji: "💪", description: "Osiągnij 1000 H/s", requirement: 1000 },
    tycoon: { name: "Mining Tycoon", emoji: "👑", description: "Osiągnij 10000 H/s", requirement: 10000 },
    collector: { name: "Collector", emoji: "🎒", description: "Posiadaj 5 NFT", requirement: 5 },
    millionaire: { name: "Millionaire", emoji: "💎", description: "Zarobić 1000 TMT", requirement: 1000 },
    explorer: { name: "Space Explorer", emoji: "🚀", description: "Odblokuj farmę kosmiczną", requirement: 1 },
    gamer: { name: "Mini-Game Master", emoji: "🎮", description: "Zagraj w każdą mini-grę", requirement: 3 },
    clicker: { name: "Click Master", emoji: "👆", description: "Kliknij 1000 razy", requirement: 1000 }
};

const DAILY_REWARDS = [
    { day: 1, reward: 10, type: "coins", emoji: "💰", name: "10 TMT" },
    { day: 2, reward: 20, type: "coins", emoji: "💰", name: "20 TMT" },
    { day: 3, reward: 50, type: "coins", emoji: "💰", name: "50 TMT" },
    { day: 4, reward: 100, type: "coins", emoji: "💰", name: "100 TMT" },
    { day: 5, reward: 0.1, type: "ton", emoji: "💎", name: "0.1 TON" },
    { day: 6, reward: 200, type: "coins", emoji: "💰", name: "200 TMT" },
    { day: 7, reward: 1, type: "nft", emoji: "🎁", name: "Free NFT" }
];

const SLOT_SYMBOLS = ["💎", "🎯", "⚡", "🚀", "🌟", "💰", "🎁", "🔥"];

// --- Komponenty Pomocnicze ---

function AnimatedNumber({ value, suffix = "", prefix = "" }) {
    const [displayValue, setDisplayValue] = useState(value);
    useEffect(() => {
        if (value !== displayValue) {
            const duration = 500;
            const steps = 20;
            const stepValue = (value - displayValue) / steps;
            const stepTime = duration / steps;
            let currentStep = 0;
            const timer = setInterval(() => {
                currentStep++;
                if (currentStep >= steps) {
                    setDisplayValue(value);
                    clearInterval(timer);
                } else {
                    setDisplayValue(prev => prev + stepValue);
                }
            }, stepTime);
            return () => clearInterval(timer);
        }
    }, [value, displayValue]);

    return (
        <span className="font-bold text-yellow-400 transition-all duration-300">
            {prefix}{value.toFixed(4)}{suffix}
        </span>
    );
}

// ... (Inne komponenty pomocnicze i minigier, jak PuzzleGame, ClickerGame, SlotMachine zostają bez zmian)
// ... (komponent NftItem zostaje bez zmian)

function FarmCard({ farmKey, farm, isSelected, isUnlocked, onSelect }) {
     return (
        <div 
            onClick={() => isUnlocked && onSelect(farmKey)}
            className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                !isUnlocked 
                    ? 'opacity-50 cursor-not-allowed border-gray-500/30 bg-gray-600/20'
                    : isSelected
                        ? `${farm.border} bg-gradient-to-br ${farm.background} shadow-lg transform scale-105`
                        : `${farm.border} bg-gradient-to-br ${farm.background} hover:scale-102 hover:shadow-md`
            }`}
        >
            <div className="text-center">
                <div className="text-4xl mb-2">{farm.emoji}</div>
                <h3 className="font-bold text-white text-lg">{farm.name}</h3>
                <p className="text-xs text-gray-300 mt-1">{farm.description}</p>
                <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                        <span className="text-blue-300">🌡️ Temperatura:</span>
                        <span className="text-white font-bold">{farm.temperature}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-green-300">⚡ Efektywność:</span>
                        <span className="text-green-400 font-bold">{(farm.efficiency * 100)}%</span>
                    </div>
                </div>
                {!isUnlocked && (
                    <div className="mt-3 py-1 px-3 bg-gray-600/50 rounded-lg">
                        <span className="text-gray-300 text-xs">🔒 Wymagany Poziom {farm.unlockLevel}</span>
                    </div>
                )}
                {isSelected && isUnlocked && (
                    <div className="mt-3 py-1 px-3 bg-amber-500/30 rounded-lg border border-amber-400/50">
                        <span className="text-amber-300 text-xs font-bold">✅ Aktywna farma</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function NftItem({ item, onStake, isProcessing }) {
    return (
        <div className="border border-gray-600 p-4 rounded-lg flex justify-between items-center">
            <div>
                <h3 className="text-xl font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-400 mt-1">{item.description}</p>
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

// --- Główny Komponent Aplikacji ---

function App() {
    const wallet = useTonWallet();
    const [tonConnectUI] = useTonConnectUI();
    const [view, setView] = useState('farm');
    const [farmData, setFarmData] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [inventoryError, setInventoryError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedFarm, setSelectedFarm] = useState('earth');

    const client = useMemo(() => new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC'
    }), []);

    // --- LOGIKA DANYCH I API ---
    
    const fetchAllData = useCallback(async () => {
        if (!wallet) return;
        setIsLoading(true);
        console.log("Fetching all data...");
        try {
            await Promise.all([
                fetchFarmData(),
                fetchInventory()
            ]);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [wallet]);

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
            setTimeout(fetchAllData, 15000);
        } catch (error) {
            console.error("Błąd transakcji:", error);
            alert("❌ Transakcja nie powiodła się.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const fetchFarmData = useCallback(async () => {
        if (!wallet) return;
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
            setFarmData(null); // Resetuj w przypadku błędu
        }
    }, [wallet, client]);

    const handleClaim = () => {
        const claimOpCode = 1906195048; 
        const body = beginCell().storeUint(claimOpCode, 32).storeUint(BigInt(Date.now()), 64).endCell();
        handleTransaction(STAKING_FARM_ADDRESS, toNano('0.05').toString(), body.toBoc().toString("base64"));
    };

    const fetchInventory = useCallback(async () => {
        if (!wallet) return;
        setInventory([]);
        setInventoryError(null);
        try {
            const playerAddress = Address.parse(wallet.account.address);
            const collectionAddress = Address.parse(NFT_COLLECTION_ADDRESS);
            const response = await fetch(`https://testnet.tonapi.io/v2/accounts/${playerAddress.toString()}/nfts?collection=${collectionAddress.toString()}&limit=100&offset=0&indirect_ownership=false`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();

            if (data.nft_items) {
                 const items = data.nft_items.map(item => ({
                    address: item.address,
                    name: item.metadata?.name || "Nieznane GPU",
                    description: item.metadata?.description || "Brak opisu"
                }));
                setInventory(items);
            }
        } catch (error) {
            console.error("Błąd pobierania ekwipunku:", error);
            setInventoryError("Nie udało się pobrać ekwipunku.");
        }
    }, [wallet]);
    
    const handleStake = (nftAddress) => {
        const body = beginCell()
            .storeUint(0x5fcc3d14, 32)
            .storeUint(BigInt(Date.now()), 64)
            .storeAddress(Address.parse(STAKING_FARM_ADDRESS))
            .storeAddress(Address.parse(wallet.account.address))
            .storeBit(false)
            .storeCoins(toNano('0.01'))
            .storeBit(false)
            .endCell();
        handleTransaction(nftAddress, toNano('0.1').toString(), body.toBoc().toString("base64"));
    };

    const handleMint = (type) => {
        const equipment = EQUIPMENT_TYPES[type];
        const metadataCell = beginCell()
            .storeStringTail(JSON.stringify({
                name: equipment.name,
                description: equipment.description,
                image: "https://<twoja-nazwa>.vercel.app/gpu.png"
            }))
            .endCell();
        
        const mintOpCode = 3871065451; 
        
        const body = beginCell()
            .storeUint(mintOpCode, 32)
            .storeUint(BigInt(Date.now()), 64)
            .storeAddress(Address.parse(wallet.account.address))
            .storeRef(metadataCell)
            .endCell();
        handleTransaction(NFT_COLLECTION_ADDRESS, toNano('0.1').toString(), body.toBoc().toString("base64"));
    };
    
    useEffect(() => {
        if (wallet) {
            fetchAllData();
        } else {
            setFarmData(null);
            setInventory([]);
        }
    }, [wallet, fetchAllData]);

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
                                <h2 className="text-2xl font-bold mb-4 text-center">Panel Farmy</h2>
                                {isLoading ? <p>Wczytywanie danych farmy...</p> : farmData ? (
                                    <>
                                        <p><strong>Moc Obliczeniowa:</strong> {farmData.hashPower} H/s</p>
                                        <p><strong>Oczekujące Nagrody:</strong> <AnimatedNumber value={farmData.pendingRewards / 1e9} suffix=" TMT" /></p>
                                        <button onClick={handleClaim} disabled={isProcessing || !farmData || farmData.pendingRewards === 0} className="w-full mt-4 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">
                                            {isProcessing ? "Przetwarzanie..." : "Odbierz Nagrody"}
                                        </button>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            {Object.entries(MINING_FARMS).map(([key, farm]) => (
                                                <FarmCard 
                                                    key={key} 
                                                    farmKey={key} 
                                                    farm={farm} 
                                                    isSelected={selectedFarm === key} 
                                                    isUnlocked={unlockedFarms[key]} 
                                                    onSelect={setSelectedFarm}
                                                />
                                            ))}
                                        </div>
                                    </>
                                ) : <p>Nie udało się załadować danych farmy.</p>}
                            </div>
                        ) : <div className="bg-gray-700 p-4 rounded-lg"><p className="text-lg text-gray-300">Połącz portfel, aby zobaczyć swoją farmę.</p></div>
                    )}

                    {view === 'inventory' && (
                         wallet ? (
                            <div className="bg-gray-700 p-4 rounded-lg text-left space-y-3">
                                 <h2 className="text-2xl font-bold mb-4">Twój Sprzęt</h2>
                                {isLoading && <p>Skanowanie portfela...</p>}
                                {inventoryError && <p className="text-red-400 text-sm">{inventoryError}</p>}
                                
                                {inventory.length > 0 ? inventory.map(item => (
                                    <NftItem key={item.address} item={item} onStake={handleStake} isProcessing={isProcessing} />
                                )) : !isLoading && <p>Nie masz żadnego sprzętu. Zdobądź go w sklepie!</p>}
                            </div>
                        ) : <div className="bg-gray-700 p-4 rounded-lg"><p className="text-lg text-gray-300">Połącz portfel, aby zobaczyć ekwipunek.</p></div>
                    )}

                    {view === 'shop' && (
                        wallet ? (
                            <div className="bg-gray-700 p-4 rounded-lg text-left space-y-3">
                                <h2 className="text-2xl font-bold mb-4">Sklep ze Sprzętem</h2>
                                {Object.entries(EQUIPMENT_TYPES).map(([key, eq]) => (
                                    <div key={key} className="border border-gray-600 p-4 rounded-lg">
                                        <h3 className="text-xl font-semibold">{eq.emoji} {eq.name}</h3>
                                        <p className="text-sm text-gray-400 mt-1">Moc: {eq.hashPower} H/s</p>
                                        <p className="text-sm text-gray-400">Koszt: {eq.price} TON</p>
                                        <button onClick={() => handleMint(key)} disabled={isProcessing} className="w-full mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">
                                            {isProcessing ? "Przetwarzanie..." : "Kup"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="bg-gray-700 p-4 rounded-lg"><p className="text-lg text-gray-300">Połącz portfel, aby wejść do sklepu.</p></div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;
