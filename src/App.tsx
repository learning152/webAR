import { useState, useEffect } from 'react';
import './App.css';
import { LibraryLoader, LoadResult } from './utils/LibraryLoader';
import ParticleCanvas from './components/ParticleCanvas';

/**
 * 应用状态类型
 */
type AppState = 'loading' | 'loaded' | 'error';

/**
 * App 根组件
 * 负责外部库加载和应用入口管理
 */
function App() {
  const [state, setState] = useState<AppState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [loadResults, setLoadResults] = useState<LoadResult[]>([]);

  useEffect(() => {
    loadLibraries();
  }, []);

  /**
   * 加载所有必需的外部库
   */
  const loadLibraries = async () => {
    setState('loading');
    setError(null);

    try {
      const loader = new LibraryLoader();
      const results = await loader.loadAllLibraries();
      setLoadResults(results);

      // 检查是否所有库都加载成功
      const allSuccess = results.every(result => result.success);

      if (allSuccess) {
        setState('loaded');
      } else {
        // 找到第一个失败的库
        const failedResult = results.find(result => !result.success);
        if (failedResult) {
          const errorMessage = LibraryLoader.getErrorMessage(failedResult);
          setError(errorMessage);
          setState('error');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(`库加载失败: ${errorMessage}`);
      setState('error');
    }
  };

  /**
   * 渲染加载中 UI
   */
  const renderLoading = () => (
    <div className="app-container loading">
      <div className="loading-content">
        <div className="spinner" role="status" aria-label="加载中"></div>
        <h2>正在加载...</h2>
        <p>正在加载 Three.js 和 MediaPipe Hands 库</p>
        {loadResults.length > 0 && (
          <div className="load-progress">
            {loadResults.map((result, index) => (
              <div key={index} className="load-item">
                {result.success ? '✓' : '⏳'} {result.library}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  /**
   * 渲染错误 UI
   */
  const renderError = () => (
    <div className="app-container error">
      <div className="error-content">
        <div className="error-icon">⚠️</div>
        <h2>加载失败</h2>
        <p className="error-message">{error}</p>
        <button className="retry-button" onClick={loadLibraries}>
          重试
        </button>
        <div className="error-details">
          <h3>加载结果:</h3>
          {loadResults.map((result, index) => (
            <div key={index} className={`result-item ${result.success ? 'success' : 'failed'}`}>
              <span className="result-icon">{result.success ? '✓' : '✗'}</span>
              <span className="result-library">{result.library}</span>
              {result.error && <span className="result-error">: {result.error}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /**
   * 渲染主应用 UI
   */
  const renderApp = () => (
    <div className="app-container loaded">
      <ParticleCanvas
        particleCount={16000}
        showUIControls={true}
        showDebugInfo={true}
        onGestureChange={(gesture) => {
          console.log('手势变化:', gesture);
        }}
        onError={(err) => {
          console.error('ParticleCanvas 错误:', err);
          setError(err);
          setState('error');
        }}
      />
    </div>
  );

  // 根据状态渲染不同的 UI
  if (state === 'loading') {
    return renderLoading();
  }

  if (state === 'error') {
    return renderError();
  }

  return renderApp();
}

export default App;
