# 확인된 사실 (오래QR 글·화면용)

형식: 값 / 출처 / 확인한 날 / 원문 요지 / 확인 못 한 것. 글과 화면에는 [확인됨]만 쓴다.

print_tip_ko: 가까이서 찍는 QR은 무늬 한 변을 2cm 이상으로, 찍는 거리는 QR 크기의 10배쯤까지가 기준이에요.
print_tip_en: For close-up scans, make the code at least 2 cm (0.8 in) wide; as a rule of thumb, it scans from about 10 times its own width.

## QR 표준·상표
- [확인됨] 'QR Code'는 DENSO WAVE의 등록 상표. 웹사이트에 쓸 때 "QR Code is registered trademark of DENSO WAVE INCORPORATED." 문장을 넣으라고 함. 상표는 낱말에만, 무늬(그림)에는 해당 안 함. 상업 이용에 사용료 없음, 라이선스 계약 불필요. 명함에 그림만 쓰면 상표 문구 불필요. / https://www.qrcode.com/en/faq.html / 2026-10-14
- [확인됨] 오류 복원: M(15%)이 가장 흔히 쓰임, 더러워지는 공장은 Q·H, 깨끗하고 데이터 많으면 L. 리드-솔로몬 부호. 퍼센트는 '전체 코드워드 대비 복원률'. / https://www.qrcode.com/en/about/error_correction.html / 2026-10-14 / 확인 못 한 것: L 7%·Q 25%·H 30%는 같은 페이지 표(그림)에 있어 글자로는 못 읽음 — 표준 값으로 널리 쓰이는 수치. 글에서는 "약 7·15·25·30%"로.
- [확인됨] 가까이서 찍는 QR은 2×2cm 이상, 그 크기면 약 20cm 거리. 찍는 거리 ≈ QR 크기의 10배(경험칙). 2인치 QR ≈ 2피트, 8인치 ≈ 6~7피트. / https://www.qr-code-generator.com/blog/minimum-qr-code-size/ / 2026-10-14 (업체 블로그, 경험칙임을 밝힐 것)
- [확인됨] 와이파이 QR 형식 `WIFI:T:WPA;S:mynetwork;P:mypass;;` — T는 WEP/WPA/WPA2-EAP/nopass(생략 가능), S 필수, P(nopass면 무시), H:true 숨김, 특수문자 `\ ; , : "`는 백슬래시로 이스케이프. 안드로이드·iOS 11+ 카메라가 읽음(위키 표제). / https://github.com/zxing/zxing/wiki/Barcode-Contents / 2026-10-14

## 시장·유료 사이트 (2026-09-28 분석: context/knowledge/5-참고/qr-유료-시장-분석.md 의 링크를 그대로 출처로)
- [확인됨 2026-10-14 화면] QRFY 한국어 첫 화면: 정적 QR 무료·만료 없음, 동적 QR은 카드 없이 7일 무료 체험 후 구독 필요. https://qrfy.com/ko
- [확인됨 2026-10-14 화면] ME-QR 한국어 첫 화면: 무료 요금제는 "모든 QR 코드에 광고", '정적 QR 코드'는 프리미엄 플랜에서 활성화, FAQ "스캔 후 Google Ads가 표시". https://me-qr.com/ko
- [확인됨 2026-09-28] QRFY 체험이 끝나면 동적 코드가 꺼지고 QRFY 안내 페이지로 연결(48시간 전 메일). https://support.qrfy.com/en/articles/6998440-what-happens-to-my-account-and-qr-codes-when-the-trial-expires
- [확인됨 2026-09-28] QRFY 한국 화면 요금 3개월 208,500원 / 12개월 408,000원(부가세 별도). https://qrfy.com/pricing — 글에 쓸 땐 "2026년 9월 요금표 기준"과 함께, 특정 업체 비난 말투 금지.
- [확인됨 2026-09-28] QR Code Generator(QRCG) 도움말: 체험 끝나면 동적 코드를 끄고 안내 페이지로. https://support.qr-code-generator.com/hc/en-us/articles/7665046137613-What-happens-to-my-account-and-QR-Codes-when-the-trial-expires
- [확인됨 2026-09-28] Adobe Express QR은 정적, 만료·요금·스캔 한도 없음, 통계·주소 변경 없음(Adobe 직원 답변). https://community.adobe.com/t5/adobe-express-discussions/do-qr-codes-expire/m-p/13108728/highlight/true
- [확인됨 2026-09-28] 정부: QR 스캔 전 주소 확인 권고(큐싱). https://www.korea.kr/news/policyNewsView.do?newsId=148935455&pWise=main&pWiseMain=A3
- [확인됨 2026-09-28] 큐싱이 개인 대상 해킹·사기 사고의 17%, 1년 새 60% 증가(매일신문 2026-09-24 보도). https://www.imaeil.com/page/view/2026092412190559016
- [확인됨 2026-09-28] "최종 목적지가 아니라 내가 쥔 중간 주소를 가리켜라" 조언(DEV Community). https://dev.to/danfoley1/-trustworthy-qr-codes-a-field-guide-2p5

## 이 사이트의 실제 동작(코드 기준, qr/CLAUDE.md)
- 정적 QR만. 대량 한 번 1,000줄. 저장 PNG 512~4096·JPG·SVG·PDF·EPS. 스티커 시트 A4. 크기(cm) = QR 무늬 한 변(여백·틀 빼고). 연락처·와이파이는 '최근 목록'에 남기지 않음. 설정을 주소에 담지 않음.
- 찍힘 확인: 대비 2:1 미만이면 '안 읽힘', 4:1 미만이면 '주의'. 틀이 있으면 여백 최소 2칸. 결과는 인쇄·조명·카메라에 따라 다를 수 있음.
