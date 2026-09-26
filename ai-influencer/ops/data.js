/* ===== 운영 데이터 =====
   ⚠️ 지금은 전부 샘플(더미) 데이터예요. 실제 운영을 시작하면 이 파일의 숫자만 바꾸면
   운영 대시보드와 메인 화면이 자동으로 바뀌어요. 다 바꾼 뒤 demo:false 로 바꾸면 '샘플' 표시가 사라져요.
   - followers : 주차별 팔로워 수 (weeks 와 개수가 같아야 해요)
   - posts     : 게시물 하나당 한 줄 (w = 몇 주차)
   - money     : 수입(income) / 지출(expense), 원 단위
   - schedule  : 이번 주 업로드 계획 */
window.OPS={
  demo:true,
  account:'@hana.ssaem',
  platform:'인스타그램',
  character:'하나 쌤',
  updated:'샘플 데이터',
  weeks:['1주','2주','3주','4주','5주','6주','7주','8주'],
  followers:[86,173,240,388,512,731,1072,1284],
  events:[{w:5,label:'엔딩에 다음 편 예고 추가'},{w:7,label:'PDF 출시'}],   // w = 몇 주차
  posts:[
    {id:1, w:1,type:'릴스',   title:"EP.1 '밥 먹었어?'가 고백인 이유", views:1200, likes:64,  comments:5,  saves:22,  shares:9},
    {id:2, w:1,type:'릴스',   title:'자기소개 "저는 AI 쌤이에요"',      views:900,  likes:38,  comments:7,  saves:6,   shares:2},
    {id:3, w:2,type:'릴스',   title:"EP.2 '대박' 쓰면 안 되는 상황",     views:1800, likes:95,  comments:8,  saves:41,  shares:12},
    {id:4, w:2,type:'캐러셀', title:'이번 주 단어 5개 #1',               views:700,  likes:30,  comments:2,  saves:48,  shares:5},
    {id:5, w:3,type:'릴스',   title:"EP.3 '눈치'는 번역이 안 돼요",      views:2100, likes:120, comments:14, saves:52,  shares:18},
    {id:6, w:3,type:'릴스',   title:"EP.4 '애교' 3단계",                 views:1500, likes:70,  comments:9,  saves:20,  shares:6},
    {id:7, w:4,type:'릴스',   title:'EP.5 존댓말→반말 타이밍',           views:3400, likes:210, comments:25, saves:96,  shares:40},
    {id:8, w:4,type:'캐러셀', title:'퀴즈: 이 상황에 맞는 말은?',        views:1300, likes:60,  comments:44, saves:12,  shares:4},
    {id:9, w:5,type:'릴스',   title:"EP.6 '헐'의 5가지 뜻",              views:6800, likes:480, comments:38, saves:210, shares:95},
    {id:10,w:5,type:'릴스',   title:"EP.7 '아이고'는 언제 쓸까",          views:5200, likes:350, comments:22, saves:150, shares:60},
    {id:11,w:6,type:'릴스',   title:"EP.8 식당에서 '이모!' 부르는 법",    views:9400, likes:690, comments:61, saves:330, shares:170},
    {id:12,w:6,type:'캐러셀', title:'이번 주 단어 5개 #2',               views:2600, likes:140, comments:6,  saves:180, shares:22},
    {id:13,w:6,type:'릴스',   title:"EP.9 '정'이 뭐예요?",               views:7100, likes:520, comments:47, saves:260, shares:110},
    {id:14,w:7,type:'릴스',   title:'EP.10 시즌 1 피날레 퀴즈',          views:12800,likes:1020,comments:96, saves:540, shares:260},
    {id:15,w:7,type:'캐러셀', title:"'K드라마 표현 50' PDF 출시",         views:3900, likes:180, comments:55, saves:40,  shares:12},
    {id:16,w:7,type:'릴스',   title:'S2 EP.1 연애 표현 편',              views:8800, likes:640, comments:70, saves:300, shares:140},
    {id:17,w:8,type:'릴스',   title:"S2 EP.2 '썸'이 뭐예요?",            views:15400,likes:1310,comments:150,saves:720, shares:390},
    {id:18,w:8,type:'릴스',   title:"S2 EP.3 '밀당' 설명서",             views:9900, likes:760, comments:80, saves:410, shares:180}
  ],
  money:{
    income:[
      {src:"📦 'K드라마 표현 50' PDF",note:'13건 × ₩3,900',amount:50700},
      {src:'🔗 제휴 링크',note:'한국어 학습 앱 가입',amount:8300}
    ],
    expense:[
      {src:'🛠️ 생성 도구 구독',note:'이미지·영상',amount:33000}
    ]
  },
  schedule:[
    {d:'월',t:"S2 EP.4 '오빠'의 진짜 뜻",type:'릴스',st:'done'},
    {d:'화',t:'',type:'',st:'off'},
    {d:'수',t:'이번 주 단어 5개 #3',type:'캐러셀',st:'ready'},
    {d:'목',t:"S2 EP.5 '고백 공격'",type:'릴스',st:'ready'},
    {d:'금',t:'',type:'',st:'off'},
    {d:'토',t:'쌀떡이 등장 편',type:'릴스',st:'draft'},
    {d:'일',t:'주간 리포트 쓰기',type:'리포트',st:'todo'}
  ]
};
