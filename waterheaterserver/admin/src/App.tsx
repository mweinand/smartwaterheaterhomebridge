import { Details } from './Details';
import { WaterHeaterList } from './WaterHeaterList';

export function App() {
  const match = /^\/admin\/water-heaters\/([^/]+)\/?$/.exec(window.location.pathname);
  if (match) {
    try {
      const deviceId = decodeURIComponent(match[1]);
      return <Details key={deviceId} deviceId={deviceId} />;
    } catch {
      return <main><p role="alert">Invalid water heater URL.</p><a href="/admin/">All water heaters</a></main>;
    }
  }
  return <WaterHeaterList />;
}
