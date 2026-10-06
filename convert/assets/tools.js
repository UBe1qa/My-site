// 만든 파일: _dev/build.py 가 만든다. 손으로 고치지 않는다.
export const TOOLS = {
 "video-to-mp3": {
  "id": "video-to-mp3",
  "cat": "video",
  "accept": ".mp4,.mov,.m4v,.webm,.mkv,.ts,.mts,.3gp",
  "multiple": false,
  "order": false,
  "pair": [
   "MP4",
   "MP3"
  ],
  "name": {
   "en": "Video to MP3",
   "ko": "동영상 MP3 변환"
  },
  "short": {
   "en": "Pull the audio out as MP3, M4A or WAV",
   "ko": "영상 속 소리만 MP3·M4A·WAV로"
  }
 },
 "audio-converter": {
  "id": "audio-converter",
  "cat": "audio",
  "accept": ".mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.weba,.webm",
  "multiple": false,
  "order": false,
  "pair": [
   "M4A",
   "MP3"
  ],
  "name": {
   "en": "Audio Converter",
   "ko": "오디오 변환"
  },
  "short": {
   "en": "Save as MP3, M4A, WAV or OGG",
   "ko": "MP3·M4A·WAV·OGG로, 음질 고르기"
  }
 },
 "cut-audio": {
  "id": "cut-audio",
  "cat": "audio",
  "accept": ".mp3,.m4a,.aac,.wav,.ogg,.oga,.opus,.flac,.weba",
  "multiple": false,
  "order": false,
  "pair": [
   "MP3",
   "CUT"
  ],
  "name": {
   "en": "Audio Cutter",
   "ko": "오디오 자르기"
  },
  "short": {
   "en": "Trim on the waveform, add a fade",
   "ko": "파형 보며 자르고 페이드 넣기"
  }
 },
 "video-converter": {
  "id": "video-converter",
  "cat": "video",
  "accept": ".mp4,.mov,.m4v,.webm,.mkv,.ts,.mts,.3gp",
  "multiple": false,
  "order": false,
  "pair": [
   "MOV",
   "MP4"
  ],
  "name": {
   "en": "Video Converter",
   "ko": "동영상 변환"
  },
  "short": {
   "en": "MOV, MKV, WebM to MP4 and back",
   "ko": "MOV·MKV·WebM을 MP4로, 거꾸로도"
  }
 },
 "cut-video": {
  "id": "cut-video",
  "cat": "video",
  "accept": ".mp4,.mov,.m4v,.webm,.mkv",
  "multiple": false,
  "order": false,
  "pair": [
   "MP4",
   "CUT"
  ],
  "name": {
   "en": "Video Cutter",
   "ko": "동영상 자르기"
  },
  "short": {
   "en": "Keep only the part you want",
   "ko": "원하는 부분만 남기기"
  }
 },
 "compress-video": {
  "id": "compress-video",
  "cat": "video",
  "accept": ".mp4,.mov,.m4v,.webm,.mkv",
  "multiple": false,
  "order": false,
  "pair": [
   "1GB",
   "80MB"
  ],
  "name": {
   "en": "Compress Video",
   "ko": "동영상 용량 줄이기"
  },
  "short": {
   "en": "Shrink a video for email or chat",
   "ko": "메일·메신저로 보낼 만큼 작게"
  }
 },
 "video-to-gif": {
  "id": "video-to-gif",
  "cat": "video",
  "accept": ".mp4,.mov,.m4v,.webm,.mkv",
  "multiple": false,
  "order": false,
  "pair": [
   "MP4",
   "GIF"
  ],
  "name": {
   "en": "Video to GIF",
   "ko": "동영상 GIF 변환"
  },
  "short": {
   "en": "Turn a short clip into a GIF",
   "ko": "짧은 장면을 GIF로"
  }
 },
 "image-converter": {
  "id": "image-converter",
  "cat": "image",
  "accept": ".jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.svg",
  "multiple": true,
  "order": false,
  "pair": [
   "PNG",
   "JPG"
  ],
  "name": {
   "en": "Image Converter",
   "ko": "이미지 변환"
  },
  "short": {
   "en": "JPG, PNG, WebP, many at once",
   "ko": "JPG·PNG·WebP, 여러 장 한 번에"
  }
 },
 "heic-to-jpg": {
  "id": "heic-to-jpg",
  "cat": "image",
  "accept": ".heic,.heif",
  "multiple": true,
  "order": false,
  "pair": [
   "HEIC",
   "JPG"
  ],
  "name": {
   "en": "HEIC to JPG",
   "ko": "HEIC JPG 변환"
  },
  "short": {
   "en": "iPhone photos that open anywhere",
   "ko": "아이폰 사진을 어디서나 열리게"
  }
 },
 "compress-image": {
  "id": "compress-image",
  "cat": "image",
  "accept": ".jpg,.jpeg,.png,.webp,.avif,.bmp",
  "multiple": true,
  "order": false,
  "pair": [
   "4MB",
   "600K"
  ],
  "name": {
   "en": "Compress Image",
   "ko": "이미지 용량 줄이기"
  },
  "short": {
   "en": "Smaller photos, size shown live",
   "ko": "용량 줄이기, 크기 바로 확인"
  }
 },
 "resize-image": {
  "id": "resize-image",
  "cat": "image",
  "accept": ".jpg,.jpeg,.png,.webp,.avif,.bmp,.gif",
  "multiple": true,
  "order": false,
  "pair": [
   "4000",
   "1200"
  ],
  "name": {
   "en": "Resize Image",
   "ko": "이미지 크기 조절"
  },
  "short": {
   "en": "Exact pixels or a percentage",
   "ko": "픽셀이나 비율로 크기 바꾸기"
  }
 },
 "images-to-pdf": {
  "id": "images-to-pdf",
  "cat": "pdf",
  "accept": ".jpg,.jpeg,.png,.webp,.gif,.bmp,.avif",
  "multiple": true,
  "order": true,
  "pair": [
   "JPG",
   "PDF"
  ],
  "name": {
   "en": "JPG to PDF",
   "ko": "JPG PDF 변환"
  },
  "short": {
   "en": "Photos or scans into one PDF",
   "ko": "사진·스캔을 PDF 하나로"
  }
 },
 "pdf-to-jpg": {
  "id": "pdf-to-jpg",
  "cat": "pdf",
  "accept": ".pdf",
  "multiple": false,
  "order": false,
  "pair": [
   "PDF",
   "JPG"
  ],
  "name": {
   "en": "PDF to JPG",
   "ko": "PDF JPG 변환"
  },
  "short": {
   "en": "Every page as an image",
   "ko": "쪽마다 그림 파일로"
  }
 },
 "merge-pdf": {
  "id": "merge-pdf",
  "cat": "pdf",
  "accept": ".pdf",
  "multiple": true,
  "order": true,
  "pair": [
   "PDF",
   "1PDF"
  ],
  "name": {
   "en": "Merge PDF",
   "ko": "PDF 합치기"
  },
  "short": {
   "en": "Several PDFs, one file, your order",
   "ko": "여러 PDF를 원하는 순서로 하나로"
  }
 },
 "split-pdf": {
  "id": "split-pdf",
  "cat": "pdf",
  "accept": ".pdf",
  "multiple": false,
  "order": false,
  "pair": [
   "PDF",
   "P1-3"
  ],
  "name": {
   "en": "Split PDF",
   "ko": "PDF 나누기"
  },
  "short": {
   "en": "By page range or equal chunks",
   "ko": "쪽 범위나 같은 쪽 수로 나누기"
  }
 },
 "compress-pdf": {
  "id": "compress-pdf",
  "cat": "pdf",
  "accept": ".pdf",
  "multiple": false,
  "order": false,
  "pair": [
   "9MB",
   "2MB"
  ],
  "name": {
   "en": "Compress PDF",
   "ko": "PDF 압축"
  },
  "short": {
   "en": "Smaller PDFs, text stays sharp",
   "ko": "스캔 PDF 용량 줄이기, 글자는 선명"
  }
 },
 "organize-pdf": {
  "id": "organize-pdf",
  "cat": "pdf",
  "accept": ".pdf",
  "multiple": false,
  "order": false,
  "pair": [
   "3412",
   "1234"
  ],
  "name": {
   "en": "Delete & Reorder PDF Pages",
   "ko": "PDF 쪽 삭제·정리"
  },
  "short": {
   "en": "Remove pages, change their order",
   "ko": "쪽 빼고 순서 바꾸기"
  }
 },
 "rotate-pdf": {
  "id": "rotate-pdf",
  "cat": "pdf",
  "accept": ".pdf",
  "multiple": false,
  "order": false,
  "pair": [
   "PDF",
   "90°"
  ],
  "name": {
   "en": "Rotate PDF",
   "ko": "PDF 회전"
  },
  "short": {
   "en": "Turn pages 90° at a time",
   "ko": "쪽마다 90°씩 돌리기"
  }
 },
 "pdf-page-numbers": {
  "id": "pdf-page-numbers",
  "cat": "pdf",
  "accept": ".pdf",
  "multiple": false,
  "order": false,
  "pair": [
   "PDF",
   "1/9"
  ],
  "name": {
   "en": "Add Page Numbers",
   "ko": "PDF 쪽 번호 넣기"
  },
  "short": {
   "en": "Number pages, choose where",
   "ko": "위치·형식 골라 쪽 번호 넣기"
  }
 },
 "watermark-pdf": {
  "id": "watermark-pdf",
  "cat": "pdf",
  "accept": ".pdf",
  "multiple": false,
  "order": false,
  "pair": [
   "PDF",
   "MARK"
  ],
  "name": {
   "en": "Watermark PDF",
   "ko": "PDF 워터마크"
  },
  "short": {
   "en": "Your text on every page",
   "ko": "모든 쪽에 글자 워터마크"
  }
 },
 "protect-pdf": {
  "id": "protect-pdf",
  "cat": "pdf",
  "accept": ".pdf",
  "multiple": false,
  "order": false,
  "pair": [
   "PDF",
   "LOCK"
  ],
  "name": {
   "en": "Protect PDF",
   "ko": "PDF 암호 걸기"
  },
  "short": {
   "en": "Lock a PDF with a password",
   "ko": "PDF에 비밀번호 걸기"
  }
 },
 "unlock-pdf": {
  "id": "unlock-pdf",
  "cat": "pdf",
  "accept": ".pdf",
  "multiple": false,
  "order": false,
  "pair": [
   "LOCK",
   "OPEN"
  ],
  "name": {
   "en": "Unlock PDF",
   "ko": "PDF 암호 풀기"
  },
  "short": {
   "en": "Take the password off a PDF",
   "ko": "PDF 비밀번호 없애기"
  }
 },
 "csv-json": {
  "id": "csv-json",
  "cat": "data",
  "accept": ".csv,.tsv,.txt,.json",
  "multiple": false,
  "order": false,
  "pair": [
   "CSV",
   "JSON"
  ],
  "name": {
   "en": "CSV ↔ JSON",
   "ko": "CSV ↔ JSON 변환"
  },
  "short": {
   "en": "Both ways, with a live preview",
   "ko": "양쪽으로, 미리 보면서"
  }
 },
 "excel-csv": {
  "id": "excel-csv",
  "cat": "data",
  "accept": ".xlsx,.xls,.xlsm,.ods,.csv",
  "multiple": false,
  "order": false,
  "pair": [
   "XLSX",
   "CSV"
  ],
  "name": {
   "en": "Excel ↔ CSV",
   "ko": "엑셀 ↔ CSV 변환"
  },
  "short": {
   "en": "XLSX to CSV, CSV to XLSX",
   "ko": "엑셀은 CSV로, CSV는 엑셀로"
  }
 }
};
export const KINDS = {"video": ["mp4", "mov", "m4v", "webm", "mkv", "ts", "mts", "3gp", "avi", "wmv", "flv"], "audio": ["mp3", "m4a", "aac", "wav", "ogg", "oga", "opus", "flac", "weba", "wma", "amr"], "image": ["jpg", "jpeg", "png", "webp", "gif", "bmp", "avif", "svg", "heic", "heif", "tif", "tiff", "ico"], "pdf": ["pdf"], "data": ["csv", "tsv", "json", "xlsx", "xls", "xlsm", "ods", "txt"]};
