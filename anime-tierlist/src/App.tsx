import { useState } from 'react';
import type { MalList, Screen, TierlistSave } from './types';
import ImportScreen from './screens/ImportScreen';
import SetupScreen from './screens/SetupScreen';
import type { SetupResult } from './screens/SetupScreen';
import TierlistScreen from './screens/TierlistScreen';
import type { TierlistSource } from './screens/TierlistScreen';

export default function App() {
  const [screen, setScreen] = useState<Screen>('import');
  const [list, setList] = useState<MalList | null>(null);
  const [setup, setSetup] = useState<SetupResult | null>(null);
  const [source, setSource] = useState<TierlistSource | null>(null);

  function loadList(newList: MalList) {
    setList(newList);
    setSetup(null);
  }

  function openSave(save: TierlistSave) {
    setSource({ type: 'save', save });
    setScreen('tierlist');
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>Anime Tierlist</h1>
      </header>
      {screen === 'import' && (
        <ImportScreen list={list} onLoad={loadList} onOpenSave={openSave} onNext={() => setScreen('setup')} />
      )}
      {screen === 'setup' && list && (
        <SetupScreen
          list={list}
          initial={setup}
          onBack={() => setScreen('import')}
          onNext={(result) => {
            setSetup(result);
            setSource({ type: 'load', userName: list.userName, setup: result });
            setScreen('tierlist');
          }}
        />
      )}
      {screen === 'tierlist' && source && (
        <TierlistScreen
          source={source}
          onBack={() => setScreen(source.type === 'load' ? 'setup' : 'import')}
        />
      )}
    </main>
  );
}
