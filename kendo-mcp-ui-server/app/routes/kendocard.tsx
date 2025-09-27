import '@progress/kendo-theme-default/dist/all.css';
import { useState } from 'react';
import { Card } from '../kendo/card';
import { useEffect } from 'react';

type InitialData = {
  user: {
    avatar_url: string;
    firstname: string;
    lastname: string;
    inProgressTaskCount: number;
    doneTaskCount: number;
    todoTaskCount: number;
  }
};

export function meta() {
  return [{ title: 'Kendo card' }];
}

export const loader = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const host = url.host;
  const pathname = url.pathname;

  return { url: request.url, host, pathname };
};

export default function KCard(props: any) {
  const [data, setData] = useState<InitialData | null>(null);

  useEffect(() => {
      if (window && window.parent && document) {
          const resizeObserver = new ResizeObserver((entries) => {
              entries.forEach((entry) => {
                  window.parent.postMessage(
                  {
                      type: "ui-size-change",
                      payload: {
                      height: entry.contentRect.height,
                      },
                  },
                  "*",
                  );
              });
          });

          resizeObserver.observe(document.documentElement)
      }
  }, []);

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.type === 'ui-lifecycle-iframe-render-data') {
        const rd =
          ev.data?.payload?.renderData ??
          ev.data?.payload ??
          ev.data?.renderData; // extra fallback, harmless

        if (rd?.user) {
          setData(rd as InitialData);
        } else {
          console.warn('Render-data missing expected shape:', ev.data);
        }
      }
    };

    window.addEventListener('message', onMsg);
    window.parent?.postMessage({ type: 'ui-lifecycle-iframe-ready' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  if (!data?.user) return <div style={{ padding: 12 }}>No data to display</div>;

  return <Card data={data} />;
}
