import { useState } from 'react';
import { KendoTable } from '../kendo/table';
import { useEffect } from 'react';

type InitialData = {
  columns: { field: string; title?: string }[];
  rows: Array<Record<string, any>>;
  total: number;
  filters: { project: string; status: string; limit: number; offset: number };
};

export function meta() {
  return [{ title: 'Kendo table' }];
}

export const loader = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const host = url.host;
  const pathname = url.pathname;

  return { url: request.url, host, pathname };
};

export default function KTable(props: any) {
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

        if (rd?.rows && rd?.columns) {
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

  if (!data?.rows) return <div style={{ padding: 12 }}>No rows to display.</div>;

  return <KendoTable data={data} />;
}
