// 노드 타입 레지스트리 진입점
// 이 파일을 import하면 각 kind 모듈의 register() 호출이 실행되어
// 레지스트리가 채워진다. 앱 부트스트랩(main.tsx)에서 한 번만 import하면 됨.

// 각 kind 모듈 side-effect import (register 실행)
import "./text";
import "./icon";
import "./progress";
import "./checkbox";
import "./split";

// 레지스트리 API 재노출
export * from "./registry";
export * from "./types";
