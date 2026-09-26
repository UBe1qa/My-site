/* ===== 운영 데이터 (캐릭터 여러 명) =====
   ⚠️ 지금은 전부 샘플(더미) 데이터예요. 실제 운영을 시작하면 이 파일의 숫자만 바꾸면
   운영 대시보드·캐릭터 프로필·메인이 자동으로 바뀌어요. 다 바꾼 뒤 demo:false 로 바꾸면 '샘플' 표시가 사라져요.

   - weeks        : 주차 이름 (모든 캐릭터 공통)
   - chars.{id}   : 캐릭터별 데이터. id 는 characters/data.js 의 id 와 같아야 해요
       followers  : 주차별 팔로워 수. 아직 시작 안 한 주는 null
       events     : 그래프에 표시할 사건 (w = 몇 주차)
       posts      : 게시물 하나당 한 줄 (w = 몇 주차, n = 캐릭터 안에서의 번호)
   - money        : 수입/지출. c = 캐릭터 id, 여러 캐릭터 공통 비용은 c:'all'
   - schedule     : 이번 주 업로드 계획. c = 캐릭터 id */
window.OPS={
  demo:true,
  updated:'샘플 데이터',
  platform:'인스타그램',
  weeks:['1주','2주','3주','4주','5주','6주','7주','8주'],
  chars:{
    hana:{
      followers:[86,173,240,388,512,731,1072,1284],
      events:[{w:5,label:'엔딩에 다음 편 예고'},{w:7,label:'PDF 출시'}],
      posts:[
        {n:1, w:1,type:'릴스',  title:"EP.1 '밥 먹었어?'가 고백인 이유",views:1200, likes:64,  comments:5,  saves:22,  shares:9},
        {n:2, w:1,type:'릴스',  title:'자기소개 "저는 AI 쌤이에요"',     views:900,  likes:38,  comments:7,  saves:6,   shares:2},
        {n:3, w:2,type:'릴스',  title:"EP.2 '대박' 쓰면 안 되는 상황",    views:1800, likes:95,  comments:8,  saves:41,  shares:12},
        {n:4, w:2,type:'캐러셀',title:'이번 주 단어 5개 #1',              views:700,  likes:30,  comments:2,  saves:48,  shares:5},
        {n:5, w:3,type:'릴스',  title:"EP.3 '눈치'는 번역이 안 돼요",     views:2100, likes:120, comments:14, saves:52,  shares:18},
        {n:6, w:3,type:'릴스',  title:"EP.4 '애교' 3단계",                views:1500, likes:70,  comments:9,  saves:20,  shares:6},
        {n:7, w:4,type:'릴스',  title:'EP.5 존댓말→반말 타이밍',          views:3400, likes:210, comments:25, saves:96,  shares:40},
        {n:8, w:4,type:'캐러셀',title:'퀴즈: 이 상황에 맞는 말은?',       views:1300, likes:60,  comments:44, saves:12,  shares:4},
        {n:9, w:5,type:'릴스',  title:"EP.6 '헐'의 5가지 뜻",             views:6800, likes:480, comments:38, saves:210, shares:95},
        {n:10,w:5,type:'릴스',  title:"EP.7 '아이고'는 언제 쓸까",         views:5200, likes:350, comments:22, saves:150, shares:60},
        {n:11,w:6,type:'릴스',  title:"EP.8 식당에서 '이모!' 부르는 법",   views:9400, likes:690, comments:61, saves:330, shares:170},
        {n:12,w:6,type:'캐러셀',title:'이번 주 단어 5개 #2',              views:2600, likes:140, comments:6,  saves:180, shares:22},
        {n:13,w:6,type:'릴스',  title:"EP.9 '정'이 뭐예요?",              views:7100, likes:520, comments:47, saves:260, shares:110},
        {n:14,w:7,type:'릴스',  title:'EP.10 시즌 1 피날레 퀴즈',         views:12800,likes:1020,comments:96, saves:540, shares:260},
        {n:15,w:7,type:'캐러셀',title:"'K드라마 표현 50' PDF 출시",        views:3900, likes:180, comments:55, saves:40,  shares:12},
        {n:16,w:7,type:'릴스',  title:'S2 EP.1 연애 표현 편',             views:8800, likes:640, comments:70, saves:300, shares:140},
        {n:17,w:8,type:'릴스',  title:"S2 EP.2 '썸'이 뭐예요?",           views:15400,likes:1310,comments:150,saves:720, shares:390},
        {n:18,w:8,type:'릴스',  title:"S2 EP.3 '밀당' 설명서",            views:9900, likes:760, comments:80, saves:410, shares:180}
      ]
    },
    doyun:{
      followers:[null,null,null,null,42,118,176,251],
      events:[{w:5,label:'테스트 시작'}],
      posts:[
        {n:1,w:5,type:'릴스',  title:'냉장고에 달걀 2개뿐일 때 계란밥',   views:1400,likes:88, comments:9, saves:61, shares:14},
        {n:2,w:5,type:'릴스',  title:'자기소개 "레시피는 진짜입니다"',     views:800, likes:40, comments:6, saves:8,  shares:3},
        {n:3,w:6,type:'릴스',  title:'드라마 속 그 라면, 진짜 버전',       views:3100,likes:190,comments:22,saves:140,shares:35},
        {n:4,w:6,type:'릴스',  title:'월급날 전날 3,000원 저녁',           views:2200,likes:120,comments:14,saves:95, shares:20},
        {n:5,w:7,type:'릴스',  title:'시장 떨이 채소 비빔밥',              views:2600,likes:150,comments:12,saves:118,shares:22},
        {n:6,w:7,type:'캐러셀',title:'자취 장보기 리스트',                 views:1100,likes:45, comments:3, saves:88, shares:9},
        {n:7,w:8,type:'릴스',  title:'편의점 재료로 크림 파스타',          views:4200,likes:280,comments:31,saves:210,shares:48}
      ]
    },
    bokdan:{
      followers:[null,null,null,null,null,64,98,121],
      events:[{w:6,label:'테스트 시작'}],
      posts:[
        {n:1,w:6,type:'릴스',  title:'키오스크에서 햄버거 주문 15분',      views:2400,likes:110,comments:18,saves:12,shares:25},
        {n:2,w:6,type:'릴스',  title:'두바이 쿠키 첫입 리뷰',              views:1500,likes:62, comments:9, saves:5, shares:10},
        {n:3,w:7,type:'캐러셀',title:'할머니 간장 계란장 비법',            views:1300,likes:55, comments:6, saves:40,shares:7},
        {n:4,w:7,type:'릴스',  title:'팝업스토어 줄 서보기',               views:1100,likes:40, comments:5, saves:3, shares:6},
        {n:5,w:8,type:'릴스',  title:'지하철 앱으로 길 찾기',              views:1200,likes:48, comments:7, saves:4, shares:9}
      ]
    }
  },
  money:{
    income:[
      {c:'hana', src:"📦 'K드라마 표현 50' PDF",note:'13건 × ₩3,900',amount:50700},
      {c:'hana', src:'🔗 제휴 링크',note:'한국어 학습 앱 가입',amount:8300},
      {c:'doyun',src:'🔗 제휴 링크',note:'자취 조리도구',amount:3900}
    ],
    expense:[
      {c:'all',src:'🛠️ 생성 도구 구독',note:'이미지·영상 (3명 공용)',amount:33000},
      {c:'all',src:'🎙️ 음성 생성',note:'캐릭터 목소리 (3명 공용)',amount:9900}
    ]
  },
  schedule:[
    {d:'월',c:'hana',  t:"S2 EP.4 '오빠'의 진짜 뜻",type:'릴스',  st:'done'},
    {d:'월',c:'doyun', t:'편의점 파스타 2탄',        type:'릴스',  st:'done'},
    {d:'화',c:'bokdan',t:'반찬가게 사장님과 흥정',   type:'릴스',  st:'ready'},
    {d:'수',c:'hana',  t:'이번 주 단어 5개 #3',      type:'캐러셀',st:'ready'},
    {d:'수',c:'doyun', t:'자취 냉장고 정리법',       type:'캐러셀',st:'draft'},
    {d:'목',c:'hana',  t:"S2 EP.5 '고백 공격'",      type:'릴스',  st:'ready'},
    {d:'금',c:'bokdan',t:'할머니 김치전 레시피',     type:'캐러셀',st:'draft'},
    {d:'토',c:'hana',  t:'쌀떡이 등장 편',           type:'릴스',  st:'draft'},
    {d:'토',c:'doyun', t:'시장 장보기 브이로그',     type:'릴스',  st:'todo'},
    {d:'일',c:'all',   t:'주간 리포트 쓰기',         type:'리포트',st:'todo'}
  ]
};
