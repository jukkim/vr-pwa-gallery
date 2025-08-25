# VR PWA Maze Gallery (Template)

이 템플릿은 A‑Frame 기반 VR 전시관을 **PWA**로 배포하기 위한 최소/완전 세트입니다.

## 폴더 구조
- `index.html` : 씬 골격 + PWA 등록
- `app.js` : `config/exhibition.json`을 읽어 **방/문/작품/라벨/오디오/미니맵** 자동 구성
- `config/exhibition.json` : 전시 콘텐츠/배치 설정(JSON만 수정하면 전시가 바뀝니다)
- `pwa/manifest.json`, `pwa/service-worker.js` : 오프라인/설치
- `assets/` : 로컬 오디오/이미지(선택)
- `icons/` : PWA 아이콘

## 실행
- 로컬: `python -m http.server 5500` → `http://localhost:5500/` 접속
- 배포: GitHub Pages / Netlify / Vercel 등 정적 호스팅

## 편집 포인트
- `config/exhibition.json`에서
  - `rooms`, `links`로 **미로형 방/문** 설계
  - `assets.images`/`assets.audio` 등록
  - `artworks[]`로 **작품 배치**(room, wall N/S/E/W, idx)
  - `audio.bgm`에 배경음 경로 지정(첫 클릭 후 재생)
- 이미지 CORS가 걱정되면 `assets/images/`로 저장 후 그 경로를 사용하세요.

## PWA
- 설치/오프라인이 동작하며, 아이콘/테마 색상은 `manifest.json`을 수정하세요.
- `service-worker.js`의 캐시 버전(`maze-v1`)은 배포마다 증가시키세요.
