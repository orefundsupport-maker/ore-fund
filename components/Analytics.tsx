'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

const GA_MEASUREMENT_ID = 'G-8TTQV42GW0';

export default function Analytics() {
  const [shouldTrack, setShouldTrack] = useState(false);

  useEffect(() => {
    // ?admin=true が付いていたら除外フラグをセット
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      localStorage.setItem('ignore_ga', 'true');
      alert('この端末からのアクセスをGA4計測から除外しました');
    }

    // フラグがなければ計測を許可
    if (localStorage.getItem('ignore_ga') !== 'true') {
      setShouldTrack(true);
    }
  }, []);

  if (!shouldTrack) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `,
        }}
      />
    </>
  );
}