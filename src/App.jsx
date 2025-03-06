import { useEffect, useState } from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';
import { StonApiClient } from '@ston-fi/api';
import './App.css';

// Styles cpuld be moved to App.css as class for better separation of concerns
// Alternatively, consider using Tailwind CSS for utility-based styling
const containerStyles = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh'
};

function App() {
  const [assets, setAssets] = useState([]);
  const [fromAsset, setFromAsset] = useState(null);
  const [toAsset, setToAsset] = useState(null);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    const client = new StonApiClient();
    // Fetch all available DEX assets (tokens)
    client.getAssets().then(assetList => {
      setAssets(assetList);
      // Optionally, set some default selections:
      if (assetList.length > 0) {
        setFromAsset(assetList[0].address); // first asset
        if (assetList.length > 1) {
          setToAsset(assetList[1].address); // second asset
        }
      }
    });
  }, []);

  return (
    <div style={containerStyles}>
      <h1>STON.fi Swap Demo</h1>
      <TonConnectButton />

      {assets.length > 0 ? (
        <div style={{ margin: '20px 0' }}>
          <label>
            From:{' '}
            <select value={fromAsset || ''} onChange={e => setFromAsset(e.target.value)}>
              {assets.map(asset => (
                <option key={asset.address} value={asset.address}>
                  {asset.symbol}
                </option>
              ))}
            </select>
          </label>
          <label style={{ marginLeft: '10px' }}>
            To:{' '}
            <select value={toAsset || ''} onChange={e => setToAsset(e.target.value)}>
              {assets.map(asset => (
                <option key={asset.address} value={asset.address}>
                  {asset.symbol}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <p>Loading assets...</p>
      )}

      <div>
        <input
          type="number"
          placeholder="Amount to swap"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
        <span>
          {' '}
          (in {fromAsset ? assets.find(a => a.address === fromAsset)?.symbol : 'token'} units)
        </span>
      </div>

      {/* We'll add simulate and swap buttons below */}
    </div>
  );
}

export default App;