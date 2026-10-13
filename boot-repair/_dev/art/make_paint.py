# 칠한 부츠 그림(SVG)을 만든다. worn=True면 닳은 판.
import sys
def boot(worn=False, bg=True, w=1000, h=700, vb="0 0 1000 700", light=(300,420), welt_stitch=True):
    lx,ly=light
    heel = ("M168 588 L332 588 L330 626 L240 636 Q196 630 172 606 Z" if worn
            else "M168 588 L332 588 L330 640 L182 640 Q168 640 168 626 Z")
    sole = ("M332 588 L948 584 Q954 596 930 600 L820 612 L520 616 Q420 604 332 598 Z" if worn
            else "M332 588 L948 584 Q956 604 934 614 L820 640 L520 640 Q420 612 332 606 Z")
    stitch_op = ".35" if worn else ".95"
    stitch_dash = "10 8 3 22 10 30" if worn else "10 8"
    scuffs = ""
    if worn:
        scuffs = '''
    <g fill="none" stroke="#2A140A" stroke-linecap="round" opacity=".55">
      <path d="M560 432 Q600 452 640 448" stroke-width="3"/><path d="M590 422 Q630 444 676 442" stroke-width="2"/>
      <path d="M540 446 Q590 470 650 466" stroke-width="2"/>
    </g>
    <g fill="#C79A72" opacity=".35"><ellipse cx="900" cy="530" rx="34" ry="16"/><ellipse cx="200" cy="520" rx="22" ry="40"/></g>'''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="spot" cx="{lx}" cy="{ly}" r="720" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#4A3424"/><stop offset=".45" stop-color="#22170F"/><stop offset="1" stop-color="#0E0A08"/>
    </radialGradient>
    <linearGradient id="lea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9A5230"/><stop offset=".55" stop-color="#7A3B1F"/><stop offset="1" stop-color="#4C2211"/>
    </linearGradient>
    <radialGradient id="sheen" cx="{lx}" cy="{ly}" r="520" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFD9B0" stop-opacity=".38"/><stop offset="1" stop-color="#FFD9B0" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="depth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>
    <radialGradient id="hl" cx="0" cy="0" r="1"><stop offset="0" stop-color="#FFE6C8" stop-opacity=".32"/><stop offset="1" stop-color="#FFE6C8" stop-opacity="0"/></radialGradient>
    <linearGradient id="soleg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B2C24"/><stop offset="1" stop-color="#17110D"/></linearGradient>
    <linearGradient id="weltg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B89A72"/><stop offset="1" stop-color="#7C6246"/></linearGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="7"/>
      <feColorMatrix values="0 0 0 0 .1  0 0 0 0 .05  0 0 0 0 .02  0 0 0 .55 0"/>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
    <filter id="pebble" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="turbulence" baseFrequency=".035 .05" numOctaves="2" seed="3"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .25 0"/>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
    <clipPath id="up"><path d="M176 572 Q150 520 168 470 Q186 410 194 300 L206 172 Q300 156 398 160 L414 250 Q426 320 470 360 Q540 420 660 446 Q800 470 884 494 Q936 512 936 562 L176 572 Z"/></clipPath>
  </defs>
  {'<rect x="-2000" y="-2000" width="5000" height="5000" fill="url(#spot)"/>' if bg else ''}
  <ellipse cx="560" cy="646" rx="440" ry="14" fill="#000" opacity=".5"/>
  <path d="M392 170 Q404 116 444 112 Q470 114 470 136 L478 330 L430 330 Z" fill="#5A2814"/>
  <g clip-path="url(#up)">
    <rect x="100" y="100" width="900" height="500" fill="url(#lea)"/>
    <rect x="100" y="100" width="900" height="500" fill="#000" filter="url(#pebble)"/>
    <rect x="100" y="100" width="900" height="500" fill="#000" filter="url(#grain)"/>
    <rect x="100" y="100" width="900" height="500" fill="url(#sheen)"/>
    <rect x="100" y="500" width="900" height="80" fill="url(#depth)"/>
    <ellipse cx="200" cy="500" rx="40" ry="70" fill="url(#hl)" transform="rotate(-8 200 500)"/>
    <ellipse cx="860" cy="505" rx="70" ry="22" fill="url(#hl)"/>
    <path d="M206 180 Q300 166 396 168" fill="none" stroke="#FFDDB8" stroke-width="2" opacity=".25"/>
    <path d="M168 452 Q250 448 296 486 Q326 520 330 568" fill="none" stroke="#2A1208" stroke-width="5"/>
    <path d="M172 460 Q250 456 290 492 Q318 524 322 568" fill="none" stroke="#E9D9BE" stroke-width="2" stroke-dasharray="6 6" opacity="{stitch_op}"/>
    <path d="M736 456 Q776 500 764 564" fill="none" stroke="#2A1208" stroke-width="5"/>
    <path d="M726 458 Q764 500 754 564" fill="none" stroke="#E9D9BE" stroke-width="2" stroke-dasharray="6 6" opacity="{stitch_op}"/>{scuffs}
  </g>
  <path d="M206 172 Q300 156 398 160" fill="none" stroke="#2A140B" stroke-width="12" stroke-linecap="round"/>
  <path d="M204 178 L196 120 Q198 106 212 108 L224 168" fill="#2F1F17"/>
  <g fill="#C9B08A" stroke="#2A1B14" stroke-width="2">
    <circle cx="404" cy="190" r="6"/><circle cx="410" cy="230" r="6"/><circle cx="418" cy="270" r="6"/>
    <circle cx="434" cy="310" r="6"/><circle cx="462" cy="346" r="6"/><circle cx="494" cy="376" r="6"/>
  </g>
  <path d="M404 190 L452 214 M410 230 L456 252 M418 270 L462 290 M434 310 L474 326" stroke="#E8DCC2" stroke-width="4" stroke-linecap="round"/>
  <path d="M164 588 L166 570 L930 560 Q950 566 950 584 Z" fill="url(#weltg)"/>{"<path d=\"M164 588 L166 570 L930 560 Q950 566 950 584 Z\" fill=\"#2A1A10\" opacity=\".45\"/>" if worn else ""}
  {"" if not welt_stitch else f'<path d="M178 580.6 L936 572.6" fill="none" stroke="#1A0E07" stroke-width="3" stroke-dasharray="{stitch_dash}" opacity=".6"/><path d="M178 579 L936 571" fill="none" stroke="#F3EEE4" stroke-width="3" stroke-dasharray="{stitch_dash}" opacity="{stitch_op}"/>'}
  <path d="{heel}" fill="url(#soleg)"/>
  <path d="{sole}" fill="url(#soleg)"/>
  <path d="M332 590 L332 {626 if worn else 640}" stroke="#0E0A08" stroke-width="3"/>
</svg>'''
if __name__=='__main__':
    J=[('boot-new',dict()),('boot-worn',dict(worn=True)),
       ('hero-wide',dict(w=2000,h=1105,vb="250 300 760 420",light=(640,420),welt_stitch=False)),
       ('hero-tall',dict(w=900,h=1500,vb="140 -260 820 1367",light=(560,380),welt_stitch=False)),
       ('close-wide',dict(w=1600,h=1000,vb="110 360 560 350",light=(260,470))),
       ('close-tall',dict(w=900,h=1300,vb="120 300 330 476",light=(240,470))),
       ('ba-worn',dict(worn=True,w=1200,h=692,vb="120 380 520 300",light=(300,470))),
       ('ba-new',dict(w=1200,h=692,vb="120 380 520 300",light=(300,470)))]
    for n,k in J: open(n+'.svg','w').write(boot(**k))
