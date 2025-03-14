import { useEffect, useState } from 'react';
import { dexFactory, Client } from "@ston-fi/sdk";
import { TonConnectButton, useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { StonApiClient, AssetTag } from '@ston-fi/api';

function App() {
  const [tonConnectUI] = useTonConnectUI();
  const userAddress = useTonAddress();
  const [assets, setAssets] = useState([]);
  const [fromAsset, setFromAsset] = useState(null);
  const [toAsset, setToAsset] = useState(null);
  const [amount, setAmount] = useState('');
  const [simulationResult, setSimulationResult] = useState(null);

  // Single function to handle changes in "From", "To", and "Amount"
  // Clears the simulation result each time any input changes
  const handleChange = (setter) => (e) => {
    const value = e.target.value;
    
    if (setter === setFromAsset || setter === setToAsset) {
      const selectedAsset = assets.find(asset => asset.contractAddress === value);
      setter(selectedAsset);
    } else {
      setter(value);
    }
    
    setSimulationResult(null);
  };

  // Helper to find an asset by address and return a consistent object
  const getAssetInfo = (asset) => {
    if (!asset) return { symbol: 'token', decimals: 1e9 };

    // Determine display symbol
    const symbol = asset.meta?.symbol || asset.meta?.displayName || 'token';

    // Determine decimals
    let decimals = 1e9;
    if (asset.kind === 'Jetton') {
      decimals = asset.meta?.decimals ? 10 ** asset.meta.decimals : 1e6;
    }

    return { symbol, decimals };
  };

  // Fetch assets on mount
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const client = new StonApiClient();
        const condition = [
          AssetTag.LiquidityVeryHigh,
          AssetTag.LiquidityHigh,
          AssetTag.LiquidityMedium,
        ].join(' | ');
        const assetList = await client.queryAssets({ condition });

        setAssets(assetList);
        if (assetList[0]) setFromAsset(assetList[0]);
        if (assetList[1]) setToAsset(assetList[1]);
      } catch (err) {
        console.error('Failed to fetch assets:', err);
      }
    };
    fetchAssets();
  }, []);

  // Simulate swap
  const handleSimulate = async () => {
    if (!fromAsset || !toAsset || !amount) return;
    try {
      const { decimals: fromDecimals } = getAssetInfo(fromAsset);
      const client = new StonApiClient();

      const result = await client.simulateSwap({
        offerAddress: fromAsset.contractAddress,
        askAddress: toAsset.contractAddress,
        slippageTolerance: '0.01',
        offerUnits: BigInt(Math.floor(Number(amount) * fromDecimals)).toString(),
      });
      setSimulationResult(result);
    } catch (err) {
      console.error('Simulation failed:', err);
      setSimulationResult(null);
    }
  };

  // Shortcut to display either symbol or 'token'
  const displaySymbol = (asset) => getAssetInfo(asset).symbol;

  const handleSwap = async () => {
    if (!fromAsset || !toAsset || !amount || !userAddress) {
      alert('Please connect wallet and enter swap details.');
      return;
    }

    if(!simulationResult) {
      alert('Please simulate the swap first.');
      return;
    }
  
    try {
      // 1. Initialize API client
      const tonApiClient = new Client({
        endpoint: "https://toncenter.com/api/v2/jsonRPC",
      });
      
      // 2. Get router metadata and create DEX instance
      const client = new StonApiClient();
      const routerMetadata = await client.getRouter(simulationResult.routerAddress);
      const dexContracts = dexFactory(routerMetadata);
      const router = tonApiClient.open(
        dexContracts.Router.create(routerMetadata.address)
      );
      
      // 3. Prepare common transaction parameters
      const sharedTxParams = {
        userWalletAddress: userAddress,
        offerAmount: simulationResult.offerUnits,
        minAskAmount: simulationResult.minAskUnits,
      };
      
      // 4. Determine swap type and get transaction parameters
      const getSwapParams = () => {
        // TON -> Jetton
        if (fromAsset.kind === 'Ton') {
          return router.getSwapTonToJettonTxParams({
            ...sharedTxParams,
            proxyTon: dexContracts.pTON.create(routerMetadata.ptonMasterAddress),
            askJettonAddress: simulationResult.askAddress,
          });
        } 
        // Jetton -> TON
        if (toAsset.kind === 'Ton') {
          return router.getSwapJettonToTonTxParams({
            ...sharedTxParams,
            proxyTon: dexContracts.pTON.create(routerMetadata.ptonMasterAddress),
            offerJettonAddress: simulationResult.offerAddress,
          });
        }
        // Jetton -> Jetton (no proxyTon needed)
        return router.getSwapJettonToJettonTxParams({
          ...sharedTxParams,
          offerJettonAddress: simulationResult.offerAddress,
          askJettonAddress: simulationResult.askAddress,
        });
      };
      
      const swapParams = await getSwapParams();
      
      // 5. Send transaction via TonConnect
      await tonConnectUI.sendTransaction({
        validUntil: Date.now() + 5 * 60 * 1000,
        messages: [
          {
            address: swapParams.to.toString(),
            amount: swapParams.value.toString(),
            payload: swapParams.body?.toBoc().toString("base64"),
          }
        ]
      });
    } catch (err) {
      console.error('Swap failed:', err);
      alert('Swap transaction failed. See console for details.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-indigo-700">STON.fi Swap</h1>
          <TonConnectButton />
        </div>

        <div className="h-px bg-gray-200 w-full my-4"></div>

        {assets.length > 0 ? (
          <div className="space-y-6">
            {/* From */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">
                From
              </label>
              <select
                value={fromAsset?.contractAddress || ''}
                onChange={handleChange(setFromAsset)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                {assets.map((asset) => (
                  <option key={asset.contractAddress} value={asset.contractAddress}>
                    {asset.meta?.symbol || asset.meta?.displayName || 'token'}
                  </option>
                ))}
              </select>
            </div>

            {/* To */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">
                To
              </label>
              <select
                value={toAsset?.contractAddress || ''}
                onChange={handleChange(setToAsset)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              >
                {assets.map((asset) => (
                  <option key={asset.contractAddress} value={asset.contractAddress}>
                    {asset.meta?.symbol || asset.meta?.displayName || 'token'}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1">
                Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={handleChange(setAmount)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  {displaySymbol(fromAsset)}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleSimulate}
                className="flex-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium py-3 px-4 rounded-lg transition-all"
              >
                Simulate
              </button>
              <button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-all"
                onClick={handleSwap}
              >
                Swap
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center py-10">
            <div className="animate-pulse flex space-x-2">
              <div className="h-2 w-2 bg-indigo-500 rounded-full"></div>
              <div className="h-2 w-2 bg-indigo-500 rounded-full"></div>
              <div className="h-2 w-2 bg-indigo-500 rounded-full"></div>
            </div>
            <p className="ml-3 text-gray-600">Loading assets...</p>
          </div>
        )}
      </div>

      {/* Simulation result */}
      {simulationResult && (
        <div className="mt-4 w-full max-w-md bg-white rounded-xl shadow-lg p-4">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-800">Swap Summary</p>
            <div className="flex justify-center items-center space-x-2 mt-2">
              <p className="text-md font-bold">
                {amount} {displaySymbol(fromAsset)}
              </p>
              <span className="text-gray-500">→</span>
              <p className="text-md font-bold">
                {(Number(simulationResult.minAskUnits) / getAssetInfo(toAsset).decimals).toFixed(
                  getAssetInfo(toAsset).decimals === 1e9 ? 4 : 2
                )}{' '}
                {displaySymbol(toAsset)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 text-center text-xs text-gray-500">
        Powered by STON.fi
      </div>
    </div>
  );
}

export default App;